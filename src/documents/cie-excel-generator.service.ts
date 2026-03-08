/**
 * CIE Excel Generator — LibreOffice UNO approach
 * Preserves 100% original .xls formatting and formulas.
 * 
 * IMPORTANT: We only write DATA cells. The Excel template has formulas that:
 *   - Generate the CIE identifier (sheet "K" → cell R6 in "CIE")
 *   - Calculate COMPLETADO/INCOMPLETO status (cell R4)
 *   - Show "FALTAN DATOS" warnings per section
 * We read the CIE identifier AFTER filling to store it in the database.
 */
import {
  Injectable, Logger, NotFoundException, InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as os from 'os';
import * as net from 'net';
import { spawn, ChildProcess } from 'child_process';
import { promisify } from 'util';
import { execFile } from 'child_process';
import { ALL_CIE_FIELDS, OPTIONAL_FIELDS, CieFieldMapping } from './cie-field-mapping';

const execFileAsync = promisify(execFile);

export interface CieGenerationResult {
  xlsBuffer: Buffer;
  pdfBuffer: Buffer;
  cieIdentificador: string;
  baseFilename: string;
}

interface UnoCell {
  col: string;
  row: number;
  value: string | number;
  type: 'string' | 'number';
}

@Injectable()
export class CieExcelGeneratorService {
  private readonly logger = new Logger(CieExcelGeneratorService.name);
  private readonly templatePath: string;
  private readonly unoScriptPath: string;

  // Semáforo para limitar concurrencia de LibreOffice (max 2 procesos simultáneos)
  private static activeProcesses = 0;
  private static readonly MAX_CONCURRENT = 2;
  private static readonly waitQueue: Array<() => void> = [];

  constructor(private readonly prisma: PrismaService) {
    this.templatePath = path.join(__dirname, '..', 'assets', 'CERTIFICADO_BASICO.xls');
    this.unoScriptPath = path.join(__dirname, '..', 'assets', 'cie_uno_fill.py');
  }

  private async acquireLock(): Promise<void> {
    if (CieExcelGeneratorService.activeProcesses < CieExcelGeneratorService.MAX_CONCURRENT) {
      CieExcelGeneratorService.activeProcesses++;
      return;
    }
    return new Promise((resolve) => {
      CieExcelGeneratorService.waitQueue.push(() => {
        CieExcelGeneratorService.activeProcesses++;
        resolve();
      });
    });
  }

  private releaseLock(): void {
    CieExcelGeneratorService.activeProcesses--;
    const next = CieExcelGeneratorService.waitQueue.shift();
    if (next) next();
  }

  async generate(installationId: string): Promise<CieGenerationResult> {
    this.logger.log(`Generating CIE for installation ${installationId}`);
    await this.acquireLock();
    try {
      return await this._generate(installationId);
    } finally {
      this.releaseLock();
    }
  }

  private async _generate(installationId: string): Promise<CieGenerationResult> {

    const installation = await this.prisma.installation.findUnique({
      where: { id: installationId },
      include: { tenant: true, user: true },
    });

    if (!installation) {
      throw new NotFoundException(`Installation ${installationId} not found`);
    }

    const dataMap = this.buildDataMap(installation);
    const cells = this.buildCellList(dataMap);

    this.logger.log(`Prepared ${cells.length} data cells to fill`);

    const { xlsBuffer, pdfBuffer, cieIdentificador } = await this.executeUnoFill(cells);
    const baseFilename = this.buildFilename(installation, cieIdentificador);

    return { xlsBuffer, pdfBuffer, cieIdentificador, baseFilename };
  }

  // ─── Data mapping (schema.prisma field names) ──────────────────────────────

  private buildDataMap(installation: any): Record<string, any> {
    const data: Record<string, any> = {};

    // Flatten scalar fields from installation
    for (const [key, value] of Object.entries(installation)) {
      if (value !== null && value !== undefined && typeof value !== 'object') {
        data[key] = value;
      }
    }

    // Fill empresa fields from tenant if not set on installation
    const tenant = installation.tenant;
    if (tenant) {
      const tenantFields = [
        'empresaNif', 'empresaNombre', 'empresaCategoria', 'empresaRegNum',
        'empresaTipoVia', 'empresaNombreVia', 'empresaNumero',
        'empresaLocalidad', 'empresaProvincia', 'empresaCp',
        'empresaTelefono', 'empresaEmail',
      ];
      for (const f of tenantFields) {
        if (!data[f] && tenant[f]) data[f] = tenant[f];
      }
      if (!data['distribuidora'] && tenant['distribuidoraHab']) {
        data['distribuidora'] = tenant['distribuidoraHab'];
      }
    }

    // Fallback: si no hay teléfono fijo, usar móvil
    if (!data['empresaTelefono'] && data['empresaMovil']) {
      data['empresaTelefono'] = data['empresaMovil'];
    }

    // Defaults
    if (!data['esquemaDistribucion']) data['esquemaDistribucion'] = 'TT';
    if (!data['tipoActuacion']) data['tipoActuacion'] = 'Nueva';
    if (!data['firmaLugar']) data['firmaLugar'] = 'MADRID';
    if (!data['firmaFecha']) data['firmaFecha'] = new Date();

    return data;
  }

  // ─── Build UNO cell list from field mappings ───────────────────────────────

  private buildCellList(dataMap: Record<string, any>): UnoCell[] {
    const cells: UnoCell[] = [];

    for (const mapping of ALL_CIE_FIELDS) {
      const value = this.resolveValue(mapping, dataMap);
      if (value === null || value === undefined || value === '') continue;

      cells.push({
        col: mapping.col,
        row: mapping.row,
        value,
        type: typeof value === 'number' ? 'number' : 'string',
      });
    }

    return cells;
  }

  // ─── Value resolution ──────────────────────────────────────────────────────

  private resolveValue(mapping: CieFieldMapping, data: Record<string, any>): any {
    const { field, transform } = mapping;

    if (transform) {
      return this.applyTransform(transform, field, data);
    }

    const value = data[field];
    if (value === null || value === undefined) return null;

    if (mapping.valueType === 'number' && typeof value === 'number') {
      return value;
    }

    return String(value);
  }

  private applyTransform(transform: string, field: string, data: Record<string, any>): any {
    switch (transform) {
      case 'tipoSuministro':
        return data['supplyVoltage'] === 400 ? 'Trifásico' : 'Monofásico';

      case 'boolToSiNo':
        return data[field] ? 'SI' : 'NO';

      case 'hasDiferencial':
        return data['diferencialNominal'] ? 'SI' : 'NO';

      case 'potAmpOrNA':
        return data['potAmpliacion'] != null ? String(data['potAmpliacion']) : 'N/A';

      case 'potOrigOrNA':
        return data['potOriginal'] != null ? String(data['potOriginal']) : 'N/A';

      case 'formatFechaFirma': {
        const fecha = data['firmaFecha'];
        if (!fecha) return '';
        const d = fecha instanceof Date ? fecha : new Date(fecha);
        const meses = [
          'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
          'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
        ];
        const loc = data['firmaLugar'] || data['emplazLocalidad'] || 'MADRID';
        return ` ${loc} A ${d.getDate()} DE ${meses[d.getMonth()]} ${d.getFullYear()}`;
      }

      default:
        return null;
    }
  }

  // ─── LibreOffice UNO execution ─────────────────────────────────────────────

  private async executeUnoFill(cells: UnoCell[]): Promise<{ xlsBuffer: Buffer; pdfBuffer: Buffer; cieIdentificador: string }> {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'cie-'));
    const loHome = path.join(tmpDir, 'lo_home');
    const dataJsonPath = path.join(tmpDir, 'cells.json');
    const xlsOutputPath = path.join(tmpDir, 'CIE_FILLED.xls');
    const pdfOutputPath = path.join(tmpDir, 'CIE_FILLED.pdf');
    const metaOutputPath = path.join(tmpDir, 'meta.json');

    let loProcess: ChildProcess | null = null;

    try {
      await fsp.mkdir(loHome, { recursive: true });
      await fsp.writeFile(dataJsonPath, JSON.stringify(cells));

      loProcess = spawn('soffice', [
        '--headless', '--norestore', '--nologo',
        '--accept=socket,host=localhost,port=8100;urp;',
        `-env:UserInstallation=file://${loHome}/.config/libreoffice`,
      ], {
        env: { ...process.env, HOME: loHome },
        stdio: 'ignore',
        detached: true,
      });

      await this.waitForPort(8100, 15_000);

      const { stdout, stderr } = await execFileAsync(
        '/usr/bin/python3',
        [this.unoScriptPath, this.templatePath, xlsOutputPath, pdfOutputPath, dataJsonPath, metaOutputPath],
        { timeout: 25_000, env: { ...process.env, HOME: loHome } },
      );

      if (stdout) this.logger.log(`UNO: ${stdout.trim()}`);
      if (stderr) this.logger.warn(`UNO stderr: ${stderr.trim()}`);

      if (!fs.existsSync(xlsOutputPath) || !fs.existsSync(pdfOutputPath)) {
        throw new Error('UNO script did not produce output files');
      }

      const xlsBuffer = await fsp.readFile(xlsOutputPath);
      const pdfBuffer = await fsp.readFile(pdfOutputPath);

      // Read CIE identifier from meta.json (extracted from Excel formula result)
      let cieIdentificador = 'UNKNOWN';
      if (fs.existsSync(metaOutputPath)) {
        const meta = JSON.parse(await fsp.readFile(metaOutputPath, 'utf-8'));
        cieIdentificador = meta.cieIdentificador || 'UNKNOWN';
        this.logger.log(`CIE identifier from Excel: ${cieIdentificador}`);
      }

      this.logger.log(`CIE generated: xls=${xlsBuffer.length}B, pdf=${pdfBuffer.length}B`);
      return { xlsBuffer, pdfBuffer, cieIdentificador };
    } catch (error) {
      this.logger.error(`CIE generation failed: ${error}`);
      throw new InternalServerErrorException(
        'Failed to generate CIE. Ensure LibreOffice is installed.',
      );
    } finally {
      if (loProcess?.pid) {
        try { process.kill(-loProcess.pid, 'SIGTERM'); }
        catch { try { loProcess.kill('SIGKILL'); } catch { /* */ } }
      }
      await fsp.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  private waitForPort(port: number, timeoutMs: number): Promise<void> {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tryConnect = () => {
        if (Date.now() - start > timeoutMs) return reject(new Error(`Timeout port ${port}`));
        const socket = new net.Socket();
        socket.once('connect', () => { socket.destroy(); resolve(); });
        socket.once('error', () => { socket.destroy(); setTimeout(tryConnect, 300); });
        socket.connect(port, 'localhost');
      };
      tryConnect();
    });
  }

  // ─── Filename ──────────────────────────────────────────────────────────────

  private buildFilename(installation: any, _cieId: string): string {
    const nombre = (installation.titularNombre || '').trim();
    const apellido1 = (installation.titularApellido1 || '').trim();
    const apellido2 = (installation.titularApellido2 || '').trim();
    const titular = [nombre, apellido1, apellido2].filter(Boolean).join('_')
      .replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_-]/g, '') || 'SIN_TITULAR';
    return `CIE_${titular}`.replace(/\s+/g, '_').substring(0, 100);
  }
}
