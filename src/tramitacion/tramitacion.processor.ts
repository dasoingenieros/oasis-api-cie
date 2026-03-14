import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { TramitacionMapperService } from './tramitacion-mapper.service';
import { TramitacionPlaywrightService, NeedsInputError } from './tramitacion-playwright.service';
import { PortalCryptoService } from './portal-crypto.service';
import type { PlaywrightStep } from './portal-field-mapping';

export interface TramitacionJobData {
  expedienteId: string;
  tenantId: string;
  installationId: string;
  eiciId: string;
  resolvedInputs?: Record<string, { value: string; label: string }>;
}

@Processor('tramitacion', {
  concurrency: parseInt(process.env['TRAMITACION_CONCURRENCY'] ?? '2', 10),
})
export class TramitacionProcessor extends WorkerHost {
  private readonly logger = new Logger(TramitacionProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: TramitacionMapperService,
    private readonly playwright: TramitacionPlaywrightService,
    private readonly crypto: PortalCryptoService,
  ) {
    super();
  }

  async process(job: Job<TramitacionJobData>): Promise<void> {
    const { expedienteId, tenantId, installationId, eiciId, resolvedInputs } =
      job.data;

    this.logger.log(`Procesando expediente ${expedienteId} (job ${job.id})`);
    const tmpDir = path.join('/tmp/tramitacion', expedienteId);

    try {
      // Mark as IN_PROGRESS
      await this.prisma.tramitacionExpediente.update({
        where: { id: expedienteId },
        data: {
          status: 'IN_PROGRESS',
          currentStep: 'LOGIN',
          progress: 0,
          attempts: { increment: 1 },
        },
      });

      // 1. Get installation data
      const installation = await this.prisma.installation.findFirst({
        where: { id: installationId, tenantId },
      });
      if (!installation) {
        throw new Error(`Instalación ${installationId} no encontrada`);
      }

      // 2. Get credentials
      const config = await this.prisma.tramitacionConfig.findUnique({
        where: { tenantId },
      });
      if (!config?.portalUsername || !config?.portalPassword) {
        throw new Error('Credenciales del portal no configuradas');
      }

      const credentials = {
        username: this.crypto.decrypt(config.portalUsername),
        password: this.crypto.decrypt(config.portalPassword),
      };

      // 3. Map installation to portal format (sin documentos — solo campos)
      const portalData = this.mapper.mapInstallation(
        installation,
        eiciId,
        config.portalEiciName ?? 'INGEIN',
        { ciePdf: '', mtdPdf: '', solicitudBtPdf: '' },
      );

      // 5. Progress callback
      const onProgress = async (
        step: PlaywrightStep,
        progress: number,
      ): Promise<void> => {
        await this.prisma.tramitacionExpediente.update({
          where: { id: expedienteId },
          data: { currentStep: step, progress },
        });
        await job.updateProgress(progress);
      };

      // 6. Execute Playwright flow (stops at SAVED, no auto-send)
      const result = await this.playwright.ejecutarTramitacion(
        portalData,
        credentials,
        expedienteId,
        onProgress,
        resolvedInputs,
      );

      // 7. Mark as SAVED (campos rellenados y guardados, sin subir documentos)
      await this.prisma.tramitacionExpediente.update({
        where: { id: expedienteId },
        data: {
          status: 'SAVED',
          portalData: portalData as any,
          screenshots: result.screenshots as any,
          progress: 100,
          currentStep: 'SAVE',
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Expediente ${expedienteId} completado — campos guardados en portal`,
      );
    } catch (err: any) {
      if (err instanceof NeedsInputError) {
        // Pause for user input
        await this.prisma.tramitacionExpediente.update({
          where: { id: expedienteId },
          data: {
            status: 'NEEDS_INPUT',
            currentStep: err.step,
            needsInputData: {
              field: err.field,
              candidates: err.candidates as any,
              searchTerm: err.searchTerm ?? null,
            },
            errorMessage: null,
          },
        });
        this.logger.warn(
          `Expediente ${expedienteId} — NEEDS_INPUT en campo "${err.field}"`,
        );
        return; // Don't throw — this is expected, don't retry
      }

      // Real error — update and let BullMQ retry
      await this.prisma.tramitacionExpediente.update({
        where: { id: expedienteId },
        data: {
          status: 'ERROR',
          errorMessage: err.message?.substring(0, 500) || 'Error desconocido',
        },
      });

      this.logger.error(
        `Error en expediente ${expedienteId}: ${err.message}`,
        err.stack,
      );
      throw err; // Re-throw so BullMQ retries
    } finally {
      // Clean up temp files
      this.cleanupTempDir(tmpDir);
    }
  }

  /**
   * Extracts PDF documents from the Document table and writes them to temp files.
   * Documents needed: CIE (CERTIFICADO), MTD (MEMORIA_TECNICA), Solicitud BT (SOLICITUD).
   */
  private async extractDocuments(
    installationId: string,
    tmpDir: string,
  ): Promise<{ ciePdf: string; mtdPdf: string; solicitudBtPdf: string }> {
    // Ensure temp directory exists
    fs.mkdirSync(tmpDir, { recursive: true });

    // Query latest PDF documents for this installation
    const documents = await this.prisma.document.findMany({
      where: {
        installationId,
        mimeType: 'application/pdf',
        type: { in: ['CERTIFICADO', 'MEMORIA_TECNICA', 'SOLICITUD'] },
      },
      orderBy: { generatedAt: 'desc' },
    });

    const ciePdf = documents.find(d => d.type === 'CERTIFICADO');
    const mtdPdf = documents.find(d => d.type === 'MEMORIA_TECNICA');
    const solicitudBtPdf = documents.find(d => d.type === 'SOLICITUD');

    if (!ciePdf?.content) {
      throw new Error('Documento CIE (CERTIFICADO) no encontrado o sin contenido');
    }
    if (!mtdPdf?.content) {
      throw new Error('Documento MTD (MEMORIA_TECNICA) no encontrado o sin contenido');
    }
    if (!solicitudBtPdf?.content) {
      throw new Error('Documento Solicitud BT (SOLICITUD) no encontrado o sin contenido');
    }

    // Write PDF buffers to temp files
    const ciePath = path.join(tmpDir, 'cie.pdf');
    const mtdPath = path.join(tmpDir, 'mtd.pdf');
    const solicitudPath = path.join(tmpDir, 'solicitud_bt.pdf');

    fs.writeFileSync(ciePath, ciePdf.content);
    fs.writeFileSync(mtdPath, mtdPdf.content);
    fs.writeFileSync(solicitudPath, solicitudBtPdf.content);

    this.logger.log(
      `Documentos extraídos: CIE (${ciePdf.content.length}b), MTD (${mtdPdf.content.length}b), Solicitud (${solicitudBtPdf.content.length}b)`,
    );

    return {
      ciePdf: ciePath,
      mtdPdf: mtdPath,
      solicitudBtPdf: solicitudPath,
    };
  }

  private cleanupTempDir(tmpDir: string): void {
    try {
      if (fs.existsSync(tmpDir)) {
        fs.rmSync(tmpDir, { recursive: true, force: true });
        this.logger.log(`Temp dir limpiado: ${tmpDir}`);
      }
    } catch {
      // Non-critical
    }
  }
}
