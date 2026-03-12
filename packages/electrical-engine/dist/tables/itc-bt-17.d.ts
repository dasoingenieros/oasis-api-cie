/**
 * ITC-BT-17 — DISPOSITIVOS GENERALES E INDIVIDUALES DE MANDO Y PROTECCIÓN
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-17
 *
 * Define los dispositivos que deben instalarse en el Cuadro General de
 * Mando y Protección (CGMP):
 *
 *   1. IGA — Interruptor General Automático (cabecera del cuadro)
 *   2. ID  — Interruptores Diferenciales (uno por grupo de circuitos)
 *   3. PIA — Pequeños Interruptores Automáticos (uno por circuito)
 *
 * Condiciones de coordinación (ITC-BT-17 §1):
 *   Ib ≤ In_PIA ≤ Iz_conductor   (condición térmica)
 *   In_PIA ≤ In_IGA               (selectividad)
 *   In_IGA = potencia_contratada / (√3 × V)  (trifásico) o P/(V) (monofásico)
 */
export declare const IGA_RATINGS_A: readonly [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400];
export type IGARating = (typeof IGA_RATINGS_A)[number];
export declare const DIFFERENTIAL_SENSITIVITIES_MA: readonly [10, 30, 100, 300, 500];
export type DifferentialSensitivity = (typeof DIFFERENTIAL_SENSITIVITIES_MA)[number];
export type DifferentialType = "AC" | "A" | "F" | "B";
export declare const CONTRACTED_POWERS_W: readonly [1150, 2300, 3450, 4600, 5750, 6900, 8050, 9200, 10350, 11500, 14490, 17321, 27713, 34641, 43301, 69282];
/**
 * Calibre mínimo del IGA para una potencia contratada dada.
 * ITC-BT-17 §1 / Tabla 1
 *
 * IGA debe ser ≥ Ib (intensidad de cálculo de la instalación)
 * y ≤ intensidad admisible del conductor DI.
 *
 * Se selecciona el calibre normalizado inmediatamente superior a In.
 */
export declare function selectIGARating(params: {
    contractedPowerW: number;
    phaseSystem: "single" | "three";
    powerFactor?: number;
    voltageV?: number;
}): {
    ratingA: IGARating;
    nominalCurrentA: number;
};
export interface DifferentialSpec {
    sensitivityMa: DifferentialSensitivity;
    type: DifferentialType;
    ratingA: number;
    poles: 2 | 4;
    circuitsCovered: string[];
    mandatory: boolean;
    normRef: string;
}
/**
 * Requisitos mínimos de diferencial según ITC-BT-17 y ITC-BT-25.
 *
 * CGMP vivienda: mínimo 2 diferenciales (ITC-BT-17 §1.2):
 *   - Para instalaciones con potencia ≤ 14.490W: 2 IDs de 30mA
 *   - Todos los circuitos deben tener diferencial de 30mA
 *   - Zonas húmedas (C5) pueden compartir diferencial dedicado
 */
export declare function getRequiredDifferentials(params: {
    phaseSystem: "single" | "three";
    contractedPowerW: number;
    circuits: string[];
}): DifferentialSpec[];
/**
 * Sección mínima del conductor de protección (PE).
 * ITC-BT-17 / IEC 60364-5-54 Tabla 54.2
 *
 * Si la sección de fase S ≤ 16mm²: PE = S
 * Si 16 < S ≤ 35mm²: PE = 16mm²
 * Si S > 35mm²: PE = S/2
 */
export declare function getProtectionConductorSection(phaseSectionMm2: number): number;
export interface ProtectionCoordinationResult {
    condition1: {
        description: string;
        Ib: number;
        In: number;
        Iz: number;
        ok: boolean;
    };
    condition2: {
        description: string;
        I2: number;
        Iz145: number;
        ok: boolean;
    };
    isCoordinated: boolean;
}
/**
 * Verifica las condiciones de coordinación de la protección.
 * ITC-BT-22 §1 (también aplicable desde ITC-BT-17):
 *
 *   Condición 1: Ib ≤ In ≤ Iz
 *   Condición 2: I2 ≤ 1.45 × Iz
 *
 * Donde:
 *   Ib = intensidad de diseño del circuito
 *   In = calibre nominal del PIA
 *   Iz = intensidad admisible del conductor (con factores de corrección)
 *   I2 = corriente de disparo efectivo del PIA (generalmente 1.45 × In para PIAs domésticos)
 */
export declare function verifyProtectionCoordination(params: {
    Ib: number;
    In: number;
    Iz: number;
    I2factor?: number;
}): ProtectionCoordinationResult;
//# sourceMappingURL=itc-bt-17.d.ts.map