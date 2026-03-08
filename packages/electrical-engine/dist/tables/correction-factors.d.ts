/**
 * FACTORES DE CORRECCIÓN — ITC-BT-19 / IEC 60364-5-52
 *
 * Los valores de intensidad admisible en tabla ITC-BT-19 son para:
 *   - Temperatura ambiente 40°C (instalaciones en aire)
 *   - Temperatura ambiente 25°C (instalaciones enterradas)
 *   - Circuito único (sin agrupamiento)
 *
 * Cuando las condiciones reales difieren, se aplican factores de corrección:
 *   Iz_real = Iz_tabla × Ca × Cg
 */
/**
 * Tabla Ca — Factor de corrección por temperatura ambiente
 * Fuente: ITC-BT-19 Tabla 3 / IEC 60364-5-52 Tabla B.52.14
 *
 * Estructura: Ca[insulationType][temperaturaAmbiente_°C]
 *
 * Para PVC: Tmax conductor = 70°C, Tref = 40°C
 * Para XLPE/EPR: Tmax conductor = 90°C, Tref = 40°C
 */
export declare const CORRECTION_FACTOR_CA: Record<"PVC" | "XLPE", Record<number, number>>;
/**
 * Obtiene el factor de corrección de temperatura Ca.
 * Interpola linealmente entre los valores de tabla si la temperatura
 * no cae exactamente en un punto tabulado.
 */
export declare function getCorrectionFactorCa(insulationType: "PVC" | "XLPE" | "EPR", ambientTempC: number): number;
/**
 * Tabla Cg — Factor de corrección por agrupamiento
 * Fuente: ITC-BT-19 Tabla 4 / IEC 60364-5-52 Tabla B.52.17
 *
 * Aplica cuando varios circuitos discurren agrupados (en el mismo tubo,
 * bandeja o en contacto).
 *
 * Estructura: Cg[nCircuitos]
 * NOTA: Aplica a métodos A1, A2, B1, B2, C, E, F (NO aplica a enterrados D)
 */
export declare const CORRECTION_FACTOR_CG: Record<number, number>;
/**
 * Obtiene el factor de corrección de agrupamiento Cg.
 * Para nCircuitos > 20, se aplica el valor de 20 (conservador).
 * Para instalaciones enterradas (método D), devuelve 1.0 (tabla D es diferente).
 */
export declare function getCorrectionFactorCg(nCircuits: number, method: string): number;
/**
 * Tabla Ct — Factor de corrección para cables enterrados (método D)
 * por resistividad térmica del terreno
 * Fuente: ITC-BT-07 / IEC 60364-5-52 Tabla B.52.16
 *
 * Resistividad de referencia (tabla D): 2.5 K·m/W
 */
export declare const CORRECTION_FACTOR_CT: Record<number, number>;
/**
 * Obtiene el factor de corrección de resistividad del terreno Ct.
 * Solo aplica a instalaciones enterradas (método D).
 */
export declare function getCorrectionFactorCt(soilResistivityKmW: number): number;
export interface CorrectionFactors {
    Ca: number;
    Cg: number;
    Ct: number;
    combined: number;
}
/**
 * Calcula todos los factores de corrección aplicables y el producto combinado.
 */
export declare function getCorrectionFactors(params: {
    insulationType: "PVC" | "XLPE" | "EPR";
    ambientTempC: number;
    groupingCircuits: number;
    method: string;
    soilResistivityKmW?: number;
}): CorrectionFactors;
//# sourceMappingURL=correction-factors.d.ts.map