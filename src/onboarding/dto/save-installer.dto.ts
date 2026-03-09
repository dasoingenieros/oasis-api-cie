import { IsString, IsOptional } from 'class-validator';

export class SaveInstallerDto {
  @IsString() @IsOptional() instaladorNombre?: string;
  @IsString() @IsOptional() instaladorNif?: string;
  @IsString() @IsOptional() instaladorCertNum?: string;
  @IsString() @IsOptional() empresaCategoria?: string;
}
