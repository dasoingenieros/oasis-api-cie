// src/installations/field-config/field-config.ts
// Tipos centrales para la configuracion de campos por perfil de expediente.

/** Tipos de expediente soportados */
export type ExpedienteProfile =
  | 'VIVIENDA_NUEVA'
  | 'VIVIENDA_AMPLIACION'
  | 'VIVIENDA_MODIFICACION'
  | 'LOCAL_NUEVO'
  | 'LOCAL_AMPLIACION'
  | 'LOCAL_LPC'
  | 'INDUSTRIAL'
  | 'GARAJE'
  | 'GARAJE_LPC'
  | 'ENLACE'
  | 'TEMPORAL'
  | 'TEMPORAL_LPC'
  | 'IRVE'
  | 'AUTOCONSUMO'
  | 'GENERACION'
  | 'MOJADO'
  | 'ELEVACION'
  | 'CALDEO'
  | 'ROTULOS'
  | 'LOCAL_ESPECIAL'
  | 'DEFAULT';

/**
 * Grupo de un campo:
 *  A = obligatorio (el usuario DEBE rellenar)
 *  B = default inteligente (modificable)
 *  C = calculado automaticamente (no se toca)
 *  D = no aplica para este perfil (oculto — no se incluye en el array)
 *  E = desde perfil tenant/installer (auto-fill)
 */
export type FieldGroup = 'A' | 'B' | 'C' | 'E';

/** Tipos de documento que pueden requerir un campo */
export type DocType = 'MTD' | 'CIE' | 'SOLICITUD_BT';

/** Definicion de un campo */
export interface FieldDef {
  /** Nombre del campo en Installation (debe coincidir exactamente con schema.prisma) */
  name: string;
  /** Grupo: A=obligatorio, B=default, C=calculado, E=tenant */
  group: FieldGroup;
  /** Seccion visual */
  section: string;
  /** Label en espanol para el UI */
  label: string;
  /** Valor por defecto (grupo B) */
  defaultValue?: any;
  /** Fuente auto-fill (grupo E): 'tenant.empresaNif', 'installer.nombre', etc. */
  autoFrom?: string;
  /** Que lo calcula (grupo C): 'motor', 'formula', etc. */
  calculatedBy?: string;
  /** En que documentos es obligatorio */
  requiredForDocs?: DocType[];
  /** Tipo de input UI */
  inputType?: 'text' | 'number' | 'select' | 'boolean' | 'date' | 'textarea';
  /** Opciones para selects */
  options?: string[];
  /** Si el campo es opcional (no bloquea generacion aunque falte) */
  optional?: boolean;
  /** Grupo "al menos uno obligatorio": si al menos un campo del grupo tiene valor, todos cuentan como completos */
  atLeastOneOf?: string;
}

/** Labels de las secciones */
export const SECTION_LABELS: Record<string, string> = {
  titular: 'Datos del titular',
  emplazamiento: 'Emplazamiento de la instalacion',
  tecnico: 'Datos tecnicos',
  acometida: 'Acometida',
  cgp: 'Caja general de proteccion',
  lga: 'Linea general de alimentacion',
  modulo_medida: 'Modulo de medida',
  protecciones: 'Protecciones',
  tierra: 'Puesta a tierra y verificaciones',
  empresa: 'Empresa instaladora',
  instalador: 'Instalador / Tecnico',
  distribuidora: 'Distribuidora',
  presupuesto: 'Presupuesto',
  certificacion: 'Certificacion / Normativa',
  firma: 'Firma',
  info: 'Informacion adicional',
};
