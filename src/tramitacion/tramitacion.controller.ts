import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TramitacionService } from './tramitacion.service';
import { TramitarDto, UpdateTramitacionConfigDto, ResolveInputDto } from './dto';

@Controller('tramitacion')
@UseGuards(AuthGuard('jwt'))
export class TramitacionController {
  constructor(private readonly tramitacionService: TramitacionService) {}

  /** Iniciar tramitación (encola job) */
  @Post(':installationId/tramitar')
  async tramitar(
    @Param('installationId') installationId: string,
    @Body() dto: TramitarDto,
    @Req() req: any,
  ) {
    return this.tramitacionService.tramitar(
      installationId,
      req.user.tenantId,
      dto,
    );
  }

  /** Consultar estado de un expediente */
  @Get(':expedienteId/status')
  async getStatus(
    @Param('expedienteId') expedienteId: string,
    @Req() req: any,
  ) {
    return this.tramitacionService.getStatus(expedienteId, req.user.tenantId);
  }

  /** Listar expedientes de una instalación */
  @Get(':installationId/expedientes')
  async getExpedientes(
    @Param('installationId') installationId: string,
    @Req() req: any,
  ) {
    return this.tramitacionService.getExpedientes(
      installationId,
      req.user.tenantId,
    );
  }

  /** Resolver campo pendiente (NEEDS_INPUT) */
  @Post(':expedienteId/resolve')
  async resolve(
    @Param('expedienteId') expedienteId: string,
    @Body() dto: ResolveInputDto,
    @Req() req: any,
  ) {
    return this.tramitacionService.resolve(
      expedienteId,
      req.user.tenantId,
      dto,
    );
  }

  /** Obtener configuración de tramitación del tenant */
  @Get('config')
  async getConfig(@Req() req: any) {
    return this.tramitacionService.getConfig(req.user.tenantId);
  }

  /** Actualizar credenciales/EICI del portal */
  @Put('config')
  async updateConfig(
    @Body() dto: UpdateTramitacionConfigDto,
    @Req() req: any,
  ) {
    await this.tramitacionService.updateConfig(req.user.tenantId, dto);
    return { success: true };
  }

  /** Test de conexión al portal */
  @Post('config/test')
  async testConexion(@Req() req: any) {
    return this.tramitacionService.testConexion(req.user.tenantId);
  }
}
