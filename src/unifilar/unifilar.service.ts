import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnifilarService {
  constructor(private readonly prisma: PrismaService) {}

  async getLayout(installationId: string, tenantId: string) {
    // Verify installation belongs to tenant
    const inst = await this.prisma.installation.findFirst({
      where: { id: installationId, tenantId },
    });
    if (!inst) throw new NotFoundException('Instalación no encontrada');

    const layout = await this.prisma.unifilarLayout.findUnique({
      where: { installationId },
    });

    return layout; // null if not saved yet
  }

  async saveLayout(installationId: string, tenantId: string, layoutJson: any) {
    // Verify installation belongs to tenant
    const inst = await this.prisma.installation.findFirst({
      where: { id: installationId, tenantId },
    });
    if (!inst) throw new NotFoundException('Instalación no encontrada');

    // Upsert: create or update (increment version on update)
    const existing = await this.prisma.unifilarLayout.findUnique({
      where: { installationId },
    });

    if (existing) {
      return this.prisma.unifilarLayout.update({
        where: { installationId },
        data: {
          layoutJson,
          version: existing.version + 1,
        },
      });
    }

    return this.prisma.unifilarLayout.create({
      data: {
        installationId,
        layoutJson,
        version: 1,
      },
    });
  }
}
