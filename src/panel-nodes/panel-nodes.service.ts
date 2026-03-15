import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePanelNodeDto } from './dto/create-panel-node.dto';
import { UpdatePanelNodeDto } from './dto/update-panel-node.dto';
import { MovePanelNodeDto } from './dto/move-panel-node.dto';
import type { PanelNode, PanelNodeType } from '@prisma/client';
import {
  calculateInstallation,
  calculateDIVoltageDrop,
  getProtectionConductorSection,
  ENGINE_VERSION,
  NORM_VERSION,
} from '@daso/electrical-engine';
import type { CircuitInput, CircuitCode, DIInput } from '@daso/electrical-engine';

@Injectable()
export class PanelNodesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Obtener el arbol completo de una instalacion.
   * Devuelve todos los nodos ordenados por position.
   * El frontend construye el arbol a partir de parentId.
   */
  async getTree(
    installationId: string,
    tenantId: string,
  ): Promise<PanelNode[]> {
    return this.prisma.panelNode.findMany({
      where: { installationId, tenantId },
      orderBy: { position: 'asc' },
    });
  }

  /**
   * Crear un nodo.
   * - Si no se envia position, ponerlo al final de sus hermanos.
   * - Validar reglas de negocio.
   */
  async createNode(
    installationId: string,
    tenantId: string,
    dto: CreatePanelNodeDto,
  ): Promise<PanelNode> {
    // Si no hay position, calcular la siguiente entre hermanos
    let position = dto.position;
    if (position === undefined) {
      const maxPos = await this.prisma.panelNode.aggregate({
        where: {
          installationId,
          tenantId,
          parentId: dto.parentId ?? null,
        },
        _max: { position: true },
      });
      position = (maxPos._max.position ?? -1) + 1;
    }

    // Validar reglas de negocio
    await this.validateNode(
      installationId,
      tenantId,
      dto.nodeType,
      dto.parentId ?? null,
    );

    const { position: _pos, ...rest } = dto;

    return this.prisma.panelNode.create({
      data: {
        ...rest,
        installationId,
        tenantId,
        parentId: dto.parentId ?? null,
        position,
      },
    });
  }

  /**
   * Actualizar campos de un nodo (NO mover — eso es moveNode).
   */
  async updateNode(
    id: string,
    tenantId: string,
    dto: UpdatePanelNodeDto,
  ): Promise<PanelNode> {
    const node = await this.prisma.panelNode.findFirst({
      where: { id, tenantId },
    });
    if (!node) throw new NotFoundException('Nodo no encontrado');

    // No permitir cambiar nodeType
    const { nodeType, ...updateData } = dto as any;

    return this.prisma.panelNode.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Mover un nodo a otro padre y/o posicion.
   * Reordenar hermanos en origen y destino.
   */
  async moveNode(
    id: string,
    tenantId: string,
    dto: MovePanelNodeDto,
  ): Promise<PanelNode> {
    const node = await this.prisma.panelNode.findFirst({
      where: { id, tenantId },
    });
    if (!node) throw new NotFoundException('Nodo no encontrado');

    // Prevenir mover un nodo dentro de si mismo o de sus descendientes
    if (dto.newParentId) {
      const isDescendant = await this.isDescendantOf(
        dto.newParentId,
        id,
        tenantId,
      );
      if (isDescendant || dto.newParentId === id) {
        throw new BadRequestException(
          'No se puede mover un nodo dentro de si mismo o de sus descendientes',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const oldParentId = node.parentId;
      const newParentId =
        dto.newParentId === undefined ? oldParentId : dto.newParentId;

      // 1. Cerrar hueco en el padre origen
      await tx.panelNode.updateMany({
        where: {
          installationId: node.installationId,
          tenantId,
          parentId: oldParentId,
          position: { gt: node.position },
        },
        data: { position: { decrement: 1 } },
      });

      // 2. Abrir hueco en el padre destino
      await tx.panelNode.updateMany({
        where: {
          installationId: node.installationId,
          tenantId,
          parentId: newParentId,
          position: { gte: dto.newPosition },
          id: { not: id },
        },
        data: { position: { increment: 1 } },
      });

      // 3. Mover el nodo
      return tx.panelNode.update({
        where: { id },
        data: {
          parentId: newParentId,
          position: dto.newPosition,
        },
      });
    });
  }

  /**
   * Eliminar un nodo y todos sus descendientes (cascade en BD).
   * Reordenar hermanos restantes.
   */
  async deleteNode(id: string, tenantId: string): Promise<void> {
    const node = await this.prisma.panelNode.findFirst({
      where: { id, tenantId },
    });
    if (!node) throw new NotFoundException('Nodo no encontrado');

    await this.prisma.$transaction(async (tx) => {
      // Eliminar (cascade borra hijos automaticamente)
      await tx.panelNode.delete({ where: { id } });

      // Reordenar hermanos: cerrar hueco
      await tx.panelNode.updateMany({
        where: {
          installationId: node.installationId,
          tenantId,
          parentId: node.parentId,
          position: { gt: node.position },
        },
        data: { position: { decrement: 1 } },
      });
    });
  }

  /**
   * Reemplazar todo el arbol de una instalacion (bulk).
   * Los nodos deben venir en orden topologico (padres antes que hijos).
   * parentId puede ser un tempId que se resuelve al ID real generado.
   */
  async replaceTree(
    installationId: string,
    tenantId: string,
    nodes: CreatePanelNodeDto[],
  ): Promise<PanelNode[]> {
    return this.prisma.$transaction(async (tx) => {
      // Borrar todo el arbol actual
      await tx.panelNode.deleteMany({
        where: { installationId, tenantId },
      });

      // Crear todos los nodos nuevos en orden topologico
      const created: PanelNode[] = [];
      const tempIdMap = new Map<string, string>();

      for (const nodeDto of nodes) {
        let resolvedParentId = nodeDto.parentId ?? null;
        if (resolvedParentId && tempIdMap.has(resolvedParentId)) {
          resolvedParentId = tempIdMap.get(resolvedParentId)!;
        }

        const sameParentCount = created.filter(
          (n) => n.parentId === resolvedParentId,
        ).length;

        const { position: _pos, parentId: originalParentId, ...rest } = nodeDto;

        const node = await tx.panelNode.create({
          data: {
            ...rest,
            installationId,
            tenantId,
            parentId: resolvedParentId,
            position: nodeDto.position ?? sameParentCount,
          },
        });
        created.push(node);

        // Si el frontend envio un parentId que no era un ID real (tempId),
        // mapeamos para que los hijos lo encuentren
        if (originalParentId && originalParentId !== resolvedParentId) {
          tempIdMap.set(originalParentId, node.id);
        }
      }

      return created;
    });
  }

  /**
   * Migra el cuadro v1 (ElectricalPanel + Differentials + Circuits)
   * al cuadro v2 (árbol PanelNode).
   *
   * NO borra datos v1. Si ya existen PanelNodes para esta instalación,
   * los borra y recrea (idempotente).
   *
   * Estructura generada:
   *   IGA (raíz, datos de ElectricalPanel)
   *     └── DIFERENCIAL (por cada Differential)
   *           └── CIRCUITO (por cada Circuit del diferencial)
   */
  async migrateV1toV2(
    installationId: string,
    tenantId: string,
  ): Promise<PanelNode[]> {
    // 1. Leer datos v1
    const panel = await this.prisma.electricalPanel.findUnique({
      where: { installationId },
      include: {
        differentials: {
          include: { circuits: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!panel) {
      throw new NotFoundException(
        'No existe un cuadro eléctrico v1 para esta instalación',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 2. Borrar PanelNodes existentes (idempotente)
      await tx.panelNode.deleteMany({
        where: { installationId, tenantId },
      });

      const created: PanelNode[] = [];

      // 3. Crear IGA (raíz)
      const iga = await tx.panelNode.create({
        data: {
          installationId,
          tenantId,
          parentId: null,
          position: 0,
          nodeType: 'IGA',
          name: 'IGA',
          calibreA: panel.igaCalibreA,
          polos: `${panel.igaPoles}P`,
          curva: panel.igaCurve,
          poderCorteKa: panel.igaPowerCutKa,
        },
      });
      created.push(iga);

      // 4. Por cada Differential, crear DIFERENCIAL
      let diffIdx = 0;
      for (const diff of panel.differentials) {
        const difNode = await tx.panelNode.create({
          data: {
            installationId,
            tenantId,
            parentId: iga.id,
            position: diffIdx,
            nodeType: 'DIFERENCIAL',
            name: diff.name || `Diferencial ${diffIdx + 1}`,
            calibreA: diff.calibreA,
            polos: `${diff.poles}P`,
            sensitivityMa: diff.sensitivityMa,
            diffType: diff.type,
          },
        });
        created.push(difNode);

        // 5. Por cada Circuit del diferencial, crear CIRCUITO
        const circuits = [...diff.circuits].sort((a, b) => a.order - b.order);
        let circIdx = 0;
        for (const c of circuits) {
          const circNode = await tx.panelNode.create({
            data: {
              installationId,
              tenantId,
              parentId: difNode.id,
              position: circIdx,
              nodeType: 'CIRCUITO',
              name: c.name,
              loadType: c.loadType,
              power: c.power,
              voltage: c.voltage,
              phases: c.phases === 1 ? '1F' : '3F',
              cosPhi: c.cosPhi,
              length: c.length,
              section: c.calculatedSection,
              cableType: c.insulationType,
              material: c.cableType, // enum CU/AL → string "CU"/"AL"
              installMethod: c.installMethod, // enum → string
              curva: c.breakerCurve,
              poderCorteKa: c.breakerCutKa,
            },
          });
          created.push(circNode);
          circIdx++;
        }
        diffIdx++;
      }

      // 6. Circuitos sin diferencial asignado → hijos directos del IGA
      const orphanCircuits = await tx.circuit.findMany({
        where: { installationId, differentialId: null },
        orderBy: { order: 'asc' },
      });

      let orphanIdx = panel.differentials.length;
      for (const c of orphanCircuits) {
        const circNode = await tx.panelNode.create({
          data: {
            installationId,
            tenantId,
            parentId: iga.id,
            position: orphanIdx,
            nodeType: 'CIRCUITO',
            name: c.name,
            loadType: c.loadType,
            power: c.power,
            voltage: c.voltage,
            phases: c.phases === 1 ? '1F' : '3F',
            cosPhi: c.cosPhi,
            length: c.length,
            section: c.calculatedSection,
            cableType: c.insulationType,
            material: c.cableType,
            installMethod: c.installMethod,
            curva: c.breakerCurve,
            poderCorteKa: c.breakerCutKa,
          },
        });
        created.push(circNode);
        orphanIdx++;
      }

      return created;
    });
  }

  /**
   * Calcula todos los circuitos del árbol PanelNode v2.
   * 1. Lee el árbol + datos de Installation
   * 2. Mapea nodos CIRCUITO → CircuitInput del motor
   * 3. Ejecuta calculateInstallation
   * 4. Guarda resultados en calcResults de cada nodo
   * 5. Calcula CdT DI y guarda en calcResults del IGA
   * 6. Devuelve el árbol actualizado
   */
  async calculateTreeV2(
    installationId: string,
    tenantId: string,
  ): Promise<PanelNode[]> {
    // 1. Leer árbol completo
    const nodes = await this.prisma.panelNode.findMany({
      where: { installationId, tenantId },
      orderBy: { position: 'asc' },
    });

    if (nodes.length === 0) {
      throw new NotFoundException('No hay nodos en el cuadro v2 para calcular');
    }

    const circuitNodes = nodes.filter((n) => n.nodeType === 'CIRCUITO');
    if (circuitNodes.length === 0) {
      throw new BadRequestException('No hay circuitos definidos para calcular');
    }

    // 2. Leer Installation para tensión y tipo
    const installation = await this.prisma.installation.findFirst({
      where: { id: installationId, tenantId },
    });
    if (!installation) {
      throw new NotFoundException('Instalación no encontrada');
    }

    const inst = installation as any;
    const defaultVoltage = inst.supplyVoltage ?? 230;
    const isVivienda = ['VIVIENDA_BASICA', 'VIVIENDA_ELEVADA'].includes(
      inst.supplyType ?? '',
    );

    // 3. Mapear circuitos → CircuitInput
    const inputs: CircuitInput[] = circuitNodes.map((node) =>
      this.mapPanelNodeToEngineInput(node, defaultVoltage, isVivienda),
    );

    // 4. Ejecutar motor
    const result = await calculateInstallation(inputs);

    // 5. Guardar calcResults en cada nodo CIRCUITO
    const resultMap = new Map(result.circuits.map((r) => [r.id, r]));

    await this.prisma.$transaction(
      circuitNodes.map((node) => {
        const circResult = resultMap.get(node.id);
        return this.prisma.panelNode.update({
          where: { id: node.id },
          data: {
            calcResults: circResult
              ? JSON.parse(JSON.stringify(circResult))
              : { error: 'Sin resultado del motor' },
          },
        });
      }),
    );

    // 6. Calcular supply (CdT DI + PE) y guardar en IGA
    const igaNode = nodes.find(
      (n) => n.nodeType === 'IGA' && n.parentId === null,
    );

    if (igaNode) {
      const voltage = defaultVoltage;
      const phaseSystem: 'single' | 'three' =
        voltage === 400 || voltage === 380 ? 'three' : 'single';
      const userIgaA = igaNode.calibreA ?? inst.igaNominal ?? 25;
      const igaDerivedPowerW =
        phaseSystem === 'three'
          ? Math.sqrt(3) * voltage * userIgaA
          : voltage * userIgaA;
      const designPowerW = (inst.potMaxAdmisible ?? igaDerivedPowerW / 1000) * 1000;
      const diSectionMm2 = inst.seccionDi ?? 6;
      const diLengthM = inst.longitudDi ?? 10;
      const materialDi: 'Cu' | 'Al' = inst.materialDi === 'AL' ? 'Al' : 'Cu';

      const diInput: DIInput = {
        contractedPowerW: designPowerW,
        phaseSystem,
        powerFactor: 0.9,
        conductorMaterial: materialDi,
        sectionMm2: diSectionMm2,
        lengthM: diLengthM,
        voltageV: voltage,
      };
      const cdtResult = calculateDIVoltageDrop(diInput);
      const peMm2 = getProtectionConductorSection(diSectionMm2);

      // Potencia total instalada (suma de circuitos)
      const totalInstalledW = circuitNodes.reduce(
        (sum, n) => sum + (n.power ?? 0),
        0,
      );

      await this.prisma.panelNode.update({
        where: { id: igaNode.id },
        data: {
          calcResults: {
            engineVersion: ENGINE_VERSION,
            normVersion: NORM_VERSION,
            designPowerW,
            totalInstalledW,
            igaRatingA: userIgaA,
            di: {
              sectionMm2: diSectionMm2,
              materialDi: materialDi,
              lengthM: diLengthM,
              voltageDropPct: cdtResult.voltageDropPct,
              voltageDropV: cdtResult.voltageDropV,
              cdtLimitPct: cdtResult.cdtLimitPct,
              cdtCompliant: cdtResult.cdtCompliant,
              nominalCurrentA: cdtResult.nominalCurrentA,
            },
            protectionConductorMm2: peMm2,
            allCircuitsValid: result.isValid,
            summary: {
              totalPowerW: result.summary.totalPowerW,
              maxSectionMm2: result.summary.maxSectionMm2,
              maxVoltageDropPct: result.summary.maxVoltageDropPct,
            },
          },
        },
      });
    }

    // 7. Devolver árbol actualizado
    return this.prisma.panelNode.findMany({
      where: { installationId, tenantId },
      orderBy: { position: 'asc' },
    });
  }

  /** Mapear designación de cable → tipo aislamiento para el motor */
  private mapInsulationType(designation: string): 'PVC' | 'XLPE' | 'EPR' {
    switch (designation) {
      case 'H07V-K': case 'H07V-U': case 'H07Z1-K': case 'PVC': return 'PVC';
      case 'RV-K': case 'RZ1-K': case 'XLPE': return 'XLPE';
      case 'EPR': return 'EPR';
      default: return 'PVC';
    }
  }

  /** Mapear PanelNode CIRCUITO → CircuitInput del motor */
  private mapPanelNodeToEngineInput(
    node: PanelNode,
    defaultVoltage: number,
    isVivienda: boolean,
  ): CircuitInput {
    const conductorMaterial = node.material === 'AL' ? 'Al' : 'Cu';
    const phaseSystem = node.phases === '3F' ? 'three' : 'single';
    const code: CircuitCode = 'CUSTOM';

    return {
      id: node.id,
      label: node.name ?? 'Sin nombre',
      code,
      phaseSystem,
      loadPowerW: node.power ?? 0,
      powerFactor: node.cosPhi ?? 1,
      simultaneityFactor: 1,
      loadFactor: 1,
      conductorMaterial,
      insulationType: this.mapInsulationType(node.cableType ?? 'H07V-K'),
      installationMethod: (node.installMethod ?? 'B1') as any,
      lengthM: node.length ?? 1,
      ambientTempC: 30,
      groupingCircuits: 1,
      voltageV: node.voltage ?? defaultVoltage,
      upstreamCdtPct: 0,
      loadType: node.loadType ?? undefined,
    };
  }

  // --- Helpers privados ---

  private async isDescendantOf(
    targetId: string,
    ancestorId: string,
    tenantId: string,
  ): Promise<boolean> {
    let currentId: string | null = targetId;
    const visited = new Set<string>();

    while (currentId) {
      if (currentId === ancestorId) return true;
      if (visited.has(currentId)) return false;
      visited.add(currentId);

      const found: { parentId: string | null } | null =
        await this.prisma.panelNode.findFirst({
          where: { id: currentId, tenantId },
          select: { parentId: true },
        });
      currentId = found?.parentId ?? null;
    }

    return false;
  }

  private async validateNode(
    installationId: string,
    tenantId: string,
    nodeType: PanelNodeType,
    parentId: string | null,
  ): Promise<void> {
    // Solo puede haber 1 IGA raiz por instalacion
    if (nodeType === 'IGA' && parentId === null) {
      const existingIga = await this.prisma.panelNode.findFirst({
        where: { installationId, tenantId, nodeType: 'IGA', parentId: null },
      });
      if (existingIga) {
        throw new BadRequestException(
          'Ya existe un IGA raiz en esta instalacion',
        );
      }
    }

    // CIRCUITO no puede tener hijos
    if (parentId) {
      const parent = await this.prisma.panelNode.findFirst({
        where: { id: parentId, tenantId },
      });
      if (parent?.nodeType === 'CIRCUITO') {
        throw new BadRequestException(
          'Un circuito no puede tener nodos hijos',
        );
      }
    }

    // El nodo raiz solo puede ser IGA o SUBCUADRO
    if (parentId === null && nodeType !== 'IGA' && nodeType !== 'SUBCUADRO') {
      throw new BadRequestException(
        'Solo IGA o SUBCUADRO pueden ser nodos raiz',
      );
    }
  }
}
