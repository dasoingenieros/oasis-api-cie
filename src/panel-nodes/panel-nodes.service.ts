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
