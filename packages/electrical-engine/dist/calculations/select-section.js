"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectSection = selectSection;
const types_1 = require("../types");
const nominal_current_1 = require("./nominal-current");
const itc_bt_19_1 = require("../tables/itc-bt-19");
const correction_factors_1 = require("../tables/correction-factors");
const itc_bt_19_voltage_drop_1 = require("../tables/itc-bt-19-voltage-drop");
const itc_bt_25_1 = require("../tables/itc-bt-25");
// ─── Secciones normalizadas por material ───────────────────────────────────
/** Secciones disponibles para Cu (1.5–300 mm²) */
const SECTIONS_CU = types_1.NORMALIZED_SECTIONS_MM2;
/** Secciones disponibles para Al (16–300 mm², no se admite < 16 en interiores) */
const SECTIONS_AL = types_1.NORMALIZED_SECTIONS_MM2.filter((s) => s >= 16);
// ─── Funciones auxiliares ──────────────────────────────────────────────────
function getSectionsForMaterial(material) {
    return material === "Cu" ? SECTIONS_CU : SECTIONS_AL;
}
/**
 * Redondea una sección calculada al valor normalizado inmediatamente superior.
 * - NaN, Infinity o > 300 → sección máxima del material (fallback seguro)
 * - ≤ 0 → sección mínima del material
 */
function normalizeSectionUp(calculatedMm2, material) {
    const sections = getSectionsForMaterial(material);
    const minSection = sections[0];
    const maxSection = sections[sections.length - 1];
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
function selectSection(input) {
    // 1. Intensidad nominal
    const nominalResult = (0, nominal_current_1.calculateNominalCurrent)({
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
    const factors = (0, correction_factors_1.getCorrectionFactors)({
        insulationType: input.insulationType,
        ambientTempC: input.ambientTempC,
        groupingCircuits: input.groupingCircuits,
        method: input.installationMethod,
    });
    // 3. Criterio térmico: mínima sección donde Iz_corregida ≥ In
    const thermalSection = selectThermalSection(In, factors.combined, input.installationMethod, input.insulationType, input.conductorMaterial);
    // 4. Criterio caída de tensión
    const voltageDropResult = (0, itc_bt_19_voltage_drop_1.calculateVoltageDrop)({
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
    const voltageDropSection = normalizeSectionUp(voltageDropResult.minSectionMm2, input.conductorMaterial);
    // 5. Criterio ITC-BT-25 (solo si tiene código distinto de CUSTOM)
    let minimumItcBt25 = null;
    if (input.code !== "CUSTOM") {
        const template = (0, itc_bt_25_1.getCircuitTemplate)(input.code);
        if (template) {
            minimumItcBt25 = template.minSectionMm2;
        }
    }
    // 6. Tomar la mayor de las tres
    const candidates = [
        { section: thermalSection, criterion: "thermal" },
        { section: voltageDropSection, criterion: "voltage_drop" },
    ];
    if (minimumItcBt25 !== null) {
        candidates.push({ section: minimumItcBt25, criterion: "minimum_itcbt25" });
    }
    const maxSection = Math.max(...candidates.map((c) => c.section));
    // Criterio determinante: el que aportó la sección máxima
    // Si hay empate, prioridad: thermal > voltage_drop > minimum_itcbt25
    const determinant = candidates
        .filter((c) => c.section === maxSection)
        .sort((a, b) => {
        const order = {
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
function selectThermalSection(In, combinedFactor, method, insulation, material) {
    const sections = (0, itc_bt_19_1.getAvailableSections)(method, insulation, material);
    for (const section of sections) {
        const Iz = (0, itc_bt_19_1.getAdmissibleCurrent)(method, section, insulation, material);
        const IzCorrected = Iz * combinedFactor;
        if (IzCorrected >= In) {
            return section;
        }
    }
    // Ninguna sección disponible cumple → devolver la máxima
    const maxSection = sections[sections.length - 1];
    return (maxSection ?? 300);
}
//# sourceMappingURL=select-section.js.map