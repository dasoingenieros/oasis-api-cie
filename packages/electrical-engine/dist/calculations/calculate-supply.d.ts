/**
 * CÁLCULO DE SUMINISTRO — Tramo de enlace para instalación individual
 *
 * Integra: ITC-BT-10 (previsión cargas) + ITC-BT-15 (DI) + ITC-BT-17 (IGA + diferenciales)
 *
 * Para una instalación individual (vivienda o local), calcula:
 *   1. Potencia prevista y grado de electrificación
 *   2. IGA (calibre)
 *   3. Derivación Individual (sección, CdT)
 *   4. Diferenciales requeridos
 *   5. Conductor de protección
 *
 * NO calcula LGA (eso es para edificios con múltiples viviendas).
 * La LGA se calcula aparte con calculateLGAVoltageDrop() si es edificio.
 */
import type { IGARating, DifferentialSpec } from "../tables/itc-bt-17";
import type { DIResult } from "../tables/itc-bt-15";
import type { ElectrificationGrade } from "../tables/itc-bt-10";
import type { SectionMm2 } from "../types";
export interface SupplyInput {
    /** Tipo de instalación */
    installationType: "residential" | "commercial";
    /** Sistema de fases */
    phaseSystem: "single" | "three";
    /** Potencia contratada en W (si se conoce). Si no, se calcula por grado electrificación */
    contractedPowerW?: number;
    /** Superficie en m² (para determinar grado electrificación en viviendas, o carga en locales) */
    surfaceM2?: number;
    /** ¿Tiene calefacción eléctrica? (solo viviendas) */
    hasElectricHeating?: boolean;
    /** ¿Tiene aire acondicionado? (solo viviendas) */
    hasAirConditioning?: boolean;
    /** Material conductor DI */
    diConductorMaterial: "Cu" | "Al";
    /** Longitud de la DI en metros */
    diLengthM: number;
    /** Sección DI elegida (mm²). Si no se proporciona, se calcula automáticamente */
    diSectionMm2?: number;
    /** Factor de potencia global (default 0.9) */
    powerFactor?: number;
    /** Tensión (default: 230 mono / 400 tri) */
    voltageV?: number;
    /** Temperatura del conductor DI (default 70°C) */
    diConductorTempC?: number;
    /** Códigos de circuitos instalados (para cálculo de diferenciales) */
    circuitCodes?: string[];
}
export interface SupplyResult {
    /** Potencia usada para el cálculo (W) */
    designPowerW: number;
    /** Grado de electrificación (solo viviendas) */
    electrificationGrade?: ElectrificationGrade;
    /** IGA seleccionado */
    iga: {
        ratingA: IGARating;
        nominalCurrentA: number;
    };
    /** Derivación Individual */
    di: {
        /** Sección seleccionada (mm²) — la mayor entre tabla y CdT */
        sectionMm2: SectionMm2;
        /** Sección mínima por tabla ITC-BT-15 */
        minSectionTableMm2: number;
        /** Sección mínima por CdT */
        minSectionCdtMm2: number;
        /** Resultado de CdT con la sección seleccionada */
        cdtResult: DIResult;
    };
    /** Conductor de protección (PE) */
    protectionConductorMm2: number;
    /** Diferenciales requeridos */
    differentials: DifferentialSpec[];
    /** Advertencias */
    warnings: string[];
    /** ¿Todo cumple? */
    isValid: boolean;
}
/**
 * Calcula el suministro completo de una instalación individual.
 */
export declare function calculateSupply(input: SupplyInput): SupplyResult;
//# sourceMappingURL=calculate-supply.d.ts.map