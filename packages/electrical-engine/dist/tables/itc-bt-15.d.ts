/**
 * ITC-BT-15 — DERIVACIONES INDIVIDUALES
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-15
 *
 * La derivación individual enlaza el contador del abonado con su
 * cuadro general de mando y protección (CGMP).
 *
 * Condiciones (ITC-BT-15 §3):
 *   - CdT máxima: 1% desde el contador hasta el CGMP
 *   - Sección mínima: 6mm² Cu
 *   - Aislamiento mínimo: 450/750V bajo tubo / 0.6/1kV al aire
 *   - Conductor de protección: obligatorio
 *   - Sin empalmes en todo su recorrido
 *   - Método habitual: A1 (empotrado en tubo) o E (bandeja en montante)
 *
 * Secciones mínimas según potencia (ITC-BT-15 Tabla 1):
 *   Hasta 5.750W (25A):  6mm²
 *   Hasta 9.200W (40A):  10mm²
 *   Hasta 14.375W (63A): 16mm²
 *   Hasta 23.000W (100A): 25mm²
 *   ...
 */
export interface DISectionSpec {
    maxCurrentA: number;
    maxPowerW_single: number;
    sectionCuMm2: number;
    sectionAlMm2: number;
    protectionCuMm2: number;
}
export declare const DI_SECTION_TABLE: DISectionSpec[];
export declare const DI_CDT_LIMIT_PCT = 1;
export interface DIInput {
    contractedPowerW: number;
    phaseSystem: "single" | "three";
    powerFactor: number;
    conductorMaterial: "Cu" | "Al";
    sectionMm2: number;
    lengthM: number;
    conductorTempC?: number;
    voltageV?: number;
}
export interface DIResult {
    nominalCurrentA: number;
    voltageDropPct: number;
    voltageDropV: number;
    cdtLimitPct: number;
    cdtCompliant: boolean;
    minSectionCuMm2: number;
    minSectionByLoadMm2: number;
    protectionSectionMm2: number;
    warnings: string[];
}
/**
 * Calcula la caída de tensión en la derivación individual.
 * ITC-BT-15 §3 — Límite 1%
 */
export declare function calculateDIVoltageDrop(input: DIInput): DIResult;
//# sourceMappingURL=itc-bt-15.d.ts.map