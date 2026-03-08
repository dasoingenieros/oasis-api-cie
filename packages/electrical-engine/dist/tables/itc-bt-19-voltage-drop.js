"use strict";
/**
 * ITC-BT-19 (COMPLEMENTO) — CAÍDA DE TENSIÓN EN INSTALACIONES INTERIORES
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-19 §2.2 / ITC-BT-15 §3
 *
 * Límites de caída de tensión acumulada desde el origen de la instalación
 * hasta el punto de utilización más desfavorable:
 *
 *   Alumbrado:    CdT_total ≤ 3%   (desde CGMP)
 *   Fuerza motriz: CdT_total ≤ 5%  (desde CGMP)
 *
 * NOTA: Estos límites son ACUMULADOS (incluyendo la derivación individual si
 * la hay). El límite de la DI ya consume 1% (ITC-BT-15), por lo que el
 * margen disponible en la instalación interior es:
 *   Alumbrado: 3% - 1% DI = 2% disponible en instalación interior
 *   Fuerza:    5% - 1% DI = 4% disponible en instalación interior
 *
 * Para simplificar en el MVP, se aplicarán los límites totales (3%/5%)
 * medidos desde la entrada del CGMP, sin contar la DI.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDT_LIMITS_PCT = void 0;
exports.getLoadType = getLoadType;
exports.calculateVoltageDrop = calculateVoltageDrop;
const itc_bt_14_1 = require("./itc-bt-14");
exports.CDT_LIMITS_PCT = {
    lighting: 3, // 3% para circuitos de alumbrado
    power: 5, // 5% para circuitos de fuerza motriz y uso general
};
/**
 * Determina el tipo de carga (alumbrado o fuerza) por el código de circuito.
 * ITC-BT-19 §2.2
 */
function getLoadType(circuitCode) {
    const lightingCircuits = ["C1", "C6", "C11"]; // Alumbrado y domótica
    return lightingCircuits.includes(circuitCode) ? "lighting" : "power";
}
/**
 * Calcula la caída de tensión de un tramo y verifica el cumplimiento.
 * ITC-BT-19 §2.2
 *
 * Fórmulas:
 *   Monofásica: ΔU = 2 × I × L × (R×cosφ + X×sinφ)  [V]
 *   Trifásica:  ΔU = √3 × I × L × (R×cosφ + X×sinφ)  [V]
 *
 *   R = ρ_T / S  [Ω/m]  (solo componente resistiva, X despreciable < 50mm²)
 *   %ΔU = (ΔU / V_nominal) × 100
 */
function calculateVoltageDrop(input) {
    const SQRT3 = Math.sqrt(3);
    const V = input.voltageV ?? (input.phaseSystem === "three" ? 400 : 230);
    const tempC = input.conductorTempC ?? (input.insulationType === "PVC" ? 70 : 90);
    // Resistividad a temperatura de servicio
    const rho = (0, itc_bt_14_1.getResistivityAtTemp)(input.conductorMaterial, tempC); // Ω·mm²/m
    const R_per_m = rho / input.sectionMm2; // Ω/m
    const cosφ = input.powerFactor;
    const sinφ = Math.sqrt(Math.max(0, 1 - cosφ ** 2));
    // Reactancia (solo significativa ≥ 50mm², para instalaciones interiores típicas ≈ 0)
    const X_per_m = input.sectionMm2 >= 50 ? 0.00009 : 0; // Ω/m aprox
    // ΔU en voltios
    let deltaU;
    if (input.phaseSystem === "three") {
        deltaU = SQRT3 * input.nominalCurrentA * input.lengthM * (R_per_m * cosφ + X_per_m * sinφ);
    }
    else {
        deltaU = 2 * input.nominalCurrentA * input.lengthM * (R_per_m * cosφ + X_per_m * sinφ);
    }
    const voltageDropPct = (deltaU / V) * 100;
    const upstreamCdt = input.upstreamCdtPct ?? 0;
    const accumulatedCdtPct = voltageDropPct + upstreamCdt;
    // Límite aplicable
    const loadType = input.circuitCode ? getLoadType(input.circuitCode) : "power";
    const limitPct = exports.CDT_LIMITS_PCT[loadType];
    const isCompliant = accumulatedCdtPct <= limitPct;
    const marginPct = limitPct - accumulatedCdtPct;
    // Sección mínima para cumplir el límite
    const maxDeltaU_V = V * (limitPct - upstreamCdt) / 100;
    let minSectionMm2;
    if (input.phaseSystem === "three") {
        minSectionMm2 = (SQRT3 * input.nominalCurrentA * input.lengthM * rho * cosφ) / maxDeltaU_V;
    }
    else {
        minSectionMm2 = (2 * input.nominalCurrentA * input.lengthM * rho * cosφ) / maxDeltaU_V;
    }
    return {
        voltageDropPct: Math.round(voltageDropPct * 1000) / 1000,
        voltageDropV: Math.round(deltaU * 1000) / 1000,
        accumulatedCdtPct: Math.round(accumulatedCdtPct * 1000) / 1000,
        limitPct,
        isCompliant,
        marginPct: Math.round(marginPct * 1000) / 1000,
        minSectionMm2: Math.max(0, Math.ceil(minSectionMm2 * 100) / 100),
    };
}
//# sourceMappingURL=itc-bt-19-voltage-drop.js.map