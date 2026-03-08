import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import type { UserLookupService, LookupUser, CreateUserData } from '@dasoingenieros/auth';
import type { Role } from '@dasoingenieros/types';
import * as bcrypt from 'bcrypt';

/**
 * SafeUser — backward-compatible type used across controllers/services.
 * Maps to LookupUser from @dasoingenieros/auth (what @CurrentUser() injects).
 */
export type SafeUser = LookupUser & { tenantId: string };

@Injectable()
export class UsersService implements UserLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<LookupUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.toLookupUser(user);
  }

  async findByEmail(email: string): Promise<LookupUser | null> {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) return null;
    return this.toLookupUser(user);
  }

  async validatePassword(user: LookupUser, password: string): Promise<boolean> {
    if (!user.password) return false;
    return bcrypt.compare(password, user.password);
  }

  async createUser(data: CreateUserData): Promise<LookupUser> {
    const existing = await this.prisma.user.findFirst({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: data.tenantId },
    });
    if (!tenant) {
      throw new NotFoundException('Tenant no encontrado');
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        tenantId: data.tenantId,
        role: (data.role as UserRole) ?? UserRole.OPERATOR,
        acceptedPrivacy: true,
        acceptedPrivacyAt: new Date(),
      },
    });

    return this.toLookupUser(created);
  }

  /**
   * RGPD — Derecho al olvido.
   */
  async deleteUser(userId: string, tenantId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.tenantId !== tenantId) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const installations = await this.prisma.installation.findMany({
      where: { userId },
      select: { id: true },
    });
    const installationIds = installations.map((i) => i.id);

    await this.prisma.$transaction([
      this.prisma.document.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.circuit.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.electricalPanel.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.unifilarLayout.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.installation.deleteMany({ where: { userId } }),
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }

  private toLookupUser(user: any): LookupUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      modules: [],
      permissions: [],
      active: user.isActive ?? true,
      password: user.passwordHash ?? undefined,
    };
  }
}
