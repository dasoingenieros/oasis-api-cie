/**
 * ITC-BT-10 — PREVISIÓN DE CARGAS PARA SUMINISTROS EN BAJA TENSIÓN
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-10
 *
 * Define las cargas mínimas a prever para el cálculo de la potencia
 * necesaria en edificios de viviendas, locales comerciales, oficinas
 * e instalaciones de uso general.
 *
 * La previsión de cargas determina la sección de la LGA (ITC-BT-14),
 * la potencia contratada mínima y el calibre del IGA.
 */
export type ElectrificationGrade = "basic" | "elevated";
export interface ElectrificationSpec {
    grade: ElectrificationGrade;
    label: string;
    minPowerW: number;
    minSectionMm2: number;
    description: string;
    typicalCircuits: string;
}
export declare const ELECTRIFICATION_GRADES: Record<ElectrificationGrade, ElectrificationSpec>;
export type BuildingUse = "residential" | "commercial" | "office" | "hotel" | "hospital" | "school" | "parking" | "industrial_light" | "industrial_heavy";
export interface LoadDensitySpec {
    use: BuildingUse;
    label: string;
    loadDensityWm2: number;
    minLoadW?: number;
    notes: string;
}
export declare const LOAD_DENSITY_TABLE: Record<BuildingUse, LoadDensitySpec>;
export declare const SIMULTANEITY_COEFFICIENT_RESIDENTIAL: Record<number, number>;
/**
 * Potencia total prevista para un edificio de viviendas.
 * Aplica el coeficiente de simultaneidad de la Tabla 1 ITC-BT-10.
 *
 * @param nDwellings Número de viviendas
 * @param powerPerDwellingW Potencia por vivienda (W) — mínimo 5.750W básica / 9.200W elevada
 */
export declare function calculateBuildingLoad(nDwellings: number, powerPerDwellingW: number): {
    totalPowerW: number;
    simultaneityCoeff: number;
    powerPerDwellingW: number;
};
/**
 * Determina el grado de electrificación de una vivienda.
 * ITC-BT-10 §1.1
 */
export declare function determineElectrificationGrade(params: {
    surfaceM2: number;
    hasElectricHeating: boolean;
    hasAirConditioning: boolean;
}): ElectrificationGrade;
/**
 * Potencia mínima prevista para locales no residenciales.
 * ITC-BT-10 §3
 */
export declare function calculateCommercialLoad(use: Exclude<BuildingUse, "residential">, surfaceM2: number): {
    totalPowerW: number;
    loadDensityWm2: number;
};
//# sourceMappingURL=itc-bt-10.d.ts.map