/**
 * Solicitud BT Generator — python-docx + LibreOffice PDF
 * Template: NUEVA_SOLICITUD_BT_GENERICA.docx (original sin modificar)
 */
import {
  Injectable, Logger, NotFoundException, InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import { promisify } from 'util';
import { execFile } from 'child_process';

const execFileAsync = promisify(execFile);

export interface SolicitudGenerationResult {
  docxBuffer: Buffer;
  pdfBuffer: Buffer;
  baseFilename: string;
}

@Injectable()
export class SolicitudBtGeneratorService {
  private readonly logger = new Logger(SolicitudBtGeneratorService.name);
  private readonly templatePath: string;
  private readonly scriptPath: string;

  constructor(private readonly prisma: PrismaService) {
    this.templatePath = path.join(__dirname, '..', 'assets', 'NUEVA_SOLICITUD_BT_GENERICA.docx');
    this.scriptPath = path.join(__dirname, '..', 'assets', 'solicitud_bt_fill.py');
  }

  async generate(installationId: string): Promise<SolicitudGenerationResult> {
    this.logger.log(`Generating Solicitud BT for ${installationId}`);

    const installation = await this.prisma.installation.findUnique({
      where: { id: installationId },
      include: { tenant: true, user: true },
    });

    if (!installation) {
      throw new NotFoundException(`Installation ${installationId} not found`);
    }

    const data = this.buildDataJson(installation);
    const { docxBuffer, pdfBuffer } = await this.executeFill(data);
    const baseFilename = this.buildFilename(installation);

    return { docxBuffer, pdfBuffer, baseFilename };
  }

  private buildDataJson(inst: any): Record<string, any> {
    const tenant = inst.tenant;
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    const now = inst.firmaFecha ? new Date(inst.firmaFecha) : new Date();

    return {
      titular: {
        nif: inst.titularNif || '',
        apellido1: inst.titularApellido1 || '',
        apellido2: inst.titularApellido2 || '',
        nombre: inst.titularNombre || '',
        email: inst.titularEmail || '',
        tipoVia: inst.titularTipoVia || '',
        nombreVia: inst.titularNombreVia || '',
        numero: inst.titularNumero || '',
        bloque: inst.titularBloque || '',
        portal: '',
        escalera: inst.titularEscalera || '',
        piso: inst.titularPiso || '',
        puerta: inst.titularPuerta || '',
        localidad: inst.titularLocalidad || '',
        provincia: inst.titularProvincia || '',
        cp: inst.titularCp || '',
        telefono: inst.titularTelefono || '',
        movil: inst.titularMovil || '',
      },
      representante: inst.representanteNombre ? {
        nif: inst.representanteNif || '',
        nombre: inst.representanteNombre || '',
      } : {},
      empresa: {
        nif: inst.empresaNif || tenant?.empresaNif || '',
        nombre: inst.empresaNombre || tenant?.empresaNombre || '',
        email: inst.empresaEmail || tenant?.empresaEmail || '',
        categoria: inst.empresaCategoria || tenant?.empresaCategoria || '',
        numRegistro: inst.empresaRegNum || tenant?.empresaRegNum || '',
        instaladorNombre: inst.instaladorNombre || '',
        tipoVia: inst.empresaTipoVia || tenant?.empresaTipoVia || '',
        nombreVia: inst.empresaNombreVia || tenant?.empresaNombreVia || '',
        numero: inst.empresaNumero || tenant?.empresaNumero || '',
        localidad: inst.empresaLocalidad || tenant?.empresaLocalidad || '',
        provincia: inst.empresaProvincia || tenant?.empresaProvincia || '',
        cp: inst.empresaCp || tenant?.empresaCp || '',
        telefono: inst.empresaTelefono || tenant?.empresaTelefono || '',
        movil: inst.empresaMovil || tenant?.empresaMovil || '',
      },
      proyectista: {},
      directorObra: {},
      emplazamiento: {
        tipoVia: inst.emplazTipoVia || '',
        nombreVia: inst.emplazNombreVia || '',
        numero: inst.emplazNumero || '',
        cp: inst.emplazCp || '',
        localidad: inst.emplazLocalidad || '',
      },
      tipoExpediente: {
        tipo: ({ 'Nueva': 'NUEVA', 'Modificación': 'MODIFICACION', 'Ampliación con o sin modif.': 'AMPLIACION' } as Record<string, string>)[inst.tipoActuacion] || inst.tipoActuacion || 'NUEVA',
        numRegistro: inst.numRegistroExistente || '',
      },
      tipoInstalacion: this.mapTipoInstalacion(inst),
      documentacion: {
        mtd: inst.tipoDocumentacion === 'MTD' ? 'X' : '',
        cie: 'X',
        dossierUsuario: 'X',
        proyecto: inst.tipoDocumentacion === 'PROYECTO' ? 'X' : '',
      },
      firma: {
        lugar: inst.firmaLugar || inst.emplazLocalidad || 'MADRID',
        dia: String(now.getDate()),
        mes: meses[now.getMonth()],
        anio: String(now.getFullYear()),
      },
    };
  }

  private mapTipoInstalacion(inst: any): Record<string, string> {
    const tipo = (inst.tipoInstalacionCie || inst.usoInstalacion || '').toUpperCase();
    const r: Record<string, string> = {};
    if (tipo.includes('VIVIENDA')) r['vivienda'] = '1';
    else if (tipo.includes('IRVE')) r['irve'] = '1';
    else if (tipo.includes('GARAJE')) r['garajes'] = '1';
    else if (tipo.includes('LPC') && tipo.includes('ESPECT')) r['lpcEspectaculos'] = '1';
    else if (tipo.includes('LPC') && tipo.includes('REUNI')) r['lpcReunion'] = '1';
    else if (tipo.includes('LPC')) r['lpcOtros'] = '1';
    else if (tipo.includes('INDUSTRIAL')) r['industrial'] = '1';
    else if (tipo.includes('LOCAL') || tipo.includes('OFICINA')) r['localOficina'] = '1';
    else if (tipo.includes('ALUMBRADO')) r['alumbradoExterior'] = '1';
    else if (tipo.includes('AUTOCONSUMO')) r['autoconsumo'] = '1';
    else if (tipo.includes('TEMPORAL')) r['temporal'] = '1';
    else if (tipo.includes('GENERACI')) r['generacion'] = '1';
    else if (tipo) r['otras'] = '1';
    return r;
  }

  private async executeFill(data: Record<string, any>): Promise<{ docxBuffer: Buffer; pdfBuffer: Buffer }> {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'sol-'));
    const dataJsonPath = path.join(tmpDir, 'data.json');
    const docxOutputPath = path.join(tmpDir, 'SOLICITUD_BT.docx');
    const pdfOutputPath = path.join(tmpDir, 'SOLICITUD_BT.pdf');

    try {
      await fsp.writeFile(dataJsonPath, JSON.stringify(data, null, 2));

      const { stdout, stderr } = await execFileAsync(
        '/usr/bin/python3',
        [this.scriptPath, this.templatePath, docxOutputPath, pdfOutputPath, dataJsonPath],
        { timeout: 30_000 },
      );

      if (stdout) this.logger.log(`Solicitud: ${stdout.trim()}`);
      if (stderr) this.logger.warn(`Solicitud stderr: ${stderr.trim()}`);

      if (!fs.existsSync(docxOutputPath)) {
        throw new Error('Script did not produce .docx');
      }

      const docxBuffer = await fsp.readFile(docxOutputPath);
      let pdfBuffer: Buffer;
      if (fs.existsSync(pdfOutputPath)) {
        pdfBuffer = await fsp.readFile(pdfOutputPath);
      } else {
        this.logger.warn('PDF not generated (LibreOffice not available)');
        pdfBuffer = Buffer.alloc(0);
      }

      return { docxBuffer, pdfBuffer };
    } catch (error) {
      this.logger.error(`Solicitud generation failed: ${error}`);
      throw new InternalServerErrorException(
        'Failed to generate Solicitud BT.',
      );
    } finally {
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private buildFilename(inst: any): string {
    const titular = (inst.titularNombre || 'SIN_TITULAR')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _-]/g, '').trim();
    const via = (inst.emplazNombreVia || '')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ _-]/g, '').trim();
    const date = new Date().toISOString().split('T')[0];
    return `SOLICITUD_BT_${titular}_${via}_${date}`.replace(/\s+/g, '_').substring(0, 80);
  }
}
