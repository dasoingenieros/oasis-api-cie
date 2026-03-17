// src/installations/field-config/index.ts
// Exportaciones y funciones para resolver perfiles y obtener campos.

export {
  type ExpedienteProfile,
  type FieldGroup,
  type DocType,
  type FieldDef,
  SECTION_LABELS,
} from './field-config';

export {
  determineDocumentationType,
  getDocumentationReason,
} from './documentation-triage';

export {
  replaceField,
  removeFields,
} from './shared-fields';

import { ExpedienteProfile, FieldDef, DocType, SECTION_LABELS } from './field-config';
import { VIVIENDA_NUEVA_FIELDS } from './vivienda-nueva';
import { VIVIENDA_AMPLIACION_FIELDS } from './vivienda-ampliacion';
import { LOCAL_FIELDS } from './local';
import { LOCAL_LPC_FIELDS } from './local-lpc';
import { INDUSTRIAL_FIELDS } from './industrial';
import { GARAJE_FIELDS } from './garaje';
import { GARAJE_LPC_FIELDS } from './garaje-lpc';
import { ENLACE_FIELDS } from './enlace';
import { TEMPORAL_FIELDS } from './temporal';
import { IRVE_FIELDS } from './irve';
import { AUTOCONSUMO_FIELDS } from './autoconsumo';
import { GENERACION_FIELDS } from './generacion';
import { MOJADO_FIELDS } from './mojado';
import { ELEVACION_FIELDS } from './elevacion';
import { CALDEO_FIELDS } from './caldeo';
import { ROTULOS_FIELDS } from './rotulos';
import { LOCAL_ESPECIAL_FIELDS } from './local-especial';
import { TEMPORAL_LPC_FIELDS } from './temporal-lpc';

/** Mapa de campos por perfil de expediente */
const FIELD_MAPS: Partial<Record<ExpedienteProfile, FieldDef[]>> = {
  VIVIENDA_NUEVA: VIVIENDA_NUEVA_FIELDS,
  VIVIENDA_AMPLIACION: VIVIENDA_AMPLIACION_FIELDS,
  VIVIENDA_MODIFICACION: VIVIENDA_AMPLIACION_FIELDS, // Mismos campos que ampliacion
  LOCAL_NUEVO: LOCAL_FIELDS,
  LOCAL_AMPLIACION: LOCAL_FIELDS, // Misma estructura base
  LOCAL_LPC: LOCAL_LPC_FIELDS,
  INDUSTRIAL: INDUSTRIAL_FIELDS,
  GARAJE: GARAJE_FIELDS,
  GARAJE_LPC: GARAJE_LPC_FIELDS,
  ENLACE: ENLACE_FIELDS,
  TEMPORAL: TEMPORAL_FIELDS,
  IRVE: IRVE_FIELDS,
  AUTOCONSUMO: AUTOCONSUMO_FIELDS,
  GENERACION: GENERACION_FIELDS,
  MOJADO: MOJADO_FIELDS,
  ELEVACION: ELEVACION_FIELDS,
  CALDEO: CALDEO_FIELDS,
  ROTULOS: ROTULOS_FIELDS,
  LOCAL_ESPECIAL: LOCAL_ESPECIAL_FIELDS,
  TEMPORAL_LPC: TEMPORAL_LPC_FIELDS,
};

/** Mapa de installationType (wizard) a ExpedienteProfile */
const PROFILE_MAP: Record<string, ExpedienteProfile> = {
  vivienda: 'VIVIENDA_NUEVA',
  local: 'LOCAL_NUEVO',
  industrial: 'INDUSTRIAL',
  garaje: 'GARAJE',
  enlace: 'ENLACE',
  temporal: 'TEMPORAL',
  irve: 'IRVE',
  autoconsumo: 'AUTOCONSUMO',
  generacion: 'GENERACION',
  lpc_host: 'LOCAL_LPC',
  lpc_espec: 'LOCAL_LPC',
  lpc_reun: 'LOCAL_LPC',
  lpc_otros: 'LOCAL_LPC',
  garaje_lpc: 'GARAJE_LPC',
  temporal_lpc: 'TEMPORAL_LPC',
  mojado: 'MOJADO',
  elevacion: 'ELEVACION',
  caldeo: 'CALDEO',
  rotulos: 'ROTULOS',
  local_esp: 'LOCAL_ESPECIAL',
};

/** Determina el perfil de expediente desde los datos de la instalacion */
export function getExpedienteProfile(installation: {
  installationType?: string | null;
  expedienteType?: string | null;
}): ExpedienteProfile {
  const tipo = installation.installationType?.toLowerCase();
  const exp = installation.expedienteType?.toUpperCase();

  if (!tipo) return 'DEFAULT';

  // Vivienda: distinguir nueva / ampliacion / modificacion
  if (tipo === 'vivienda') {
    if (!exp || exp === 'NUEVA') return 'VIVIENDA_NUEVA';
    if (exp.includes('AMPLIACION')) return 'VIVIENDA_AMPLIACION';
    if (exp.includes('MODIFICACION')) return 'VIVIENDA_MODIFICACION';
    return 'VIVIENDA_NUEVA';
  }

  // Local: distinguir nuevo / ampliacion
  if (tipo === 'local') {
    if (exp?.includes('AMPLIACION')) return 'LOCAL_AMPLIACION';
    return 'LOCAL_NUEVO';
  }

  // Resto: mapeo directo
  return PROFILE_MAP[tipo] || 'DEFAULT';
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

  // Pre-compute "atLeastOneOf" groups: check if at least one field in the group has a value
  const atLeastOneGroups = new Map<string, boolean>();
  for (const field of fields) {
    if (!field.atLeastOneOf) continue;
    if (!atLeastOneGroups.has(field.atLeastOneOf)) {
      atLeastOneGroups.set(field.atLeastOneOf, false);
    }
    if (hasValue(installation[field.name])) {
      atLeastOneGroups.set(field.atLeastOneOf, true);
    }
  }

  const totalFields = userFields.length;
  let completedFields = 0;

  const missingSectionsMap = new Map<
    string,
    { name: string; label: string; requiredForDocs?: DocType[] }[]
  >();

  for (const field of userFields) {
    // atLeastOneOf group: if any field in the group has a value, all count as complete
    if (field.atLeastOneOf) {
      const groupSatisfied = atLeastOneGroups.get(field.atLeastOneOf) ?? false;
      if (groupSatisfied) {
        completedFields++;
      } else {
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
      continue;
    }

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
    const missing = docFields.filter((f) => {
      if (f.atLeastOneOf) {
        return !(atLeastOneGroups.get(f.atLeastOneOf) ?? false);
      }
      return !hasValue(installation[f.name]);
    });
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
      atLeastOneOf?: string;
    }[]
  >();

  for (const field of fields) {
    const section = field.section;
    if (!sectionsMap.has(section)) {
      sectionsMap.set(section, []);
    }

    // For group B fields, resolve default when DB value is null
    const dbValue = installation[field.name];
    const effectiveValue = hasValue(dbValue) ? dbValue : (field.defaultValue ?? null);

    sectionsMap.get(section)!.push({
      name: field.name,
      label: field.label,
      group: field.group,
      inputType: field.inputType,
      options: field.options,
      currentValue: effectiveValue,
      defaultValue: field.defaultValue,
      isComplete: hasValue(effectiveValue),
      requiredForDocs: field.requiredForDocs,
      calculatedBy: field.calculatedBy,
      optional: field.optional,
      atLeastOneOf: field.atLeastOneOf,
    });
  }

  return Array.from(sectionsMap.entries()).map(([sectionId, sectionFields]) => ({
    id: sectionId,
    label: SECTION_LABELS[sectionId] || sectionId,
    fields: sectionFields,
  }));
}
