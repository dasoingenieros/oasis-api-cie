// src/circuits/circuits.controller.ts
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
import { CircuitsService } from './circuits.service';
import { CreateCircuitDto } from './dto/create-circuit.dto';
import { UpdateCircuitDto } from './dto/update-circuit.dto';
import { JwtAuthGuard, CurrentUser } from '@dasoingenieros/auth';
import type { SafeUser } from '../users/users.service';
import type { Circuit } from '@prisma/client';

@Controller('installations/:installationId/circuits')
@UseGuards(JwtAuthGuard)
export class CircuitsController {
  constructor(private readonly circuitsService: CircuitsService) {}

  /**
   * POST /api/v1/installations/:installationId/circuits
   */
  @Post()
  create(
    @Param('installationId') installationId: string,
    @Body() dto: CreateCircuitDto,
    @CurrentUser() user: SafeUser,
  ): Promise<Circuit> {
    return this.circuitsService.create(installationId, dto, user);
  }

  /**
   * GET /api/v1/installations/:installationId/circuits
   */
  @Get()
  findAll(
    @Param('installationId') installationId: string,
    @CurrentUser() user: SafeUser,
  ): Promise<Circuit[]> {
    return this.circuitsService.findAll(installationId, user);
  }

  /**
   * GET /api/v1/installations/:installationId/circuits/:id
   */
  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<Circuit> {
    return this.circuitsService.findOne(id, user);
  }

  /**
   * PUT /api/v1/installations/:installationId/circuits/:id
   */
  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCircuitDto,
    @CurrentUser() user: SafeUser,
  ): Promise<Circuit> {
    return this.circuitsService.update(id, dto, user);
  }

  /**
   * DELETE /api/v1/installations/:installationId/circuits/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: SafeUser,
  ): Promise<void> {
    return this.circuitsService.remove(id, user);
  }

  /**
   * PUT /api/v1/installations/:installationId/circuits
   * Reemplaza TODOS los circuitos de golpe (uso desde el formulario de cuadro).
   */
  @Put()
  replaceAll(
    @Param('installationId') installationId: string,
    @Body() dtos: CreateCircuitDto[],
    @CurrentUser() user: SafeUser,
  ): Promise<Circuit[]> {
    return this.circuitsService.replaceAll(installationId, dtos, user);
  }
}
