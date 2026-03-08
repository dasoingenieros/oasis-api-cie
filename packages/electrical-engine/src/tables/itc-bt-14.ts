/**
 * ITC-BT-14 — LÍNEA GENERAL DE ALIMENTACIÓN (LGA)
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-14
 *
 * La LGA enlaza la CGP (Caja General de Protección) con la centralización
 * de contadores o con el cuadro de distribución general.
 *
 * Condiciones:
 *   - CdT máxima: 0.5% (ITC-BT-14 §3)
 *   - Sección mínima: 10mm² Cu / 16mm² Al
 *   - Conductor neutro: igual sección que fase hasta 10mm², la mitad por encima (mín. 10mm²)
 *   - Aislamiento mínimo: 0.6/1kV
 *   - No admite empalmes en todo su recorrido
 *   - Método de instalación habitual: E o F (libre de halógenos en zonas comunes)
 */

// ─── Secciones mínimas LGA (ITC-BT-14 Tabla 1) ───────────────────────────

export interface LGASectionSpec {
  maxCurrentA: number;     // Intensidad máxima para esta sección
  sectionCuMm2: number;    // Sección en cobre (mm²)
  sectionAlMm2: number;    // Sección en aluminio (mm²)
  neutralCuMm2: number;    // Sección neutro en cobre
}

/**
 * Tabla de secciones mínimas para LGA según intensidad máxima prevista.
 * ITC-BT-14 §3 / IEC 60364-5-52
 */
export const LGA_SECTION_TABLE: LGASectionSpec[] = [
  { maxCurrentA: 100,  sectionCuMm2: 16,  sectionAlMm2: 25,  neutralCuMm2: 16 },
  { maxCurrentA: 160,  sectionCuMm2: 25,  sectionAlMm2: 35,  neutralCuMm2: 16 },
  { maxCurrentA: 200,  sectionCuMm2: 35,  sectionAlMm2: 50,  neutralCuMm2: 16 },
  { maxCurrentA: 250,  sectionCuMm2: 50,  sectionAlMm2: 70,  neutralCuMm2: 25 },
  { maxCurrentA: 315,  sectionCuMm2: 70,  sectionAlMm2: 95,  neutralCuMm2: 35 },
  { maxCurrentA: 400,  sectionCuMm2: 95,  sectionAlMm2: 150, neutralCuMm2: 50 },
  { maxCurrentA: 500,  sectionCuMm2: 120, sectionAlMm2: 185, neutralCuMm2: 70 },
  { maxCurrentA: 630,  sectionCuMm2: 150, sectionAlMm2: 240, neutralCuMm2: 70 },
  { maxCurrentA: 800,  sectionCuMm2: 185, sectionAlMm2: 300, neutralCuMm2: 95 },
  { maxCurrentA: 1000, sectionCuMm2: 240, sectionAlMm2: 400, neutralCuMm2: 120 },
];

// ─── Resistividades a 20°C (Ω·mm²/m) ────────────────────────────────────

export const RESISTIVITY_20C: Record<"Cu" | "Al", number> = {
  Cu: 0.01724,   // Ω·mm²/m a 20°C
  Al: 0.02826,   // Ω·mm²/m a 20°C
};

// Coeficiente de temperatura (1/°C)
export const TEMP_COEFF: Record<"Cu" | "Al", number> = {
  Cu: 0.00393,
  Al: 0.00403,
};

/**
 * Resistividad corregida por temperatura.
 * ρ_T = ρ_20 × [1 + α × (T - 20)]
 */
export function getResistivityAtTemp(
  material: "Cu" | "Al",
  tempC: number
): number {
  const rho20 = RESISTIVITY_20C[material];
  const alpha = TEMP_COEFF[material];
  return rho20 * (1 + alpha * (tempC - 20));
}

// ─── Reactancia de conductores (mΩ/m) ────────────────────────────────────
// Valores aproximados para cálculo de CdT con reactancia
// Para secciones < 50mm² la reactancia es despreciable (< 1% del error)

export const REACTANCE_TABLE_CABLE: Partial<Record<number, number>> = {
  50:  0.09,   // mΩ/m
  70:  0.087,
  95:  0.083,
  120: 0.080,
  150: 0.078,
  185: 0.076,
  240: 0.073,
  300: 0.072,
};

// ─── Cálculo de caída de tensión en LGA ──────────────────────────────────

export interface LGAInput {
  totalPowerW: number;          // Potencia total de la LGA (W)
  powerFactor: number;          // cosφ global del edificio (típico 0.9)
  phaseSystem: "three" | "single";
  conductorMaterial: "Cu" | "Al";
  sectionMm2: number;           // Sección de fase elegida
  lengthM: number;              // Longitud de la LGA (m)
  conductorTempC?: number;      // Temperatura de servicio conductor (default 70°C PVC / 90°C XLPE)
  voltageV?: number;            // Tensión (default 400V trifásico / 230V monofásico)
}

export interface LGAResult {
  nominalCurrentA: number;
  voltageDropPct: number;
  voltageDropV: number;
  cdtLimitPct: number;          // Siempre 0.5% para LGA
  cdtCompliant: boolean;
  minSectionMm2: number;        // Sección mínima para cumplir CdT
  resistanceOhm: number;
  warnings: string[];
}

/**
 * Calcula la caída de tensión en la LGA y verifica el límite del 0.5%.
 * ITC-BT-14 §3
 *
 * Fórmula trifásica:  ΔU = √3 × I × L × (R×cosφ + X×sinφ) / 1000
 * Fórmula monofásica: ΔU = 2 × I × L × (R×cosφ + X×sinφ) / 1000
 * Donde R = ρ_T / S (Ω/m) y X en mΩ/m
 */
export function calculateLGAVoltageDrop(input: LGAInput): LGAResult {
  const SQRT3 = Math.sqrt(3);
  const V = input.voltageV ?? (input.phaseSystem === "three" ? 400 : 230);
  const tempC = input.conductorTempC ?? 70;
  const warnings: string[] = [];

  // Intensidad nominal
  const In = input.phaseSystem === "three"
    ? input.totalPowerW / (SQRT3 * V * input.powerFactor)
    : input.totalPowerW / (V * input.powerFactor);

  // Resistencia del conductor (Ω/m → mΩ/m para consistencia con X)
  const rho = getResistivityAtTemp(input.conductorMaterial, tempC);
  const R_mOhm_per_m = (rho / input.sectionMm2) * 1000; // mΩ/m

  // Reactancia (solo significativa ≥ 50mm²)
  const X_mOhm_per_m = REACTANCE_TABLE_CABLE[input.sectionMm2] ?? 0;

  const sinφ = Math.sqrt(1 - input.powerFactor ** 2);

  // ΔU en voltios
  let deltaU: number;
  if (input.phaseSystem === "three") {
    deltaU = (SQRT3 * In * input.lengthM * (R_mOhm_per_m * input.powerFactor + X_mOhm_per_m * sinφ)) / 1000;
  } else {
    deltaU = (2 * In * input.lengthM * (R_mOhm_per_m * input.powerFactor + X_mOhm_per_m * sinφ)) / 1000;
  }

  const voltageDropPct = (deltaU / V) * 100;
  const cdtCompliant = voltageDropPct <= 0.5;

  // Sección mínima para cumplir 0.5%
  const maxDeltaU = V * 0.005;
  let minSectionMm2: number;
  if (input.phaseSystem === "three") {
    minSectionMm2 = (SQRT3 * In * input.lengthM * rho * 1000 * input.powerFactor) / (maxDeltaU * 1000);
  } else {
    minSectionMm2 = (2 * In * input.lengthM * rho * 1000 * input.powerFactor) / (maxDeltaU * 1000);
  }

  // Advertencias
  if (input.sectionMm2 < 10 && input.conductorMaterial === "Cu") {
    warnings.push("ITC-BT-14: Sección mínima en LGA es 10mm² para conductores de cobre.");
  }
  if (input.sectionMm2 < 16 && input.conductorMaterial === "Al") {
    warnings.push("ITC-BT-14: Sección mínima en LGA es 16mm² para conductores de aluminio.");
  }

  return {
    nominalCurrentA: Math.round(In * 100) / 100,
    voltageDropPct: Math.round(voltageDropPct * 1000) / 1000,
    voltageDropV: Math.round(deltaU * 100) / 100,
    cdtLimitPct: 0.5,
    cdtCompliant,
    minSectionMm2: Math.ceil(minSectionMm2 * 10) / 10,
    resistanceOhm: Math.round((R_mOhm_per_m * input.lengthM) / 1000 * 10000) / 10000,
    warnings,
  };
}

/**
 * Sección mínima del neutro en función de la sección de fase.
 * ITC-BT-14 / IEC 60364-5-54
 *
 * Regla:
 *   - Sección fase ≤ 16mm² Cu: neutro = fase
 *   - Sección fase > 16mm² Cu: neutro = fase/2, mínimo 16mm²
 */
export function getNeutralSection(phaseSectionMm2: number, material: "Cu" | "Al"): number {
  if (material === "Cu") {
    if (phaseSectionMm2 <= 16) return phaseSectionMm2;
    return Math.max(phaseSectionMm2 / 2, 16);
  } else {
    // Aluminio
    if (phaseSectionMm2 <= 25) return phaseSectionMm2;
    return Math.max(phaseSectionMm2 / 2, 16);
  }
}
