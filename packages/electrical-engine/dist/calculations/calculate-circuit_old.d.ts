/**
 * CÁLCULO COMPLETO DE CIRCUITO — Función principal del motor
 *
 * Orquesta calculateNominalCurrent(), selectSection() y generateJustification().
 * Devuelve un CircuitResult completo con sección, protecciones, CdT,
 * tubo, justificación y validez.
 *
 * Si cualquier cálculo falla lanza EngineError con code y circuitId.
 */
import type { CircuitInput, CircuitResult } from "../types";
/**
 * Calcula un circuito completo orquestando todas las funciones del motor.
 *
 * @param input Datos del circuito
 * @returns CircuitResult con sección, protecciones, CdT, tubo, justificación
 * @throws EngineError si cualquier cálculo falla
 */
export declare function calculateCircuit(input: CircuitInput): CircuitResult;
//# sourceMappingURL=calculate-circuit_old.d.ts.map