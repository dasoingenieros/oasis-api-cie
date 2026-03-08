// src/prisma/prisma.service.ts
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log: [
        { level: 'warn', emit: 'event' },
        { level: 'error', emit: 'event' },
        // En desarrollo, habilitar query log añadiendo: { level: 'query', emit: 'event' }
      ],
    });
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Connecting to PostgreSQL...');
    await this.$connect();
    this.logger.log('PostgreSQL connected ✓');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Disconnecting from PostgreSQL...');
    await this.$disconnect();
  }

  /**
   * Limpia la base de datos en tests de integración.
   * NUNCA llamar en producción.
   */
  async cleanDatabase(): Promise<void> {
    if (process.env['NODE_ENV'] === 'production') {
      throw new Error('cleanDatabase() is not allowed in production');
    }

    await this.$transaction([
      this.auditLog.deleteMany(),
      this.signingRequest.deleteMany(),
      this.photo.deleteMany(),
      this.document.deleteMany(),
      this.calculationResult.deleteMany(),
      this.unifilarLayout.deleteMany(),
      this.circuit.deleteMany(),
      this.differential.deleteMany(),
      this.electricalPanel.deleteMany(),
      this.installation.deleteMany(),
      this.user.deleteMany(),
      this.tenant.deleteMany(),
    ]);
  }
}
