/**
 * CÁLCULO COMPLETO DE CIRCUITO — Función principal del motor
 *
 * Dos modos de operación:
 *
 * 1. CIRCUITOS TIPO ITC-BT-25 (C1-C12):
 *    - Sección, PIA, intensidad → directos de la tabla ITC-BT-25
 *    - Potencia de cálculo = V × I_PIA
 *    - Solo se calcula CdT para verificar; si excede límite, se sube sección
 *    - Nº conductores: 2 (mono) / 4 (tri)
 *
 * 2. CIRCUITOS CUSTOM:
 *    - Cálculo completo: intensidad nominal, criterio térmico, CdT, PIA
 *    - Igual que antes (calculateNominalCurrent + selectSection + selectPIA)
 *
 * Si cualquier cálculo falla lanza EngineError con code y circuitId.
 */

import type { CircuitInput, CircuitResult, JustificationStep } from "../types";
import { EngineError, NORMALIZED_SECTIONS_MM2 } from "../types";
import type { SectionMm2 } from "../types";
import { calculateNominalCurrent } from "./nominal-current";
import { selectSection } from "./select-section";
import { generateJustification, generateItcBt25Justification } from "./generate-justification";
import { getCorrectionFactors } from "../tables/correction-factors";
import { getAdmissibleCurrent } from "../tables/itc-bt-19";
import { calculateVoltageDrop, getLoadType, CDT_LIMITS_PCT } from "../tables/itc-bt-19-voltage-drop";
import { getCircuitTemplate } from "../tables/itc-bt-25";
import { selectPIA } from "../tables/itc-bt-22";
import { getMinTubeDiameter, getConductorCountForCircuit } from "../tables/itc-bt-21";
import type { TechnicalJustificationStep } from "./generate-justification";

function mapTechnicalStepToJustificationStep(ts: TechnicalJustificationStep): JustificationStep {
  return {
    order: ts.step,
    description: ts.concept,
    formula: ts.formula,
    inputValues: ts.values,
    result: ts.result,
    normRef: ts.normRef,
  };
}

/**
 * Determina si un circuito es tipo ITC-BT-25 (valores fijos de tabla)
 * o CUSTOM (requiere cálculo completo).
 */
function isItcBt25Circuit(code: string): boolean {
  return code !== "CUSTOM" && getCircuitTemplate(code) !== undefined;
}

/**
 * Calcula un circuito tipo ITC-BT-25 aplicando directamente los valores de tabla.
 * Solo calcula la CdT y sube sección si excede el límite.
 */
function calculateItcBt25Circuit(input: CircuitInput): CircuitResult {
  const template = getCircuitTemplate(input.code)!;
  const V = input.voltageV ?? (input.phaseSystem === "single" ? 230 : 400);

  // 1. Valores directos de ITC-BT-25
  const breakerRatingA = template.maxBreakerA;
  const breakerCurve = template.breakerCurve;
  const rcdSensitivityMa = template.rcdSensitivityMa;
  const In = breakerRatingA; // Intensidad de cálculo = PIA
  let sectionMm2 = template.minSectionMm2 as SectionMm2;

  // 2. Potencia de cálculo = V × I_PIA
  const calculatedPowerW = V * In;

  // 3. Caída de tensión con sección ITC-BT-25
  const loadType = getLoadType(input.code, input.loadType);
  const cdtLimit = CDT_LIMITS_PCT[loadType];
  let sectionIncreased = false;
  const originalSection = sectionMm2;

  let vdResult = calculateVoltageDrop({
    nominalCurrentA: In,
    lengthM: input.lengthM,
    sectionMm2,
    phaseSystem: input.phaseSystem,
    conductorMaterial: input.conductorMaterial,
    insulationType: input.insulationType,
    powerFactor: input.powerFactor,
    upstreamCdtPct: input.upstreamCdtPct ?? 0,
    circuitCode: input.code,
    loadType: input.loadType,
    voltageV: V,
  });

  // 4. Si CdT > límite, subir sección hasta que cumpla
  if (!vdResult.isCompliant) {
    const sections = NORMALIZED_SECTIONS_MM2.filter(s => s > sectionMm2);
    for (const nextSection of sections) {
      vdResult = calculateVoltageDrop({
        nominalCurrentA: In,
        lengthM: input.lengthM,
        sectionMm2: nextSection,
        phaseSystem: input.phaseSystem,
        conductorMaterial: input.conductorMaterial,
        insulationType: input.insulationType,
        powerFactor: input.powerFactor,
        upstreamCdtPct: input.upstreamCdtPct ?? 0,
        circuitCode: input.code,
        loadType: input.loadType,
        voltageV: V,
      });
      if (vdResult.isCompliant) {
        sectionMm2 = nextSection;
        sectionIncreased = true;
        break;
      }
    }
  }

  // 5. Nº conductores y tubo
  // Para tubo: incluir PE → mono = 3, tri = 5
  const numConductorsTube = getConductorCountForCircuit({
    phaseSystem: input.phaseSystem,
    includeNeutral: true,
    includeProtection: true,
  });
  const tubeDiameterMm = getMinTubeDiameter(sectionMm2, numConductorsTube);

  // Nº conductores para MTD (sin PE): mono = 2, tri = 4
  const numConductors = input.phaseSystem === "single" ? 2 : 4;

  // 6. Justificación
  const techSteps = generateItcBt25Justification(input, {
    sectionMm2,
    originalSectionMm2: originalSection,
    sectionIncreased,
    breakerRatingA,
    breakerCurve,
    rcdSensitivityMa,
    nominalCurrentA: In,
    calculatedPowerW,
    vdResult,
    numConductors,
  });
  const justificationSteps = techSteps.map(mapTechnicalStepToJustificationStep);

  // 7. Warnings y errors
  const warnings: string[] = [];
  const errors: string[] = [];
  const cdtOk = vdResult.isCompliant;

  if (sectionIncreased) {
    warnings.push(
      `Sección aumentada de ${originalSection}mm² a ${sectionMm2}mm² por caída de tensión. ` +
      `La longitud del circuito (${input.lengthM}m) supera la máxima admisible para la sección estándar ITC-BT-25.`
    );
  }
  if (!cdtOk) {
    errors.push(
      `Caída de tensión ${vdResult.accumulatedCdtPct.toFixed(2)}% supera el límite ${cdtLimit}% ` +
      `incluso con la sección máxima. Revisar longitud o distribución del circuito.`
    );
  }

  const isCompliant = cdtOk;

  const formulasUsed = [...new Set(techSteps.map((s) => s.formula))];
  const normReferences = [...new Set(techSteps.map((s) => s.normRef))];
  const tableReferences = normReferences.filter((r) => r.includes("Tabla"));

  return {
    id: input.id,
    nominalCurrentA: In,
    admissibleCurrentA: In,
    correctedIzA: In,
    sectionMm2,
    sectionCriteria: sectionIncreased ? "voltage_drop" : "minimum_itcbt25",
    voltageDropPct: vdResult.voltageDropPct,
    accumulatedCdtPct: vdResult.accumulatedCdtPct,
    cdtLimitPct: cdtLimit,
    cdtCompliant: cdtOk,
    breakerRatingA,
    breakerCurve,
    rcdSensitivityMa,
    isCompliant,
    isValid: isCompliant,
    tubeDiameterMm,
    warnings,
    errors,
    justification: {
      formulasUsed,
      tableReferences,
      steps: justificationSteps,
      normReferences,
    },
    // Campos adicionales para MTD
    calculatedPowerW,
    numConductors,
    voltageDropV: vdResult.voltageDropV,
  };
}

/**
 * Calcula un circuito CUSTOM con el motor completo (criterio térmico + CdT + PIA).
 */
function calculateCustomCircuit(input: CircuitInput): CircuitResult {
  const circuitId = input.id;

  // 1. Intensidad nominal
  const nominalResult = calculateNominalCurrent({
    phaseSystem: input.phaseSystem,
    loadPowerW: input.loadPowerW,
    powerFactor: input.powerFactor,
    simultaneityFactor: input.simultaneityFactor,
    loadFactor: input.loadFactor,
    voltageV: input.voltageV,
    circuitId,
  });
  const In = nominalResult.nominalCurrentA;

  // 2. Selección de sección
  const selectResult = selectSection(input);

  // 3. Factores de corrección e intensidad admisible
  const factors = getCorrectionFactors({
    insulationType: input.insulationType,
    ambientTempC: input.ambientTempC,
    groupingCircuits: input.groupingCircuits,
    method: input.installationMethod,
  });
  const Iz = getAdmissibleCurrent(
    input.installationMethod,
    selectResult.sectionMm2,
    input.insulationType,
    input.conductorMaterial
  );
  const IzCorrected = Iz * factors.combined;

  // 4. Caída de tensión
  const vdResult = calculateVoltageDrop({
    nominalCurrentA: In,
    lengthM: input.lengthM,
    sectionMm2: selectResult.sectionMm2,
    phaseSystem: input.phaseSystem,
    conductorMaterial: input.conductorMaterial,
    insulationType: input.insulationType,
    powerFactor: input.powerFactor,
    upstreamCdtPct: input.upstreamCdtPct ?? 0,
    circuitCode: input.code,
    loadType: input.loadType,
    voltageV: input.voltageV,
  });

  // 5. PIA
  const curve: "B" | "C" | "D" = "C";
  const piaResult = selectPIA({
    Ib: In,
    Iz: IzCorrected,
    curve,
  });

  // 6. Diferencial
  const rcdSensitivityMa: 30 | 300 | null = 30;

  // 7. Diámetro de tubo
  const numConductorsTube = getConductorCountForCircuit({
    phaseSystem: input.phaseSystem,
    includeNeutral: true,
    includeProtection: true,
  });
  const tubeDiameterMm = getMinTubeDiameter(
    selectResult.sectionMm2,
    numConductorsTube
  );

  // 8. Justificación
  const techSteps = generateJustification(input, selectResult);
  const justificationSteps = techSteps.map(mapTechnicalStepToJustificationStep);

  // 9. Validación
  const cdtOk = vdResult.isCompliant;
  const piaOk = piaResult.isValid;
  const thermalOk = IzCorrected >= In;
  const isCompliant = cdtOk && piaOk && thermalOk;

  // 10. Warnings y errors
  const warnings: string[] = [...piaResult.warnings];
  const errors: string[] = [];
  if (!cdtOk) {
    errors.push(
      `Caída de tensión ${vdResult.accumulatedCdtPct.toFixed(2)}% supera el límite ${vdResult.limitPct}% (ITC-BT-19 §2.2)`
    );
  }
  if (!thermalOk) {
    errors.push(
      `Intensidad admisible Iz=${IzCorrected.toFixed(1)}A < In=${In.toFixed(1)}A (ITC-BT-19)`
    );
  }

  const formulasUsed = [...new Set(techSteps.map((s) => s.formula))];
  const normReferences = [...new Set(techSteps.map((s) => s.normRef))];
  const tableReferences = normReferences.filter((r) => r.includes("Tabla"));

  const V = input.voltageV ?? (input.phaseSystem === "single" ? 230 : 400);
  const numConductors = input.phaseSystem === "single" ? 2 : 4;

  return {
    id: input.id,
    nominalCurrentA: In,
    admissibleCurrentA: IzCorrected,
    correctedIzA: IzCorrected,
    sectionMm2: selectResult.sectionMm2,
    sectionCriteria: selectResult.determinantCriteria,
    voltageDropPct: vdResult.voltageDropPct,
    accumulatedCdtPct: vdResult.accumulatedCdtPct,
    cdtLimitPct: vdResult.limitPct,
    cdtCompliant: cdtOk,
    breakerRatingA: piaResult.ratingA,
    breakerCurve: piaResult.curve,
    rcdSensitivityMa,
    isCompliant,
    isValid: isCompliant,
    tubeDiameterMm,
    warnings,
    errors,
    justification: {
      formulasUsed,
      tableReferences,
      steps: justificationSteps,
      normReferences,
    },
    // Campos adicionales para MTD
    calculatedPowerW: V * In,
    numConductors,
    voltageDropV: vdResult.voltageDropV,
  };
}

/**
 * Calcula un circuito completo.
 * Detecta automáticamente si es tipo ITC-BT-25 o CUSTOM y aplica la lógica correcta.
 */
export function calculateCircuit(input: CircuitInput): CircuitResult {
  const circuitId = input.id;

  try {
    if (isItcBt25Circuit(input.code)) {
      return calculateItcBt25Circuit(input);
    } else {
      return calculateCustomCircuit(input);
    }
  } catch (err) {
    if (err instanceof EngineError) {
      throw err;
    }
    throw new EngineError(
      err instanceof Error ? err.message : "Error en cálculo de circuito",
      "CALCULATION_ERROR",
      circuitId
    );
  }
}
