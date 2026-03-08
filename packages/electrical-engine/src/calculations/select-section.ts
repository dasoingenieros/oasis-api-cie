/**
 * SELECCIÓN DE SECCIÓN — ITC-BT-19, ITC-BT-19 §2.2, ITC-BT-25
 *
 * Calcula la sección mínima normalizada que satisface los tres criterios:
 * 1. Térmico: Iz ≥ In (ITC-BT-19 con factores de corrección)
 * 2. Caída de tensión: límite 3% alumbrado / 5% fuerza (ITC-BT-19 §2.2)
 * 3. Mínimo normativo: ITC-BT-25 si el circuito tiene código
 *
 * Se devuelve la mayor de las tres secciones normalizadas.
 * NUNCA devuelve NaN, Infinity ni sección 0.
 */

import type { CircuitInput, SectionMm2, ConductorMaterial } from "../types";
import { NORMALIZED_SECTIONS_MM2 } from "../types";
import { calculateNominalCurrent } from "./nominal-current";
import { getAdmissibleCurrent, getAvailableSections } from "../tables/itc-bt-19";
import { getCorrectionFactors } from "../tables/correction-factors";
import { calculateVoltageDrop } from "../tables/itc-bt-19-voltage-drop";
import { getCircuitTemplate } from "../tables/itc-bt-25";

// ─── Tipos ────────────────────────────────────────────────────────────────

export type SectionCriterion =
  | "thermal"
  | "voltage_drop"
  | "minimum_itcbt25";

export interface SelectSectionResult {
  sectionMm2: SectionMm2;
  determinantCriteria: SectionCriterion;
  thermalSectionMm2: SectionMm2;
  voltageDropSectionMm2: SectionMm2;
  minimumItcBt25SectionMm2: SectionMm2 | null;
  nominalCurrentA: number;
}

// ─── Secciones normalizadas por material ───────────────────────────────────

/** Secciones disponibles para Cu (1.5–300 mm²) */
const SECTIONS_CU = NORMALIZED_SECTIONS_MM2;

/** Secciones disponibles para Al (16–300 mm², no se admite < 16 en interiores) */
const SECTIONS_AL = NORMALIZED_SECTIONS_MM2.filter((s) => s >= 16);

// ─── Funciones auxiliares ──────────────────────────────────────────────────

function getSectionsForMaterial(material: ConductorMaterial): readonly SectionMm2[] {
  return material === "Cu" ? SECTIONS_CU : SECTIONS_AL;
}

/**
 * Redondea una sección calculada al valor normalizado inmediatamente superior.
 * - NaN, Infinity o > 300 → sección máxima del material (fallback seguro)
 * - ≤ 0 → sección mínima del material
 */
function normalizeSectionUp(
  calculatedMm2: number,
  material: ConductorMaterial
): SectionMm2 {
  const sections = getSectionsForMaterial(material);
  const minSection = sections[0]!;
  const maxSection = sections[sections.length - 1]!;

  if (!isFinite(calculatedMm2) || calculatedMm2 > 300) {
    return maxSection;
  }
  if (calculatedMm2 <= 0) {
    return minSection;
  }

  const found = sections.find((s) => s >= calculatedMm2);
  return found ?? maxSection;
}

// ─── Función principal ─────────────────────────────────────────────────────

/**
 * Selecciona la sección mínima normalizada que cumple los tres criterios REBT.
 *
 * @param input Datos del circuito
 * @returns Sección elegida, criterio determinante y detalle por criterio
 */
export function selectSection(input: CircuitInput): SelectSectionResult {
  // 1. Intensidad nominal
  const nominalResult = calculateNominalCurrent({
    phaseSystem: input.phaseSystem,
    loadPowerW: input.loadPowerW,
    powerFactor: input.powerFactor,
    simultaneityFactor: input.simultaneityFactor,
    loadFactor: input.loadFactor,
    voltageV: input.voltageV,
    circuitId: input.id,
  });
  const In = nominalResult.nominalCurrentA;

  // 2. Factores de corrección
  const factors = getCorrectionFactors({
    insulationType: input.insulationType,
    ambientTempC: input.ambientTempC,
    groupingCircuits: input.groupingCircuits,
    method: input.installationMethod,
  });

  // 3. Criterio térmico: mínima sección donde Iz_corregida ≥ In
  const thermalSection = selectThermalSection(
    In,
    factors.combined,
    input.installationMethod,
    input.insulationType,
    input.conductorMaterial
  );

  // 4. Criterio caída de tensión
  const voltageDropResult = calculateVoltageDrop({
    nominalCurrentA: In,
    lengthM: input.lengthM,
    sectionMm2: 1.5, // Solo para cálculo de CdT; minSectionMm2 no depende de esto
    phaseSystem: input.phaseSystem,
    conductorMaterial: input.conductorMaterial,
    insulationType: input.insulationType,
    powerFactor: input.powerFactor,
    upstreamCdtPct: input.upstreamCdtPct ?? 0,
    circuitCode: input.code,
    voltageV: input.voltageV,
  });
  const voltageDropSection = normalizeSectionUp(
    voltageDropResult.minSectionMm2,
    input.conductorMaterial
  );

  // 5. Criterio ITC-BT-25 (solo si tiene código distinto de CUSTOM)
  let minimumItcBt25: SectionMm2 | null = null;
  if (input.code !== "CUSTOM") {
    const template = getCircuitTemplate(input.code);
    if (template) {
      minimumItcBt25 = template.minSectionMm2;
    }
  }

  // 6. Tomar la mayor de las tres
  const candidates: Array<{ section: SectionMm2; criterion: SectionCriterion }> = [
    { section: thermalSection, criterion: "thermal" },
    { section: voltageDropSection, criterion: "voltage_drop" },
  ];
  if (minimumItcBt25 !== null) {
    candidates.push({ section: minimumItcBt25, criterion: "minimum_itcbt25" });
  }

  const maxSection = Math.max(
    ...candidates.map((c) => c.section)
  ) as SectionMm2;

  // Criterio determinante: el que aportó la sección máxima
  // Si hay empate, prioridad: thermal > voltage_drop > minimum_itcbt25
  const determinant =
    candidates
      .filter((c) => c.section === maxSection)
      .sort((a, b) => {
        const order: Record<SectionCriterion, number> = {
          thermal: 0,
          voltage_drop: 1,
          minimum_itcbt25: 2,
        };
        return order[a.criterion] - order[b.criterion];
      })[0]?.criterion ?? "thermal";

  return {
    sectionMm2: maxSection,
    determinantCriteria: determinant,
    thermalSectionMm2: thermalSection,
    voltageDropSectionMm2: voltageDropSection,
    minimumItcBt25SectionMm2: minimumItcBt25,
    nominalCurrentA: In,
  };
}

/**
 * Selecciona la mínima sección que cumple Iz × Ca × Cg ≥ In.
 */
function selectThermalSection(
  In: number,
  combinedFactor: number,
  method: CircuitInput["installationMethod"],
  insulation: CircuitInput["insulationType"],
  material: ConductorMaterial
): SectionMm2 {
  const sections = getAvailableSections(method, insulation, material);

  for (const section of sections) {
    const Iz = getAdmissibleCurrent(method, section, insulation, material);
    const IzCorrected = Iz * combinedFactor;
    if (IzCorrected >= In) {
      return section as SectionMm2;
    }
  }

  // Ninguna sección disponible cumple → devolver la máxima
  const maxSection = sections[sections.length - 1];
  return (maxSection ?? 300) as SectionMm2;
}
