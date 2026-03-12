// src/circuits/dto/create-circuit.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { CableType, InstallMethod } from '@prisma/client';

export class CreateCircuitDto {
  @IsString()
  name!: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsInt()
  @Min(0)
  order!: number;

  @IsNumber()
  @Min(0)
  power!: number;

  @IsInt()
  voltage!: number;

  @IsInt()
  @Min(1)
  @Max(3)
  phases!: number;

  @IsNumber()
  @Min(0.1)
  length!: number;

  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(CableType)
  cableType!: CableType;

  @IsString()
  insulationType!: string;

  @Transform(({ value }) => typeof value === 'string' ? value.toUpperCase() : value)
  @IsEnum(InstallMethod)
  installMethod!: InstallMethod;

  @IsNumber()
  @Min(0.1)
  @Max(1)
  @IsOptional()
  cosPhi?: number;

  @IsNumber()
  @Min(0.1)
  @Max(1)
  @IsOptional()
  tempCorrFactor?: number;

  @IsNumber()
  @Min(0.1)
  @Max(1)
  @IsOptional()
  groupCorrFactor?: number;

  @IsString()
  @IsOptional()
  loadType?: string;

  @IsString()
  @IsOptional()
  maniobraType?: string;

  @IsInt()
  @IsOptional()
  maniobraCalibreA?: number;

  @IsOptional()
  maniobraExtra?: any;
}