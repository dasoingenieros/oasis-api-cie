import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
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

      // 3. Map installation to portal format
      // TODO: generate real document PDFs; for now use placeholders
      const documentPaths = {
        ciePdf: '/tmp/tramitacion/cie.pdf',
        mtdPdf: '/tmp/tramitacion/mtd.pdf',
        solicitudBtPdf: '/tmp/tramitacion/solicitud_bt.pdf',
      };
      const portalData = this.mapper.mapInstallation(
        installation,
        eiciId,
        documentPaths,
      );

      // 4. Progress callback
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

      // 5. Execute Playwright flow
      const result = await this.playwright.ejecutarTramitacion(
        portalData,
        credentials,
        expedienteId,
        onProgress,
        resolvedInputs,
      );

      // 6. Mark as SENT/REGISTERED
      await this.prisma.tramitacionExpediente.update({
        where: { id: expedienteId },
        data: {
          status: result.portalExpediente ? 'REGISTERED' : 'SENT',
          portalExpediente: result.portalExpediente,
          portalData: portalData as any,
          screenshots: result.screenshots as any,
          progress: 100,
          currentStep: 'VERIFY',
          sentAt: new Date(),
          completedAt: new Date(),
        },
      });

      this.logger.log(
        `Expediente ${expedienteId} completado — portal: ${result.portalExpediente ?? 'sin nº'}`,
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
    }
  }
}
