import { IsOptional, IsString } from 'class-validator';

export class TramitarDto {
  @IsOptional()
  @IsString()
  eiciId?: string;
}
