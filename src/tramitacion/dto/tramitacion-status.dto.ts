import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class ResolveInputDto {
  @IsString()
  field!: string;

  /** UUID del candidato seleccionado (si el usuario eligió de la lista) */
  @ValidateIf((o) => !o.searchTerm)
  @IsString()
  selectedValue?: string;

  @IsOptional()
  @IsString()
  selectedLabel?: string;

  /** Término de búsqueda manual (si no había candidatos) */
  @ValidateIf((o) => !o.selectedValue)
  @IsString()
  searchTerm?: string;
}
