import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateTechnicianDto {
  @IsString() nombre!: string;
  @IsString() @IsOptional() nif?: string;
  @IsString() @IsOptional() titulacion?: string;
  @IsString() @IsOptional() numColegiado?: string;
  @IsString() @IsOptional() colegioOficial?: string;
  @IsString() @IsOptional() telefono?: string;
  @IsString() @IsOptional() email?: string;
  @IsString() @IsOptional() direccion?: string;
  @IsString() @IsOptional() localidad?: string;
  @IsString() @IsOptional() provincia?: string;
  @IsString() @IsOptional() cp?: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
}
