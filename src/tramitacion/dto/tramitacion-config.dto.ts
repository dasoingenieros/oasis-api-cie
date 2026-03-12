import { IsOptional, IsString } from 'class-validator';

export class UpdateTramitacionConfigDto {
  @IsOptional()
  @IsString()
  portalUsername?: string;

  @IsOptional()
  @IsString()
  portalPassword?: string;

  @IsOptional()
  @IsString()
  portalEiciId?: string;

  @IsOptional()
  @IsString()
  portalEiciName?: string;
}
