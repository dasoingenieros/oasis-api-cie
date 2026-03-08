/**
 * SELECCIÓN DE SECCIÓN — ITC-BT-19, ITC-BT-19 §2.2, ITC-BT-25
 *
 * Calcula la sección mínima normalizada que satisface los tres criterios:
 * 1. Térmico: Iz ≥ In (ITC-BT-19 con factores de corrección)
 * 2. Caída de tensión: límite 3% alumbrado / 5% fuerza (ITC-BT-19 §2.2)
 * 3. Mínimo normativo: ITC-BT-25 si el circuito tiene código
 *
 * Se devuelve la mayor de las tres secciones normalizadas.
 * NUNCA devuelve NaN, Infinity ni sección 0.
 */
import type { CircuitInput, SectionMm2 } from "../types";
export type SectionCriterion = "thermal" | "voltage_drop" | "minimum_itcbt25";
export interface SelectSectionResult {
    sectionMm2: SectionMm2;
    determinantCriteria: SectionCriterion;
    thermalSectionMm2: SectionMm2;
    voltageDropSectionMm2: SectionMm2;
    minimumItcBt25SectionMm2: SectionMm2 | null;
    nominalCurrentA: number;
}
/**
 * Selecciona la sección mínima normalizada que cumple los tres criterios REBT.
 *
 * @param input Datos del circuito
 * @returns Sección elegida, criterio determinante y detalle por criterio
 */
export declare function selectSection(input: CircuitInput): SelectSectionResult;
//# sourceMappingURL=select-section.d.ts.map