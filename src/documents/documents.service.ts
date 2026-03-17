// ============================================================
// documents.service.ts — Sesión 13 + 18 + 19
// MTD (PDF) + CIE (XLS+PDF) + Solicitud BT (DOCX+PDF)
// ============================================================

import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger, Inject,
} from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import { promises as fsp } from 'fs';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { generateMtdPdf, MtdInstallationData, MtdCircuitData } from './mtd-pdf-generator';
import { CieExcelGeneratorService } from './cie-excel-generator.service';
import { SolicitudBtGeneratorService } from './solicitud-bt-generator.service';
import { buildNormalizedFilename } from './filename-utils';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(SubscriptionsService) private readonly subscriptionsService: SubscriptionsService,
    private readonly cieGenerator: CieExcelGeneratorService,
    private readonly solicitudGenerator: SolicitudBtGeneratorService,
  ) {}

  // ─── Listar documentos ─────────────────────────────────────

  async findAll(installationId: string, tenantId: string) {
    await this.verifyInstallation(installationId, tenantId);
    return this.prisma.document.findMany({
      where: { installationId },
      orderBy: { generatedAt: 'desc' },
      select: {
        id: true, installationId: true, type: true, filename: true,
        mimeType: true, sizeBytes: true, isDraft: true, generatedAt: true,
        version: true, signedAt: true, signedFileUrl: true, signerName: true,
        reviewStatus: true, reviewedAt: true, reviewNote: true,
      },
    });
  }

  // ─── Aprobar documento ────────────────────────────────────

  async approveDocument(installationId: string, documentId: string, tenantId: string) {
    await this.verifyInstallation(installationId, tenantId);
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, installationId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    return this.prisma.document.update({
      where: { id: documentId },
      data: { reviewStatus: 'APPROVED', reviewedAt: new Date(), reviewNote: null },
      select: {
        id: true, installationId: true, type: true, filename: true,
        mimeType: true, sizeBytes: true, isDraft: true, generatedAt: true,
        version: true, signedAt: true, signedFileUrl: true, signerName: true,
        reviewStatus: true, reviewedAt: true, reviewNote: true,
      },
    });
  }

  // ─── Actualizar estado de revisión ────────────────────────

  async updateReviewStatus(
    installationId: string, documentId: string, tenantId: string,
    reviewStatus: string, reviewNote?: string,
  ) {
    await this.verifyInstallation(installationId, tenantId);
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, installationId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    return this.prisma.document.update({
      where: { id: documentId },
      data: { reviewStatus, reviewedAt: new Date(), reviewNote: reviewNote || null },
      select: {
        id: true, installationId: true, type: true, filename: true,
        mimeType: true, sizeBytes: true, isDraft: true, generatedAt: true,
        version: true, signedAt: true, signedFileUrl: true, signerName: true,
        reviewStatus: true, reviewedAt: true, reviewNote: true,
      },
    });
  }

  // ─── Crear reporte de feedback ────────────────────────────

  async createFeedbackReport(
    installationId: string, documentId: string, tenantId: string,
    description: string, documentType?: string, screenshotFile?: Express.Multer.File,
  ) {
    await this.verifyInstallation(installationId, tenantId);
    const doc = await this.prisma.document.findFirst({ where: { id: documentId, installationId } });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    let screenshotKey: string | null = null;
    if (screenshotFile) {
      const dir = path.join('uploads', 'feedback', installationId);
      await fsp.mkdir(dir, { recursive: true });
      screenshotKey = path.join(dir, `${Date.now()}_${screenshotFile.originalname}`);
      await fsp.rename(screenshotFile.path, screenshotKey);
    }

    const report = await this.prisma.feedbackReport.create({
      data: {
        tenantId, installationId, documentId,
        documentType: documentType || doc.type,
        description, screenshotKey, status: 'OPEN',
      },
    });

    // Mark document as REPORTED
    await this.prisma.document.update({
      where: { id: documentId },
      data: { reviewStatus: 'REPORTED', reviewedAt: new Date() },
    });

    this.logger.log(`Feedback report created: ${report.id} for doc ${documentId}`);
    return report;
  }

  // ─── Generar MTD u otros ───────────────────────────────────

  async generate(installationId: string, tenantId: string, type: string, userId?: string) {
    // Check credit-based limits
    if (userId) {
      const check = await this.subscriptionsService.canGenerateDocument(userId);
      if (!check.allowed) {
        throw new ForbiddenException({ message: check.reason, code: 'CERT_LIMIT_REACHED' });
      }
    }

    const installation = await this.verifyInstallation(installationId, tenantId, true);
    const panelVersion = (installation as any).panelVersion ?? 'v1';

    // v2 can generate MTD from PanelNode calcResults (no CalculationResult needed)
    const latestCalc = await this.prisma.calculationResult.findFirst({
      where: { installationId }, orderBy: { calculatedAt: 'desc' },
    });
    if (!latestCalc && panelVersion !== 'v2') {
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
      if (panelVersion === 'v2') {
        buffer = await this.generateMtdPdfBufferV2(installation, tenantId);
      } else {
        if (!latestCalc) throw new BadRequestException('No hay resultados de cálculo.');
        buffer = await this.generateMtdPdfBuffer(installation, latestCalc);
      }
      mimeType = 'application/pdf';
      fileExt = 'pdf';
    } else {
      if (!latestCalc && panelVersion !== 'v2') {
        throw new BadRequestException('No hay resultados de cálculo.');
      }
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

    // Consume credit (or just increment counter for Pro/Enterprise)
    if (userId) await this.subscriptionsService.consumeCredit(userId, installationId);

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
    // Check credit-based limits
    if (userId) {
      const check = await this.subscriptionsService.canGenerateDocument(userId);
      if (!check.allowed) {
        throw new ForbiddenException({ message: check.reason, code: 'CERT_LIMIT_REACHED' });
      }
    }

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

    // Consume credit (or just increment counter for Pro/Enterprise)
    if (userId) await this.subscriptionsService.consumeCredit(userId, installationId);

    this.logger.log(`CIE generado: ${result.cieIdentificador}`);

    return {
      id: xlsDoc.id, installationId: xlsDoc.installationId,
      type: xlsDoc.type, filename: xlsDoc.filename,
      mimeType: xlsDoc.mimeType, sizeBytes: xlsDoc.sizeBytes,
      isDraft: xlsDoc.isDraft, generatedAt: xlsDoc.generatedAt,
      cieIdentificador: result.cieIdentificador,
    };
  }

  // ─── Generar Solicitud BT (.docx + .pdf) ──────────────────

  async generateSolicitud(installationId: string, tenantId: string, userId?: string) {
    // Check credit-based limits
    if (userId) {
      const check = await this.subscriptionsService.canGenerateDocument(userId);
      if (!check.allowed) {
        throw new ForbiddenException({ message: check.reason, code: 'CERT_LIMIT_REACHED' });
      }
    }

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

    // Consume credit (or just increment counter for Pro/Enterprise)
    if (userId) await this.subscriptionsService.consumeCredit(userId, installationId);

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

    // When deleting a CIE, clear the identificadorCie on the installation
    if (doc.type === 'CERTIFICADO') {
      await this.prisma.installation.update({
        where: { id: installationId },
        data: { identificadorCie: null },
      });
    }

    return { deleted: true };
  }

  // ─── Subir documento firmado ───────────────────────────────

  async uploadSigned(
    installationId: string,
    documentId: string,
    tenantId: string,
    file: Express.Multer.File,
    signerName?: string,
  ) {
    const installation = await this.verifyInstallation(installationId, tenantId);
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, installationId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');

    // Delete old signed file if replacing
    if (doc.signedFileUrl) {
      const oldPath = path.resolve(doc.signedFileUrl);
      if (fs.existsSync(oldPath)) {
        await fsp.unlink(oldPath);
      }
    }

    // Store relative path: uploads/signed/{installationId}/{timestamp}.pdf
    const dir = path.join('uploads', 'signed', installationId);
    await fsp.mkdir(dir, { recursive: true });
    const relativePath = path.join(dir, `${Date.now()}.pdf`);
    await fsp.rename(file.path, relativePath);

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        signedAt: new Date(),
        signedFileUrl: relativePath,
        signerName: signerName || null,
      },
      select: {
        id: true, installationId: true, type: true, filename: true,
        mimeType: true, sizeBytes: true, isDraft: true, generatedAt: true,
        version: true, signedAt: true, signedFileUrl: true, signerName: true,
      },
    });

    this.logger.log(`Documento firmado subido: ${doc.type} (${documentId})`);
    return updated;
  }

  // ─── Descargar documento firmado ──────────────────────────

  async downloadSigned(installationId: string, documentId: string, tenantId: string) {
    const installation = await this.verifyInstallation(installationId, tenantId);
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, installationId },
    });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    if (!doc.signedFileUrl) throw new BadRequestException('El documento no tiene versión firmada');

    const filePath = path.resolve(doc.signedFileUrl);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Archivo firmado no encontrado en disco');
    }

    const filename = buildNormalizedFilename(installation, doc.type, 'pdf', true);
    return { filePath, filename };
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
      phaseSystem: (inst.supplyVoltage === 400 || inst.supplyVoltage === 380) ? 'three' : 'single',
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

  // ─── MTD PDF from PanelNode v2 ──────────────────────────────

  private async generateMtdPdfBufferV2(installation: any, tenantId: string): Promise<Buffer> {
    const inst = installation;
    const installationId = inst.id;

    // Fetch all panel nodes
    const panelNodes = await this.prisma.panelNode.findMany({
      where: { installationId, tenantId },
      orderBy: { position: 'asc' },
    });

    if (panelNodes.length === 0) {
      throw new BadRequestException('No hay nodos en el cuadro v2. Configura el cuadro eléctrico primero.');
    }

    // Check that at least some circuits have calcResults
    const circuitNodes = panelNodes.filter((n) => n.nodeType === 'CIRCUITO');
    if (circuitNodes.length === 0) {
      throw new BadRequestException('No hay circuitos definidos en el cuadro v2.');
    }

    const hasCalcResults = circuitNodes.some((n) => n.calcResults != null);
    if (!hasCalcResults) {
      throw new BadRequestException('No hay resultados de cálculo en v2. Ejecuta el cálculo del cuadro primero.');
    }

    // Build same mtdData as v1 (reuse same mapping from installation scalar fields)
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
      instaladorNombre: inst.installer?.nombre || inst.instaladorNombre || inst.installerName,
      instaladorCertNum: inst.installer?.certNum || inst.instaladorCertNum,
      instaladorDomicilio: empresaDomicilio,
      instaladorNum: inst.empresaNumero, instaladorLocalidad: inst.empresaLocalidad,
      instaladorCp: inst.empresaCp, instaladorTelefono: inst.empresaTelefono || inst.empresaMovil,
      instaladorEmail: inst.empresaEmail,
      tecnicoNombre: inst.technician?.nombre,
      tecnicoColegiado: inst.technician?.numColegiado,
      tecnicoDomicilio: inst.technician?.direccion,
      tecnicoLocalidad: inst.technician?.localidad,
      tecnicoCp: inst.technician?.cp,
      tecnicoTelefono: inst.technician?.telefono,
      tecnicoEmail: inst.technician?.email,
      tecnicoColegio: inst.technician?.colegioOficial,
      memoriaDescriptiva: inst.memoriaDescriptiva,
      firmaLugar: inst.firmaLugar || 'MADRID', esquemaDistribucion: inst.esquemaDistribucion,
      phaseSystem: (inst.supplyVoltage === 400 || inst.supplyVoltage === 380) ? 'three' : 'single',
      cdtDi: inst.cdtDi ?? undefined, contadorUbicacion: inst.contadorUbicacion,
    };

    // Build IGA data from PanelNode (override installation-level if present)
    const igaNode = panelNodes.find((n) => n.nodeType === 'IGA' && n.parentId === null);
    if (igaNode) {
      if (igaNode.calibreA) mtdData.igaNominal = igaNode.calibreA;
      if (igaNode.calibreA) mtdData.igmNominal = igaNode.calibreA;
      if (igaNode.poderCorteKa) mtdData.poderCorte = igaNode.poderCorteKa;
      // CdT DI from IGA calcResults
      const igaCalc = igaNode.calcResults as any;
      if (igaCalc?.di?.voltageDropPct != null) mtdData.cdtDi = igaCalc.di.voltageDropPct;
    }

    // Build diferencial data from first DIFERENCIAL node
    const diffNode = panelNodes.find((n) => n.nodeType === 'DIFERENCIAL');
    if (diffNode) {
      if (diffNode.calibreA) mtdData.diferencialNominal = diffNode.calibreA;
      if (diffNode.sensitivityMa) mtdData.diferencialSensibilidad = diffNode.sensitivityMa;
    }

    // Map insulation type designation to category
    const mapInsulationType = (designation: string | null): string => {
      switch (designation) {
        case 'H07V-K': case 'H07V-U': case 'H07Z1-K': case 'PVC': return 'PVC';
        case 'RV-K': case 'RZ1-K': case 'XLPE': return 'XLPE';
        case 'EPR': return 'EPR';
        default: return 'PVC';
      }
    };

    // Build MtdCircuitData from CIRCUITO nodes + their calcResults
    const mtdCircuits: MtdCircuitData[] = circuitNodes.map((node) => {
      const cr = node.calcResults as any;
      const phases = node.phases === '3F' ? 3 : 1;
      const material = node.material === 'AL' ? 'AL' : 'CU';

      // Find parent AUTOMATICO for breaker info (if not in calcResults)
      let breakerRatingA = cr?.breakerRatingA ?? null;
      let breakerCurve = cr?.breakerCurve ?? 'C';
      if (!breakerRatingA) {
        const parentNode = panelNodes.find((n) => n.id === node.parentId);
        if (parentNode?.nodeType === 'AUTOMATICO') {
          breakerRatingA = parentNode.calibreA;
          breakerCurve = parentNode.curva || breakerCurve;
        }
      }

      return {
        code: '', // v2 nodes don't have a separate code field
        name: node.name || '',
        power: node.power ?? 0,
        voltage: node.voltage ?? 230,
        phases,
        length: node.length ?? 0,
        cableType: material,
        insulationType: mapInsulationType(node.cableType),
        installMethod: node.installMethod || 'A1',
        calculatedSection: cr?.sectionMm2 ?? node.section ?? undefined,
        voltageDrop: cr?.voltageDropPct ?? undefined,
        breakerRatingA: breakerRatingA ?? undefined,
        nominalCurrentA: cr?.nominalCurrentA ?? undefined,
        admissibleCurrentA: cr?.correctedIzA ?? undefined,
        potMaxAdmKw: node.power ? node.power / 1000 : undefined,
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

  private buildFilename(installation: any, type: string, _version: number, ext = 'pdf'): string {
    return buildNormalizedFilename(installation, type, ext);
  }

  private buildHtmlFallback(installation: any, calc: any, type: string): string {
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>${type}</title></head>
<body style="font-family:sans-serif;padding:40px"><h1>Documento ${type}</h1>
<p>La generación para este tipo está en desarrollo.</p></body></html>`;
  }
}
