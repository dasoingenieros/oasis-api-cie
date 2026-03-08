/**
 * @daso/electrical-engine — Tipos base
 * Normativa: REBT (RD 842/2002), ITC-BT-19, ITC-BT-22, ITC-BT-24, ITC-BT-25
 */
export type InstallationMethod = "A1" | "A2" | "B1" | "B2" | "C" | "D" | "E" | "F";
export type InsulationType = "PVC" | "XLPE" | "EPR";
export type ConductorMaterial = "Cu" | "Al";
export type PhaseSystem = "single" | "three";
export declare const NORMALIZED_SECTIONS_MM2: readonly [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
export type SectionMm2 = (typeof NORMALIZED_SECTIONS_MM2)[number];
export declare const NORMALIZED_BREAKER_RATINGS: readonly [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250];
export type BreakerRating = (typeof NORMALIZED_BREAKER_RATINGS)[number];
export type BreakerCurve = "B" | "C" | "D";
export type CircuitCode = "C1" | "C2" | "C3" | "C4.1" | "C4.2" | "C4.3" | "C5" | "C6" | "C7" | "C8" | "C9" | "C10" | "C11" | "C12" | "CUSTOM";
export interface CircuitInput {
    id: string;
    label: string;
    code: CircuitCode;
    phaseSystem: PhaseSystem;
    loadPowerW: number;
    powerFactor: number;
    simultaneityFactor: number;
    loadFactor: number;
    conductorMaterial: ConductorMaterial;
    insulationType: InsulationType;
    installationMethod: InstallationMethod;
    lengthM: number;
    ambientTempC: number;
    groupingCircuits: number;
    voltageV?: number;
    upstreamCdtPct?: number;
}
export interface CircuitResult {
    id: string;
    nominalCurrentA: number;
    admissibleCurrentA: number;
    correctedIzA: number;
    sectionMm2: SectionMm2;
    sectionCriteria: "thermal" | "voltage_drop" | "short_circuit" | "minimum_itcbt25";
    voltageDropPct: number;
    accumulatedCdtPct: number;
    cdtLimitPct: number;
    cdtCompliant: boolean;
    breakerRatingA: BreakerRating;
    breakerCurve: BreakerCurve;
    rcdSensitivityMa: 30 | 300 | null;
    shortCircuitKa?: number;
    isCompliant: boolean;
    isValid: boolean;
    tubeDiameterMm?: number;
    warnings: string[];
    errors: string[];
    justification: CalculationJustification;
}
export interface CalculationJustification {
    formulasUsed: string[];
    tableReferences: string[];
    steps: JustificationStep[];
    normReferences: string[];
}
export interface JustificationStep {
    order: number;
    description: string;
    formula?: string;
    inputValues: Record<string, number | string>;
    result: number | string;
    unit?: string;
    normRef?: string;
}
export declare class EngineError extends Error {
    readonly code: string;
    readonly circuitId?: string | undefined;
    constructor(message: string, code: string, circuitId?: string | undefined);
}
//# sourceMappingURL=index_old.d.ts.map