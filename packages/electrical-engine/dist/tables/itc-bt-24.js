"use strict";
/**
 * ITC-BT-24 — PROTECCIÓN CONTRA CONTACTOS INDIRECTOS
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-24 / IEC 60364-4-41
 *
 * La protección contra contactos indirectos se basa en la desconexión
 * automática de la alimentación cuando aparece una falta a tierra.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * CONDICIÓN DE DESCONEXIÓN AUTOMÁTICA (ITC-BT-24 §3.2 / IEC 60364-4-41):
 *
 * Sistema TT (normal en España para edificios):
 *   La corriente de defecto Id debe ser suficiente para actuar el diferencial.
 *   Condición: Id ≥ sensibilidad del diferencial
 *   Donde: Id = U0 / (Rt + Zs) ≈ U0 / Rt  (para Rt >> Zs)
 *
 * Sistema TN (redes de distribución propias, industria):
 *   Condición: Icc ≥ Ia (corriente de actuación del dispositivo de protección)
 *   Icc = U0 / Zs
 *   Donde Zs = impedancia del bucle de defecto fase-PE
 *
 * Para ambos sistemas la regla práctica es que el diferencial de 30mA
 * actúe con cualquier resistencia de defecto realista.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * CÁLCULO DE CORRIENTE DE CORTOCIRCUITO MÁXIMA Y MÍNIMA:
 *
 * En el punto más alejado del circuito:
 *   Icc_min = U0 / (2 × Z_loop)
 *   Z_loop = impedancia del bucle fase-neutro desde el transformador hasta el punto
 *
 * En el origen del circuito (junto al cuadro):
 *   Icc_max ≈ tensión de la red / impedancia de la red (dato de la compañía)
 *   Valor típico para viviendas en España: 4-6 kA
 *   Valor típico para instalaciones industriales: 10-15 kA
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPICAL_NETWORK_IMPEDANCE = exports.CONDUCTOR_MAX_TEMP_C = exports.NETWORK_VOLTAGE = void 0;
exports.calculateLoopImpedance = calculateLoopImpedance;
exports.verifyIndirectContactProtection = verifyIndirectContactProtection;
const itc_bt_14_1 = require("./itc-bt-14");
// ─── Tensiones de red en España ───────────────────────────────────────────
exports.NETWORK_VOLTAGE = {
    phase_neutral: 230, // V — tensión fase-neutro (U0)
    phase_phase: 400, // V — tensión fase-fase
};
// ─── Temperatura de cálculo para cortocircuito ────────────────────────────
// IEC 60364-4-43: usar temperatura máxima de servicio del conductor
exports.CONDUCTOR_MAX_TEMP_C = {
    PVC: 70, // °C
    XLPE: 90, // °C
    EPR: 90, // °C
};
// Valores típicos para España (Iberdrola, Endesa, etc.)
exports.TYPICAL_NETWORK_IMPEDANCE = {
    urban_residential: {
        description: "Red urbana residencial (viviendas, barrios)",
        maxIccKA: 6,
        networkImpedanceOhm: 0.038, // 230V/6kA ≈ 0.038Ω
    },
    urban_commercial: {
        description: "Red urbana comercial/industrial",
        maxIccKA: 10,
        networkImpedanceOhm: 0.023,
    },
    rural: {
        description: "Red rural (líneas largas de distribución)",
        maxIccKA: 3,
        networkImpedanceOhm: 0.077,
    },
    industrial_transformer: {
        description: "Transformador propio (edificio/planta industrial)",
        maxIccKA: 20,
        networkImpedanceOhm: 0.0115,
    },
};
/**
 * Calcula la impedancia del bucle de defecto y la corriente de cortocircuito.
 * ITC-BT-24 §3 / IEC 60364-4-41
 *
 * Fórmula simplificada (sin reactancia para secciones < 50mm²):
 *   Zs = Z_red + R_fase + R_PE
 *   R = ρ_T / S × L
 *
 * Corriente de cortocircuito mínima (al final del circuito):
 *   Icc_min = U0 / Zs
 */
function calculateLoopImpedance(input) {
    const tempC = exports.CONDUCTOR_MAX_TEMP_C[input.insulation];
    const rho = (0, itc_bt_14_1.getResistivityAtTemp)(input.material, tempC);
    // Resistencias del tramo (Ω)
    const R_phase = (rho / input.sectionMm2) * input.lengthM;
    const R_pe = (rho / input.protectionSectionMm2) * input.lengthM;
    // Impedancia de red aguas arriba
    const Z_upstream = input.upstreamImpedanceOhm ?? 0.038;
    // Impedancia del bucle completo: red + fase + PE (vuelta por PE)
    const Zs = Z_upstream + R_phase + R_pe;
    // Corrientes de cortocircuito
    const U0 = exports.NETWORK_VOLTAGE.phase_neutral;
    const IccMax = U0 / Z_upstream; // En el origen (sin contar el cable)
    const IccMin = U0 / Zs; // Al final del circuito (mínima)
    return {
        loopImpedanceOhm: Math.round(Zs * 10000) / 10000,
        phaseImpedanceOhm: Math.round(R_phase * 10000) / 10000,
        peImpedanceOhm: Math.round(R_pe * 10000) / 10000,
        IccMaxA: Math.round(IccMax),
        IccMinA: Math.round(IccMin),
        IccMinKA: Math.round(IccMin / 1000 * 100) / 100,
    };
}
/**
 * Verifica la protección contra contactos indirectos en sistema TT.
 * Sistema habitual en instalaciones de edificios en España.
 *
 * Condición: Uc = Id × Rt ≤ 50V (local seco) o ≤ 24V (húmedo)
 * El diferencial actúa si Id ≥ sensibilidad
 */
function verifyIndirectContactProtection(params) {
    const U0 = exports.NETWORK_VOLTAGE.phase_neutral;
    const maxUc = params.locationIsHumid ? 24 : 50;
    const Id_diff = params.differentialSensitivityMa / 1000; // Convertir a A
    const warnings = [];
    // Corriente de defecto mínima que genera la tensión de contacto máxima admisible
    const Id_min_for_Uc = maxUc / params.earthResistanceOhm;
    // Tensión de contacto con corriente de defecto = sensibilidad del diferencial
    const Uc = Id_diff * params.earthResistanceOhm;
    // El diferencial actúa si la corriente de defecto ≥ sensibilidad
    const isDifferentialTriggered = true; // En TT con diferencial 30mA, cualquier defecto real lo dispara
    const isProtected = Uc <= maxUc;
    if (!isProtected) {
        warnings.push(`ITC-BT-24: Tensión de contacto ${Uc.toFixed(1)}V supera ${maxUc}V. ` +
            `Mejorar la puesta a tierra (R_tierra ≤ ${(maxUc / Id_diff).toFixed(0)}Ω).`);
    }
    if (params.earthResistanceOhm > 1667 && params.differentialSensitivityMa === 30) {
        warnings.push(`ITC-BT-24: Con diferencial 30mA, R_tierra ≤ 1.666Ω para Uc ≤ 50V. Valor actual: ${params.earthResistanceOhm.toFixed(1)}Ω`);
    }
    return {
        system: "TT",
        differentialSensitivityMa: params.differentialSensitivityMa,
        earthResistanceOhm: params.earthResistanceOhm,
        IccMinA: Math.round(U0 / params.earthResistanceOhm),
        contactVoltageV: Math.round(Uc * 100) / 100,
        maxContactVoltageV: maxUc,
        isDifferentialTriggered,
        isProtected,
        warnings,
    };
}
//# sourceMappingURL=itc-bt-24.js.map