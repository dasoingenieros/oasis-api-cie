/**
 * ITC-BT-47 — INSTALACIONES DE RECEPTORES. MOTORES
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-47
 *
 * Los motores tienen características especiales frente a otras cargas:
 *   1. Corriente de arranque elevada (5–10× In en arranque directo)
 *   2. Factor de potencia inductivo (cosφ ≈ 0.75–0.90)
 *   3. Rendimiento η que reduce la potencia eléctrica absorbida
 *
 * ─────────────────────────────────────────────────────────────────────────
 * REGLAS ITC-BT-47:
 *
 * §1 — Circuito exclusivo:
 *   Motores > 0.75 kW deben tener circuito exclusivo.
 *
 * §2 — Factor 1.25 sobre In del motor:
 *   El conductor y la protección se dimensionan para 1.25 × In_motor.
 *   Ib_diseño = 1.25 × In_motor
 *
 * §3 — Corriente de arranque:
 *   - Arranque directo: Ia ≈ 5–8 × In (momentáneo, 1–10s)
 *   - Estrella-triángulo: Ia ≈ 1.5–2.5 × In
 *   - Variador de frecuencia: Ia ≈ 1.0–1.5 × In
 *   La protección no debe disparar durante el arranque.
 *
 * §4 — Protección:
 *   - PIA curva D para arranque directo (10–20× In): no dispara en arranque
 *   - PIA curva C para arranque Y/D o con VFD
 *   - Relé térmico o guardamotor para protección sobrecarga
 * ─────────────────────────────────────────────────────────────────────────
 */

import type { BreakerCurve, PhaseSystem } from "../types";
import { NORMALIZED_BREAKER_RATINGS } from "../types";

// ─── Tipos de arranque de motor ───────────────────────────────────────────

export type MotorStartType =
  | "direct"          // Arranque directo (DOL — Direct On Line)
  | "star_delta"      // Arranque estrella-triángulo (Y/D)
  | "vfd"             // Variador de frecuencia (VFD/Drive)
  | "soft_starter";   // Arrancador progresivo (soft-starter)

export interface StartTypeSpec {
  type: MotorStartType;
  label: string;
  startCurrentFactor: { min: number; max: number };  // Múltiplo de In
  recommendedCurve: BreakerCurve;
  notes: string;
}

export const MOTOR_START_TYPES: Record<MotorStartType, StartTypeSpec> = {
  direct: {
    type: "direct",
    label: "Arranque directo (DOL)",
    startCurrentFactor: { min: 5, max: 8 },
    recommendedCurve: "D",
    notes: "Corriente de arranque 5–8× In. Usar PIA curva D. Solo para motores pequeños (≤ 4kW en monofásico, ≤ 11kW trifásico).",
  },
  star_delta: {
    type: "star_delta",
    label: "Arranque estrella-triángulo (Y/D)",
    startCurrentFactor: { min: 1.5, max: 2.5 },
    recommendedCurve: "C",
    notes: "Reduce corriente de arranque a 1/3 del DOL. Requiere motor con 6 bornes accesibles. PIA curva C.",
  },
  vfd: {
    type: "vfd",
    label: "Variador de frecuencia (VFD)",
    startCurrentFactor: { min: 1.0, max: 1.5 },
    recommendedCurve: "C",
    notes: "Arranque suave con control total de velocidad. Diferencial tipo A o F obligatorio. PIA curva C.",
  },
  soft_starter: {
    type: "soft_starter",
    label: "Arrancador progresivo (Soft-Starter)",
    startCurrentFactor: { min: 2.0, max: 4.0 },
    recommendedCurve: "C",
    notes: "Rampa de arranque ajustable. PIA curva C. Más económico que VFD para aplicaciones sin regulación de velocidad.",
  },
};

// ─── Rendimientos típicos de motores (%) ──────────────────────────────────

export const MOTOR_EFFICIENCY_TYPICAL: Partial<Record<number, number>> = {
  // Potencia motor (kW) → rendimiento típico IE3 (%)
  0.25: 0.68,
  0.37: 0.71,
  0.55: 0.74,
  0.75: 0.77,
  1.1:  0.81,
  1.5:  0.84,
  2.2:  0.86,
  3.0:  0.87,
  4.0:  0.88,
  5.5:  0.89,
  7.5:  0.90,
  11.0: 0.91,
  15.0: 0.92,
  18.5: 0.92,
  22.0: 0.93,
  30.0: 0.93,
  37.0: 0.94,
  45.0: 0.94,
  55.0: 0.95,
  75.0: 0.95,
};

// Factores de potencia típicos de motores
export const MOTOR_POWER_FACTOR_TYPICAL: Partial<Record<number, number>> = {
  // A plena carga
  0.25: 0.70,
  0.55: 0.72,
  0.75: 0.75,
  1.1:  0.78,
  1.5:  0.80,
  2.2:  0.81,
  4.0:  0.83,
  7.5:  0.85,
  11.0: 0.87,
  15.0: 0.88,
  22.0: 0.89,
  30.0: 0.90,
  45.0: 0.91,
  75.0: 0.92,
};

// ─── Cálculo de corriente de motor ───────────────────────────────────────

export interface MotorInput {
  shaftPowerKW: number;          // Potencia mecánica en el eje (kW) — dato de placa
  phaseSystem: PhaseSystem;
  efficiency?: number;           // Rendimiento η (0–1) — default: típico IE3
  powerFactor?: number;          // cosφ — default: típico para la potencia
  voltageV?: number;
  startType?: MotorStartType;
}

export interface MotorResult {
  nominalCurrentA: number;       // In del motor a plena carga (A)
  designCurrentA: number;        // Ib_diseño = 1.25 × In (ITC-BT-47)
  startCurrentA: number;         // Corriente de arranque máxima (A)
  electricalPowerW: number;      // Potencia eléctrica absorbida P_elec = P_mec / η
  efficiency: number;
  powerFactor: number;
  recommendedCurve: BreakerCurve;
  minPIARatingA: number;         // PIA mínimo para Ib_diseño
  warnings: string[];
}

/**
 * Calcula la corriente nominal de un motor y los parámetros de diseño.
 * ITC-BT-47 §2 y §3
 */
export function calculateMotorCurrent(input: MotorInput): MotorResult {
  const SQRT3 = Math.sqrt(3);
  const V = input.voltageV ?? (input.phaseSystem === "three" ? 400 : 230);
  const warnings: string[] = [];

  // Rendimiento y cosφ: usar valor típico si no se indica
  const P_kW = input.shaftPowerKW;
  const eta = input.efficiency ?? (MOTOR_EFFICIENCY_TYPICAL[P_kW] ?? 0.88);
  const cosφ = input.powerFactor ?? (MOTOR_POWER_FACTOR_TYPICAL[P_kW] ?? 0.85);
  const startType = input.startType ?? "direct";

  // Potencia eléctrica absorbida
  const P_elec_W = (P_kW * 1000) / eta;

  // Corriente nominal (placa del motor)
  const In = input.phaseSystem === "three"
    ? P_elec_W / (SQRT3 * V * cosφ)
    : P_elec_W / (V * cosφ);

  // Corriente de diseño: 1.25 × In (ITC-BT-47 §2)
  const Ib_design = 1.25 * In;

  // Corriente de arranque
  const startSpec = MOTOR_START_TYPES[startType];
  const startCurrentA = In * startSpec.startCurrentFactor.max;

  // PIA mínimo para Ib_diseño
  const minPIA = NORMALIZED_BREAKER_RATINGS.find(r => r >= Ib_design) ?? 250;

  // Advertencias
  if (P_kW > 0.75 && input.phaseSystem === "single") {
    warnings.push("ITC-BT-47 §1: Motores > 0.75kW requieren circuito exclusivo.");
  }
  if (startType === "direct" && P_kW > 11) {
    warnings.push("ITC-BT-47 §3: Para motores > 11kW trifásico, se recomienda arranque Y/D o VFD.");
  }

  return {
    nominalCurrentA: Math.round(In * 100) / 100,
    designCurrentA: Math.round(Ib_design * 100) / 100,
    startCurrentA: Math.round(startCurrentA * 100) / 100,
    electricalPowerW: Math.round(P_elec_W),
    efficiency: eta,
    powerFactor: cosφ,
    recommendedCurve: startSpec.recommendedCurve,
    minPIARatingA: minPIA,
    warnings,
  };
}

// ─── Corrección de la intensidad admisible para motores ──────────────────

/**
 * Para motores, la intensidad de diseño que se usa para seleccionar sección
 * y protección es siempre 1.25 × In_motor (ITC-BT-47 §2).
 *
 * Esta función devuelve el Ib efectivo que debe usarse en selectSection().
 */
export function getMotorDesignCurrent(nominalCurrentA: number): number {
  return nominalCurrentA * 1.25;
}
