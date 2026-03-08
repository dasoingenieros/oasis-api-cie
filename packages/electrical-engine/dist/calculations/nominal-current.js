"use strict";
/**
 * CÁLCULO DE INTENSIDAD NOMINAL
 *
 * Normativa: ITC-BT-19, ITC-BT-47
 *
 * Fórmulas:
 *   Monofásica: In = P / (V × cosφ)
 *   Trifásica:  In = P / (√3 × V × cosφ)
 *
 * Con factores de simultaneidad y utilización:
 *   P_efectiva = P_instalada × Ks × Fu
 *   In = P_efectiva / (V_fase × cosφ)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateNominalCurrent = calculateNominalCurrent;
const types_1 = require("../types");
// ─── Constantes físicas ───────────────────────────────────────────────────
const SQRT3 = Math.sqrt(3); // 1.7320508...
// Tensiones nominales por defecto (España)
const DEFAULT_VOLTAGE = {
    single: 230, // Fase-Neutro
    three: 400, // Fase-Fase
};
// ─── Función principal ────────────────────────────────────────────────────
/**
 * Calcula la intensidad nominal de un circuito según REBT.
 *
 * @param input Parámetros del circuito
 * @returns Intensidad nominal y trazabilidad de cálculo
 * @throws EngineError si los parámetros son inválidos
 */
function calculateNominalCurrent(input) {
    // ── Validación de entrada ───────────────────────────────────────────────
    if (input.loadPowerW <= 0) {
        throw new types_1.EngineError(`Potencia inválida: ${input.loadPowerW}W. Debe ser > 0.`, "INVALID_POWER", input.circuitId);
    }
    if (input.powerFactor <= 0 || input.powerFactor > 1) {
        throw new types_1.EngineError(`Factor de potencia inválido: ${input.powerFactor}. Rango válido: (0, 1].`, "INVALID_POWER_FACTOR", input.circuitId);
    }
    const Ks = input.simultaneityFactor ?? 1.0;
    const Fu = input.loadFactor ?? 1.0;
    if (Ks <= 0 || Ks > 1) {
        throw new types_1.EngineError(`Factor de simultaneidad inválido: ${Ks}. Rango válido: (0, 1].`, "INVALID_KS", input.circuitId);
    }
    if (Fu <= 0 || Fu > 1) {
        throw new types_1.EngineError(`Factor de utilización inválido: ${Fu}. Rango válido: (0, 1].`, "INVALID_FU", input.circuitId);
    }
    // ── Variables ──────────────────────────────────────────────────────────
    const V = input.voltageV ?? DEFAULT_VOLTAGE[input.phaseSystem];
    const cosφ = input.powerFactor;
    const P_instalada = input.loadPowerW;
    const P_efectiva = P_instalada * Ks * Fu;
    const steps = [];
    // ── Paso 1: Potencia efectiva ──────────────────────────────────────────
    steps.push({
        order: 1,
        description: "Potencia efectiva de diseño",
        formula: "P_ef = P_instalada × Ks × Fu",
        inputValues: {
            P_instalada: P_instalada,
            Ks: Ks,
            Fu: Fu,
        },
        result: round2(P_efectiva),
        unit: "W",
        normRef: "ITC-BT-19 §2",
    });
    // ── Paso 2: Intensidad nominal ─────────────────────────────────────────
    let In;
    if (input.phaseSystem === "single") {
        // Monofásica: In = P / (V × cosφ)
        In = P_efectiva / (V * cosφ);
        steps.push({
            order: 2,
            description: "Intensidad nominal monofásica",
            formula: "In = P_ef / (V × cosφ)",
            inputValues: {
                P_ef: round2(P_efectiva),
                V: V,
                cosφ: cosφ,
            },
            result: round2(In),
            unit: "A",
            normRef: "ITC-BT-19 §2.1 / Fórmula monofásica",
        });
    }
    else {
        // Trifásica: In = P / (√3 × V × cosφ)
        In = P_efectiva / (SQRT3 * V * cosφ);
        steps.push({
            order: 2,
            description: "Intensidad nominal trifásica",
            formula: "In = P_ef / (√3 × V × cosφ)",
            inputValues: {
                P_ef: round2(P_efectiva),
                "√3": round4(SQRT3),
                V: V,
                cosφ: cosφ,
            },
            result: round2(In),
            unit: "A",
            normRef: "ITC-BT-19 §2.1 / Fórmula trifásica",
        });
    }
    // ── Validación de resultado ────────────────────────────────────────────
    if (!isFinite(In) || In <= 0) {
        throw new types_1.EngineError(`El cálculo produjo una intensidad nominal inválida: ${In}A. Revisar parámetros de entrada.`, "INVALID_RESULT", input.circuitId);
    }
    return {
        nominalCurrentA: round2(In),
        effectivePowerW: round2(P_efectiva),
        voltageV: V,
        phaseSystem: input.phaseSystem,
        powerFactor: cosφ,
        simultaneityFactor: Ks,
        loadFactor: Fu,
        steps,
    };
}
// ─── Utilidades ──────────────────────────────────────────────────────────
function round2(n) {
    return Math.round(n * 100) / 100;
}
function round4(n) {
    return Math.round(n * 10000) / 10000;
}
//# sourceMappingURL=nominal-current.js.map