/**
 * GENERACIÓN DE MEMORIA TÉCNICA — Justificación paso a paso
 *
 * Dos funciones:
 * 1. generateJustification() — para circuitos CUSTOM (cálculo completo)
 * 2. generateItcBt25Justification() — para circuitos tipo ITC-BT-25 (valores de tabla)
 */
import type { CircuitInput } from "../types";
import type { SelectSectionResult } from "./select-section";
import type { VoltageDropResult } from "../tables/itc-bt-19-voltage-drop";
export interface TechnicalJustificationStep {
    step: number;
    concept: string;
    formula: string;
    values: Record<string, number | string>;
    result: number | string;
    normRef: string;
}
export interface ItcBt25JustificationParams {
    sectionMm2: number;
    originalSectionMm2: number;
    sectionIncreased: boolean;
    breakerRatingA: number;
    breakerCurve: string;
    rcdSensitivityMa: number;
    nominalCurrentA: number;
    calculatedPowerW: number;
    vdResult: VoltageDropResult;
    numConductors: number;
}
/**
 * Genera la memoria técnica para un circuito tipo ITC-BT-25.
 * Los valores vienen directamente de la tabla normativa.
 */
export declare function generateItcBt25Justification(input: CircuitInput, params: ItcBt25JustificationParams): TechnicalJustificationStep[];
/**
 * Genera la memoria técnica paso a paso para un circuito CUSTOM.
 */
export declare function generateJustification(input: CircuitInput, selectResult: SelectSectionResult): TechnicalJustificationStep[];
//# sourceMappingURL=generate-justification.d.ts.map