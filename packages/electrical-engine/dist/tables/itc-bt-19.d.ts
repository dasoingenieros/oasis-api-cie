/**
 * TABLA ITC-BT-19 — Intensidades admisibles (A) a temperatura ambiente 40°C
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-19 Tabla 1
 * Condiciones base:
 *   - Temperatura ambiente: 40°C (en aire) / 25°C (enterrado)
 *   - Temperatura máxima conductor: 70°C (PVC) / 90°C (XLPE/EPR)
 *   - Factor de agrupamiento: 1 (circuito aislado)
 *
 * Estructura: tabla[método][sección_mm2] = intensidad_admisible_A
 *
 * Métodos:
 *   A1 — Conductores unipolares aislados en tubo empotrado en pared aislante
 *   A2 — Cable multiconductor en tubo empotrado en pared aislante
 *   B1 — Conductores unipolares aislados en tubo en pared
 *   B2 — Cable multiconductor en tubo en pared
 *   C  — Cable multiconductor sobre pared, bandeja maciza o en suelo
 *   D  — Cable multiconductor enterrado en tubo
 *   E  — Cable multiconductor al aire o en bandeja perforada
 *   F  — Conductores unipolares al aire o en bandeja perforada (espaciados)
 */
import type { InstallationMethod, InsulationType } from "../types";
type AdmissibleCurrentTable = Partial<Record<number, number>>;
interface InsulationTable {
    PVC: AdmissibleCurrentTable;
    XLPE: AdmissibleCurrentTable;
}
type FullCurrentTable = Record<InstallationMethod, InsulationTable>;
export declare const ITC_BT_19_CURRENT_TABLE_CU: FullCurrentTable;
export declare const ITC_BT_19_CURRENT_TABLE_AL: FullCurrentTable;
import type { ConductorMaterial } from "../types";
/**
 * Obtiene la intensidad admisible de tabla ITC-BT-19 para las condiciones dadas.
 * @throws EngineError si la combinación método/sección no está en tabla
 */
export declare function getAdmissibleCurrent(method: InstallationMethod, sectionMm2: number, insulation: InsulationType, material?: ConductorMaterial): number;
/**
 * Devuelve todas las secciones disponibles para un método e insulación dados.
 */
export declare function getAvailableSections(method: InstallationMethod, insulation: InsulationType, material?: ConductorMaterial): number[];
export {};
//# sourceMappingURL=itc-bt-19.d.ts.map