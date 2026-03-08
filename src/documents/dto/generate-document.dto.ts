// ============================================================
// CAMBIO 7a/7 — apps/api/src/documents/dto/generate-document.dto.ts
//
// ACCIÓN: Crear carpeta documents/dto/ y este archivo
// ============================================================

import { IsEnum, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export enum GenerateDocumentType {
  MEMORIA_TECNICA = 'MEMORIA_TECNICA',
  CERTIFICADO = 'CERTIFICADO',
  UNIFILAR = 'UNIFILAR',
}

export class GenerateDocumentDto {
  @IsNotEmpty()
  @IsEnum(GenerateDocumentType)
  @Transform(({ value }) => value?.toUpperCase())
  type!: GenerateDocumentType;
}
