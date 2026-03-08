"use strict";
/**
 * GENERACIÓN DE MEMORIA TÉCNICA — Justificación paso a paso
 *
 * Dos funciones:
 * 1. generateJustification() — para circuitos CUSTOM (cálculo completo)
 * 2. generateItcBt25Justification() — para circuitos tipo ITC-BT-25 (valores de tabla)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateItcBt25Justification = generateItcBt25Justification;
exports.generateJustification = generateJustification;
const correction_factors_1 = require("../tables/correction-factors");
const itc_bt_19_1 = require("../tables/itc-bt-19");
const itc_bt_19_voltage_drop_1 = require("../tables/itc-bt-19-voltage-drop");
const itc_bt_25_1 = require("../tables/itc-bt-25");
const SQRT3 = Math.sqrt(3);
const DEFAULT_VOLTAGE = { single: 230, three: 400 };
function round2(n) {
    return Math.round(n * 100) / 100;
}
function round3(n) {
    return Math.round(n * 1000) / 1000;
}
/**
 * Genera la memoria técnica para un circuito tipo ITC-BT-25.
 * Los valores vienen directamente de la tabla normativa.
 */
function generateItcBt25Justification(input, params) {
    const steps = [];
    const template = (0, itc_bt_25_1.getCircuitTemplate)(input.code);
    const V = input.voltageV ?? DEFAULT_VOLTAGE[input.phaseSystem];
    // Paso 1: Identificación del circuito tipo
    steps.push({
        step: 1,
        concept: "Circuito tipo ITC-BT-25",
        formula: "Valores directos de tabla normativa",
        values: {
            codigo: input.code,
            nombre: template.name,
            descripcion: template.description,
        },
        result: `Circuito ${input.code} — ${template.name}`,
        normRef: "ITC-BT-25 Tabla 1 / Circuitos tipo vivienda",
    });
    // Paso 2: Intensidad de cálculo = PIA
    steps.push({
        step: 2,
        concept: "Intensidad de cálculo (I_PIA)",
        formula: "I_cálculo = I_PIA (según ITC-BT-25)",
        values: {
            PIA: params.breakerRatingA,
            curva: params.breakerCurve,
        },
        result: `${params.breakerRatingA} A`,
        normRef: "ITC-BT-25 Tabla 1 / Calibre máximo PIA",
    });
    // Paso 3: Potencia de cálculo
    const formula = input.phaseSystem === "single"
        ? "P_cálculo = V × I_PIA"
        : "P_cálculo = √3 × V × I_PIA";
    steps.push({
        step: 3,
        concept: "Potencia de cálculo",
        formula,
        values: {
            V,
            I_PIA: params.breakerRatingA,
            P_cálculo_W: params.calculatedPowerW,
            P_cálculo_kW: round2(params.calculatedPowerW / 1000),
        },
        result: `${round2(params.calculatedPowerW / 1000)} kW`,
        normRef: "ITC-BT-25 / P = V × I",
    });
    // Paso 4: Sección mínima ITC-BT-25
    steps.push({
        step: 4,
        concept: "Sección mínima normativa",
        formula: "S_min según tipo de circuito ITC-BT-25",
        values: {
            circuito: input.code,
            S_min: params.originalSectionMm2,
            material: input.conductorMaterial,
            n_conductores: params.numConductors,
        },
        result: `${params.numConductors}×${params.originalSectionMm2} mm²`,
        normRef: "ITC-BT-25 Tabla 1 / Sección mínima conductor",
    });
    // Paso 5: Caída de tensión
    const loadType = (0, itc_bt_19_voltage_drop_1.getLoadType)(input.code);
    const cdtLimit = itc_bt_19_voltage_drop_1.CDT_LIMITS_PCT[loadType];
    steps.push({
        step: 5,
        concept: "Verificación caída de tensión",
        formula: input.phaseSystem === "single"
            ? "ΔV = 2 × I × L × ρ / S"
            : "ΔV = √3 × I × L × ρ / S",
        values: {
            I: params.nominalCurrentA,
            L: input.lengthM,
            S: params.sectionMm2,
            CdT_V: round3(params.vdResult.voltageDropV),
            CdT_pct: round3(params.vdResult.voltageDropPct),
            CdT_acum_pct: round3(params.vdResult.accumulatedCdtPct),
            limite_pct: cdtLimit,
            tipo_carga: loadType === "lighting" ? "alumbrado" : "fuerza",
            cumple: params.vdResult.isCompliant ? "SÍ" : "NO",
        },
        result: `${round3(params.vdResult.voltageDropV)} V (${round3(params.vdResult.accumulatedCdtPct)}%)`,
        normRef: "ITC-BT-19 §2.2 / Límite 3% alumbrado, 5% fuerza",
    });
    // Paso 6: Aumento de sección por CdT (si aplica)
    if (params.sectionIncreased) {
        steps.push({
            step: 6,
            concept: "Sección aumentada por caída de tensión",
            formula: "S_final > S_min (ITC-BT-25) por exceso de CdT",
            values: {
                S_original: params.originalSectionMm2,
                S_final: params.sectionMm2,
                longitud: input.lengthM,
                motivo: "CdT excedía límite con sección mínima normativa",
            },
            result: `${params.numConductors}×${params.sectionMm2} mm²`,
            normRef: "ITC-BT-19 §2.2 / Aumento de sección por CdT",
        });
    }
    // Paso 7: Protección diferencial
    steps.push({
        step: params.sectionIncreased ? 7 : 6,
        concept: "Protección diferencial (RCD)",
        formula: "Sensibilidad según ITC-BT-25",
        values: {
            sensibilidad_mA: params.rcdSensitivityMa,
        },
        result: `Dif. ${params.rcdSensitivityMa}mA`,
        normRef: "ITC-BT-25 Tabla 1 / Sensibilidad diferencial",
    });
    // Paso final: Resumen
    const stepFinal = steps.length + 1;
    steps.push({
        step: stepFinal,
        concept: "Sección final del circuito",
        formula: params.sectionIncreased
            ? "S_final = máx(S_ITC-BT-25, S_CdT)"
            : "S_final = S_ITC-BT-25 (sección mínima normativa cumple CdT)",
        values: {
            circuito: input.code,
            nombre: template.name,
            S_final: params.sectionMm2,
            conductores: `${params.numConductors}×${params.sectionMm2}`,
            material: input.conductorMaterial,
            PIA: `${params.breakerRatingA}A curva ${params.breakerCurve}`,
            diferencial: `${params.rcdSensitivityMa}mA`,
            P_cálculo: `${round2(params.calculatedPowerW / 1000)} kW`,
            CdT: `${round3(params.vdResult.voltageDropV)} V`,
        },
        result: `${params.numConductors}×${params.sectionMm2} mm² ${input.conductorMaterial}`,
        normRef: "ITC-BT-25 Tabla 1 / Resultado final",
    });
    return steps;
}
// ─── Justificación para circuitos CUSTOM (cálculo completo) ──────────────────
/**
 * Genera la memoria técnica paso a paso para un circuito CUSTOM.
 */
function generateJustification(input, selectResult) {
    const steps = [];
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
    const InFormula = input.phaseSystem === "single"
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
    const factors = (0, correction_factors_1.getCorrectionFactors)({
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
    const Iz = (0, itc_bt_19_1.getAdmissibleCurrent)(input.installationMethod, selectResult.thermalSectionMm2, input.insulationType, input.conductorMaterial);
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
    const loadType = (0, itc_bt_19_voltage_drop_1.getLoadType)(input.code);
    const cdtLimit = itc_bt_19_voltage_drop_1.CDT_LIMITS_PCT[loadType];
    const vdResult = (0, itc_bt_19_voltage_drop_1.calculateVoltageDrop)({
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
        formula: input.phaseSystem === "single"
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
        const template = (0, itc_bt_25_1.getCircuitTemplate)(input.code);
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
    const critLabel = {
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
//# sourceMappingURL=generate-justification.js.map