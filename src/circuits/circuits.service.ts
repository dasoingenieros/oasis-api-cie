// src/circuits/circuits.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Circuit } from '@prisma/client';
import { CreateCircuitDto } from './dto/create-circuit.dto';
import { UpdateCircuitDto } from './dto/update-circuit.dto';
import { InstallationsService } from '../installations/installations.service';
import type { SafeUser } from '../users/users.service';

@Injectable()
export class CircuitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly installationsService: InstallationsService,
  ) {}

  async create(
    installationId: string,
    dto: CreateCircuitDto,
    user: SafeUser,
  ): Promise<Circuit> {
    // Verifica que la instalación existe y el usuario tiene acceso
    await this.installationsService.findOne(installationId, user);

    return this.prisma.circuit.create({
      data: {
        ...dto,
        maniobraType: dto.maniobraType ? dto.maniobraType.toUpperCase() as any : null,
        installationId,
        cosPhi: dto.cosPhi ?? 0.9,
        tempCorrFactor: dto.tempCorrFactor ?? 1.0,
        groupCorrFactor: dto.groupCorrFactor ?? 1.0,
      },
    });
  }

  async findAll(installationId: string, user: SafeUser): Promise<Circuit[]> {
    await this.installationsService.findOne(installationId, user);

    return this.prisma.circuit.findMany({
      where: { installationId },
      orderBy: { order: 'asc' },
    });
  }

  async findOne(id: string, user: SafeUser): Promise<Circuit> {
    const circuit = await this.prisma.circuit.findUnique({ where: { id } });
    if (!circuit) throw new NotFoundException(`Circuito ${id} no encontrado`);

    // Verifica acceso a la instalación padre
    await this.installationsService.findOne(circuit.installationId, user);
    return circuit;
  }

  async update(id: string, dto: UpdateCircuitDto, user: SafeUser): Promise<Circuit> {
    await this.findOne(id, user);

    return this.prisma.circuit.update({
      where: { id },
      data: {
        ...dto,
        maniobraType: dto.maniobraType !== undefined ? (dto.maniobraType ? dto.maniobraType.toUpperCase() as any : null) : undefined,
      } as any,
    });
  }

  async remove(id: string, user: SafeUser): Promise<void> {
    await this.findOne(id, user);
    await this.prisma.circuit.delete({ where: { id } });
  }

  /**
   * Reemplaza todos los circuitos de una instalación de golpe.
   * Útil para el formulario de cuadro eléctrico del frontend.
   */
  async replaceAll(
    installationId: string,
    dtos: CreateCircuitDto[],
    user: SafeUser,
  ): Promise<Circuit[]> {
    await this.installationsService.findOne(installationId, user);

    return this.prisma.$transaction(async (tx) => {
      // Borra los existentes
      await tx.circuit.deleteMany({ where: { installationId } });

      // Crea los nuevos
      await tx.circuit.createMany({
        data: dtos.map((dto) => ({
          ...dto,
          cableType: (dto.cableType || 'CU').toUpperCase() as any,
          insulationType: (dto.insulationType || 'PVC').toUpperCase() as any,
          installMethod: (dto.installMethod || 'A1').toUpperCase() as any,
          maniobraType: dto.maniobraType ? dto.maniobraType.toUpperCase() as any : null,
          maniobraExtra: dto.maniobraExtra ?? undefined,
          installationId,
          cosPhi: dto.cosPhi ?? 0.9,
          tempCorrFactor: dto.tempCorrFactor ?? 1.0,
          groupCorrFactor: dto.groupCorrFactor ?? 1.0,
        } as any)),
      });

      return tx.circuit.findMany({
        where: { installationId },
        orderBy: { order: 'asc' },
      });
    });
  }
}
