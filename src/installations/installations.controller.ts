// src/installations/installations.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InstallationsService } from './installations.service';
import { CreateInstallationDto } from './dto/create-installation.dto';
import { UpdateInstallationDto } from './dto/update-installation.dto';
import { JwtAuthGuard, CurrentUser } from '@dasoingenieros/auth';
import type { SafeUser } from '../users/users.service';
import type { Installation } from '@prisma/client';

@Controller('installations')
@UseGuards(JwtAuthGuard)
export class InstallationsController {
  constructor(private readonly installationsService: InstallationsService) {}

  /**
   * POST /api/v1/installations
   * Crea una nueva instalación en estado DRAFT.
   */
  @Post()
  create(
    @Body() dto: CreateInstallationDto,
    @CurrentUser() user: SafeUser,
  ): Promise<Installation> {
    return this.installationsService.create(dto, user);
  }

  /**
   * GET /api/v1/installations
   * Lista instalaciones del tenant (OPERATOR: solo las suyas, ADMIN/SIGNER: todas).
   */
  @Get()
  findAll(@CurrentUser() user: SafeUser): Promise<Installation[]> {
    return this.installationsService.findAll(user);
  }

  /**
   * GET /api/v1/installations/:id
   */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<Installation> {
    return this.installationsService.findOne(id, user);
  }

  /**
   * PUT /api/v1/installations/:id
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateInstallationDto,
    @CurrentUser() user: SafeUser,
  ): Promise<Installation> {
    return this.installationsService.update(id, dto, user);
  }

  /**
   * DELETE /api/v1/installations/:id
   * Solo permitido en estado DRAFT.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<void> {
    return this.installationsService.remove(id, user);
  }
}
