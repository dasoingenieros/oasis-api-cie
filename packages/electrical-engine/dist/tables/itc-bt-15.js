"use strict";
/**
 * ITC-BT-15 — DERIVACIONES INDIVIDUALES
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-15
 *
 * La derivación individual enlaza el contador del abonado con su
 * cuadro general de mando y protección (CGMP).
 *
 * Condiciones (ITC-BT-15 §3):
 *   - CdT máxima: 1% desde el contador hasta el CGMP
 *   - Sección mínima: 6mm² Cu
 *   - Aislamiento mínimo: 450/750V bajo tubo / 0.6/1kV al aire
 *   - Conductor de protección: obligatorio
 *   - Sin empalmes en todo su recorrido
 *   - Método habitual: A1 (empotrado en tubo) o E (bandeja en montante)
 *
 * Secciones mínimas según potencia (ITC-BT-15 Tabla 1):
 *   Hasta 5.750W (25A):  6mm²
 *   Hasta 9.200W (40A):  10mm²
 *   Hasta 14.375W (63A): 16mm²
 *   Hasta 23.000W (100A): 25mm²
 *   ...
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DI_CDT_LIMIT_PCT = exports.DI_SECTION_TABLE = void 0;
exports.calculateDIVoltageDrop = calculateDIVoltageDrop;
const itc_bt_14_1 = require("./itc-bt-14");
exports.DI_SECTION_TABLE = [
    { maxCurrentA: 25, maxPowerW_single: 5750, sectionCuMm2: 6, sectionAlMm2: 10, protectionCuMm2: 6 },
    { maxCurrentA: 32, maxPowerW_single: 7360, sectionCuMm2: 10, sectionAlMm2: 16, protectionCuMm2: 10 },
    { maxCurrentA: 40, maxPowerW_single: 9200, sectionCuMm2: 10, sectionAlMm2: 16, protectionCuMm2: 10 },
    { maxCurrentA: 50, maxPowerW_single: 11500, sectionCuMm2: 16, sectionAlMm2: 25, protectionCuMm2: 10 },
    { maxCurrentA: 63, maxPowerW_single: 14490, sectionCuMm2: 16, sectionAlMm2: 25, protectionCuMm2: 10 },
    { maxCurrentA: 80, maxPowerW_single: 18400, sectionCuMm2: 25, sectionAlMm2: 35, protectionCuMm2: 16 },
    { maxCurrentA: 100, maxPowerW_single: 23000, sectionCuMm2: 25, sectionAlMm2: 50, protectionCuMm2: 16 },
    { maxCurrentA: 125, maxPowerW_single: 28750, sectionCuMm2: 35, sectionAlMm2: 50, protectionCuMm2: 16 },
    { maxCurrentA: 160, maxPowerW_single: 36800, sectionCuMm2: 50, sectionAlMm2: 70, protectionCuMm2: 25 },
    { maxCurrentA: 200, maxPowerW_single: 46000, sectionCuMm2: 70, sectionAlMm2: 95, protectionCuMm2: 35 },
    { maxCurrentA: 250, maxPowerW_single: 57500, sectionCuMm2: 95, sectionAlMm2: 150, protectionCuMm2: 50 },
    { maxCurrentA: 315, maxPowerW_single: 72450, sectionCuMm2: 120, sectionAlMm2: 185, protectionCuMm2: 70 },
];
// ─── CdT límite DI ───────────────────────────────────────────────────────
exports.DI_CDT_LIMIT_PCT = 1.0; // 1% máximo ITC-BT-15 §3
/**
 * Calcula la caída de tensión en la derivación individual.
 * ITC-BT-15 §3 — Límite 1%
 */
function calculateDIVoltageDrop(input) {
    const SQRT3 = Math.sqrt(3);
    const V = input.voltageV ?? (input.phaseSystem === "three" ? 400 : 230);
    const tempC = input.conductorTempC ?? 70;
    const cosφ = input.powerFactor ?? 0.9;
    const sinφ = Math.sqrt(1 - cosφ ** 2);
    const warnings = [];
    // Intensidad nominal
    const In = input.phaseSystem === "three"
        ? input.contractedPowerW / (SQRT3 * V * cosφ)
        : input.contractedPowerW / (V * cosφ);
    // Resistencia
    const rho = (0, itc_bt_14_1.getResistivityAtTemp)(input.conductorMaterial, tempC);
    const R_mOhm_per_m = (rho / input.sectionMm2) * 1000;
    const X_mOhm_per_m = itc_bt_14_1.REACTANCE_TABLE_CABLE[input.sectionMm2] ?? 0;
    // ΔU
    let deltaU;
    if (input.phaseSystem === "three") {
        deltaU = (SQRT3 * In * input.lengthM * (R_mOhm_per_m * cosφ + X_mOhm_per_m * sinφ)) / 1000;
    }
    else {
        deltaU = (2 * In * input.lengthM * (R_mOhm_per_m * cosφ + X_mOhm_per_m * sinφ)) / 1000;
    }
    const voltageDropPct = (deltaU / V) * 100;
    const cdtCompliant = voltageDropPct <= exports.DI_CDT_LIMIT_PCT;
    // Sección mínima por tabla
    const tableEntry = exports.DI_SECTION_TABLE.find(e => e.maxCurrentA >= In);
    const minSectionCuMm2 = tableEntry?.sectionCuMm2 ?? 95;
    const protectionSectionMm2 = tableEntry?.protectionCuMm2 ?? 50;
    // Sección mínima por CdT (1%)
    const maxDeltaU = V * 0.01;
    const rhoAtTemp = (0, itc_bt_14_1.getResistivityAtTemp)("Cu", tempC);
    let minSectionByLoadMm2;
    if (input.phaseSystem === "three") {
        minSectionByLoadMm2 = (SQRT3 * In * input.lengthM * rhoAtTemp * 1000 * cosφ) / (maxDeltaU * 1000);
    }
    else {
        minSectionByLoadMm2 = (2 * In * input.lengthM * rhoAtTemp * 1000 * cosφ) / (maxDeltaU * 1000);
    }
    // Validaciones
    if (input.sectionMm2 < 6) {
        warnings.push("ITC-BT-15: Sección mínima de la derivación individual es 6mm² Cu.");
    }
    if (!cdtCompliant) {
        warnings.push(`ITC-BT-15: CdT ${voltageDropPct.toFixed(2)}% supera el límite del 1%.`);
    }
    return {
        nominalCurrentA: Math.round(In * 100) / 100,
        voltageDropPct: Math.round(voltageDropPct * 1000) / 1000,
        voltageDropV: Math.round(deltaU * 100) / 100,
        cdtLimitPct: exports.DI_CDT_LIMIT_PCT,
        cdtCompliant,
        minSectionCuMm2,
        minSectionByLoadMm2: Math.ceil(minSectionByLoadMm2 * 10) / 10,
        protectionSectionMm2,
        warnings,
    };
}
//# sourceMappingURL=itc-bt-15.js.map