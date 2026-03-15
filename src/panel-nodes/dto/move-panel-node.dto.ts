import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MovePanelNodeDto {
  @IsOptional()
  @IsString()
  newParentId?: string | null;

  @IsInt()
  @Min(0)
  newPosition!: number;
}
