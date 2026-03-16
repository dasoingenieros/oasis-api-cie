// src/installations/field-config/index.ts
// Exportaciones y funciones para resolver perfiles y obtener campos.

export {
  type ExpedienteProfile,
  type FieldGroup,
  type DocType,
  type FieldDef,
  SECTION_LABELS,
} from './field-config';

import { ExpedienteProfile, FieldDef, DocType, SECTION_LABELS } from './field-config';
import { VIVIENDA_NUEVA_FIELDS } from './vivienda-nueva';

/** Mapa de campos por perfil de expediente */
const FIELD_MAPS: Partial<Record<ExpedienteProfile, FieldDef[]>> = {
  VIVIENDA_NUEVA: VIVIENDA_NUEVA_FIELDS,
  // Futuro: LOCAL_NUEVO, INDUSTRIAL, IRVE, AUTOCONSUMO, etc.
};

/** Determina el perfil de expediente desde los datos de la instalacion */
export function getExpedienteProfile(installation: {
  installationType?: string | null;
  expedienteType?: string | null;
}): ExpedienteProfile {
  const tipo = installation.installationType?.toLowerCase();
  const exp = installation.expedienteType?.toUpperCase();

  if (tipo === 'vivienda') {
    if (!exp || exp === 'NUEVA') return 'VIVIENDA_NUEVA';
    if (exp.includes('AMPLIACION')) return 'VIVIENDA_AMPLIACION';
    if (exp.includes('MODIFICACION')) return 'VIVIENDA_MODIFICACION';
    return 'VIVIENDA_NUEVA';
  }

  if (tipo === 'local') {
    if (exp?.includes('AMPLIACION')) return 'LOCAL_AMPLIACION';
    return 'LOCAL_NUEVO';
  }

  if (tipo === 'industrial') return 'INDUSTRIAL';
  if (tipo === 'irve') return 'IRVE';
  if (tipo === 'autoconsumo') return 'AUTOCONSUMO';

  return 'DEFAULT';
}

/** Obtiene los campos para un perfil. Fallback a VIVIENDA_NUEVA. */
export function getFieldsForProfile(profile: ExpedienteProfile): FieldDef[] {
  return FIELD_MAPS[profile] || FIELD_MAPS['VIVIENDA_NUEVA'] || [];
}

/**
 * Resuelve un path de auto-fill (e.g. 'tenant.empresaNif') contra los datos disponibles.
 */
export function resolveAutoFrom(
  path: string,
  tenant: Record<string, any> | null,
  installer: Record<string, any> | null,
): any {
  const parts = path.split('.');
  const source = parts[0];
  const field = parts[1];
  if (!field) return null;
  if (source === 'tenant' && tenant) return tenant[field] ?? null;
  if (source === 'installer' && installer) return installer[field] ?? null;
  return null;
}

/**
 * Verifica si un campo tiene valor (no null, undefined, ni string vacia).
 */
export function hasValue(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string' && value.trim() === '') return false;
  return true;
}

/**
 * Calcula el estado de campos faltantes para una instalacion y perfil dado.
 */
export function computeFieldStatus(
  installation: Record<string, any>,
  fields: FieldDef[],
) {
  // Solo campos A y B cuentan para completitud (no C calculados ni E tenant)
  const userFields = fields.filter((f) => f.group === 'A' || f.group === 'B');
  const allNonCalcFields = fields.filter((f) => f.group !== 'C');

  const totalFields = userFields.length;
  let completedFields = 0;

  const missingSectionsMap = new Map<
    string,
    { name: string; label: string; requiredForDocs?: DocType[] }[]
  >();

  for (const field of userFields) {
    if (hasValue(installation[field.name])) {
      completedFields++;
    } else if (!field.optional) {
      const section = field.section;
      if (!missingSectionsMap.has(section)) {
        missingSectionsMap.set(section, []);
      }
      missingSectionsMap.get(section)!.push({
        name: field.name,
        label: field.label,
        requiredForDocs: field.requiredForDocs,
      });
    }
  }

  // Calcular completitud tambien contando opcionales que tienen valor
  const completionPct =
    totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 100;

  // Secciones faltantes
  const missingSections = Array.from(missingSectionsMap.entries()).map(
    ([sectionId, sectionFields]) => ({
      section: sectionId,
      label: SECTION_LABELS[sectionId] || sectionId,
      fields: sectionFields,
    }),
  );

  // Preparacion por documento
  const docTypes: DocType[] = ['MTD', 'CIE', 'SOLICITUD_BT'];
  const documentReadiness: Record<
    string,
    { ready: boolean; missingCount: number; missingFields: string[] }
  > = {};

  for (const docType of docTypes) {
    const docFields = allNonCalcFields.filter(
      (f) => f.requiredForDocs?.includes(docType) && !f.optional,
    );
    const missing = docFields.filter((f) => !hasValue(installation[f.name]));
    documentReadiness[docType] = {
      ready: missing.length === 0,
      missingCount: missing.length,
      missingFields: missing.map((f) => f.name),
    };
  }

  return {
    totalFields,
    completedFields,
    completionPct,
    missingSections,
    documentReadiness,
  };
}

/**
 * Genera la configuracion de campos con valores actuales para el frontend.
 */
export function computeFieldConfig(
  installation: Record<string, any>,
  fields: FieldDef[],
) {
  const sectionsMap = new Map<
    string,
    {
      name: string;
      label: string;
      group: string;
      inputType?: string;
      options?: string[];
      currentValue: any;
      defaultValue?: any;
      isComplete: boolean;
      requiredForDocs?: DocType[];
      calculatedBy?: string;
      optional?: boolean;
    }[]
  >();

  for (const field of fields) {
    const section = field.section;
    if (!sectionsMap.has(section)) {
      sectionsMap.set(section, []);
    }

    sectionsMap.get(section)!.push({
      name: field.name,
      label: field.label,
      group: field.group,
      inputType: field.inputType,
      options: field.options,
      currentValue: installation[field.name] ?? null,
      defaultValue: field.defaultValue,
      isComplete: hasValue(installation[field.name]),
      requiredForDocs: field.requiredForDocs,
      calculatedBy: field.calculatedBy,
      optional: field.optional,
    });
  }

  return Array.from(sectionsMap.entries()).map(([sectionId, sectionFields]) => ({
    id: sectionId,
    label: SECTION_LABELS[sectionId] || sectionId,
    fields: sectionFields,
  }));
}
