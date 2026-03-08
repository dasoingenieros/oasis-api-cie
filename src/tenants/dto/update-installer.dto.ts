// src/tenants/dto/update-installer.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class UpdateInstallerDto {
  @IsString() @IsOptional() name?: string;
  @IsString() @IsOptional() instaladorNombre?: string;
  @IsString() @IsOptional() instaladorNif?: string;
  @IsString() @IsOptional() instaladorCertNum?: string;
}
