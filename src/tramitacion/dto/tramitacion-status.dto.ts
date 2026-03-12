import { IsOptional, IsString } from 'class-validator';

export class ResolveInputDto {
  @IsString()
  field!: string;

  @IsString()
  selectedValue!: string;

  @IsOptional()
  @IsString()
  selectedLabel?: string;
}
