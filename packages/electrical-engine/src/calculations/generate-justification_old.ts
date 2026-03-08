/**
 * GENERACIÓN DE MEMORIA TÉCNICA — Justificación paso a paso
 *
 * Genera una memoria técnica con cada cálculo justificado, citando
 * los artículos exactos del REBT (ITC-BT-19, ITC-BT-22, ITC-BT-25, etc.).
 *
 * Recibe CircuitInput y SelectSectionResult; devuelve array de pasos
 * con trazabilidad completa.
 */

import type { CircuitInput } from "../types";
import type { SelectSectionResult } from "./select-section";
import { getCorrectionFactors } from "../tables/correction-factors";
import { getAdmissibleCurrent } from "../tables/itc-bt-19";
import { getLoadType, calculateVoltageDrop, CDT_LIMITS_PCT } from "../tables/itc-bt-19-voltage-drop";
import { getCircuitTemplate } from "../tables/itc-bt-25";

// ─── Tipo de paso de justificación técnica ─────────────────────────────────

export interface TechnicalJustificationStep {
  step: number;
  concept: string;
  formula: string;
  values: Record<string, number | string>;
  result: number | string;
  normRef: string;
}

const SQRT3 = Math.sqrt(3);
const DEFAULT_VOLTAGE = { single: 230, three: 400 } as const;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

/**
 * Genera la memoria técnica paso a paso para un circuito.
 *
 * @param input Datos del circuito
 * @param selectResult Resultado de selectSection()
 * @returns Array de JustificationStep, nunca vacío
 */
export function generateJustification(
  input: CircuitInput,
  selectResult: SelectSectionResult
): TechnicalJustificationStep[] {
  const steps: TechnicalJustificationStep[] = [];
  const In = selectResult.nominalCurrentA;
  const V = input.voltageV ?? DEFAULT_VOLTAGE[input.phaseSystem];

  // Paso 1: Potencia efectiva
  const Ks = input.simultaneityFactor;
  const Fu = input.loadFactor;
  const P_ef = input.loadPowerW * Ks * Fu;
  steps.push({
    step: 1,
    concept: "Potencia efectiva de diseño",
    formula: "P_ef = P_instalada × Ks × Fu",
    values: {
      P_instalada: input.loadPowerW,
      Ks,
      Fu,
    },
    result: round2(P_ef),
    normRef: "ITC-BT-19 §2 / Previsión de cargas",
  });

  // Paso 2: Intensidad nominal
  const cosφ = input.powerFactor;
  const InFormula =
    input.phaseSystem === "single"
      ? "In = P_ef / (V × cosφ)"
      : "In = P_ef / (√3 × V × cosφ)";
  steps.push({
    step: 2,
    concept: "Intensidad nominal",
    formula: InFormula,
    values: {
      P_ef: round2(P_ef),
      V,
      cosφ,
      ...(input.phaseSystem === "three" && { "√3": round3(SQRT3) }),
    },
    result: round2(In),
    normRef: "ITC-BT-19 §2.1 / Fórmula de intensidad",
  });

  // Paso 3: Factores de corrección
  const factors = getCorrectionFactors({
    insulationType: input.insulationType,
    ambientTempC: input.ambientTempC,
    groupingCircuits: input.groupingCircuits,
    method: input.installationMethod,
  });

  steps.push({
    step: 3,
    concept: "Factor de corrección por temperatura ambiente (Ca)",
    formula: "Ca según T_ambiente e isolación (tabla)",
    values: {
      T_ambiente: input.ambientTempC,
      isolacion: input.insulationType,
      Ca: round3(factors.Ca),
    },
    result: round3(factors.Ca),
    normRef: "ITC-BT-19 Tabla 3 / IEC 60364-5-52 Tabla B.52.14",
  });

  steps.push({
    step: 4,
    concept: "Factor de corrección por agrupamiento (Cg)",
    formula: "Cg según número de circuitos agrupados",
    values: {
      n_circuitos: input.groupingCircuits,
      metodo: input.installationMethod,
      Cg: round3(factors.Cg),
    },
    result: round3(factors.Cg),
    normRef: "ITC-BT-19 Tabla 4 / IEC 60364-5-52 Tabla B.52.17",
  });

  steps.push({
    step: 5,
    concept: "Factor combinado Ca × Cg",
    formula: "F_comb = Ca × Cg",
    values: {
      Ca: round3(factors.Ca),
      Cg: round3(factors.Cg),
      F_comb: round3(factors.combined),
    },
    result: round3(factors.combined),
    normRef: "ITC-BT-19 §2 / Iz = Izt × Ca × Cg",
  });

  // Paso 6: Criterio térmico
  const Iz = getAdmissibleCurrent(
    input.installationMethod,
    selectResult.thermalSectionMm2,
    input.insulationType,
    input.conductorMaterial
  );
  const IzCorrected = Iz * factors.combined;

  steps.push({
    step: 6,
    concept: "Criterio térmico: intensidad admisible",
    formula: "Iz_corregida = Iz_tabla × Ca × Cg ≥ In",
    values: {
      Iz_tabla: Iz,
      S_térmica: selectResult.thermalSectionMm2,
      metodo: input.installationMethod,
      Iz_corregida: round2(IzCorrected),
      In,
    },
    result: `${selectResult.thermalSectionMm2} mm²`,
    normRef: "ITC-BT-19 Tabla 1 / Intensidades admisibles",
  });

  // Paso 7: Criterio caída de tensión
  const loadType = getLoadType(input.code);
  const cdtLimit = CDT_LIMITS_PCT[loadType];
  const vdResult = calculateVoltageDrop({
    nominalCurrentA: In,
    lengthM: input.lengthM,
    sectionMm2: selectResult.sectionMm2,
    phaseSystem: input.phaseSystem,
    conductorMaterial: input.conductorMaterial,
    insulationType: input.insulationType,
    powerFactor: cosφ,
    upstreamCdtPct: input.upstreamCdtPct ?? 0,
    circuitCode: input.code,
    voltageV: V,
  });

  steps.push({
    step: 7,
    concept: "Criterio caída de tensión",
    formula:
      input.phaseSystem === "single"
        ? "ΔU% = 2 × I × L × (R·cosφ) / V × 100"
        : "ΔU% = √3 × I × L × (R·cosφ) / V × 100",
    values: {
      In: round2(In),
      L: input.lengthM,
      S_CdT: selectResult.voltageDropSectionMm2,
      limite_pct: cdtLimit,
      tipo_carga: loadType,
      CdT_tramo: round3(vdResult.voltageDropPct),
      CdT_acum: round3(vdResult.accumulatedCdtPct),
    },
    result: `${selectResult.voltageDropSectionMm2} mm²`,
    normRef: "ITC-BT-19 §2.2 / Límite 3% alumbrado, 5% fuerza",
  });

  // Paso 8: Criterio ITC-BT-25 (si aplica)
  if (input.code !== "CUSTOM" && selectResult.minimumItcBt25SectionMm2 !== null) {
    const template = getCircuitTemplate(input.code);
    steps.push({
      step: 8,
      concept: "Mínimo normativo ITC-BT-25",
      formula: "Sección mínima por tipo de circuito",
      values: {
        circuito: input.code,
        S_min: selectResult.minimumItcBt25SectionMm2,
        uso: template?.name ?? input.code,
      },
      result: `${selectResult.minimumItcBt25SectionMm2} mm²`,
      normRef: "ITC-BT-25 Tabla 1 / Circuitos tipo vivienda",
    });
  }

  // Paso final: Sección elegida
  const stepNumFinal = steps.length + 1;
  const critLabel: Record<string, string> = {
    thermal: "térmico (ITC-BT-19)",
    voltage_drop: "caída de tensión (ITC-BT-19 §2.2)",
    minimum_itcbt25: "mínimo normativo (ITC-BT-25)",
  };

  steps.push({
    step: stepNumFinal,
    concept: "Sección final elegida",
    formula: "S_final = max(S_térmica, S_CdT, S_ITC-BT-25)",
    values: {
      S_térmica: selectResult.thermalSectionMm2,
      S_CdT: selectResult.voltageDropSectionMm2,
      S_ITC_BT25: selectResult.minimumItcBt25SectionMm2 ?? "-",
      criterio_determinante: critLabel[selectResult.determinantCriteria] ?? selectResult.determinantCriteria,
    },
    result: `${selectResult.sectionMm2} mm²`,
    normRef: "ITC-BT-19 / Se toma la mayor de las tres secciones",
  });

  return steps;
}
