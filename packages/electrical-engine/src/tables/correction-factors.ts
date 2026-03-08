/**
 * FACTORES DE CORRECCIÓN — ITC-BT-19 / IEC 60364-5-52
 *
 * Los valores de intensidad admisible en tabla ITC-BT-19 son para:
 *   - Temperatura ambiente 40°C (instalaciones en aire)
 *   - Temperatura ambiente 25°C (instalaciones enterradas)
 *   - Circuito único (sin agrupamiento)
 *
 * Cuando las condiciones reales difieren, se aplican factores de corrección:
 *   Iz_real = Iz_tabla × Ca × Cg
 */

// ─── FACTOR Ca — Corrección por temperatura ambiente ──────────────────────

/**
 * Tabla Ca — Factor de corrección por temperatura ambiente
 * Fuente: ITC-BT-19 Tabla 3 / IEC 60364-5-52 Tabla B.52.14
 *
 * Estructura: Ca[insulationType][temperaturaAmbiente_°C]
 *
 * Para PVC: Tmax conductor = 70°C, Tref = 40°C
 * Para XLPE/EPR: Tmax conductor = 90°C, Tref = 40°C
 */
export const CORRECTION_FACTOR_CA: Record<"PVC" | "XLPE", Record<number, number>> = {
  PVC: {
    10: 1.22,
    15: 1.17,
    20: 1.12,
    25: 1.06,
    30: 1.00,   // <-- La tabla ITC-BT-19 usa 40°C como base; este 1.00 es a 30°C en IEC
    35: 0.94,
    40: 0.87,   // <-- Temperatura base ITC-BT-19 para instalaciones en aire
    45: 0.79,
    50: 0.71,
    55: 0.61,
    60: 0.50,
  },
  XLPE: {
    10: 1.15,
    15: 1.12,
    20: 1.08,
    25: 1.04,
    30: 1.00,
    35: 0.96,
    40: 0.91,   // <-- Temperatura base ITC-BT-19
    45: 0.87,
    50: 0.82,
    55: 0.76,
    60: 0.71,
    65: 0.65,
    70: 0.58,
    75: 0.50,
    80: 0.41,
  },
};

/**
 * Obtiene el factor de corrección de temperatura Ca.
 * Interpola linealmente entre los valores de tabla si la temperatura
 * no cae exactamente en un punto tabulado.
 */
export function getCorrectionFactorCa(
  insulationType: "PVC" | "XLPE" | "EPR",
  ambientTempC: number
): number {
  // EPR = XLPE en cuanto a factores de corrección
  const insKey: "PVC" | "XLPE" = insulationType === "PVC" ? "PVC" : "XLPE";
  const table = CORRECTION_FACTOR_CA[insKey];
  const temps = Object.keys(table).map(Number).sort((a, b) => a - b);

  // Dentro de rango: interpolación lineal
  for (let i = 0; i < temps.length - 1; i++) {
    const t1 = temps[i]!;
    const t2 = temps[i + 1]!;
    if (ambientTempC >= t1 && ambientTempC <= t2) {
      const ca1 = table[t1]!;
      const ca2 = table[t2]!;
      return ca1 + ((ambientTempC - t1) / (t2 - t1)) * (ca2 - ca1);
    }
  }

  // Fuera de rango: límites
  if (ambientTempC <= temps[0]!) return table[temps[0]!]!;
  if (ambientTempC >= temps[temps.length - 1]!) return table[temps[temps.length - 1]!]!;

  return 1.0; // fallback seguro
}

// ─── FACTOR Cg — Corrección por agrupamiento de circuitos ─────────────────

/**
 * Tabla Cg — Factor de corrección por agrupamiento
 * Fuente: ITC-BT-19 Tabla 4 / IEC 60364-5-52 Tabla B.52.17
 *
 * Aplica cuando varios circuitos discurren agrupados (en el mismo tubo,
 * bandeja o en contacto).
 *
 * Estructura: Cg[nCircuitos]
 * NOTA: Aplica a métodos A1, A2, B1, B2, C, E, F (NO aplica a enterrados D)
 */
export const CORRECTION_FACTOR_CG: Record<number, number> = {
  1:  1.00,
  2:  0.80,
  3:  0.70,
  4:  0.65,
  5:  0.60,
  6:  0.57,
  7:  0.54,
  8:  0.52,
  9:  0.50,
  10: 0.48,
  12: 0.45,
  14: 0.43,
  16: 0.41,
  20: 0.38,
};

/**
 * Obtiene el factor de corrección de agrupamiento Cg.
 * Para nCircuitos > 20, se aplica el valor de 20 (conservador).
 * Para instalaciones enterradas (método D), devuelve 1.0 (tabla D es diferente).
 */
export function getCorrectionFactorCg(
  nCircuits: number,
  method: string
): number {
  // Enterrado tiene su propia tabla, no aplica este factor
  if (method === "D") return 1.0;

  const clampedN = Math.min(nCircuits, 20);

  // Buscar el valor más cercano en la tabla (por debajo o igual)
  const tableKeys = Object.keys(CORRECTION_FACTOR_CG).map(Number).sort((a, b) => a - b);
  let factor = 1.0;
  for (const k of tableKeys) {
    if (k <= clampedN) factor = CORRECTION_FACTOR_CG[k]!;
  }

  return factor;
}

// ─── FACTOR Ct — Corrección por resistividad del terreno (enterrados) ─────

/**
 * Tabla Ct — Factor de corrección para cables enterrados (método D)
 * por resistividad térmica del terreno
 * Fuente: ITC-BT-07 / IEC 60364-5-52 Tabla B.52.16
 *
 * Resistividad de referencia (tabla D): 2.5 K·m/W
 */
export const CORRECTION_FACTOR_CT: Record<number, number> = {
  0.5: 1.28,
  0.7: 1.20,
  1.0: 1.18,
  1.5: 1.10,
  2.0: 1.05,
  2.5: 1.00,  // Valor de referencia
  3.0: 0.96,
  3.5: 0.93,
  4.0: 0.90,
};

/**
 * Obtiene el factor de corrección de resistividad del terreno Ct.
 * Solo aplica a instalaciones enterradas (método D).
 */
export function getCorrectionFactorCt(
  soilResistivityKmW: number
): number {
  const keys = Object.keys(CORRECTION_FACTOR_CT).map(Number).sort((a, b) => a - b);

  // Interpolación lineal
  for (let i = 0; i < keys.length - 1; i++) {
    const r1 = keys[i]!;
    const r2 = keys[i + 1]!;
    if (soilResistivityKmW >= r1 && soilResistivityKmW <= r2) {
      const ct1 = CORRECTION_FACTOR_CT[r1]!;
      const ct2 = CORRECTION_FACTOR_CT[r2]!;
      return ct1 + ((soilResistivityKmW - r1) / (r2 - r1)) * (ct2 - ct1);
    }
  }

  if (soilResistivityKmW <= keys[0]!) return CORRECTION_FACTOR_CT[keys[0]!]!;
  if (soilResistivityKmW >= keys[keys.length - 1]!) return CORRECTION_FACTOR_CT[keys[keys.length - 1]!]!;

  return 1.0;
}

// ─── Función combinada ────────────────────────────────────────────────────

export interface CorrectionFactors {
  Ca: number;
  Cg: number;
  Ct: number;
  combined: number;
}

/**
 * Calcula todos los factores de corrección aplicables y el producto combinado.
 */
export function getCorrectionFactors(params: {
  insulationType: "PVC" | "XLPE" | "EPR";
  ambientTempC: number;
  groupingCircuits: number;
  method: string;
  soilResistivityKmW?: number;
}): CorrectionFactors {
  const Ca = getCorrectionFactorCa(params.insulationType, params.ambientTempC);
  const Cg = getCorrectionFactorCg(params.groupingCircuits, params.method);
  const Ct = params.method === "D" && params.soilResistivityKmW !== undefined
    ? getCorrectionFactorCt(params.soilResistivityKmW)
    : 1.0;

  return {
    Ca,
    Cg,
    Ct,
    combined: Ca * Cg * Ct,
  };
}
