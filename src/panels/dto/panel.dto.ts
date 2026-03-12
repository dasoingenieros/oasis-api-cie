// src/panels/dto/panel.dto.ts
import {
  IsOptional,
  IsNumber,
  IsString,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateCircuitDto } from '../../circuits/dto/create-circuit.dto';

export class UpsertPanelDto {
  @IsOptional() @IsNumber() igaCalibreA?: number;
  @IsOptional() @IsString() igaCurve?: string;
  @IsOptional() @IsNumber() igaPowerCutKa?: number;
  @IsOptional() @IsNumber() igaPoles?: number;
  @IsOptional() @IsNumber() voltage?: number;
}

export class UpsertDifferentialDto {
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() order?: number;
  @IsOptional() @IsNumber() calibreA?: number;
  @IsOptional() @IsNumber() sensitivityMa?: number;
  @IsOptional() @IsString() type?: string;
  @IsOptional() @IsNumber() poles?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) circuitIds?: string[];
}

export class SavePanelWithDifferentialsDto {
  @ValidateNested()
  @Type(() => UpsertPanelDto)
  panel!: UpsertPanelDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertDifferentialDto)
  differentials!: UpsertDifferentialDto[];
}

export class SaveCuadroDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateCircuitDto)
  circuits!: CreateCircuitDto[];

  @ValidateNested()
  @Type(() => SavePanelWithDifferentialsDto)
  panel!: SavePanelWithDifferentialsDto;

  @IsOptional()
  @IsObject()
  installationUpdates?: Record<string, any>;
}
