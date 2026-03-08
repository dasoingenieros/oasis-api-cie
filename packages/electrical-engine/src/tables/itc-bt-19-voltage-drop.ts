/**
 * ITC-BT-19 (COMPLEMENTO) — CAÍDA DE TENSIÓN EN INSTALACIONES INTERIORES
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-19 §2.2 / ITC-BT-15 §3
 *
 * Límites de caída de tensión acumulada desde el origen de la instalación
 * hasta el punto de utilización más desfavorable:
 *
 *   Alumbrado:    CdT_total ≤ 3%   (desde CGMP)
 *   Fuerza motriz: CdT_total ≤ 5%  (desde CGMP)
 *
 * NOTA: Estos límites son ACUMULADOS (incluyendo la derivación individual si
 * la hay). El límite de la DI ya consume 1% (ITC-BT-15), por lo que el
 * margen disponible en la instalación interior es:
 *   Alumbrado: 3% - 1% DI = 2% disponible en instalación interior
 *   Fuerza:    5% - 1% DI = 4% disponible en instalación interior
 *
 * Para simplificar en el MVP, se aplicarán los límites totales (3%/5%)
 * medidos desde la entrada del CGMP, sin contar la DI.
 */

import { getResistivityAtTemp } from "./itc-bt-14";
import type { PhaseSystem, ConductorMaterial, InsulationType } from "../types";

// ─── Límites CdT ─────────────────────────────────────────────────────────

export type CircuitLoadType = "lighting" | "power";

export const CDT_LIMITS_PCT: Record<CircuitLoadType, number> = {
  lighting: 3,   // 3% para circuitos de alumbrado
  power:    5,   // 5% para circuitos de fuerza motriz y uso general
};

/**
 * Determina el tipo de carga (alumbrado o fuerza) por el código de circuito.
 * ITC-BT-19 §2.2
 */
export function getLoadType(circuitCode: string): CircuitLoadType {
  const lightingCircuits = ["C1", "C6", "C11"]; // Alumbrado y domótica
  return lightingCircuits.includes(circuitCode) ? "lighting" : "power";
}

// ─── Cálculo de CdT en instalaciones interiores ───────────────────────────

export interface VoltagDropInput {
  nominalCurrentA: number;       // Intensidad de diseño (A)
  lengthM: number;               // Longitud del tramo (m) — un sentido
  sectionMm2: number;            // Sección del conductor de fase (mm²)
  phaseSystem: PhaseSystem;
  conductorMaterial: ConductorMaterial;
  insulationType: InsulationType;
  powerFactor: number;           // cosφ — 1.0 para resistivo, <1 para inductivo
  conductorTempC?: number;       // Temperatura de servicio (default según aislamiento)
  voltageV?: number;
  upstreamCdtPct?: number;       // CdT acumulada aguas arriba (%)
  circuitCode?: string;          // Para determinar límite automáticamente
}

export interface VoltageDropResult {
  voltageDropPct: number;        // CdT de este tramo (%)
  voltageDropV: number;          // CdT en voltios
  accumulatedCdtPct: number;    // CdT acumulada total (%)
  limitPct: number;              // Límite aplicable (3% o 5%)
  isCompliant: boolean;
  marginPct: number;             // Margen disponible (%)
  minSectionMm2: number;        // Sección mínima para cumplir límite
}

/**
 * Calcula la caída de tensión de un tramo y verifica el cumplimiento.
 * ITC-BT-19 §2.2
 *
 * Fórmulas:
 *   Monofásica: ΔU = 2 × I × L × (R×cosφ + X×sinφ)  [V]
 *   Trifásica:  ΔU = √3 × I × L × (R×cosφ + X×sinφ)  [V]
 *
 *   R = ρ_T / S  [Ω/m]  (solo componente resistiva, X despreciable < 50mm²)
 *   %ΔU = (ΔU / V_nominal) × 100
 */
export function calculateVoltageDrop(input: VoltagDropInput): VoltageDropResult {
  const SQRT3 = Math.sqrt(3);
  const V = input.voltageV ?? (input.phaseSystem === "three" ? 400 : 230);
  const tempC = input.conductorTempC ?? (input.insulationType === "PVC" ? 70 : 90);

  // Resistividad a temperatura de servicio
  const rho = getResistivityAtTemp(input.conductorMaterial, tempC); // Ω·mm²/m
  const R_per_m = rho / input.sectionMm2; // Ω/m

  const cosφ = input.powerFactor;
  const sinφ = Math.sqrt(Math.max(0, 1 - cosφ ** 2));

  // Reactancia (solo significativa ≥ 50mm², para instalaciones interiores típicas ≈ 0)
  const X_per_m = input.sectionMm2 >= 50 ? 0.00009 : 0; // Ω/m aprox

  // ΔU en voltios
  let deltaU: number;
  if (input.phaseSystem === "three") {
    deltaU = SQRT3 * input.nominalCurrentA * input.lengthM * (R_per_m * cosφ + X_per_m * sinφ);
  } else {
    deltaU = 2 * input.nominalCurrentA * input.lengthM * (R_per_m * cosφ + X_per_m * sinφ);
  }

  const voltageDropPct = (deltaU / V) * 100;
  const upstreamCdt = input.upstreamCdtPct ?? 0;
  const accumulatedCdtPct = voltageDropPct + upstreamCdt;

  // Límite aplicable
  const loadType = input.circuitCode ? getLoadType(input.circuitCode) : "power";
  const limitPct = CDT_LIMITS_PCT[loadType];
  const isCompliant = accumulatedCdtPct <= limitPct;
  const marginPct = limitPct - accumulatedCdtPct;

  // Sección mínima para cumplir el límite
  const maxDeltaU_V = V * (limitPct - upstreamCdt) / 100;
  let minSectionMm2: number;
  if (input.phaseSystem === "three") {
    minSectionMm2 = (SQRT3 * input.nominalCurrentA * input.lengthM * rho * cosφ) / maxDeltaU_V;
  } else {
    minSectionMm2 = (2 * input.nominalCurrentA * input.lengthM * rho * cosφ) / maxDeltaU_V;
  }

  return {
    voltageDropPct: Math.round(voltageDropPct * 1000) / 1000,
    voltageDropV: Math.round(deltaU * 1000) / 1000,
    accumulatedCdtPct: Math.round(accumulatedCdtPct * 1000) / 1000,
    limitPct,
    isCompliant,
    marginPct: Math.round(marginPct * 1000) / 1000,
    minSectionMm2: Math.max(0, Math.ceil(minSectionMm2 * 100) / 100),
  };
}
