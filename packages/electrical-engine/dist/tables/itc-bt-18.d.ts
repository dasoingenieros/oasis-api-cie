/**
 * ITC-BT-18 — INSTALACIONES DE PUESTA A TIERRA
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-18
 *
 * La puesta a tierra tiene por objeto limitar la tensión que pueden
 * presentar las masas metálicas respecto a tierra, asegurar la actuación
 * de las protecciones y eliminar el riesgo de accidente eléctrico.
 *
 * Tensión de contacto máxima (ITC-BT-18 §3):
 *   - Locales secos: Uc ≤ 50V
 *   - Locales húmedos / exteriores: Uc ≤ 24V
 *
 * Resistencia máxima de puesta a tierra:
 *   R ≤ Uc / Id
 *   Donde Id = sensibilidad del diferencial (A)
 *
 * Ejemplo: diferencial 30mA, local seco → R ≤ 50/0.030 = 1.667Ω → usar R ≤ 1.666Ω
 *          diferencial 30mA, local húmedo → R ≤ 24/0.030 = 800Ω → usar R ≤ 800Ω
 *
 * En la práctica REBT exige R ≤ 37Ω con diferencial de 650mA o
 * R ≤ 1.666Ω con diferencial 30mA para cumplir Uc ≤ 50V.
 */
export type LocationType = "dry" | "humid" | "outdoor";
export declare const MAX_CONTACT_VOLTAGE_V: Record<LocationType, number>;
export type ElectrodeType = "pica_vertical" | "conductor_horizontal" | "placa" | "anillo";
export interface ElectrodeSpec {
    type: ElectrodeType;
    label: string;
    resistanceFormula: string;
    typicalResistanceOhm?: number;
    notes: string;
}
export declare const ELECTRODE_TYPES: Record<ElectrodeType, ElectrodeSpec>;
export interface SoilResistivitySpec {
    type: string;
    minOhm_m: number;
    maxOhm_m: number;
    typicalOhm_m: number;
}
export declare const SOIL_RESISTIVITY_TABLE: SoilResistivitySpec[];
/**
 * Resistencia máxima de puesta a tierra para que actúe el diferencial
 * y no se supere la tensión de contacto límite.
 *
 * ITC-BT-18 §3: R_tierra ≤ Uc / Id
 *
 * @param differentialSensitivityA Sensibilidad del diferencial en A (ej: 0.030 para 30mA)
 * @param location Tipo de local (determina Uc máxima)
 */
export declare function getMaxEarthResistance(differentialSensitivityA: number, location: LocationType): {
    maxResistanceOhm: number;
    maxContactVoltageV: number;
    formula: string;
};
/**
 * Resistencia de una pica vertical en el terreno.
 * Fórmula simplificada: R = ρ / L
 *
 * @param soilResistivityOhm_m Resistividad del terreno (Ω·m)
 * @param pikeLengthM Longitud de la pica (m) — mínimo 2m
 */
export declare function calcPikeResistance(soilResistivityOhm_m: number, pikeLengthM: number): number;
/**
 * Número de picas necesarias para conseguir una resistencia objetivo.
 * Picas en paralelo: R_total ≈ R_1pica / n (aproximación para picas separadas ≥ 2× longitud)
 *
 * @param singlePikeResistanceOhm Resistencia de una pica
 * @param targetResistanceOhm Resistencia máxima admisible
 */
export declare function getRequiredPikes(singlePikeResistanceOhm: number, targetResistanceOhm: number): number;
export interface EarthConductorSpec {
    application: string;
    minSectionCuMm2: number;
    minSectionAlMm2?: number;
    minSectionFeSm2?: number;
    protected: boolean;
    notes: string;
}
export declare const EARTH_CONDUCTOR_SECTIONS: EarthConductorSpec[];
//# sourceMappingURL=itc-bt-18.d.ts.map