import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateInstallerDto {
  @IsString() nombre!: string;
  @IsString() @IsOptional() nif?: string;
  @IsString() @IsOptional() certNum?: string;
  @IsString() @IsOptional() categoria?: string;
  @IsBoolean() @IsOptional() isDefault?: boolean;
}
