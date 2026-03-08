"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONTRACTED_POWERS_W = exports.DIFFERENTIAL_SENSITIVITIES_MA = exports.IGA_RATINGS_A = void 0;
exports.selectIGARating = selectIGARating;
exports.getRequiredDifferentials = getRequiredDifferentials;
exports.getProtectionConductorSection = getProtectionConductorSection;
exports.verifyProtectionCoordination = verifyProtectionCoordination;
// ─── Calibres normalizados IGA/ICP (A) ───────────────────────────────────
exports.IGA_RATINGS_A = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400];
// ─── Sensibilidades diferenciales normalizadas (mA) ──────────────────────
exports.DIFFERENTIAL_SENSITIVITIES_MA = [10, 30, 100, 300, 500];
// ─── Potencias normalizadas de suministro (W) ────────────────────────────
// ITC-BT-17 + Reglamento de puntos de medida
exports.CONTRACTED_POWERS_W = [
    1150, // 5A monofásico
    2300, // 10A monofásico
    3450, // 15A monofásico
    4600, // 20A monofásico
    5750, // 25A monofásico — electrificación básica
    6900, // 30A monofásico
    8050, // 35A monofásico
    9200, // 40A monofásico — electrificación elevada
    10350, // 45A monofásico
    11500, // 50A monofásico
    14490, // 63A monofásico (límite monofásico)
    // Trifásicos (400V)
    17321, // 25A trifásico
    27713, // 40A trifásico
    34641, // 50A trifásico
    43301, // 63A trifásico
    69282, // 100A trifásico
];
// ─── Reglas de selección del IGA ─────────────────────────────────────────
/**
 * Calibre mínimo del IGA para una potencia contratada dada.
 * ITC-BT-17 §1 / Tabla 1
 *
 * IGA debe ser ≥ Ib (intensidad de cálculo de la instalación)
 * y ≤ intensidad admisible del conductor DI.
 *
 * Se selecciona el calibre normalizado inmediatamente superior a In.
 */
function selectIGARating(params) {
    const SQRT3 = Math.sqrt(3);
    const V = params.voltageV ?? (params.phaseSystem === "three" ? 400 : 230);
    const cosφ = params.powerFactor ?? 1.0;
    const In = params.phaseSystem === "three"
        ? params.contractedPowerW / (SQRT3 * V * cosφ)
        : params.contractedPowerW / (V * cosφ);
    // Seleccionar calibre normalizado inmediatamente superior o igual
    const rating = exports.IGA_RATINGS_A.find(r => r >= In) ?? exports.IGA_RATINGS_A[exports.IGA_RATINGS_A.length - 1];
    return { ratingA: rating, nominalCurrentA: Math.round(In * 100) / 100 };
}
/**
 * Requisitos mínimos de diferencial según ITC-BT-17 y ITC-BT-25.
 *
 * CGMP vivienda: mínimo 2 diferenciales (ITC-BT-17 §1.2):
 *   - Para instalaciones con potencia ≤ 14.490W: 2 IDs de 30mA
 *   - Todos los circuitos deben tener diferencial de 30mA
 *   - Zonas húmedas (C5) pueden compartir diferencial dedicado
 */
function getRequiredDifferentials(params) {
    // Calibre del diferencial ≥ IGA
    const { ratingA } = selectIGARating({
        contractedPowerW: params.contractedPowerW,
        phaseSystem: params.phaseSystem,
    });
    // Calibre diferencial normalizado: debe ≥ IGA
    // Normalmente 40A para electrificación básica, 63A para elevada
    const diffRating = ratingA <= 40 ? 40 : 63;
    const poles = params.phaseSystem === "three" ? 4 : 2;
    const diffs = [
        {
            sensitivitityMa: 30,
            type: "AC",
            ratingA: diffRating,
            poles,
            circuitsCovered: ["C1", "C2", "C3", "C4.1", "C4.2", "C4.3"],
            mandatory: true,
            normRef: "ITC-BT-17 §1.2 / ITC-BT-25",
        },
        {
            sensitivitityMa: 30,
            type: "AC",
            ratingA: diffRating,
            poles,
            circuitsCovered: ["C5", "C8", "C9", "C10"],
            mandatory: true,
            normRef: "ITC-BT-17 §1.2 / ITC-BT-25",
        },
    ];
    return diffs;
}
// ─── Conductor de protección PE ───────────────────────────────────────────
/**
 * Sección mínima del conductor de protección (PE).
 * ITC-BT-17 / IEC 60364-5-54 Tabla 54.2
 *
 * Si la sección de fase S ≤ 16mm²: PE = S
 * Si 16 < S ≤ 35mm²: PE = 16mm²
 * Si S > 35mm²: PE = S/2
 */
function getProtectionConductorSection(phaseSectionMm2) {
    if (phaseSectionMm2 <= 16)
        return phaseSectionMm2;
    if (phaseSectionMm2 <= 35)
        return 16;
    return Math.ceil(phaseSectionMm2 / 2);
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
function verifyProtectionCoordination(params) {
    const I2factor = params.I2factor ?? 1.45;
    const I2 = params.In * I2factor;
    const Iz145 = params.Iz * 1.45;
    const cond1Ok = params.Ib <= params.In && params.In <= params.Iz;
    const cond2Ok = I2 <= Iz145;
    return {
        condition1: {
            description: "Ib ≤ In ≤ Iz",
            Ib: params.Ib,
            In: params.In,
            Iz: params.Iz,
            ok: cond1Ok,
        },
        condition2: {
            description: "I2 ≤ 1.45 × Iz",
            I2,
            Iz145,
            ok: cond2Ok,
        },
        isCoordinated: cond1Ok && cond2Ok,
    };
}
//# sourceMappingURL=itc-bt-17.js.map