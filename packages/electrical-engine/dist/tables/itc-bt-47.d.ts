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
export type MotorStartType = "direct" | "star_delta" | "vfd" | "soft_starter";
export interface StartTypeSpec {
    type: MotorStartType;
    label: string;
    startCurrentFactor: {
        min: number;
        max: number;
    };
    recommendedCurve: BreakerCurve;
    notes: string;
}
export declare const MOTOR_START_TYPES: Record<MotorStartType, StartTypeSpec>;
export declare const MOTOR_EFFICIENCY_TYPICAL: Partial<Record<number, number>>;
export declare const MOTOR_POWER_FACTOR_TYPICAL: Partial<Record<number, number>>;
export interface MotorInput {
    shaftPowerKW: number;
    phaseSystem: PhaseSystem;
    efficiency?: number;
    powerFactor?: number;
    voltageV?: number;
    startType?: MotorStartType;
}
export interface MotorResult {
    nominalCurrentA: number;
    designCurrentA: number;
    startCurrentA: number;
    electricalPowerW: number;
    efficiency: number;
    powerFactor: number;
    recommendedCurve: BreakerCurve;
    minPIARatingA: number;
    warnings: string[];
}
/**
 * Calcula la corriente nominal de un motor y los parámetros de diseño.
 * ITC-BT-47 §2 y §3
 */
export declare function calculateMotorCurrent(input: MotorInput): MotorResult;
/**
 * Para motores, la intensidad de diseño que se usa para seleccionar sección
 * y protección es siempre 1.25 × In_motor (ITC-BT-47 §2).
 *
 * Esta función devuelve el Ib efectivo que debe usarse en selectSection().
 */
export declare function getMotorDesignCurrent(nominalCurrentA: number): number;
//# sourceMappingURL=itc-bt-47.d.ts.map