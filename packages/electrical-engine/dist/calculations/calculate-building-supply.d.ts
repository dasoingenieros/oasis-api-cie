/**
 * CÁLCULO DE SUMINISTRO PARA EDIFICIO MULTIVIVIENDA
 *
 * Integra: ITC-BT-10 (previsión cargas edificio) + ITC-BT-14 (LGA) +
 *          ITC-BT-15 (DI) + ITC-BT-17 (IGA + diferenciales)
 *
 * Para un edificio con múltiples viviendas, calcula:
 *   1. Previsión de cargas total del edificio (ITC-BT-10, coeficiente simultaneidad)
 *   2. LGA: sección + CdT ≤ 0.5% (ITC-BT-14)
 *   3. Por cada vivienda: DI + IGA + diferenciales (reutiliza calculateSupply)
 *
 * Opcionalmente incluye servicios generales y locales comerciales.
 */
import type { ElectrificationGrade } from "../tables/itc-bt-10";
import type { LGAResult } from "../tables/itc-bt-14";
import type { SupplyResult } from "./calculate-supply";
import type { SectionMm2 } from "../types";
export interface AdditionalLoad {
    /** Nombre descriptivo (ej: "Servicios generales", "Local comercial planta baja") */
    name: string;
    /** Potencia en W */
    powerW: number;
}
export interface BuildingSupplyInput {
    /** Número de viviendas */
    nDwellings: number;
    /** Grado de electrificación de las viviendas */
    electrificationGrade: ElectrificationGrade;
    /** Potencia por vivienda en W (si se omite, se usa la mínima del grado) */
    powerPerDwellingW?: number;
    /** Cargas adicionales: servicios generales, locales comerciales, garaje, etc. */
    additionalLoads?: AdditionalLoad[];
    /** Sistema de fases de la LGA (normalmente trifásico en edificios) */
    lgaPhaseSystem?: "three" | "single";
    /** Material conductor LGA */
    lgaConductorMaterial: "Cu" | "Al";
    /** Longitud de la LGA en metros (CGP → centralización contadores) */
    lgaLengthM: number;
    /** Sección LGA elegida (mm²). Si no se proporciona, se calcula automáticamente */
    lgaSectionMm2?: number;
    /** Temperatura del conductor LGA (default 70°C) */
    lgaConductorTempC?: number;
    /** Factor de potencia global del edificio (default 0.9) */
    powerFactor?: number;
    /** Tensión LGA (default 400V trifásico) */
    voltageV?: number;
    /** Material conductor DI */
    diConductorMaterial: "Cu" | "Al";
    /** Longitud media de la DI en metros */
    diLengthM: number;
    /** Códigos de circuitos tipo de las viviendas */
    circuitCodes?: string[];
}
export interface BuildingSupplyResult {
    /** Previsión de cargas del edificio */
    loadForecast: {
        /** Potencia por vivienda (W) */
        powerPerDwellingW: number;
        /** Coeficiente de simultaneidad aplicado */
        simultaneityCoeff: number;
        /** Potencia total viviendas tras simultaneidad (W) */
        dwellingsTotalW: number;
        /** Potencia cargas adicionales (W) */
        additionalTotalW: number;
        /** Potencia total del edificio (W) */
        buildingTotalW: number;
    };
    /** Resultado LGA */
    lga: {
        /** Sección de fase seleccionada (mm²) */
        sectionMm2: SectionMm2;
        /** Sección del neutro (mm²) */
        neutralSectionMm2: number;
        /** Sección mínima por tabla ITC-BT-14 */
        minSectionTableMm2: number;
        /** Sección mínima por CdT */
        minSectionCdtMm2: number;
        /** Resultado CdT */
        cdtResult: LGAResult;
    };
    /** Resultado DI tipo (para una vivienda representativa) */
    dwellingSupply: SupplyResult;
    /** Advertencias generales */
    warnings: string[];
    /** ¿Todo cumple? */
    isValid: boolean;
}
/**
 * Calcula el suministro completo de un edificio multivivienda:
 * previsión de cargas + LGA + DI tipo.
 */
export declare function calculateBuildingSupply(input: BuildingSupplyInput): BuildingSupplyResult;
//# sourceMappingURL=calculate-building-supply.d.ts.map