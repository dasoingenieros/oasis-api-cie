// src/panels/panels.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstallationsService } from '../installations/installations.service';
import type { SafeUser } from '../users/users.service';
import type { SavePanelWithDifferentialsDto } from './dto/panel.dto';

/** Calibres IGA normalizados */
const IGA_RATINGS = [10, 15, 16, 20, 25, 32, 40, 50, 63];

/** Tabla IGA → Potencia máx. admisible */
function calcMaxPowerW(calibreA: number, voltage: number, poles: number): number {
  if (poles === 4 || voltage === 400) {
    // Trifásico: P = √3 × 400 × I
    return Math.round(Math.sqrt(3) * 400 * calibreA);
  }
  // Monofásico: P = 230 × I
  return 230 * calibreA;
}

/** Valida si un diferencial está protegido */
function validateDifferentialProtection(
  diffCalibreA: number,
  igaCalibreA: number,
  sumPiasA: number,
): { isProtected: boolean; note: string } {
  // Condición A: IGA protege al diferencial
  if (igaCalibreA <= diffCalibreA) {
    return { isProtected: true, note: 'Protegido por IGA' };
  }
  // Condición B: Suma de PIAs aguas abajo protege
  if (sumPiasA <= diffCalibreA) {
    return { isProtected: true, note: 'Protegido por suma de PIAs' };
  }
  // No protegido
  return {
    isProtected: false,
    note: `No protegido: IGA ${igaCalibreA}A > Dif. ${diffCalibreA}A y ΣPIAs ${sumPiasA}A > Dif. ${diffCalibreA}A`,
  };
}

@Injectable()
export class PanelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly installationsService: InstallationsService,
  ) {}

  /**
   * Obtener el panel de una instalación (con diferenciales y circuitos)
   */
  async getPanel(installationId: string, user: SafeUser) {
    await this.installationsService.findOne(installationId, user);

    const panel = await this.prisma.electricalPanel.findUnique({
      where: { installationId },
      include: {
        differentials: {
          orderBy: { order: 'asc' },
          include: {
            circuits: {
              orderBy: { order: 'asc' },
              select: { id: true, name: true, code: true, order: true, power: true, assignedBreaker: true },
            },
          },
        },
      },
    });

    if (!panel) {
      return null;
    }

    // Enriquecer con potencia máxima
    const maxPowerW = calcMaxPowerW(panel.igaCalibreA, panel.voltage, panel.igaPoles);

    return {
      ...panel,
      maxPowerW,
      maxPowerKw: Math.round(maxPowerW / 10) / 100,
    };
  }

  /**
   * Crear o actualizar panel + diferenciales en una sola operación
   */
  async savePanel(
    installationId: string,
    dto: SavePanelWithDifferentialsDto,
    user: SafeUser,
  ) {
    await this.installationsService.findOne(installationId, user);

    const { panel: panelDto, differentials: diffsDto } = dto;
    const voltage = panelDto.voltage ?? 230;
    const igaCalibreA = panelDto.igaCalibreA ?? 25;
    const igaPoles = panelDto.igaPoles ?? (voltage === 400 ? 4 : 2);
    const maxPowerW = calcMaxPowerW(igaCalibreA, voltage, igaPoles);

    // Upsert panel
    const panel = await this.prisma.electricalPanel.upsert({
      where: { installationId },
      create: {
        installationId,
        igaCalibreA,
        igaCurve: panelDto.igaCurve ?? 'C',
        igaPowerCutKa: panelDto.igaPowerCutKa ?? 6,
        igaPoles,
        voltage,
        maxPowerW,
      },
      update: {
        igaCalibreA,
        igaCurve: panelDto.igaCurve ?? 'C',
        igaPowerCutKa: panelDto.igaPowerCutKa ?? 6,
        igaPoles,
        voltage,
        maxPowerW,
      },
    });

    // Eliminar diferenciales que ya no están en el DTO
    const dtoIds = diffsDto.filter((d) => d.id).map((d) => d.id!);
    await this.prisma.differential.deleteMany({
      where: {
        panelId: panel.id,
        id: { notIn: dtoIds },
      },
    });

    // Crear/actualizar diferenciales
    for (const diffDto of diffsDto) {
      let diff;
      if (diffDto.id) {
        // Actualizar existente
        diff = await this.prisma.differential.update({
          where: { id: diffDto.id },
          data: {
            name: diffDto.name,
            order: diffDto.order,
            calibreA: diffDto.calibreA,
            sensitivityMa: diffDto.sensitivityMa,
            type: diffDto.type,
            poles: diffDto.poles ?? igaPoles,
          },
        });
      } else {
        // Crear nuevo
        diff = await this.prisma.differential.create({
          data: {
            panelId: panel.id,
            name: diffDto.name ?? `Diferencial ${diffDto.order ?? 1}`,
            order: diffDto.order ?? 1,
            calibreA: diffDto.calibreA ?? 40,
            sensitivityMa: diffDto.sensitivityMa ?? 30,
            type: diffDto.type ?? 'AC',
            poles: diffDto.poles ?? igaPoles,
          },
        });
      }

      // Asignar circuitos al diferencial
      if (diffDto.circuitIds) {
        // Desasignar circuitos anteriores de este diferencial
        await this.prisma.circuit.updateMany({
          where: { differentialId: diff.id },
          data: { differentialId: null },
        });
        // Asignar los nuevos
        if (diffDto.circuitIds.length > 0) {
          await this.prisma.circuit.updateMany({
            where: { id: { in: diffDto.circuitIds } },
            data: { differentialId: diff.id },
          });
        }
      }
    }

    // Validar protección de cada diferencial
    await this.validateProtections(panel.id, igaCalibreA);

    // Devolver panel completo
    return this.getPanel(installationId, user);
  }

  /**
   * Validar protección de todos los diferenciales del panel
   */
  private async validateProtections(panelId: string, igaCalibreA: number) {
    const diffs = await this.prisma.differential.findMany({
      where: { panelId },
      include: {
        circuits: {
          select: { assignedBreaker: true },
        },
      },
    });

    for (const diff of diffs) {
      // Extraer PIAs de los circuitos asignados
      const sumPias = diff.circuits.reduce((sum, c) => {
        if (!c.assignedBreaker) return sum;
        const match = c.assignedBreaker.match(/(\d+)A/);
        return sum + (match && match[1] ? parseInt(match[1]) : 0);
      }, 0);

      const { isProtected, note } = validateDifferentialProtection(
        diff.calibreA,
        igaCalibreA,
        sumPias,
      );

      await this.prisma.differential.update({
        where: { id: diff.id },
        data: { isProtected, protectionNote: note },
      });
    }
  }

  /**
   * Auto-crear panel con plantilla según tipo de suministro
   */
  async createFromTemplate(
    installationId: string,
    user: SafeUser,
  ) {
    const installation = await this.installationsService.findOne(installationId, user);
    const circuits = await this.prisma.circuit.findMany({
      where: { installationId },
      orderBy: { order: 'asc' },
    });

    if (circuits.length === 0) {
      throw new NotFoundException('No hay circuitos. Crea circuitos primero.');
    }

    // Determinar IGA según tipo de suministro
    const voltage = installation.supplyVoltage ?? 230;
    const igaPoles = voltage === 400 ? 4 : 2;
    let igaCalibreA: number;

    switch (installation.supplyType) {
      case 'VIVIENDA_ELEVADA':
        igaCalibreA = 40;  // 9.2 kW estándar
        break;
      case 'VIVIENDA_BASICA':
        igaCalibreA = 25;  // 5.75 kW estándar
        break;
      default:
        igaCalibreA = 25;
        break;
    }

    // Plantilla de diferenciales según tipo
    // ITC-BT-25: máximo 5 circuitos por diferencial

    switch (installation.supplyType) {
      case 'VIVIENDA_ELEVADA': {
        // Agrupar circuitos en bloques de max 5
        const chunks: typeof circuits[] = [];
        for (let i = 0; i < circuits.length; i += 5) {
          chunks.push(circuits.slice(i, i + 5));
        }
        const differentials = chunks.map((chunk, i) => ({
          name: `Diferencial ${i + 1}`,
          order: i + 1,
          calibreA: 40,
          sensitivityMa: 30,
          type: 'AC',
          poles: igaPoles,
          circuitIds: chunk.map((c) => c.id),
        }));

        return this.savePanel(installationId, {
          panel: {
            igaCalibreA,
            igaCurve: 'C',
            igaPowerCutKa: 6,
            igaPoles,
            voltage,
          },
          differentials,
        }, user);
      }
      case 'VIVIENDA_BASICA':
      default: {
        // 1 diferencial con todos (max 5 circuitos)
        const differentials = [{
          name: 'Diferencial 1',
          order: 1,
          calibreA: 40,
          sensitivityMa: 30,
          type: 'AC',
          poles: igaPoles,
          circuitIds: circuits.map((c) => c.id),
        }];

        return this.savePanel(installationId, {
          panel: {
            igaCalibreA,
            igaCurve: 'C',
            igaPowerCutKa: 6,
            igaPoles,
            voltage,
          },
          differentials,
        }, user);
      }
    }
  }
}
