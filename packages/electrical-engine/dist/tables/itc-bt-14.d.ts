/**
 * ITC-BT-14 — LÍNEA GENERAL DE ALIMENTACIÓN (LGA)
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-14
 *
 * La LGA enlaza la CGP (Caja General de Protección) con la centralización
 * de contadores o con el cuadro de distribución general.
 *
 * Condiciones:
 *   - CdT máxima: 0.5% (ITC-BT-14 §3)
 *   - Sección mínima: 10mm² Cu / 16mm² Al
 *   - Conductor neutro: igual sección que fase hasta 10mm², la mitad por encima (mín. 10mm²)
 *   - Aislamiento mínimo: 0.6/1kV
 *   - No admite empalmes en todo su recorrido
 *   - Método de instalación habitual: E o F (libre de halógenos en zonas comunes)
 */
export interface LGASectionSpec {
    maxCurrentA: number;
    sectionCuMm2: number;
    sectionAlMm2: number;
    neutralCuMm2: number;
}
/**
 * Tabla de secciones mínimas para LGA según intensidad máxima prevista.
 * ITC-BT-14 §3 / IEC 60364-5-52
 */
export declare const LGA_SECTION_TABLE: LGASectionSpec[];
export declare const RESISTIVITY_20C: Record<"Cu" | "Al", number>;
export declare const TEMP_COEFF: Record<"Cu" | "Al", number>;
/**
 * Resistividad corregida por temperatura.
 * ρ_T = ρ_20 × [1 + α × (T - 20)]
 */
export declare function getResistivityAtTemp(material: "Cu" | "Al", tempC: number): number;
export declare const REACTANCE_TABLE_CABLE: Partial<Record<number, number>>;
export interface LGAInput {
    totalPowerW: number;
    powerFactor: number;
    phaseSystem: "three" | "single";
    conductorMaterial: "Cu" | "Al";
    sectionMm2: number;
    lengthM: number;
    conductorTempC?: number;
    voltageV?: number;
}
export interface LGAResult {
    nominalCurrentA: number;
    voltageDropPct: number;
    voltageDropV: number;
    cdtLimitPct: number;
    cdtCompliant: boolean;
    minSectionMm2: number;
    resistanceOhm: number;
    warnings: string[];
}
/**
 * Calcula la caída de tensión en la LGA y verifica el límite del 0.5%.
 * ITC-BT-14 §3
 *
 * Fórmula trifásica:  ΔU = √3 × I × L × (R×cosφ + X×sinφ) / 1000
 * Fórmula monofásica: ΔU = 2 × I × L × (R×cosφ + X×sinφ) / 1000
 * Donde R = ρ_T / S (Ω/m) y X en mΩ/m
 */
export declare function calculateLGAVoltageDrop(input: LGAInput): LGAResult;
/**
 * Sección mínima del neutro en función de la sección de fase.
 * ITC-BT-14 / IEC 60364-5-54
 *
 * Regla:
 *   - Sección fase ≤ 16mm² Cu: neutro = fase
 *   - Sección fase > 16mm² Cu: neutro = fase/2, mínimo 16mm²
 */
export declare function getNeutralSection(phaseSectionMm2: number, material: "Cu" | "Al"): number;
//# sourceMappingURL=itc-bt-14.d.ts.map