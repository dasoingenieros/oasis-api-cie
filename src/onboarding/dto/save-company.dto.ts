import { IsString, IsOptional } from 'class-validator';

export class SaveCompanyDto {
  @IsString() @IsOptional() empresaNif?: string;
  @IsString() @IsOptional() empresaNombre?: string;
  @IsString() @IsOptional() empresaTipoVia?: string;
  @IsString() @IsOptional() empresaNombreVia?: string;
  @IsString() @IsOptional() empresaNumero?: string;
  @IsString() @IsOptional() empresaLocalidad?: string;
  @IsString() @IsOptional() empresaProvincia?: string;
  @IsString() @IsOptional() empresaCp?: string;
  @IsString() @IsOptional() empresaTelefono?: string;
  @IsString() @IsOptional() empresaEmail?: string;
}
