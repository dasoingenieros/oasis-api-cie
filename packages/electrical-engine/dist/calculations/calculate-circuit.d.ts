/**
 * CÁLCULO COMPLETO DE CIRCUITO — Función principal del motor
 *
 * Dos modos de operación:
 *
 * 1. CIRCUITOS TIPO ITC-BT-25 (C1-C12):
 *    - Sección, PIA, intensidad → directos de la tabla ITC-BT-25
 *    - Potencia de cálculo = V × I_PIA
 *    - Solo se calcula CdT para verificar; si excede límite, se sube sección
 *    - Nº conductores: 2 (mono) / 4 (tri)
 *
 * 2. CIRCUITOS CUSTOM:
 *    - Cálculo completo: intensidad nominal, criterio térmico, CdT, PIA
 *    - Igual que antes (calculateNominalCurrent + selectSection + selectPIA)
 *
 * Si cualquier cálculo falla lanza EngineError con code y circuitId.
 */
import type { CircuitInput, CircuitResult } from "../types";
/**
 * Calcula un circuito completo.
 * Detecta automáticamente si es tipo ITC-BT-25 o CUSTOM y aplica la lógica correcta.
 */
export declare function calculateCircuit(input: CircuitInput): CircuitResult;
//# sourceMappingURL=calculate-circuit.d.ts.map