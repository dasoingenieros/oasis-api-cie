// src/tenants/dto/update-tenant-profile.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class UpdateTenantProfileDto {
  @IsString() @IsOptional() empresaNif?: string;
  @IsString() @IsOptional() empresaNombre?: string;
  @IsString() @IsOptional() empresaCategoria?: string;
  @IsString() @IsOptional() empresaRegNum?: string;
  @IsString() @IsOptional() empresaTipoVia?: string;
  @IsString() @IsOptional() empresaNombreVia?: string;
  @IsString() @IsOptional() empresaNumero?: string;
  @IsString() @IsOptional() empresaLocalidad?: string;
  @IsString() @IsOptional() empresaProvincia?: string;
  @IsString() @IsOptional() empresaCp?: string;
  @IsString() @IsOptional() empresaTelefono?: string;
  @IsString() @IsOptional() empresaMovil?: string;
  @IsString() @IsOptional() empresaEmail?: string;
  @IsString() @IsOptional() distribuidoraHab?: string;
  @IsString() @IsOptional() certificadoEmpresaUrl?: string;
  @IsString() @IsOptional() certificadoEmpresaName?: string;
  @IsString() @IsOptional() anexoUsuarioUrl?: string;
  @IsString() @IsOptional() anexoUsuarioName?: string;
}
