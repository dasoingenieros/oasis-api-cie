import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PanelNodeType } from '@prisma/client';

export class CreatePanelNodeDto {
  @IsEnum(PanelNodeType)
  nodeType!: PanelNodeType;

  @IsOptional()
  @IsString()
  parentId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @IsOptional()
  @IsString()
  name?: string;

  // --- Proteccion ---
  @IsOptional()
  @IsInt()
  calibreA?: number;

  @IsOptional()
  @IsString()
  polos?: string;

  @IsOptional()
  @IsString()
  curva?: string;

  @IsOptional()
  @IsNumber()
  poderCorteKa?: number;

  // --- Diferencial ---
  @IsOptional()
  @IsInt()
  sensitivityMa?: number;

  @IsOptional()
  @IsString()
  diffType?: string;

  // --- Circuito ---
  @IsOptional()
  @IsString()
  loadType?: string;

  @IsOptional()
  @IsNumber()
  power?: number;

  @IsOptional()
  @IsInt()
  voltage?: number;

  @IsOptional()
  @IsString()
  phases?: string;

  @IsOptional()
  @IsNumber()
  cosPhi?: number;

  @IsOptional()
  @IsNumber()
  length?: number;

  @IsOptional()
  @IsNumber()
  section?: number;

  @IsOptional()
  @IsString()
  cableType?: string;

  @IsOptional()
  @Transform(({ value }) => value?.toUpperCase())
  @IsString()
  material?: string;

  @IsOptional()
  @IsString()
  installMethod?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  // --- Subcuadro ---
  @IsOptional()
  @IsString()
  subcuadroName?: string;

  // --- Contactor ---
  @IsOptional()
  @IsString()
  contactorType?: string;
}
