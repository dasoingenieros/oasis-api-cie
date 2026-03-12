// src/installations/installations.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Installation, InstallationStatus } from '@prisma/client';
import { CreateInstallationDto } from './dto/create-installation.dto';
import { UpdateInstallationDto } from './dto/update-installation.dto';
import type { SafeUser } from '../users/users.service';

@Injectable()
export class InstallationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateInstallationDto, user: SafeUser): Promise<Installation> {
    // Auto-rellenar datos empresa desde tenant + datos instalador desde user
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });
    const fullUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    const autoFill: Record<string, any> = {};

    // Datos empresa desde tenant
    if (tenant) {
      if (tenant.empresaNif) autoFill.empresaNif = tenant.empresaNif;
      if (tenant.empresaNombre) autoFill.empresaNombre = tenant.empresaNombre;
      if (tenant.empresaCategoria) autoFill.empresaCategoria = tenant.empresaCategoria;
      if (tenant.empresaRegNum) autoFill.empresaRegNum = tenant.empresaRegNum;
      if (tenant.empresaTipoVia) autoFill.empresaTipoVia = tenant.empresaTipoVia;
      if (tenant.empresaNombreVia) autoFill.empresaNombreVia = tenant.empresaNombreVia;
      if (tenant.empresaNumero) autoFill.empresaNumero = tenant.empresaNumero;
      if (tenant.empresaLocalidad) autoFill.empresaLocalidad = tenant.empresaLocalidad;
      if (tenant.empresaProvincia) autoFill.empresaProvincia = tenant.empresaProvincia;
      if (tenant.empresaCp) autoFill.empresaCp = tenant.empresaCp;
      if (tenant.empresaTelefono) autoFill.empresaTelefono = tenant.empresaTelefono;
      if (tenant.empresaMovil) autoFill.empresaMovil = tenant.empresaMovil;
      if (tenant.empresaEmail) autoFill.empresaEmail = tenant.empresaEmail;
      if (tenant.distribuidoraHab) autoFill.distribuidora = tenant.distribuidoraHab;
    }

    // Datos instalador: preferir default Installer del team, fallback a User
    const defaultInstaller = await this.prisma.installer.findFirst({
      where: { tenantId: user.tenantId, isDefault: true, deletedAt: null },
    });
    if (defaultInstaller) {
      autoFill.installerId = defaultInstaller.id;
      autoFill.instaladorNombre = defaultInstaller.nombre;
      autoFill.instaladorNif = defaultInstaller.nif ?? undefined;
      autoFill.instaladorCertNum = defaultInstaller.certNum ?? undefined;
    } else if (fullUser) {
      if (fullUser.instaladorNombre) autoFill.instaladorNombre = fullUser.instaladorNombre;
      if (fullUser.instaladorNif) autoFill.instaladorNif = fullUser.instaladorNif;
      if (fullUser.instaladorCertNum) autoFill.instaladorCertNum = fullUser.instaladorCertNum;
    }

    // ── Wizard → legacy field mapping ──
    const wizardMapped: Record<string, any> = {};

    // expedienteType → tipoActuacion (exact CIE Excel dropdown values)
    if (dto.expedienteType && !dto.tipoActuacion) {
      const exp = dto.expedienteType;
      if (exp === 'NUEVA') wizardMapped.tipoActuacion = 'Nueva';
      else if (exp.startsWith('AMPLIACION')) wizardMapped.tipoActuacion = 'Ampliación con o sin modif.';
      else if (exp.startsWith('MODIFICACION')) wizardMapped.tipoActuacion = 'Modificación';
    }

    // installationType → supplyType (where applicable)
    if (dto.installationType && !dto.supplyType) {
      const t = dto.installationType;
      if (t === 'vivienda') {
        wizardMapped.supplyType = dto.gradoElectrificacion === 'ELEVADO'
          ? 'VIVIENDA_ELEVADA' : 'VIVIENDA_BASICA';
      } else if (t === 'irve') {
        wizardMapped.supplyType = 'IRVE';
      } else if (t === 'local' || t === 'industrial') {
        wizardMapped.supplyType = 'LOCAL_COMERCIAL';
      }
    }

    return this.prisma.installation.create({
      data: {
        ...autoFill,       // primero auto-relleno
        ...wizardMapped,   // mapeos wizard→legacy
        ...(dto as any),   // luego DTO (sobrescribe si el usuario envió algo)
        userId: user.id,
        tenantId: user.tenantId,
        status: InstallationStatus.DRAFT,
      },
      include: { circuits: true },
    });
  }

  /**
   * Lista todas las instalaciones del tenant del usuario.
   * Un ADMIN ve todas las del tenant. Un OPERATOR solo las suyas.
   */
  async findAll(user: SafeUser): Promise<Installation[]> {
    const where =
      user.role === 'ADMIN' || user.role === 'SIGNER'
        ? { tenantId: user.tenantId }
        : { tenantId: user.tenantId, userId: user.id };

    return this.prisma.installation.findMany({
      where,
      include: { circuits: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: string, user: SafeUser): Promise<Installation> {
    const installation = await this.prisma.installation.findUnique({
      where: { id },
      include: { circuits: true, calculations: { orderBy: { calculatedAt: 'desc' }, take: 1 } },
    });

    if (!installation) {
      throw new NotFoundException(`Instalación ${id} no encontrada`);
    }

    this.checkAccess(installation, user);
    return installation;
  }

  async update(id: string, dto: UpdateInstallationDto, user: SafeUser): Promise<Installation> {
    const installation = await this.findOne(id, user);
    this.checkAccess(installation, user);

    return this.prisma.installation.update({
      where: { id },
      data: dto,
      include: { circuits: true },
    });
  }

  async remove(id: string, user: SafeUser): Promise<void> {
    const installation = await this.findOne(id, user);
    this.checkAccess(installation, user);

    // Solo impedir borrar si está en estado terminal (COMPLETED)
    if (installation.status === InstallationStatus.COMPLETED) {
      throw new ForbiddenException(
        'No se pueden eliminar instalaciones completadas',
      );
    }

    // Borrar registros relacionados primero
    await this.prisma.unifilarLayout.deleteMany({ where: { installationId: id } });
    await this.prisma.photo.deleteMany({ where: { installationId: id } });
    await this.prisma.signingRequest.deleteMany({ where: { installationId: id } });
    await this.prisma.calculationResult.deleteMany({ where: { installationId: id } });
    await this.prisma.circuit.deleteMany({ where: { installationId: id } });
    await this.prisma.document.deleteMany({ where: { installationId: id } });
    const panels = await this.prisma.electricalPanel.findMany({ where: { installationId: id }, select: { id: true } });
    if (panels.length > 0) {
      await this.prisma.differential.deleteMany({ where: { panelId: { in: panels.map(p => p.id) } } });
    }
    await this.prisma.electricalPanel.deleteMany({ where: { installationId: id } });
    await this.prisma.installation.delete({ where: { id } });
  }

  private checkAccess(installation: Installation, user: SafeUser): void {
    if (installation.tenantId !== user.tenantId) {
      throw new ForbiddenException('Acceso denegado');
    }
    if (user.role === 'OPERATOR' && installation.userId !== user.id) {
      throw new ForbiddenException('Acceso denegado');
    }
  }
}
