/**
 * CÁLCULO DE INTENSIDAD NOMINAL
 *
 * Normativa: ITC-BT-19, ITC-BT-47
 *
 * Fórmulas:
 *   Monofásica: In = P / (V × cosφ)
 *   Trifásica:  In = P / (√3 × V × cosφ)
 *
 * Con factores de simultaneidad y utilización:
 *   P_efectiva = P_instalada × Ks × Fu
 *   In = P_efectiva / (V_fase × cosφ)
 */
import type { PhaseSystem, JustificationStep } from "../types";
export interface NominalCurrentInput {
    phaseSystem: PhaseSystem;
    loadPowerW: number;
    powerFactor: number;
    simultaneityFactor?: number;
    loadFactor?: number;
    voltageV?: number;
    circuitId?: string;
}
export interface NominalCurrentResult {
    nominalCurrentA: number;
    effectivePowerW: number;
    voltageV: number;
    phaseSystem: PhaseSystem;
    powerFactor: number;
    simultaneityFactor: number;
    loadFactor: number;
    steps: JustificationStep[];
}
/**
 * Calcula la intensidad nominal de un circuito según REBT.
 *
 * @param input Parámetros del circuito
 * @returns Intensidad nominal y trazabilidad de cálculo
 * @throws EngineError si los parámetros son inválidos
 */
export declare function calculateNominalCurrent(input: NominalCurrentInput): NominalCurrentResult;
//# sourceMappingURL=nominal-current.d.ts.map