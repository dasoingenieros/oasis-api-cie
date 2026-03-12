// src/panels/panels.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { PanelsService } from './panels.service';
import type { SafeUser } from '../users/users.service';
import { SavePanelWithDifferentialsDto, SaveCuadroDto } from './dto/panel.dto';

@Controller('installations/:installationId/panel')
@UseGuards(JwtAuthGuard)
export class PanelsController {
  constructor(private readonly panelsService: PanelsService) {}

  /**
   * GET /api/v1/installations/:id/panel
   * Obtener panel con diferenciales y circuitos
   */
  @Get()
  async getPanel(
    @Param('installationId') installationId: string,
    @Request() req: { user: SafeUser },
  ) {
    return this.panelsService.getPanel(installationId, req.user);
  }

  /**
   * PUT /api/v1/installations/:id/panel
   * Crear o actualizar panel + diferenciales
   */
  @Put()
  async savePanel(
    @Param('installationId') installationId: string,
    @Body() dto: SavePanelWithDifferentialsDto,
    @Request() req: { user: SafeUser },
  ) {
    return this.panelsService.savePanel(installationId, dto, req.user);
  }

  /**
   * PUT /api/v1/installations/:id/panel/save-all
   * Transactional: replace circuits + update installation + save panel/differentials
   */
  @Put('save-all')
  async saveCuadro(
    @Param('installationId') installationId: string,
    @Body() dto: SaveCuadroDto,
    @Request() req: { user: SafeUser },
  ) {
    return this.panelsService.saveCuadro(installationId, dto, req.user);
  }

  /**
   * POST /api/v1/installations/:id/panel/template
   * Auto-crear panel desde plantilla (según tipo suministro + circuitos existentes)
   */
  @Post('template')
  async createFromTemplate(
    @Param('installationId') installationId: string,
    @Request() req: { user: SafeUser },
  ) {
    return this.panelsService.createFromTemplate(installationId, req.user);
  }

  /**
   * DELETE /api/v1/installations/:id/panel/reset
   * Reiniciar cuadro eléctrico: borra circuitos, diferenciales y panel.
   * NO borra datos de la instalación (pestaña Datos).
   */
  @Delete('reset')
  async resetPanel(
    @Param('installationId') installationId: string,
    @Request() req: { user: SafeUser },
  ) {
    return this.panelsService.resetPanel(installationId, req.user);
  }
}
