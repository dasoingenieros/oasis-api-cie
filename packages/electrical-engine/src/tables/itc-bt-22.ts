/**
 * ITC-BT-22 — PROTECCIÓN CONTRA SOBREINTENSIDADES
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-22
 *
 * Establece las condiciones que deben cumplir los dispositivos de
 * protección contra sobreintensidades (sobrecargas y cortocircuitos).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONDICIONES DE PROTECCIÓN (ITC-BT-22 §1):
 *
 * Para protección contra SOBRECARGA:
 *   Condición 1: Ib ≤ In ≤ Iz
 *   Condición 2: I2 ≤ 1.45 × Iz
 *
 *   Donde:
 *   Ib = intensidad de diseño del circuito (A)
 *   In = intensidad nominal del dispositivo de protección (A)
 *   Iz = intensidad admisible del conductor, con factores corrección (A)
 *   I2 = corriente que asegura el disparo efectivo del dispositivo
 *        Para PIAs (IEC 60898): I2 = 1.45 × In
 *        Para fusibles tipo gG: I2 = 1.6 × In (hasta 16A) / 1.25 × In (> 16A)
 *
 * Para protección contra CORTOCIRCUITO:
 *   El poder de corte del dispositivo (Icc_nominal) debe ser ≥ Icc_max en ese punto.
 *   La energía disipada I²t durante el cortocircuito no puede superar la
 *   que soporta el conductor: I²t ≤ K² × S²
 *   Donde K = 115 (Cu/PVC), K = 143 (Cu/XLPE), K = 74 (Al/PVC), K = 94 (Al/XLPE)
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { BreakerRating, BreakerCurve, InsulationType, ConductorMaterial } from "../types";
import { NORMALIZED_BREAKER_RATINGS } from "../types";

// ─── Constante K para cálculo I²t (ITC-BT-22 §2 / IEC 60364-4-43) ───────

export type KConstantKey = "Cu_PVC" | "Cu_XLPE" | "Cu_EPR" | "Al_PVC" | "Al_XLPE";

/**
 * Constante K para la energía específica admisible del conductor (I²t ≤ K²×S²).
 * Depende del material conductor y del aislamiento.
 * Fuente: IEC 60364-4-43 Tabla 43A
 */
export const K_CONSTANT: Record<KConstantKey, number> = {
  Cu_PVC:   115,   // A·s^0.5 / mm²
  Cu_XLPE:  143,
  Cu_EPR:   143,
  Al_PVC:    74,
  Al_XLPE:   94,
};

export function getKConstant(
  material: ConductorMaterial,
  insulation: InsulationType
): number {
  const key = `${material}_${insulation}` as KConstantKey;
  return K_CONSTANT[key] ?? 115; // fallback conservador Cu/PVC
}

// ─── Características de disparo de PIAs (IEC 60898) ──────────────────────

export interface BreakerCharacteristics {
  curve: BreakerCurve;
  magneticTripMin: number;   // Múltiplo mínimo de In para disparo magnético
  magneticTripMax: number;   // Múltiplo máximo de In para disparo magnético
  I2factor: number;          // I2 = I2factor × In (corriente de disparo térmico)
  typicalApplications: string;
}

export const BREAKER_CHARACTERISTICS: Record<BreakerCurve, BreakerCharacteristics> = {
  B: {
    curve: "B",
    magneticTripMin: 3,
    magneticTripMax: 5,
    I2factor: 1.45,
    typicalApplications: "Cargas resistivas puras, alumbrado incandescente/LED, líneas largas con baja Icc",
  },
  C: {
    curve: "C",
    magneticTripMin: 5,
    magneticTripMax: 10,
    I2factor: 1.45,
    typicalApplications: "Uso general doméstico e industrial. Motores pequeños, transformadores, cargas mixtas.",
  },
  D: {
    curve: "D",
    magneticTripMin: 10,
    magneticTripMax: 20,
    I2factor: 1.45,
    typicalApplications: "Cargas con elevada corriente de arranque: motores grandes, transformadores, soldadoras.",
  },
};

// ─── Poderes de corte normalizados (kA) IEC 60898 ────────────────────────

export const BREAKING_CAPACITY_KA = [1.5, 3, 4.5, 6, 10, 15, 20, 25] as const;
export type BreakingCapacityKA = (typeof BREAKING_CAPACITY_KA)[number];

// Poder de corte mínimo por tipo de instalación (ITC-BT-22 §3)
export const MIN_BREAKING_CAPACITY_KA = {
  residential: 6,    // kA — viviendas
  commercial: 10,    // kA — locales comerciales / oficinas
  industrial: 15,    // kA — instalaciones industriales
} as const;

// ─── Selección automática de PIA ─────────────────────────────────────────

export interface PIASelectionInput {
  Ib: number;                // Intensidad de diseño (A)
  Iz: number;                // Intensidad admisible conductor con corrección (A)
  curve?: BreakerCurve;      // Curva preferida (default: C)
  IccMaxKA?: number;         // Icc máxima en el punto de instalación (kA)
}

export interface PIASelectionResult {
  ratingA: BreakerRating;
  curve: BreakerCurve;
  breakingCapacityKA: BreakingCapacityKA;
  condition1: { Ib: number; In: number; Iz: number; ok: boolean };
  condition2: { I2: number; Iz145: number; ok: boolean };
  isValid: boolean;
  warnings: string[];
}

/**
 * Selecciona automáticamente el PIA que cumple ITC-BT-22 §1.
 *
 * Proceso:
 *   1. In mínimo = valor normalizado ≥ Ib
 *   2. In máximo = Iz (condición 1a)
 *   3. Verificar condición 2: 1.45×In ≤ 1.45×Iz ✓ siempre si In ≤ Iz
 *   4. Seleccionar poder de corte ≥ Icc_max
 */
export function selectPIA(input: PIASelectionInput): PIASelectionResult {
  const curve = input.curve ?? "C";
  const warnings: string[] = [];

  // Buscar calibre mínimo ≥ Ib
  let selectedRating: BreakerRating | undefined;
  for (const rating of NORMALIZED_BREAKER_RATINGS) {
    if (rating >= input.Ib && rating <= input.Iz) {
      selectedRating = rating;
      break;
    }
  }

  // Si no hay ninguno que cumpla Ib ≤ In ≤ Iz, hay que aumentar sección del conductor
  if (selectedRating === undefined) {
    // Usar el más cercano a Ib por encima como fallback y marcar error
    selectedRating = NORMALIZED_BREAKER_RATINGS.find(r => r >= input.Ib) ?? NORMALIZED_BREAKER_RATINGS[NORMALIZED_BREAKER_RATINGS.length - 1]!;
    warnings.push(
      `ITC-BT-22: No existe calibre normalizado que cumpla ${input.Ib.toFixed(1)}A ≤ In ≤ ${input.Iz.toFixed(1)}A. ` +
      `Aumentar sección del conductor o reducir la carga.`
    );
  }

  const I2 = selectedRating * BREAKER_CHARACTERISTICS[curve].I2factor;
  const Iz145 = input.Iz * 1.45;
  const cond1Ok = input.Ib <= selectedRating && selectedRating <= input.Iz;
  const cond2Ok = I2 <= Iz145;

  // Seleccionar poder de corte
  const IccMax = input.IccMaxKA ?? 6;
  const breakingCapacity = BREAKING_CAPACITY_KA.find(bc => bc >= IccMax) ?? 25;

  if (!cond2Ok) {
    warnings.push(`ITC-BT-22: Condición 2 no cumplida: I2 (${I2.toFixed(1)}A) > 1.45×Iz (${Iz145.toFixed(1)}A). Revisar sección.`);
  }

  return {
    ratingA: selectedRating,
    curve,
    breakingCapacityKA: breakingCapacity,
    condition1: { Ib: input.Ib, In: selectedRating, Iz: input.Iz, ok: cond1Ok },
    condition2: { I2, Iz145, ok: cond2Ok },
    isValid: cond1Ok && cond2Ok,
    warnings,
  };
}

// ─── Verificación de capacidad de cortocircuito ───────────────────────────

/**
 * Verifica que la energía disipada durante un cortocircuito no daña el conductor.
 * Condición: I²t ≤ K² × S²
 * Equivalente: Icc ≤ K × S / √t
 *
 * @param IccA Corriente de cortocircuito en el punto (A)
 * @param breakerClearingTimeS Tiempo de actuación del PIA (s) — típico 0.01s a 0.1s
 * @param sectionMm2 Sección del conductor (mm²)
 * @param K Constante del conductor (de K_CONSTANT)
 */
export function verifyShortCircuitCapacity(params: {
  IccA: number;
  breakerClearingTimeS: number;
  sectionMm2: number;
  K: number;
}): { I2t: number; K2S2: number; isCompliant: boolean; maxClearingTimeS: number } {
  const I2t = params.IccA ** 2 * params.breakerClearingTimeS;
  const K2S2 = params.K ** 2 * params.sectionMm2 ** 2;
  const maxClearingTimeS = K2S2 / (params.IccA ** 2);

  return {
    I2t: Math.round(I2t),
    K2S2: Math.round(K2S2),
    isCompliant: I2t <= K2S2,
    maxClearingTimeS: Math.round(maxClearingTimeS * 10000) / 10000,
  };
}

// ─── Selectividad entre protecciones ─────────────────────────────────────

/**
 * Comprueba selectividad básica entre PIA de circuito y IGA/ID aguas arriba.
 * Condición mínima: In_circuito < In_IGA (no hay selectividad total garantizada,
 * pero al menos el PIA de menor calibre actúa antes por zona de corrientes moderadas).
 */
export function checkSelectivity(params: {
  downstreamRatingA: number;   // PIA del circuito
  upstreamRatingA: number;     // IGA o PIA de cabecera
}): { isSelective: boolean; warning?: string } {
  if (params.downstreamRatingA >= params.upstreamRatingA) {
    return {
      isSelective: false,
      warning: `Posible falta de selectividad: PIA circuito (${params.downstreamRatingA}A) ≥ IGA (${params.upstreamRatingA}A). Verificar curvas de actuación.`,
    };
  }
  return { isSelective: true };
}
