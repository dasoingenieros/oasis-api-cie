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
import type { PhaseSystem, ConductorMaterial, InsulationType } from "../types";
export type CircuitLoadType = "lighting" | "power";
export declare const CDT_LIMITS_PCT: Record<CircuitLoadType, number>;
/**
 * Determina el tipo de carga (alumbrado o fuerza) por el código de circuito.
 * ITC-BT-19 §2.2
 */
export declare function getLoadType(circuitCode: string): CircuitLoadType;
export interface VoltagDropInput {
    nominalCurrentA: number;
    lengthM: number;
    sectionMm2: number;
    phaseSystem: PhaseSystem;
    conductorMaterial: ConductorMaterial;
    insulationType: InsulationType;
    powerFactor: number;
    conductorTempC?: number;
    voltageV?: number;
    upstreamCdtPct?: number;
    circuitCode?: string;
}
export interface VoltageDropResult {
    voltageDropPct: number;
    voltageDropV: number;
    accumulatedCdtPct: number;
    limitPct: number;
    isCompliant: boolean;
    marginPct: number;
    minSectionMm2: number;
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
export declare function calculateVoltageDrop(input: VoltagDropInput): VoltageDropResult;
//# sourceMappingURL=itc-bt-19-voltage-drop.d.ts.map