/**
 * CÁLCULO COMPLETO DE CIRCUITO — Función principal del motor
 *
 * Orquesta calculateNominalCurrent(), selectSection() y generateJustification().
 * Devuelve un CircuitResult completo con sección, protecciones, CdT,
 * tubo, justificación y validez.
 *
 * Si cualquier cálculo falla lanza EngineError con code y circuitId.
 */

import type { CircuitInput, CircuitResult, JustificationStep } from "../types";
import { EngineError } from "../types";
import { calculateNominalCurrent } from "./nominal-current";
import { selectSection } from "./select-section";
import { generateJustification } from "./generate-justification";
import { getCorrectionFactors } from "../tables/correction-factors";
import { getAdmissibleCurrent } from "../tables/itc-bt-19";
import { calculateVoltageDrop } from "../tables/itc-bt-19-voltage-drop";
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
 * Calcula un circuito completo orquestando todas las funciones del motor.
 *
 * @param input Datos del circuito
 * @returns CircuitResult con sección, protecciones, CdT, tubo, justificación
 * @throws EngineError si cualquier cálculo falla
 */
export function calculateCircuit(input: CircuitInput): CircuitResult {
  const circuitId = input.id;

  try {
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
      voltageV: input.voltageV,
    });

    // 5. PIA (protección magnetotérmica)
    const template = getCircuitTemplate(input.code);
    const curve = template?.breakerCurve ?? "C";
    const piaResult = selectPIA({
      Ib: In,
      Iz: IzCorrected,
      curve,
    });

    // 6. Diferencial (RCD)
    const rcdSensitivityMa: 30 | 300 | null =
      template?.rcdSensitivityMa ?? 30;

    // 7. Diámetro de tubo
    const numConductors = getConductorCountForCircuit({
      phaseSystem: input.phaseSystem,
      includeNeutral: true,
      includeProtection: true,
    });
    const tubeDiameterMm = getMinTubeDiameter(
      selectResult.sectionMm2,
      numConductors
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
    };
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
