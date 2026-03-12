import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { TramitacionMapperService } from './tramitacion-mapper.service';
import { TramitacionPlaywrightService } from './tramitacion-playwright.service';
import { PortalCryptoService } from './portal-crypto.service';
import type { TramitarDto, UpdateTramitacionConfigDto, ResolveInputDto } from './dto';
import type { TramitacionJobData } from './tramitacion.processor';

@Injectable()
export class TramitacionService {
  private readonly logger = new Logger(TramitacionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: TramitacionMapperService,
    private readonly playwright: TramitacionPlaywrightService,
    private readonly crypto: PortalCryptoService,
    @InjectQueue('tramitacion') private readonly tramitacionQueue: Queue<TramitacionJobData>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAMITAR — Crear expediente y encolar job
  // ═══════════════════════════════════════════════════════════════════════════

  async tramitar(
    installationId: string,
    tenantId: string,
    dto: TramitarDto,
  ) {
    // Verificar que la instalación existe y pertenece al tenant
    const installation = await this.prisma.installation.findFirst({
      where: { id: installationId, tenantId },
    });
    if (!installation) {
      throw new NotFoundException('Instalación no encontrada');
    }

    // Obtener config de tramitación del tenant
    const config = await this.prisma.tramitacionConfig.findUnique({
      where: { tenantId },
    });
    if (!config?.portalUsername || !config?.portalPassword) {
      throw new BadRequestException(
        'Configura tus credenciales del Portal del Instalador antes de tramitar',
      );
    }

    const eiciId = dto.eiciId ?? config.portalEiciId;
    if (!eiciId) {
      throw new BadRequestException('Selecciona una EICI para tramitar');
    }

    // Crear registro de expediente
    const expediente = await this.prisma.tramitacionExpediente.create({
      data: {
        tenantId,
        installationId,
        eiciId,
        eiciNombre: config.portalEiciName,
        status: 'QUEUED',
        currentStep: null,
        progress: 0,
      },
    });

    // Encolar job BullMQ
    await this.tramitacionQueue.add(
      'tramitar',
      {
        expedienteId: expediente.id,
        tenantId,
        installationId,
        eiciId,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );

    this.logger.log(
      `Expediente ${expediente.id} creado y encolado para instalación ${installationId}`,
    );

    return {
      expedienteId: expediente.id,
      status: expediente.status,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATUS — Consultar estado de expediente
  // ═══════════════════════════════════════════════════════════════════════════

  async getStatus(expedienteId: string, tenantId: string) {
    const expediente = await this.prisma.tramitacionExpediente.findFirst({
      where: { id: expedienteId, tenantId },
    });
    if (!expediente) {
      throw new NotFoundException('Expediente no encontrado');
    }
    return {
      id: expediente.id,
      status: expediente.status,
      currentStep: expediente.currentStep,
      progress: expediente.progress,
      portalExpediente: expediente.portalExpediente,
      errorMessage: expediente.errorMessage,
      needsInputData: expediente.needsInputData,
      attempts: expediente.attempts,
      sentAt: expediente.sentAt,
      completedAt: expediente.completedAt,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPEDIENTES — Listar expedientes de una instalación
  // ═══════════════════════════════════════════════════════════════════════════

  async getExpedientes(installationId: string, tenantId: string) {
    return this.prisma.tramitacionExpediente.findMany({
      where: { installationId, tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESOLVE — Resolver campo pendiente (NEEDS_INPUT)
  // ═══════════════════════════════════════════════════════════════════════════

  async resolve(expedienteId: string, tenantId: string, dto: ResolveInputDto) {
    const expediente = await this.prisma.tramitacionExpediente.findFirst({
      where: { id: expedienteId, tenantId, status: 'NEEDS_INPUT' },
    });
    if (!expediente) {
      throw new NotFoundException(
        'Expediente no encontrado o no está esperando input',
      );
    }

    // Guardar la resolución y re-encolar
    const resolvedInputs = {
      ...(expediente.needsInputData as any)?.resolvedInputs,
      [dto.field]: { value: dto.selectedValue, label: dto.selectedLabel ?? '' },
    };

    await this.prisma.tramitacionExpediente.update({
      where: { id: expedienteId },
      data: {
        status: 'QUEUED',
        needsInputData: {
          ...(expediente.needsInputData as any),
          resolvedInputs,
        },
      },
    });

    // Re-encolar job con los inputs resueltos
    await this.tramitacionQueue.add(
      'tramitar',
      {
        expedienteId,
        tenantId: expediente.tenantId,
        installationId: expediente.installationId,
        eiciId: expediente.eiciId!,
        resolvedInputs,
      },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30000 },
        removeOnComplete: 50,
        removeOnFail: 100,
      },
    );

    this.logger.log(`Expediente ${expedienteId} — input resuelto, re-encolado`);

    return { status: 'QUEUED' as const };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFIG — Gestionar credenciales del portal
  // ═══════════════════════════════════════════════════════════════════════════

  async getConfig(tenantId: string) {
    const config = await this.prisma.tramitacionConfig.findUnique({
      where: { tenantId },
    });
    if (!config) {
      return {
        hasCredentials: false,
        portalEiciId: null,
        portalEiciName: null,
      };
    }
    return {
      hasCredentials: !!config.portalUsername && !!config.portalPassword,
      portalEiciId: config.portalEiciId,
      portalEiciName: config.portalEiciName,
    };
  }

  async updateConfig(tenantId: string, dto: UpdateTramitacionConfigDto) {
    const data: any = {};
    if (dto.portalEiciId !== undefined) data.portalEiciId = dto.portalEiciId;
    if (dto.portalEiciName !== undefined) data.portalEiciName = dto.portalEiciName;
    if (dto.portalUsername !== undefined) {
      data.portalUsername = this.crypto.encrypt(dto.portalUsername);
    }
    if (dto.portalPassword !== undefined) {
      data.portalPassword = this.crypto.encrypt(dto.portalPassword);
    }

    return this.prisma.tramitacionConfig.upsert({
      where: { tenantId },
      create: { tenantId, ...data },
      update: data,
    });
  }

  async testConexion(tenantId: string) {
    const config = await this.prisma.tramitacionConfig.findUnique({
      where: { tenantId },
    });
    if (!config?.portalUsername || !config?.portalPassword) {
      throw new BadRequestException('No hay credenciales configuradas');
    }

    const username = this.crypto.decrypt(config.portalUsername);
    const password = this.crypto.decrypt(config.portalPassword);

    return this.playwright.testConexion({ username, password });
  }
}
