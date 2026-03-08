// src/tenants/tenants.controller.ts
import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { TenantsService } from './tenants.service';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { UpdateInstallerDto } from './dto/update-installer.dto';

@Controller('tenant')
@UseGuards(JwtAuthGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  /** GET /tenant/profile — datos empresa del tenant */
  @Get('profile')
  getProfile(@Request() req: any) {
    return this.tenantsService.getProfile(req.user.tenantId);
  }

  /** PUT /tenant/profile — actualizar datos empresa */
  @Put('profile')
  updateProfile(@Request() req: any, @Body() dto: UpdateTenantProfileDto) {
    return this.tenantsService.updateProfile(req.user.tenantId, dto);
  }

  /** GET /tenant/installers — listar instaladores del tenant */
  @Get('installers')
  getInstallers(@Request() req: any) {
    return this.tenantsService.getInstallers(req.user.tenantId);
  }

  /** PUT /tenant/installers/:id — actualizar datos de un instalador */
  @Put('installers/:id')
  updateInstaller(
    @Request() req: any,
    @Param('id') userId: string,
    @Body() dto: UpdateInstallerDto,
  ) {
    return this.tenantsService.updateInstaller(req.user.tenantId, userId, dto);
  }
}
