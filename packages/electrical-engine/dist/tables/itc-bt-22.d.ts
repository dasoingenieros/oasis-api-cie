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
export type KConstantKey = "Cu_PVC" | "Cu_XLPE" | "Cu_EPR" | "Al_PVC" | "Al_XLPE";
/**
 * Constante K para la energía específica admisible del conductor (I²t ≤ K²×S²).
 * Depende del material conductor y del aislamiento.
 * Fuente: IEC 60364-4-43 Tabla 43A
 */
export declare const K_CONSTANT: Record<KConstantKey, number>;
export declare function getKConstant(material: ConductorMaterial, insulation: InsulationType): number;
export interface BreakerCharacteristics {
    curve: BreakerCurve;
    magneticTripMin: number;
    magneticTripMax: number;
    I2factor: number;
    typicalApplications: string;
}
export declare const BREAKER_CHARACTERISTICS: Record<BreakerCurve, BreakerCharacteristics>;
export declare const BREAKING_CAPACITY_KA: readonly [1.5, 3, 4.5, 6, 10, 15, 20, 25];
export type BreakingCapacityKA = (typeof BREAKING_CAPACITY_KA)[number];
export declare const MIN_BREAKING_CAPACITY_KA: {
    readonly residential: 6;
    readonly commercial: 10;
    readonly industrial: 15;
};
export interface PIASelectionInput {
    Ib: number;
    Iz: number;
    curve?: BreakerCurve;
    IccMaxKA?: number;
}
export interface PIASelectionResult {
    ratingA: BreakerRating;
    curve: BreakerCurve;
    breakingCapacityKA: BreakingCapacityKA;
    condition1: {
        Ib: number;
        In: number;
        Iz: number;
        ok: boolean;
    };
    condition2: {
        I2: number;
        Iz145: number;
        ok: boolean;
    };
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
export declare function selectPIA(input: PIASelectionInput): PIASelectionResult;
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
export declare function verifyShortCircuitCapacity(params: {
    IccA: number;
    breakerClearingTimeS: number;
    sectionMm2: number;
    K: number;
}): {
    I2t: number;
    K2S2: number;
    isCompliant: boolean;
    maxClearingTimeS: number;
};
/**
 * Comprueba selectividad básica entre PIA de circuito y IGA/ID aguas arriba.
 * Condición mínima: In_circuito < In_IGA (no hay selectividad total garantizada,
 * pero al menos el PIA de menor calibre actúa antes por zona de corrientes moderadas).
 */
export declare function checkSelectivity(params: {
    downstreamRatingA: number;
    upstreamRatingA: number;
}): {
    isSelective: boolean;
    warning?: string;
};
//# sourceMappingURL=itc-bt-22.d.ts.map