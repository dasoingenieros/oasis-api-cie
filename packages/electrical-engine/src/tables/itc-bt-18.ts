/**
 * ITC-BT-18 — INSTALACIONES DE PUESTA A TIERRA
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-18
 *
 * La puesta a tierra tiene por objeto limitar la tensión que pueden
 * presentar las masas metálicas respecto a tierra, asegurar la actuación
 * de las protecciones y eliminar el riesgo de accidente eléctrico.
 *
 * Tensión de contacto máxima (ITC-BT-18 §3):
 *   - Locales secos: Uc ≤ 50V
 *   - Locales húmedos / exteriores: Uc ≤ 24V
 *
 * Resistencia máxima de puesta a tierra:
 *   R ≤ Uc / Id
 *   Donde Id = sensibilidad del diferencial (A)
 *
 * Ejemplo: diferencial 30mA, local seco → R ≤ 50/0.030 = 1.667Ω → usar R ≤ 1.666Ω
 *          diferencial 30mA, local húmedo → R ≤ 24/0.030 = 800Ω → usar R ≤ 800Ω
 *
 * En la práctica REBT exige R ≤ 37Ω con diferencial de 650mA o
 * R ≤ 1.666Ω con diferencial 30mA para cumplir Uc ≤ 50V.
 */

// ─── Tensiones de contacto máximas ───────────────────────────────────────

export type LocationType = "dry" | "humid" | "outdoor";

export const MAX_CONTACT_VOLTAGE_V: Record<LocationType, number> = {
  dry:     50,   // V — locales secos
  humid:   24,   // V — locales húmedos (baños, piscinas, etc.)
  outdoor: 24,   // V — instalaciones exteriores
};

// ─── Electrodos de puesta a tierra (ITC-BT-18 §3) ────────────────────────

export type ElectrodeType =
  | "pica_vertical"        // Pica vertical hincada en terreno
  | "conductor_horizontal" // Conductor enterrado horizontalmente
  | "placa"               // Placa enterrada
  | "anillo";             // Conductor en anillo perimetral (cimentación)

export interface ElectrodeSpec {
  type: ElectrodeType;
  label: string;
  resistanceFormula: string;
  typicalResistanceOhm?: number;
  notes: string;
}

export const ELECTRODE_TYPES: Record<ElectrodeType, ElectrodeSpec> = {
  pica_vertical: {
    type: "pica_vertical",
    label: "Pica vertical",
    resistanceFormula: "R = ρ / L",
    notes: "Pica de acero-cobre de 2m mínimo. Diámetro mínimo 14mm. R = ρ/L (Ω), donde ρ = resistividad del terreno (Ω·m) y L = longitud de pica (m).",
  },
  conductor_horizontal: {
    type: "conductor_horizontal",
    label: "Conductor horizontal enterrado",
    resistanceFormula: "R = ρ / (2πL) × ln(4L²/(dh))",
    typicalResistanceOhm: 10,
    notes: "Conductor de Cu desnudo 35mm² mínimo, enterrado a ≥ 0.5m. Para terreno ρ = 300 Ω·m y L = 30m: R ≈ 10Ω.",
  },
  placa: {
    type: "placa",
    label: "Placa enterrada",
    resistanceFormula: "R = ρ / (4√(S/π))",
    notes: "Placa de Cu de al menos 0.35m × 0.35m. Se usa cuando no hay espacio para conductor horizontal.",
  },
  anillo: {
    type: "anillo",
    label: "Anillo en cimentación (tierra de obra)",
    resistanceFormula: "R ≈ ρ / (2π × L_perimetro)",
    typicalResistanceOhm: 5,
    notes: "Conductor Cu desnudo 35mm² embebido en la cimentación. Método más efectivo y económico en obra nueva.",
  },
};

// ─── Resistividades típicas del terreno (Ω·m) ────────────────────────────
// ITC-BT-18 Tabla 3

export interface SoilResistivitySpec {
  type: string;
  minOhm_m: number;
  maxOhm_m: number;
  typicalOhm_m: number;
}

export const SOIL_RESISTIVITY_TABLE: SoilResistivitySpec[] = [
  { type: "Tierra vegetal, terreno de cultivo húmedo",     minOhm_m: 1,    maxOhm_m: 50,   typicalOhm_m: 25 },
  { type: "Terreno arcilloso húmedo",                      minOhm_m: 1,    maxOhm_m: 100,  typicalOhm_m: 50 },
  { type: "Terreno de margas y arcillas",                  minOhm_m: 100,  maxOhm_m: 200,  typicalOhm_m: 150 },
  { type: "Terreno calcáreo blando con venas de arcilla",  minOhm_m: 100,  maxOhm_m: 300,  typicalOhm_m: 200 },
  { type: "Terreno calcáreo compacto (muy karstificado)",  minOhm_m: 300,  maxOhm_m: 500,  typicalOhm_m: 400 },
  { type: "Terreno de pizarras y micaesquistos",           minOhm_m: 50,   maxOhm_m: 300,  typicalOhm_m: 100 },
  { type: "Terreno granítico meteorizado",                  minOhm_m: 100,  maxOhm_m: 600,  typicalOhm_m: 300 },
  { type: "Terreno granítico sano o gneis",                minOhm_m: 1000, maxOhm_m: 10000, typicalOhm_m: 3000 },
  { type: "Arenas secas de dunas",                         minOhm_m: 200,  maxOhm_m: 3000,  typicalOhm_m: 500 },
  { type: "Grava seca sin finos",                         minOhm_m: 600,  maxOhm_m: 10000, typicalOhm_m: 1000 },
];

// ─── Cálculo de resistencia máxima de tierra ─────────────────────────────

/**
 * Resistencia máxima de puesta a tierra para que actúe el diferencial
 * y no se supere la tensión de contacto límite.
 *
 * ITC-BT-18 §3: R_tierra ≤ Uc / Id
 *
 * @param differentialSensitivityA Sensibilidad del diferencial en A (ej: 0.030 para 30mA)
 * @param location Tipo de local (determina Uc máxima)
 */
export function getMaxEarthResistance(
  differentialSensitivityA: number,
  location: LocationType
): { maxResistanceOhm: number; maxContactVoltageV: number; formula: string } {
  const Uc = MAX_CONTACT_VOLTAGE_V[location];
  const R_max = Uc / differentialSensitivityA;

  return {
    maxResistanceOhm: Math.round(R_max * 100) / 100,
    maxContactVoltageV: Uc,
    formula: `R_tierra ≤ Uc / Id = ${Uc}V / ${differentialSensitivityA * 1000}mA = ${Math.round(R_max * 100) / 100}Ω`,
  };
}

/**
 * Resistencia de una pica vertical en el terreno.
 * Fórmula simplificada: R = ρ / L
 *
 * @param soilResistivityOhm_m Resistividad del terreno (Ω·m)
 * @param pikeLengthM Longitud de la pica (m) — mínimo 2m
 */
export function calcPikeResistance(
  soilResistivityOhm_m: number,
  pikeLengthM: number
): number {
  if (pikeLengthM <= 0) throw new Error("ITC-BT-18: Longitud de pica debe ser > 0");
  return soilResistivityOhm_m / pikeLengthM;
}

/**
 * Número de picas necesarias para conseguir una resistencia objetivo.
 * Picas en paralelo: R_total ≈ R_1pica / n (aproximación para picas separadas ≥ 2× longitud)
 *
 * @param singlePikeResistanceOhm Resistencia de una pica
 * @param targetResistanceOhm Resistencia máxima admisible
 */
export function getRequiredPikes(
  singlePikeResistanceOhm: number,
  targetResistanceOhm: number
): number {
  return Math.ceil(singlePikeResistanceOhm / targetResistanceOhm);
}

// ─── Secciones mínimas de los conductores de tierra ──────────────────────
// ITC-BT-18 Tabla 2

export interface EarthConductorSpec {
  application: string;
  minSectionCuMm2: number;
  minSectionAlMm2?: number;
  minSectionFeSm2?: number;   // Acero galvanizado (mm²)
  protected: boolean;          // Si está protegido mecánicamente
  notes: string;
}

export const EARTH_CONDUCTOR_SECTIONS: EarthConductorSpec[] = [
  {
    application: "Conductor de tierra (enterrado, protegido corrosión)",
    minSectionCuMm2: 16,
    minSectionAlMm2: 35,
    minSectionFeSm2: 16,
    protected: true,
    notes: "Cu desnudo enterrado: mínimo 16mm². En canalizaciones protegidas: 35mm² Al.",
  },
  {
    application: "Conductor de tierra (enterrado, sin protección mecánica)",
    minSectionCuMm2: 25,
    minSectionFeSm2: 50,
    protected: false,
    notes: "Cu desnudo sin protección mecánica: 25mm². No se admite aluminio enterrado.",
  },
  {
    application: "Conductor principal de equipotencialidad",
    minSectionCuMm2: 6,
    protected: true,
    notes: "Mínimo 6mm² Cu. Conecta todas las masas metálicas accesibles.",
  },
  {
    application: "Conductor suplementario de equipotencialidad local (baños)",
    minSectionCuMm2: 2.5,
    protected: true,
    notes: "ITC-BT-27: En baños, conecta masas metálicas en volúmenes 1 y 2. Mínimo 2.5mm².",
  },
];
