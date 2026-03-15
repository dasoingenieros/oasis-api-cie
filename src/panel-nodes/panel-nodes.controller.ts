import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard, CurrentUser } from '@dasoingenieros/auth';
import { PanelNodesService } from './panel-nodes.service';
import { CreatePanelNodeDto } from './dto/create-panel-node.dto';
import { UpdatePanelNodeDto } from './dto/update-panel-node.dto';
import { MovePanelNodeDto } from './dto/move-panel-node.dto';
import type { SafeUser } from '../users/users.service';
import type { PanelNode } from '@prisma/client';
import type { TreeValidation } from './panel-nodes.service';

@Controller('installations/:installationId/panel-nodes')
@UseGuards(JwtAuthGuard)
export class PanelNodesController {
  constructor(private readonly panelNodesService: PanelNodesService) {}

  /**
   * GET /api/v1/installations/:installationId/panel-nodes
   * Devuelve array plano de todos los nodos. El frontend monta el arbol.
   */
  @Get()
  getTree(
    @Param('installationId') installationId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<PanelNode[]> {
    return this.panelNodesService.getTree(installationId, user.tenantId);
  }

  /**
   * POST /api/v1/installations/:installationId/panel-nodes
   * Crear un nodo nuevo.
   */
  @Post()
  createNode(
    @Param('installationId') installationId: string,
    @Body() dto: CreatePanelNodeDto,
    @CurrentUser() user: SafeUser,
  ): Promise<PanelNode> {
    return this.panelNodesService.createNode(
      installationId,
      user.tenantId,
      dto,
    );
  }

  /**
   * PATCH /api/v1/installations/:installationId/panel-nodes/:id
   * Actualizar campos de un nodo.
   */
  @Patch(':id')
  updateNode(
    @Param('id') id: string,
    @Body() dto: UpdatePanelNodeDto,
    @CurrentUser() user: SafeUser,
  ): Promise<PanelNode> {
    return this.panelNodesService.updateNode(id, user.tenantId, dto);
  }

  /**
   * PATCH /api/v1/installations/:installationId/panel-nodes/:id/move
   * Mover un nodo a otro padre/posicion.
   */
  @Patch(':id/move')
  moveNode(
    @Param('id') id: string,
    @Body() dto: MovePanelNodeDto,
    @CurrentUser() user: SafeUser,
  ): Promise<PanelNode> {
    return this.panelNodesService.moveNode(id, user.tenantId, dto);
  }

  /**
   * DELETE /api/v1/installations/:installationId/panel-nodes/:id
   * Eliminar nodo y descendientes.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteNode(
    @Param('id') id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<void> {
    return this.panelNodesService.deleteNode(id, user.tenantId);
  }

  /**
   * GET /api/v1/installations/:installationId/panel-nodes/validate
   * Devuelve errores, warnings e info del árbol.
   */
  @Get('validate')
  validateTree(
    @Param('installationId') installationId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<TreeValidation> {
    return this.panelNodesService.validateTree(installationId, user.tenantId);
  }

  /**
   * POST /api/v1/installations/:installationId/panel-nodes/calculate
   * Calcula todos los circuitos del árbol v2.
   * Devuelve nodos actualizados + validación.
   */
  @Post('calculate')
  calculateTree(
    @Param('installationId') installationId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<{ nodes: PanelNode[]; validation: TreeValidation }> {
    return this.panelNodesService.calculateTreeV2(
      installationId,
      user.tenantId,
    );
  }

  /**
   * POST /api/v1/installations/:installationId/panel-nodes/migrate-v1
   * Migra el cuadro v1 al v2. Idempotente.
   */
  @Post('migrate-v1')
  migrateV1(
    @Param('installationId') installationId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<PanelNode[]> {
    return this.panelNodesService.migrateV1toV2(installationId, user.tenantId);
  }

  /**
   * PUT /api/v1/installations/:installationId/panel-nodes
   * Reemplazar todo el arbol (bulk).
   */
  @Put()
  replaceTree(
    @Param('installationId') installationId: string,
    @Body() nodes: CreatePanelNodeDto[],
    @CurrentUser() user: SafeUser,
  ): Promise<PanelNode[]> {
    return this.panelNodesService.replaceTree(
      installationId,
      user.tenantId,
      nodes,
    );
  }
}
