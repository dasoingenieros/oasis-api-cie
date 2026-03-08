// src/panels/panels.controller.ts
import {
  Controller,
  Get,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { PanelsService } from './panels.service';
import type { SafeUser } from '../users/users.service';
import { SavePanelWithDifferentialsDto } from './dto/panel.dto';

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
}
