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

import { selectIGARating, getRequiredDifferentials, getProtectionConductorSection } from "../tables/itc-bt-17";
import type { IGARating, DifferentialSpec } from "../tables/itc-bt-17";
import { DI_SECTION_TABLE, calculateDIVoltageDrop } from "../tables/itc-bt-15";
import type { DIResult } from "../tables/itc-bt-15";
import { ELECTRIFICATION_GRADES, determineElectrificationGrade } from "../tables/itc-bt-10";
import type { ElectrificationGrade } from "../tables/itc-bt-10";
import { NORMALIZED_SECTIONS_MM2 } from "../types";
import type { SectionMm2 } from "../types";

// ─── Tipos de entrada ──────────────────────────────────────

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

// ─── Tipos de salida ───────────────────────────────────────

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

// ─── Función principal ─────────────────────────────────────

/**
 * Calcula el suministro completo de una instalación individual.
 */
export function calculateSupply(input: SupplyInput): SupplyResult {
  const warnings: string[] = [];
  const cosφ = input.powerFactor ?? 0.9;

  // 1. Determinar potencia de diseño
  let designPowerW: number;
  let electrificationGrade: ElectrificationGrade | undefined;

  if (input.contractedPowerW && input.contractedPowerW > 0) {
    // Potencia explícita
    designPowerW = input.contractedPowerW;

    // Aún así determinamos grado para viviendas
    if (input.installationType === "residential") {
      electrificationGrade = determineElectrificationGrade({
        surfaceM2: input.surfaceM2 ?? 90,
        hasElectricHeating: input.hasElectricHeating ?? false,
        hasAirConditioning: input.hasAirConditioning ?? false,
      });
      const minPower = ELECTRIFICATION_GRADES[electrificationGrade].minPowerW;
      if (designPowerW < minPower) {
        warnings.push(
          `Potencia contratada ${designPowerW}W inferior al mínimo para electrificación ${electrificationGrade}: ${minPower}W. Se usa ${minPower}W.`
        );
        designPowerW = minPower;
      }
    }
  } else if (input.installationType === "residential") {
    // Calcular por grado electrificación
    electrificationGrade = determineElectrificationGrade({
      surfaceM2: input.surfaceM2 ?? 90,
      hasElectricHeating: input.hasElectricHeating ?? false,
      hasAirConditioning: input.hasAirConditioning ?? false,
    });
    designPowerW = ELECTRIFICATION_GRADES[electrificationGrade].minPowerW;
  } else {
    // Comercial sin potencia → error
    throw new Error("SUPPLY: Para instalaciones comerciales se requiere contractedPowerW.");
  }

  // 2. IGA
  const iga = selectIGARating({
    contractedPowerW: designPowerW,
    phaseSystem: input.phaseSystem,
    powerFactor: 1.0, // IGA se calcula con cosφ=1 (potencia aparente de contrato)
  });

  // 3. Derivación Individual — buscar sección mínima
  const V = input.voltageV ?? (input.phaseSystem === "three" ? 400 : 230);
  const SQRT3 = Math.sqrt(3);

  // Intensidad de cálculo DI — usa cosφ de la carga (default 0.9)
  // La corriente real que circula por la DI incluye el factor de potencia
  const In = input.phaseSystem === "three"
    ? designPowerW / (SQRT3 * V * cosφ)
    : designPowerW / (V * cosφ);

  // Sección mínima por tabla ITC-BT-15
  const tableEntry = DI_SECTION_TABLE.find(e => e.maxCurrentA >= In)
    ?? DI_SECTION_TABLE[DI_SECTION_TABLE.length - 1]; // Usar última entrada si In excede tabla
  const minSectionTableMm2 = input.diConductorMaterial === "Cu"
    ? tableEntry!.sectionCuMm2
    : tableEntry!.sectionAlMm2;

  // Calcular sección mínima por CdT probando secciones normalizadas
  let minSectionCdtMm2 = minSectionTableMm2;
  if (input.diLengthM > 0) {
    for (const s of NORMALIZED_SECTIONS_MM2) {
      if (s < minSectionTableMm2) continue;
      const cdtCheck = calculateDIVoltageDrop({
        contractedPowerW: designPowerW,
        phaseSystem: input.phaseSystem,
        powerFactor: cosφ,
        conductorMaterial: input.diConductorMaterial,
        sectionMm2: s,
        lengthM: input.diLengthM,
        conductorTempC: input.diConductorTempC,
        voltageV: input.voltageV,
      });
      if (cdtCheck.cdtCompliant) {
        minSectionCdtMm2 = s;
        break;
      }
    }
  }

  // Sección final = la mayor entre tabla, CdT y la elegida por el usuario
  const autoSection = Math.max(minSectionTableMm2, minSectionCdtMm2) as SectionMm2;
  const finalSection = input.diSectionMm2
    ? (Math.max(input.diSectionMm2, autoSection) as SectionMm2)
    : autoSection;

  // Normalizar a sección comercial
  const normalizedSection = NORMALIZED_SECTIONS_MM2.find(s => s >= finalSection) ?? 300;

  // CdT con la sección final
  const cdtResult = calculateDIVoltageDrop({
    contractedPowerW: designPowerW,
    phaseSystem: input.phaseSystem,
    powerFactor: cosφ,
    conductorMaterial: input.diConductorMaterial,
    sectionMm2: normalizedSection,
    lengthM: input.diLengthM,
    conductorTempC: input.diConductorTempC,
    voltageV: input.voltageV,
  });

  if (!cdtResult.cdtCompliant) {
    warnings.push(
      `DI: CdT ${cdtResult.voltageDropPct.toFixed(2)}% supera el 1% con sección ${normalizedSection}mm². Revisar longitud o sección.`
    );
  }

  // 4. Conductor de protección
  const protectionConductorMm2 = getProtectionConductorSection(normalizedSection);

  // 5. Diferenciales
  const circuitCodes = input.circuitCodes ?? ["C1", "C2", "C3", "C4.1", "C5"];
  const differentials = getRequiredDifferentials({
    phaseSystem: input.phaseSystem,
    contractedPowerW: designPowerW,
    circuits: circuitCodes,
  });

  // 6. Validaciones adicionales
  if (normalizedSection < 6 && input.diConductorMaterial === "Cu") {
    warnings.push("ITC-BT-15: Sección mínima DI es 6mm² Cu.");
  }

  // Verificar IGA ≤ intensidad admisible DI (simplificado)
  if (iga.ratingA > In * 1.5) {
    // No es un error per se, pero avisar
    warnings.push(
      `IGA ${iga.ratingA}A muy superior a la intensidad nominal ${In.toFixed(1)}A. Verificar potencia contratada.`
    );
  }

  warnings.push(...cdtResult.warnings);

  const isValid = cdtResult.cdtCompliant;

  return {
    designPowerW,
    electrificationGrade,
    iga,
    di: {
      sectionMm2: normalizedSection as SectionMm2,
      minSectionTableMm2,
      minSectionCdtMm2,
      cdtResult,
    },
    protectionConductorMm2,
    differentials,
    warnings,
    isValid,
  };
}
