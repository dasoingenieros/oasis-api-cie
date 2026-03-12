import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Installer, Technician } from '@prisma/client';
import { CreateInstallerDto } from './dto/create-installer.dto';
import { UpdateInstallerDto } from './dto/update-installer.dto';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import type { SafeUser } from '../users/users.service';

@Injectable()
export class TeamService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Installers ──────────────────────────────────────────────────────

  async listInstallers(user: SafeUser): Promise<Installer[]> {
    return this.prisma.installer.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { nombre: 'asc' }],
    });
  }

  async createInstaller(dto: CreateInstallerDto, user: SafeUser): Promise<Installer> {
    if (dto.isDefault) {
      await this.prisma.installer.updateMany({
        where: { tenantId: user.tenantId, deletedAt: null },
        data: { isDefault: false },
      });
    }
    return this.prisma.installer.create({
      data: {
        ...dto,
        tenantId: user.tenantId,
      },
    });
  }

  async updateInstaller(id: string, dto: UpdateInstallerDto, user: SafeUser): Promise<Installer> {
    const installer = await this.prisma.installer.findUnique({ where: { id } });
    if (!installer || installer.deletedAt) throw new NotFoundException('Instalador no encontrado');
    if (installer.tenantId !== user.tenantId) throw new ForbiddenException('Acceso denegado');

    if (dto.isDefault) {
      await this.prisma.installer.updateMany({
        where: { tenantId: user.tenantId, deletedAt: null, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.installer.update({ where: { id }, data: dto });
  }

  async deleteInstaller(id: string, user: SafeUser): Promise<void> {
    const installer = await this.prisma.installer.findUnique({ where: { id } });
    if (!installer || installer.deletedAt) throw new NotFoundException('Instalador no encontrado');
    if (installer.tenantId !== user.tenantId) throw new ForbiddenException('Acceso denegado');

    await this.prisma.installer.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });
  }

  // ─── Technicians ─────────────────────────────────────────────────────

  async listTechnicians(user: SafeUser): Promise<Technician[]> {
    return this.prisma.technician.findMany({
      where: { tenantId: user.tenantId, deletedAt: null },
      orderBy: [{ isDefault: 'desc' }, { nombre: 'asc' }],
    });
  }

  async createTechnician(dto: CreateTechnicianDto, user: SafeUser): Promise<Technician> {
    if (dto.isDefault) {
      await this.prisma.technician.updateMany({
        where: { tenantId: user.tenantId, deletedAt: null },
        data: { isDefault: false },
      });
    }
    return this.prisma.technician.create({
      data: {
        ...dto,
        tenantId: user.tenantId,
      },
    });
  }

  async updateTechnician(id: string, dto: UpdateTechnicianDto, user: SafeUser): Promise<Technician> {
    const tech = await this.prisma.technician.findUnique({ where: { id } });
    if (!tech || tech.deletedAt) throw new NotFoundException('Técnico no encontrado');
    if (tech.tenantId !== user.tenantId) throw new ForbiddenException('Acceso denegado');

    if (dto.isDefault) {
      await this.prisma.technician.updateMany({
        where: { tenantId: user.tenantId, deletedAt: null, id: { not: id } },
        data: { isDefault: false },
      });
    }
    return this.prisma.technician.update({ where: { id }, data: dto });
  }

  async deleteTechnician(id: string, user: SafeUser): Promise<void> {
    const tech = await this.prisma.technician.findUnique({ where: { id } });
    if (!tech || tech.deletedAt) throw new NotFoundException('Técnico no encontrado');
    if (tech.tenantId !== user.tenantId) throw new ForbiddenException('Acceso denegado');

    await this.prisma.technician.update({
      where: { id },
      data: { deletedAt: new Date(), isDefault: false },
    });
  }
}
