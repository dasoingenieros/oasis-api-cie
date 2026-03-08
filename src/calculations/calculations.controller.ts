// src/calculations/calculations.controller.ts
import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '@dasoingenieros/auth';
import { CalculationsService } from './calculations.service';
import type { SafeUser } from '../users/users.service';

@Controller('installations/:installationId')
@UseGuards(JwtAuthGuard)
export class CalculationsController {
  constructor(private readonly calculationsService: CalculationsService) {}

  @Post('calculate')
  async calculate(
    @Param('installationId') installationId: string,
    @Request() req: { user: SafeUser },
  ) {
    return this.calculationsService.calculate(installationId, req.user);
  }

  @Post('calculate-supply')
  async calculateSupply(
    @Param('installationId') installationId: string,
    @Request() req: { user: SafeUser },
  ) {
    return this.calculationsService.calculateSupplyForInstallation(installationId, req.user);
  }

  @Get('calculations/latest')
  async getLatest(
    @Param('installationId') installationId: string,
    @Request() req: { user: SafeUser },
  ) {
    return this.calculationsService.getLatest(installationId, req.user);
  }
}
