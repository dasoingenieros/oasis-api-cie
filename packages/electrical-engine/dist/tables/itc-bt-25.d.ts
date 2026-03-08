/**
 * CIRCUITOS TIPO ITC-BT-25 — Instalaciones interiores en viviendas
 *
 * Fuente: REBT — ITC-BT-25 Tabla 1
 *
 * Define los circuitos mínimos obligatorios en viviendas, con:
 *   - Potencia prevista
 *   - Sección mínima conductor (fase y neutro)
 *   - Calibre máximo PIA
 *   - Sensibilidad diferencial
 *   - Clavija/enchufe tipo
 *   - Número mínimo de puntos de utilización
 */
import type { CircuitCode, BreakerCurve, SectionMm2, BreakerRating } from "../types";
export interface CircuitTemplate {
    code: CircuitCode;
    name: string;
    description: string;
    powerPerPointW: number;
    minPoints: {
        studio: number;
        small: number;
        medium: number;
        large: number;
        xlarge: number;
    };
    minSectionMm2: SectionMm2;
    maxBreakerA: BreakerRating;
    breakerCurve: BreakerCurve;
    rcdSensitivityMa: 30 | 300;
    socketType: "schuko_16A" | "schuko_25A" | "none";
    notes: string;
}
export declare const ITC_BT_25_CIRCUITS: Record<string, CircuitTemplate>;
/**
 * Obtiene la plantilla de circuito por código.
 */
export declare function getCircuitTemplate(code: string): CircuitTemplate | undefined;
/**
 * Lista de circuitos obligatorios según superficie de la vivienda.
 * Retorna los códigos de circuito que son obligatorios.
 */
export declare function getMandatoryCircuits(surfaceM2: number): CircuitCode[];
//# sourceMappingURL=itc-bt-25.d.ts.map