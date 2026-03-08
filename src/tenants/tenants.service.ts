// src/tenants/tenants.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { UpdateInstallerDto } from './dto/update-installer.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Obtener datos del tenant (empresa) */
  async getProfile(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant no encontrado');
    return tenant;
  }

  /** Actualizar datos empresa del tenant */
  async updateProfile(tenantId: string, dto: UpdateTenantProfileDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: dto,
    });
  }

  /** Listar instaladores (usuarios) del tenant */
  async getInstallers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        instaladorNombre: true,
        instaladorNif: true,
        instaladorCertNum: true,
      },
      orderBy: { name: 'asc' },
    });
    return users;
  }

  /** Actualizar datos de un instalador */
  async updateInstaller(tenantId: string, userId: string, dto: UpdateInstallerDto) {
    // Verificar que el usuario pertenece al tenant
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });
    if (!user) throw new NotFoundException('Instalador no encontrado');

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.instaladorNombre !== undefined && { instaladorNombre: dto.instaladorNombre }),
        ...(dto.instaladorNif !== undefined && { instaladorNif: dto.instaladorNif }),
        ...(dto.instaladorCertNum !== undefined && { instaladorCertNum: dto.instaladorCertNum }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        instaladorNombre: true,
        instaladorNif: true,
        instaladorCertNum: true,
      },
    });
  }
}
