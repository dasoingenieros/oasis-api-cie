// ============================================================
// documents.service.ts — Sesión 13 + 18 + 19
// MTD (PDF) + CIE (XLS+PDF) + Solicitud BT (DOCX+PDF)
// ============================================================

import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { generateMtdPdf, MtdInstallationData, MtdCircuitData } from './mtd-pdf-generator';
import { CieExcelGeneratorService } from './cie-excel-generator.service';
import { SolicitudBtGeneratorService } from './solicitud-bt-generator.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(SubscriptionsService) private readonly subscriptionsService: SubscriptionsService,
    private readonly cieGenerator: CieExcelGeneratorService,
    private readonly solicitudGenerator: SolicitudBtGeneratorService,
  ) {}

  // ─── Verificar límite CIE del plan ──────────────────────────

  async checkCieLimit(tenantId: string): Promise<void> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');

    // Límite total (-1 = ilimitado)
    if (tenant.maxCertsTotal > 0) {
      if (tenant.certCount >= tenant.maxCertsTotal) {
        throw new ForbiddenException({
          code: 'CIE_LIMIT_REACHED',
          message: `Has alcanzado el límite de ${tenant.maxCertsTotal} CIE. Mejora tu plan para seguir generando certificados.`,
          currentCount: tenant.certCount,
          maxAllowed: tenant.maxCertsTotal,
        });
      }
      return;
    }

    // Límite mensual (-1 = ilimitado)
    if (tenant.maxCertsMonth === -1) return;

    // Reset mensual si toca
    const now = new Date();
    if (now > tenant.certResetDate) {
      const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      await this.prisma.tenant.update({
        where: { id: tenantId },
        data: { certCount: 0, certResetDate: nextReset },
      });
      return;
    }

    if (tenant.certCount >= tenant.maxCertsMonth) {
      throw new ForbiddenException({
        code: 'CIE_LIMIT_REACHED',
        message: `Has alcanzado el límite de ${tenant.maxCertsMonth} CIE este mes.`,
        currentCount: tenant.certCount,
        maxAllowed: tenant.maxCertsMonth,
      });
    }
  }

  // ─── Incrementar contador CIE ───────────────────────────────

  private async incrementCertCount(tenantId: string): Promise<void> {
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { certCount: { increment: 1 } },
    });
  }

  // ─── Listar documentos ─────────────────────────────────────

  async findAll(installationId: string, tenantId: string) {
    await this.verifyInstallation(installationId, tenantId);
    return this.prisma.document.findMany({
      where: { installationId },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true, installationId: true, type: true, filename: true,
        mimeType: true, sizeBytes: true, isDraft: true, generatedAt: true,
        version: true,
      },
    });
  }

  // ─── Generar MTD u otros ───────────────────────────────────

  async generate(installationId: string, tenantId: string, type: string, userId?: string) {
    // Check user plan limit
    if (userId) await this.subscriptionsService.checkCanGenerate(userId);

    const installation = await this.verifyInstallation(installationId, tenantId, true);

    const latestCalc = await this.prisma.calculationResult.findFirst({
      where: { installationId }, orderBy: { calculatedAt: 'desc' },
    });
    if (!latestCalc) {
      throw new BadRequestException('No hay resultados de cálculo. Ejecuta el cálculo primero.');
    }
    if (type === 'CERTIFICADO') {
      throw new BadRequestException('Usa el endpoint /generate-cie para generar el CIE.');
    }
    if (type === 'SOLICITUD') {
      throw new BadRequestException('Usa el endpoint /generate-solicitud para generar la Solicitud BT.');
    }

    let buffer: Buffer;
    let mimeType: string;
    let fileExt: string;

    if (type === 'MEMORIA_TECNICA') {
      buffer = await this.generateMtdPdfBuffer(installation, latestCalc);
      mimeType = 'application/pdf';
      fileExt = 'pdf';
    } else {
      const html = this.buildHtmlFallback(installation, latestCalc, type);
      buffer = Buffer.from(html, 'utf-8');
      mimeType = 'text/html';
      fileExt = 'html';
    }

    const existingCount = await this.prisma.document.count({ where: { installationId, type: type as any } });
    const filename = this.buildFilename(installation, type, existingCount + 1, fileExt);

    const document = await this.prisma.document.create({
      data: {
        installationId, userId, type: type as any, filename,
        storageKey: `pending/${filename}`, mimeType,
        sizeBytes: buffer.length, content: buffer,
        version: existingCount + 1, isDraft: true,
      },
    });

    // Increment user cert counter
    if (userId) await this.subscriptionsService.incrementCertsGenerated(userId);

    this.logger.log(`Documento ${type} generado: ${filename} (${buffer.length} bytes, v${existingCount + 1})`);

    return {
      id: document.id, installationId: document.installationId,
      type: document.type, filename: document.filename,
      mimeType: document.mimeType, sizeBytes: document.sizeBytes,
      isDraft: document.isDraft, generatedAt: document.generatedAt,
    };
  }

  // ─── Generar CIE (.xls + .pdf) ────────────────────────────

  async generateCie(installationId: string, tenantId: string, userId?: string) {
    // Check user plan limit
    if (userId) await this.subscriptionsService.checkCanGenerate(userId);

    await this.verifyInstallation(installationId, tenantId);
    const result = await this.cieGenerator.generate(installationId);

    const existingCount = await this.prisma.document.count({ where: { installationId, type: 'CERTIFICADO' } });
    const version = existingCount + 1;
    const versionSuffix = version > 1 ? `_v${version}` : '';

    const xlsDoc = await this.prisma.document.create({
      data: {
        installationId, userId, type: 'CERTIFICADO',
        filename: `${result.baseFilename}${versionSuffix}.xls`,
        storageKey: `cie/${installationId}/${result.baseFilename}${versionSuffix}.xls`,
        mimeType: 'application/vnd.ms-excel',
        sizeBytes: result.xlsBuffer.length, content: result.xlsBuffer,
        version, isDraft: false,
      },
    });

    await this.prisma.installation.update({
      where: { id: installationId },
      data: { identificadorCie: result.cieIdentificador, status: 'DOCUMENTED' },
    });

    // Increment user cert counter
    if (userId) await this.subscriptionsService.incrementCertsGenerated(userId);

    this.logger.log(`CIE generado: ${result.cieIdentificador}`);

    return {
      xlsDoc: { id: xlsDoc.id, filename: xlsDoc.filename },
      xlsBuffer: result.xlsBuffer,
      pdfBuffer: result.pdfBuffer,
      cieIdentificador: result.cieIdentificador,
    };
  }

  // ─── Generar Solicitud BT (.docx + .pdf) ──────────────────

  async generateSolicitud(installationId: string, tenantId: string, userId?: string) {
    // Check user plan limit
    if (userId) await this.subscriptionsService.checkCanGenerate(userId);

    await this.verifyInstallation(installationId, tenantId);
    const result = await this.solicitudGenerator.generate(installationId);

    const existingCount = await this.prisma.document.count({ where: { installationId, type: 'SOLICITUD' } });
    const version = existingCount + 1;
    const versionSuffix = version > 1 ? `_v${version}` : '';

    const docxDoc = await this.prisma.document.create({
      data: {
        installationId, userId, type: 'SOLICITUD',
        filename: `${result.baseFilename}${versionSuffix}.docx`,
        storageKey: `solicitud/${installationId}/${result.baseFilename}${versionSuffix}.docx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: result.docxBuffer.length, content: result.docxBuffer,
        version, isDraft: false,
      },
    });

    // Increment user cert counter
    if (userId) await this.subscriptionsService.incrementCertsGenerated(userId);

    this.logger.log(`Solicitud BT generada: docx=${result.docxBuffer.length}B`);

    return {
      docxDoc: { id: docxDoc.id, filename: docxDoc.filename },
      docxBuffer: result.docxBuffer,
      pdfBuffer: result.pdfBuffer,
    };
  }

  // ─── Descargar ─────────────────────────────────────────────

  async download(installationId: string, documentId: string, tenantId: string) {
    await this.verifyInstallation(installationId, tenantId);
    const document = await this.prisma.document.findFirst({ where: { id: documentId, installationId } });
    if (!document) throw new NotFoundException('Documento no encontrado');
    return { buffer: document.content as Buffer, filename: document.filename, mimeType: document.mimeType || 'application/pdf' };
  }

  // ─── Eliminar ─────────────────────────────────────────────

  async remove(installationId: string, documentId: string, tenantId: string) {
    await this.verifyInstallation(installationId, tenantId);
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, installationId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    await this.prisma.document.delete({ where: { id: documentId } });
    return { deleted: true };
  }

  // ─── MTD PDF (unchanged from session 13) ───────────────────

  private async generateMtdPdfBuffer(installation: any, calc: any): Promise<Buffer> {
    const inst = installation;
    const resultSnapshot = calc.resultSnapshot as any;
    const circuitsCalc = resultSnapshot?.circuits || [];

    const titularParts = [inst.titularTipoVia, inst.titularNombreVia, inst.titularNumero].filter(Boolean);
    const titularExtra = [
      inst.titularBloque ? `Bl.${inst.titularBloque}` : null,
      inst.titularEscalera ? `Esc.${inst.titularEscalera}` : null,
      inst.titularPiso ? `${inst.titularPiso}º` : null,
      inst.titularPuerta ? inst.titularPuerta : null,
    ].filter(Boolean);
    const titularDireccion = [titularParts.join(' '), titularExtra.join(' ')].filter(Boolean).join(', ') || '';

    const emplazParts = [inst.emplazTipoVia, inst.emplazNombreVia, inst.emplazNumero].filter(Boolean);
    const emplazExtra = [
      inst.emplazBloque ? `Bl.${inst.emplazBloque}` : null,
      inst.emplazEscalera ? `Esc.${inst.emplazEscalera}` : null,
      inst.emplazPiso ? `${inst.emplazPiso}º` : null,
      inst.emplazPuerta ? inst.emplazPuerta : null,
    ].filter(Boolean);
    const emplazDireccion = [emplazParts.join(' '), emplazExtra.join(' ')].filter(Boolean).join(', ') || inst.address || '';

    const empresaParts = [inst.empresaTipoVia, inst.empresaNombreVia, inst.empresaNumero].filter(Boolean);
    const empresaDomicilio = empresaParts.join(' ') || '';

    const memoriaPorMap: Record<string, string> = {
      NUEVA: 'N', MODIFICACION: 'M', AMPLIACION: 'A',
      'Nueva': 'N', 'Modificación': 'M', 'Ampliación con o sin modif.': 'A',
    };
    const situacionMap: Record<string, string> = { INTERIOR: 'EN INTERIOR', FACHADA: 'EN FACHADA' };

    const mtdData: MtdInstallationData = {
      titularNif: inst.titularNif, titularNombre: inst.titularNombre || inst.titularName,
      titularApellido1: inst.titularApellido1, titularApellido2: inst.titularApellido2,
      titularDireccion, titularLocalidad: inst.titularLocalidad, titularCp: inst.titularCp,
      emplazDireccion, emplazLocalidad: inst.emplazLocalidad, emplazCp: inst.emplazCp,
      usoInstalacion: inst.tipoInstalacionCie || inst.usoInstalacion, tension: inst.supplyVoltage || 230,
      gradoElectrificacion: inst.gradoElectrificacion,
      memoriaPor: memoriaPorMap[inst.tipoActuacion] || 'N',
      superficieM2: inst.superficieM2, puntoConexion: inst.puntoConexion,
      tipoAcometida: inst.tipoAcometida, seccionAcometida: inst.seccionAcometida,
      materialAcometida: inst.materialAcometida,
      tipoCgp: inst.tipoCgp, inBaseCgp: inst.inBaseCgp, inCartuchoCgp: inst.inCartuchoCgp,
      seccionLga: inst.seccionLga, materialLga: inst.materialLga,
      longitudLga: inst.longitudLga, aislamientoLga: inst.aislamientoLga,
      seccionDi: inst.seccionDi, materialDi: inst.materialDi,
      longitudDi: inst.longitudDi, numDerivaciones: inst.numDerivaciones || 1,
      aislamientoDi: inst.aislamientoDi, tipoInstalacionDi: inst.tipoInstalacionDi,
      igmNominal: inst.igaNominal, poderCorte: inst.igaPoderCorte,
      tipoModuloMedida: inst.tipoModuloMedida,
      situacionModulo: situacionMap[inst.situacionModulo] || inst.situacionModulo,
      igaNominal: inst.igaNominal, diferencialNominal: inst.diferencialNominal,
      diferencialSensibilidad: inst.diferencialSensibilidad,
      tipoElectrodos: inst.tipoElectrodos, seccionLineaEnlace: inst.seccionLineaEnlace,
      seccionCondProteccion: inst.seccionCondProteccion,
      supplyType: inst.supplyType, potMaxAdmisible: inst.potMaxAdmisible,
      presupuestoMateriales: inst.presupuestoMateriales,
      presupuestoManoObra: inst.presupuestoManoObra, presupuestoTotal: inst.presupuestoTotal,
      tipoAutor: inst.tipoAutor || 'INSTALADOR',
      instaladorNombre: (inst as any).installer?.nombre || inst.instaladorNombre || inst.installerName,
      instaladorCertNum: (inst as any).installer?.certNum || inst.instaladorCertNum,
      instaladorDomicilio: empresaDomicilio,
      instaladorNum: inst.empresaNumero, instaladorLocalidad: inst.empresaLocalidad,
      instaladorCp: inst.empresaCp, instaladorTelefono: inst.empresaTelefono || inst.empresaMovil,
      instaladorEmail: inst.empresaEmail,
      // Técnico cualificado (from FK relation)
      tecnicoNombre: (inst as any).technician?.nombre,
      tecnicoColegiado: (inst as any).technician?.numColegiado,
      tecnicoDomicilio: (inst as any).technician?.direccion,
      tecnicoLocalidad: (inst as any).technician?.localidad,
      tecnicoCp: (inst as any).technician?.cp,
      tecnicoTelefono: (inst as any).technician?.telefono,
      tecnicoEmail: (inst as any).technician?.email,
      tecnicoColegio: (inst as any).technician?.colegioOficial,
      memoriaDescriptiva: inst.memoriaDescriptiva,
      firmaLugar: inst.firmaLugar || 'MADRID', esquemaDistribucion: inst.esquemaDistribucion,
      phaseSystem: inst.supplyVoltage === 400 ? 'three' : 'single',
      cdtDi: inst.cdtDi ?? undefined, contadorUbicacion: inst.contadorUbicacion,
    };

    const inputCircuits = (calc.inputSnapshot as any[]) || [];
    const mtdCircuits: MtdCircuitData[] = circuitsCalc.map((result: any) => {
      const input = inputCircuits.find((inp: any) => inp.id === result.id);
      return {
        code: input?.code || '', name: input?.label || '',
        power: input?.loadPowerW || 0, voltage: input?.voltageV || 230,
        phases: input?.phaseSystem === 'three' ? 3 : 1, length: input?.lengthM || 0,
        cableType: input?.conductorMaterial === 'Cu' ? 'CU' : 'AL',
        insulationType: input?.insulationType || 'PVC', installMethod: input?.installationMethod || 'A1',
        calculatedSection: result.sectionMm2, voltageDrop: result.voltageDropPct,
        breakerRatingA: result.breakerRatingA, nominalCurrentA: result.nominalCurrentA,
        admissibleCurrentA: result.correctedIzA,
        potMaxAdmKw: input?.loadPowerW ? input.loadPowerW / 1000 : undefined,
      };
    });

    return generateMtdPdf(mtdData, mtdCircuits);
  }

  // ─── Helpers ──────────────────────────────────────────────

  private async verifyInstallation(installationId: string, tenantId: string, includeCircuits = false) {
    const installation = await this.prisma.installation.findFirst({
      where: { id: installationId, tenantId },
      include: includeCircuits
        ? { circuits: true, installer: true, technician: true }
        : { installer: true, technician: true },
    });
    if (!installation) throw new NotFoundException('Instalación no encontrada');
    return installation;
  }

  private buildFilename(installation: any, type: string, version: number, ext = 'pdf'): string {
    const address = (installation.address || 'instalacion').replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').replace(/\s+/g, '_').substring(0, 30);
    const typeShort = type === 'MEMORIA_TECNICA' ? 'MTD' : type === 'CERTIFICADO' ? 'CIE' : type === 'SOLICITUD' ? 'SOL' : 'UNIF';
    return `${typeShort}_${address}_v${version}.${ext}`;
  }

  private buildHtmlFallback(installation: any, calc: any, type: string): string {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${type}</title></head>
<body style="font-family:sans-serif;padding:40px"><h1>Documento ${type}</h1>
<p>La generación para este tipo está en desarrollo.</p></body></html>`;
  }
}
