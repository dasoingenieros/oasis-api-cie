/**
 * CÁLCULO DE INSTALACIÓN — Conjunto de circuitos
 *
 * Recibe un array de CircuitInput y devuelve InstallationResult con
 * resultados por circuito, resumen global y errores.
 * Procesa los circuitos en paralelo con Promise.all.
 */
import type { CircuitInput, CircuitResult } from "../types";
export interface InstallationSummary {
    totalPowerW: number;
    maxSectionMm2: number;
    maxVoltageDropPct: number;
}
export interface CircuitError {
    circuitId: string;
    errors: string[];
}
export interface InstallationResult {
    circuits: CircuitResult[];
    summary: InstallationSummary;
    circuitErrors: CircuitError[];
    isValid: boolean;
}
/**
 * Calcula todos los circuitos de una instalación en paralelo.
 *
 * @param inputs Array de CircuitInput
 * @returns InstallationResult con resultados, resumen y errores
 */
export declare function calculateInstallation(inputs: CircuitInput[]): Promise<InstallationResult>;
//# sourceMappingURL=calculate-installation.d.ts.map