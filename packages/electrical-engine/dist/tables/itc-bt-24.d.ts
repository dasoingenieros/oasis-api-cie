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
import type { ConductorMaterial, InsulationType } from "../types";
export declare const NETWORK_VOLTAGE: {
    readonly phase_neutral: 230;
    readonly phase_phase: 400;
};
export declare const CONDUCTOR_MAX_TEMP_C: Record<InsulationType, number>;
export interface NetworkImpedanceData {
    description: string;
    maxIccKA: number;
    networkImpedanceOhm: number;
}
export declare const TYPICAL_NETWORK_IMPEDANCE: Record<string, NetworkImpedanceData>;
export interface LoopImpedanceInput {
    sectionMm2: number;
    protectionSectionMm2: number;
    lengthM: number;
    material: ConductorMaterial;
    insulation: InsulationType;
    upstreamImpedanceOhm?: number;
}
export interface LoopImpedanceResult {
    loopImpedanceOhm: number;
    phaseImpedanceOhm: number;
    peImpedanceOhm: number;
    IccMaxA: number;
    IccMinA: number;
    IccMinKA: number;
}
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
export declare function calculateLoopImpedance(input: LoopImpedanceInput): LoopImpedanceResult;
export interface IndirectContactVerification {
    system: "TT" | "TN";
    differentialSensitivityMa: number;
    earthResistanceOhm: number;
    IccMinA: number;
    contactVoltageV: number;
    maxContactVoltageV: number;
    isDifferentialTriggered: boolean;
    isProtected: boolean;
    warnings: string[];
}
/**
 * Verifica la protección contra contactos indirectos en sistema TT.
 * Sistema habitual en instalaciones de edificios en España.
 *
 * Condición: Uc = Id × Rt ≤ 50V (local seco) o ≤ 24V (húmedo)
 * El diferencial actúa si Id ≥ sensibilidad
 */
export declare function verifyIndirectContactProtection(params: {
    earthResistanceOhm: number;
    differentialSensitivityMa: number;
    locationIsHumid?: boolean;
}): IndirectContactVerification;
//# sourceMappingURL=itc-bt-24.d.ts.map