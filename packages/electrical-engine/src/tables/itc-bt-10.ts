/**
 * ITC-BT-10 — PREVISIÓN DE CARGAS PARA SUMINISTROS EN BAJA TENSIÓN
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-10
 *
 * Define las cargas mínimas a prever para el cálculo de la potencia
 * necesaria en edificios de viviendas, locales comerciales, oficinas
 * e instalaciones de uso general.
 *
 * La previsión de cargas determina la sección de la LGA (ITC-BT-14),
 * la potencia contratada mínima y el calibre del IGA.
 */

// ─── Grados de electrificación en viviendas (ITC-BT-10 §1.1) ─────────────

export type ElectrificationGrade = "basic" | "elevated";

export interface ElectrificationSpec {
  grade: ElectrificationGrade;
  label: string;
  minPowerW: number;          // Potencia mínima prevista por vivienda (W)
  minSectionMm2: number;      // Sección mínima derivación individual (mm²)
  description: string;
  typicalCircuits: string;
}

export const ELECTRIFICATION_GRADES: Record<ElectrificationGrade, ElectrificationSpec> = {
  basic: {
    grade: "basic",
    label: "Electrificación básica",
    minPowerW: 5750,           // 25A × 230V
    minSectionMm2: 6,
    description: "Viviendas sin calefacción eléctrica ni aire acondicionado",
    typicalCircuits: "C1, C2, C3, C4.1, C5",
  },
  elevated: {
    grade: "elevated",
    label: "Electrificación elevada",
    minPowerW: 9200,           // 40A × 230V
    minSectionMm2: 10,
    description: "Viviendas con calefacción eléctrica, aire acondicionado o superficie > 160m²",
    typicalCircuits: "C1–C12 completos",
  },
};

// ─── Cargas mínimas por tipo de local (ITC-BT-10 §3) ─────────────────────

export type BuildingUse =
  | "residential"         // Viviendas
  | "commercial"          // Locales comerciales
  | "office"              // Oficinas
  | "hotel"               // Hoteles
  | "hospital"            // Hospitales/clínicas
  | "school"              // Centros docentes
  | "parking"             // Aparcamientos
  | "industrial_light"    // Industrial ligera
  | "industrial_heavy";   // Industrial pesada

export interface LoadDensitySpec {
  use: BuildingUse;
  label: string;
  loadDensityWm2: number;      // W/m² de superficie útil
  minLoadW?: number;           // Carga mínima por local (W)
  notes: string;
}

export const LOAD_DENSITY_TABLE: Record<BuildingUse, LoadDensitySpec> = {
  residential: {
    use: "residential",
    label: "Viviendas",
    loadDensityWm2: 0,          // Las viviendas se calculan por grado de electrificación
    notes: "Ver ELECTRIFICATION_GRADES. Se usa potencia por vivienda, no densidad.",
  },
  commercial: {
    use: "commercial",
    label: "Locales comerciales",
    loadDensityWm2: 100,        // 100 W/m²
    minLoadW: 3450,             // Mínimo 3.450 W por local
    notes: "Mínimo 3.450W por local. Para grandes superficies, calcular según equipos.",
  },
  office: {
    use: "office",
    label: "Oficinas",
    loadDensityWm2: 80,         // 80 W/m²
    minLoadW: 3450,
    notes: "Para edificios de oficinas con climatización central: 100 W/m².",
  },
  hotel: {
    use: "hotel",
    label: "Hoteles y hostales",
    loadDensityWm2: 100,
    notes: "Por habitación: 1.000W mínimo. Zonas comunes: 50 W/m².",
  },
  hospital: {
    use: "hospital",
    label: "Hospitales y clínicas",
    loadDensityWm2: 1500,       // Alta densidad por equipos médicos
    notes: "Incluye equipos médicos, iluminación especial y sistemas de emergencia.",
  },
  school: {
    use: "school",
    label: "Centros docentes",
    loadDensityWm2: 50,
    notes: "Aulas: 50 W/m². Laboratorios y talleres: 100 W/m².",
  },
  parking: {
    use: "parking",
    label: "Aparcamientos",
    loadDensityWm2: 10,
    notes: "Incluye alumbrado y ventilación. Para recarga VE añadir según ITC-BT-52.",
  },
  industrial_light: {
    use: "industrial_light",
    label: "Industrial ligera",
    loadDensityWm2: 125,
    notes: "Talleres y naves de industria ligera.",
  },
  industrial_heavy: {
    use: "industrial_heavy",
    label: "Industrial pesada",
    loadDensityWm2: 250,
    notes: "Industria con maquinaria pesada. Calcular según equipos instalados.",
  },
};

// ─── Coeficiente de simultaneidad para edificios de viviendas ─────────────
// ITC-BT-10 §1 Tabla 1

export const SIMULTANEITY_COEFFICIENT_RESIDENTIAL: Record<number, number> = {
  1:  1.00,
  2:  2.00,
  3:  2.80,   // factor acumulado total, no por vivienda adicional
  4:  3.52,
  5:  4.22,
  6:  4.89,
  7:  5.55,
  8:  6.18,
  9:  6.79,
  10: 7.38,
  11: 7.95,
  12: 8.50,
  13: 9.03,
  14: 9.54,
  15: 10.03,
  16: 10.50,
  17: 10.95,
  18: 11.38,
  19: 11.79,
  20: 12.18,
  21: 12.55,
  22: 12.90,
  23: 13.23,
  24: 13.54,
  25: 13.83,
  26: 14.10,
  27: 14.35,
  28: 14.58,
  29: 14.79,
  30: 14.98,
  31: 15.15,
  32: 15.30,
  33: 15.43,
  34: 15.54,
  35: 15.63,
  36: 15.70,
  37: 15.75,
  38: 15.78,
  39: 15.79,
  40: 15.80,   // A partir de 40 viviendas: 15.80 constante
};

/**
 * Potencia total prevista para un edificio de viviendas.
 * Aplica el coeficiente de simultaneidad de la Tabla 1 ITC-BT-10.
 *
 * @param nDwellings Número de viviendas
 * @param powerPerDwellingW Potencia por vivienda (W) — mínimo 5.750W básica / 9.200W elevada
 */
export function calculateBuildingLoad(
  nDwellings: number,
  powerPerDwellingW: number
): { totalPowerW: number; simultaneityCoeff: number; powerPerDwellingW: number } {
  if (nDwellings <= 0) throw new Error("ITCBT10: El número de viviendas debe ser > 0");
  if (powerPerDwellingW < 5750) throw new Error("ITCBT10: Potencia por vivienda mínima 5.750W (electrificación básica)");

  // Para > 40 viviendas, el coeficiente es 15.80 (constante)
  const clampedN = Math.min(nDwellings, 40);
  const coeff = SIMULTANEITY_COEFFICIENT_RESIDENTIAL[clampedN] ?? 15.80;

  // totalPowerW = coeff × powerPerDwellingW
  // OJO: el coeff es el total acumulado (no × nDwellings)
  const totalPowerW = coeff * powerPerDwellingW;

  return {
    totalPowerW: Math.round(totalPowerW),
    simultaneityCoeff: coeff,
    powerPerDwellingW,
  };
}

/**
 * Determina el grado de electrificación de una vivienda.
 * ITC-BT-10 §1.1
 */
export function determineElectrificationGrade(params: {
  surfaceM2: number;
  hasElectricHeating: boolean;
  hasAirConditioning: boolean;
}): ElectrificationGrade {
  if (
    params.surfaceM2 > 160 ||
    params.hasElectricHeating ||
    params.hasAirConditioning
  ) {
    return "elevated";
  }
  return "basic";
}

/**
 * Potencia mínima prevista para locales no residenciales.
 * ITC-BT-10 §3
 */
export function calculateCommercialLoad(
  use: Exclude<BuildingUse, "residential">,
  surfaceM2: number
): { totalPowerW: number; loadDensityWm2: number } {
  const spec = LOAD_DENSITY_TABLE[use];
  const rawPower = spec.loadDensityWm2 * surfaceM2;
  const totalPowerW = Math.max(rawPower, spec.minLoadW ?? 0);
  return { totalPowerW: Math.round(totalPowerW), loadDensityWm2: spec.loadDensityWm2 };
}
