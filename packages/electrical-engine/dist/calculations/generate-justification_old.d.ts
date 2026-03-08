/**
 * GENERACIÓN DE MEMORIA TÉCNICA — Justificación paso a paso
 *
 * Genera una memoria técnica con cada cálculo justificado, citando
 * los artículos exactos del REBT (ITC-BT-19, ITC-BT-22, ITC-BT-25, etc.).
 *
 * Recibe CircuitInput y SelectSectionResult; devuelve array de pasos
 * con trazabilidad completa.
 */
import type { CircuitInput } from "../types";
import type { SelectSectionResult } from "./select-section";
export interface TechnicalJustificationStep {
    step: number;
    concept: string;
    formula: string;
    values: Record<string, number | string>;
    result: number | string;
    normRef: string;
}
/**
 * Genera la memoria técnica paso a paso para un circuito.
 *
 * @param input Datos del circuito
 * @param selectResult Resultado de selectSection()
 * @returns Array de JustificationStep, nunca vacío
 */
export declare function generateJustification(input: CircuitInput, selectResult: SelectSectionResult): TechnicalJustificationStep[];
//# sourceMappingURL=generate-justification_old.d.ts.map