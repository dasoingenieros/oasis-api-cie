// src/installations/dto/update-installation.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateInstallationDto } from './create-installation.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { InstallationStatus } from '@prisma/client';

export class UpdateInstallationDto extends PartialType(CreateInstallationDto) {
  @IsEnum(InstallationStatus)
  @IsOptional()
  status?: InstallationStatus;

  @IsString()
  @IsOptional()
  reviewNotes?: string;

  @IsString()
  @IsOptional()
  signerId?: string;
}
