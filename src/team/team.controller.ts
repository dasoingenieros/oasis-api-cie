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
import { JwtAuthGuard, CurrentUser } from '@dasoingenieros/auth';
import { TeamService } from './team.service';
import { CreateInstallerDto } from './dto/create-installer.dto';
import { UpdateInstallerDto } from './dto/update-installer.dto';
import { CreateTechnicianDto } from './dto/create-technician.dto';
import { UpdateTechnicianDto } from './dto/update-technician.dto';
import type { SafeUser } from '../users/users.service';

@Controller('team')
@UseGuards(JwtAuthGuard)
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  // ─── Installers ──────────────────────────────────────────────────────

  @Get('installers')
  listInstallers(@CurrentUser() user: SafeUser) {
    return this.teamService.listInstallers(user);
  }

  @Post('installers')
  createInstaller(@Body() dto: CreateInstallerDto, @CurrentUser() user: SafeUser) {
    return this.teamService.createInstaller(dto, user);
  }

  @Put('installers/:id')
  updateInstaller(
    @Param('id') id: string,
    @Body() dto: UpdateInstallerDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.teamService.updateInstaller(id, dto, user);
  }

  @Delete('installers/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteInstaller(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.teamService.deleteInstaller(id, user);
  }

  // ─── Technicians ─────────────────────────────────────────────────────

  @Get('technicians')
  listTechnicians(@CurrentUser() user: SafeUser) {
    return this.teamService.listTechnicians(user);
  }

  @Post('technicians')
  createTechnician(@Body() dto: CreateTechnicianDto, @CurrentUser() user: SafeUser) {
    return this.teamService.createTechnician(dto, user);
  }

  @Put('technicians/:id')
  updateTechnician(
    @Param('id') id: string,
    @Body() dto: UpdateTechnicianDto,
    @CurrentUser() user: SafeUser,
  ) {
    return this.teamService.updateTechnician(id, dto, user);
  }

  @Delete('technicians/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteTechnician(@Param('id') id: string, @CurrentUser() user: SafeUser) {
    return this.teamService.deleteTechnician(id, user);
  }
}
