import { Injectable, ConflictException, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';
import type { UserLookupService, LookupUser, CreateUserData } from '@dasoingenieros/auth';
import type { Role } from '@dasoingenieros/types';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

/**
 * CieLookupUser — extends LookupUser with CIE-specific fields.
 */
export interface CieLookupUser extends LookupUser {
  emailVerified: boolean;
  onboardingCompleted: boolean;
}

/**
 * SafeUser — backward-compatible type used across controllers/services.
 * Maps to LookupUser from @dasoingenieros/auth (what @CurrentUser() injects).
 */
export type SafeUser = CieLookupUser & { tenantId: string };

@Injectable()
export class UsersService implements UserLookupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async findById(id: string): Promise<LookupUser | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    if (user.emailVerified === false) {
      throw new ForbiddenException('Email not verified');
    }
    return this.toLookupUser(user);
  }

  async findByEmail(email: string): Promise<LookupUser | null> {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) return null;
    return { ...this.toLookupUser(user), password: user.passwordHash ?? undefined };
  }

  async validatePassword(user: LookupUser, password: string): Promise<boolean> {
    if (!user.password) return false;
    return bcrypt.compare(password, user.password);
  }

  async createUser(data: CreateUserData & { tenantName?: string }): Promise<LookupUser> {
    const existing = await this.prisma.user.findFirst({
      where: { email: data.email },
    });
    if (existing) {
      throw new ConflictException('El email ya está registrado');
    }

    let tenantId = data.tenantId;
    let isSelfRegistration = false;

    if (!tenantId) {
      // Self-registration: create a new tenant
      const tenantName = data.tenantName || data.name;
      const slug = this.generateSlug(tenantName);
      const tenant = await this.prisma.tenant.create({
        data: { name: tenantName, slug },
      });
      tenantId = tenant.id;
      isSelfRegistration = true;
    } else {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });
      if (!tenant) {
        throw new NotFoundException('Tenant no encontrado');
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    // Generate email verification token
    const emailVerifyToken = crypto.randomUUID();
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    const created = await this.prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name,
        tenantId,
        role: isSelfRegistration ? UserRole.ADMIN : ((data.role as UserRole) ?? UserRole.OPERATOR),
        acceptedPrivacy: true,
        acceptedPrivacyAt: new Date(),
        emailVerified: false,
        emailVerifyToken,
        emailVerifyExpires,
        onboardingCompleted: false,
      },
    });

    // Send verification email (fire and forget)
    this.emailService.sendVerificationEmail(data.name, data.email, emailVerifyToken).catch(() => {});

    return this.toLookupUser(created);
  }

  /** Verify email by token. Returns the user email on success. */
  async verifyEmail(token: string): Promise<{ email: string; name: string }> {
    const user = await this.prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      throw new BadRequestException('Token de verificación no válido');
    }

    if (user.emailVerifyExpires && user.emailVerifyExpires < new Date()) {
      throw new BadRequestException('El enlace de verificación ha caducado. Solicita uno nuevo.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpires: null,
      },
    });

    // Send welcome email
    this.emailService.sendWelcomeEmail(user.name, user.email).catch(() => {});

    return { email: user.email, name: user.name };
  }

  /** Resend verification email. Rate limited: 60s between resends. */
  async resendVerification(email: string): Promise<void> {
    const user = await this.prisma.user.findFirst({ where: { email } });
    if (!user) {
      // Don't reveal whether email exists
      return;
    }

    if (user.emailVerified) {
      return;
    }

    // Rate limit: if token was sent less than 60s ago
    if (user.emailVerifyExpires) {
      const tokenAge = 24 * 60 * 60 * 1000 - (user.emailVerifyExpires.getTime() - Date.now());
      if (tokenAge < 60_000) {
        throw new BadRequestException('Espera 60 segundos antes de reenviar');
      }
    }

    const emailVerifyToken = crypto.randomUUID();
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken, emailVerifyExpires },
    });

    await this.emailService.sendVerificationEmail(user.name, email, emailVerifyToken);
  }

  private generateSlug(name: string): string {
    return (
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 50) +
      '-' +
      Date.now().toString(36)
    );
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
      // 1. Delete installation children (FK → installationId)
      this.prisma.signingRequest.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.photo.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.calculationResult.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.document.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.circuit.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.electricalPanel.deleteMany({ where: { installationId: { in: installationIds } } }),
      this.prisma.unifilarLayout.deleteMany({ where: { installationId: { in: installationIds } } }),
      // 2. Delete installations
      this.prisma.installation.deleteMany({ where: { userId } }),
      // 3. Delete user children (FK → userId)
      this.prisma.auditLog.deleteMany({ where: { userId } }),
      this.prisma.consentLog.deleteMany({ where: { userId } }),
      // 4. Delete user
      this.prisma.user.delete({ where: { id: userId } }),
    ]);
  }

  /** Mark onboarding as completed */
  async completeOnboarding(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { onboardingCompleted: true },
    });
  }

  private toLookupUser(user: any): CieLookupUser {
    return {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      name: user.name,
      role: user.role as Role,
      modules: [],
      permissions: [],
      active: user.isActive ?? true,
      password: undefined,
      emailVerified: user.emailVerified ?? false,
      onboardingCompleted: user.onboardingCompleted ?? false,
    };
  }
}
