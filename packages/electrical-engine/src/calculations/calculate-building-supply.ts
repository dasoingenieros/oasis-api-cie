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

import { calculateBuildingLoad, ELECTRIFICATION_GRADES, calculateCommercialLoad } from "../tables/itc-bt-10";
import type { ElectrificationGrade, BuildingUse } from "../tables/itc-bt-10";
import { LGA_SECTION_TABLE, calculateLGAVoltageDrop, getNeutralSection } from "../tables/itc-bt-14";
import type { LGAResult } from "../tables/itc-bt-14";
import { calculateSupply } from "./calculate-supply";
import type { SupplyInput, SupplyResult } from "./calculate-supply";
import { NORMALIZED_SECTIONS_MM2 } from "../types";
import type { SectionMm2 } from "../types";

// ─── Tipos de entrada ──────────────────────────────────────

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

  // ─── Datos comunes para DI de cada vivienda ───
  /** Material conductor DI */
  diConductorMaterial: "Cu" | "Al";

  /** Longitud media de la DI en metros */
  diLengthM: number;

  /** Códigos de circuitos tipo de las viviendas */
  circuitCodes?: string[];
}

// ─── Tipos de salida ───────────────────────────────────────

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

// ─── Secciones normalizadas para LGA (Cu) ──────────────────
const LGA_SECTIONS_CU: number[] = [10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
const LGA_SECTIONS_AL: number[] = [16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400];

// ─── Función principal ─────────────────────────────────────

/**
 * Calcula el suministro completo de un edificio multivivienda:
 * previsión de cargas + LGA + DI tipo.
 */
export function calculateBuildingSupply(input: BuildingSupplyInput): BuildingSupplyResult {
  const warnings: string[] = [];
  const cosφ = input.powerFactor ?? 0.9;
  const lgaPhase = input.lgaPhaseSystem ?? "three";
  const V = input.voltageV ?? (lgaPhase === "three" ? 400 : 230);

  // ─── 1. Previsión de cargas (ITC-BT-10) ───

  const powerPerDwelling = input.powerPerDwellingW
    ?? ELECTRIFICATION_GRADES[input.electrificationGrade].minPowerW;

  const buildingLoad = calculateBuildingLoad(input.nDwellings, powerPerDwelling);
  const dwellingsTotalW = buildingLoad.totalPowerW;

  // Cargas adicionales (servicios generales, locales, garaje)
  const additionalTotalW = (input.additionalLoads ?? [])
    .reduce((sum, l) => sum + l.powerW, 0);

  const buildingTotalW = dwellingsTotalW + additionalTotalW;

  // ─── 2. LGA (ITC-BT-14) ───

  const SQRT3 = Math.sqrt(3);
  const lgaCurrentA = lgaPhase === "three"
    ? buildingTotalW / (SQRT3 * V * cosφ)
    : buildingTotalW / (V * cosφ);

  // Sección mínima por tabla ITC-BT-14
  const tableEntry = LGA_SECTION_TABLE.find(e => e.maxCurrentA >= lgaCurrentA);
  const minSectionTableMm2 = input.lgaConductorMaterial === "Cu"
    ? (tableEntry?.sectionCuMm2 ?? 240)
    : (tableEntry?.sectionAlMm2 ?? 400);

  // Sección mínima absoluta según ITC-BT-14
  const absMinSection = input.lgaConductorMaterial === "Cu" ? 10 : 16;
  const effectiveMinTable = Math.max(minSectionTableMm2, absMinSection);

  // Sección mínima por CdT (probar secciones hasta cumplir ≤ 0.5%)
  const availableSections = input.lgaConductorMaterial === "Cu"
    ? LGA_SECTIONS_CU : LGA_SECTIONS_AL;

  let minSectionCdtMm2 = effectiveMinTable;
  if (input.lgaLengthM > 0) {
    for (const s of availableSections) {
      if (s < effectiveMinTable) continue;
      const cdtCheck = calculateLGAVoltageDrop({
        totalPowerW: buildingTotalW,
        powerFactor: cosφ,
        phaseSystem: lgaPhase,
        conductorMaterial: input.lgaConductorMaterial,
        sectionMm2: s,
        lengthM: input.lgaLengthM,
        conductorTempC: input.lgaConductorTempC,
        voltageV: V,
      });
      if (cdtCheck.cdtCompliant) {
        minSectionCdtMm2 = s;
        break;
      }
    }
  }

  // Sección final LGA
  const autoLgaSection = Math.max(effectiveMinTable, minSectionCdtMm2);
  const lgaSection = input.lgaSectionMm2
    ? Math.max(input.lgaSectionMm2, autoLgaSection)
    : autoLgaSection;

  // Normalizar a sección comercial disponible
  const normalizedLgaSection = availableSections.find(s => s >= lgaSection)
    ?? availableSections[availableSections.length - 1]!;

  // CdT final con sección elegida
  const lgaCdtResult = calculateLGAVoltageDrop({
    totalPowerW: buildingTotalW,
    powerFactor: cosφ,
    phaseSystem: lgaPhase,
    conductorMaterial: input.lgaConductorMaterial,
    sectionMm2: normalizedLgaSection,
    lengthM: input.lgaLengthM,
    conductorTempC: input.lgaConductorTempC,
    voltageV: V,
  });

  if (!lgaCdtResult.cdtCompliant) {
    warnings.push(
      `LGA: CdT ${lgaCdtResult.voltageDropPct.toFixed(3)}% supera el 0.5% con sección ${normalizedLgaSection}mm². Revisar longitud o sección.`
    );
  }

  // Neutro
  const neutralSectionMm2 = getNeutralSection(normalizedLgaSection, input.lgaConductorMaterial);

  // Advertencias LGA
  warnings.push(...lgaCdtResult.warnings);

  if (!tableEntry) {
    warnings.push(
      `LGA: Intensidad ${lgaCurrentA.toFixed(1)}A supera la tabla ITC-BT-14 (máx 1000A). Revisar diseño.`
    );
  }

  // ─── 3. DI tipo (para una vivienda representativa) ───

  const diInput: SupplyInput = {
    installationType: "residential",
    phaseSystem: "single", // DI de vivienda normalmente monofásica
    contractedPowerW: powerPerDwelling,
    surfaceM2: undefined,
    hasElectricHeating: input.electrificationGrade === "elevated",
    diConductorMaterial: input.diConductorMaterial,
    diLengthM: input.diLengthM,
    powerFactor: cosφ,
    circuitCodes: input.circuitCodes,
  };

  const dwellingSupply = calculateSupply(diInput);
  warnings.push(...dwellingSupply.warnings.map(w => `DI: ${w}`));

  // ─── 4. Validación global ───

  const isValid = lgaCdtResult.cdtCompliant && dwellingSupply.isValid;

  return {
    loadForecast: {
      powerPerDwellingW: powerPerDwelling,
      simultaneityCoeff: buildingLoad.simultaneityCoeff,
      dwellingsTotalW,
      additionalTotalW,
      buildingTotalW,
    },
    lga: {
      sectionMm2: normalizedLgaSection as SectionMm2,
      neutralSectionMm2,
      minSectionTableMm2: effectiveMinTable,
      minSectionCdtMm2,
      cdtResult: lgaCdtResult,
    },
    dwellingSupply,
    warnings,
    isValid,
  };
}
