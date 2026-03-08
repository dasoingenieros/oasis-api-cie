"use strict";
/**
 * CÁLCULO COMPLETO DE CIRCUITO — Función principal del motor
 *
 * Orquesta calculateNominalCurrent(), selectSection() y generateJustification().
 * Devuelve un CircuitResult completo con sección, protecciones, CdT,
 * tubo, justificación y validez.
 *
 * Si cualquier cálculo falla lanza EngineError con code y circuitId.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateCircuit = calculateCircuit;
const types_1 = require("../types");
const nominal_current_1 = require("./nominal-current");
const select_section_1 = require("./select-section");
const generate_justification_1 = require("./generate-justification");
const correction_factors_1 = require("../tables/correction-factors");
const itc_bt_19_1 = require("../tables/itc-bt-19");
const itc_bt_19_voltage_drop_1 = require("../tables/itc-bt-19-voltage-drop");
const itc_bt_25_1 = require("../tables/itc-bt-25");
const itc_bt_22_1 = require("../tables/itc-bt-22");
const itc_bt_21_1 = require("../tables/itc-bt-21");
function mapTechnicalStepToJustificationStep(ts) {
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
function calculateCircuit(input) {
    const circuitId = input.id;
    try {
        // 1. Intensidad nominal
        const nominalResult = (0, nominal_current_1.calculateNominalCurrent)({
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
        const selectResult = (0, select_section_1.selectSection)(input);
        // 3. Factores de corrección e intensidad admisible
        const factors = (0, correction_factors_1.getCorrectionFactors)({
            insulationType: input.insulationType,
            ambientTempC: input.ambientTempC,
            groupingCircuits: input.groupingCircuits,
            method: input.installationMethod,
        });
        const Iz = (0, itc_bt_19_1.getAdmissibleCurrent)(input.installationMethod, selectResult.sectionMm2, input.insulationType, input.conductorMaterial);
        const IzCorrected = Iz * factors.combined;
        // 4. Caída de tensión
        const vdResult = (0, itc_bt_19_voltage_drop_1.calculateVoltageDrop)({
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
        const template = (0, itc_bt_25_1.getCircuitTemplate)(input.code);
        const curve = template?.breakerCurve ?? "C";
        const piaResult = (0, itc_bt_22_1.selectPIA)({
            Ib: In,
            Iz: IzCorrected,
            curve,
        });
        // 6. Diferencial (RCD)
        const rcdSensitivityMa = template?.rcdSensitivityMa ?? 30;
        // 7. Diámetro de tubo
        const numConductors = (0, itc_bt_21_1.getConductorCountForCircuit)({
            phaseSystem: input.phaseSystem,
            includeNeutral: true,
            includeProtection: true,
        });
        const tubeDiameterMm = (0, itc_bt_21_1.getMinTubeDiameter)(selectResult.sectionMm2, numConductors);
        // 8. Justificación
        const techSteps = (0, generate_justification_1.generateJustification)(input, selectResult);
        const justificationSteps = techSteps.map(mapTechnicalStepToJustificationStep);
        // 9. Validación
        const cdtOk = vdResult.isCompliant;
        const piaOk = piaResult.isValid;
        const thermalOk = IzCorrected >= In;
        const isCompliant = cdtOk && piaOk && thermalOk;
        // 10. Warnings y errors
        const warnings = [...piaResult.warnings];
        const errors = [];
        if (!cdtOk) {
            errors.push(`Caída de tensión ${vdResult.accumulatedCdtPct.toFixed(2)}% supera el límite ${vdResult.limitPct}% (ITC-BT-19 §2.2)`);
        }
        if (!thermalOk) {
            errors.push(`Intensidad admisible Iz=${IzCorrected.toFixed(1)}A < In=${In.toFixed(1)}A (ITC-BT-19)`);
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
    }
    catch (err) {
        if (err instanceof types_1.EngineError) {
            throw err;
        }
        throw new types_1.EngineError(err instanceof Error ? err.message : "Error en cálculo de circuito", "CALCULATION_ERROR", circuitId);
    }
}
//# sourceMappingURL=calculate-circuit_old.js.map