"use strict";
/**
 * @daso/electrical-engine — Tipos base
 * Normativa: REBT (RD 842/2002), ITC-BT-19, ITC-BT-22, ITC-BT-24, ITC-BT-25
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngineError = exports.NORMALIZED_BREAKER_RATINGS = exports.NORMALIZED_SECTIONS_MM2 = void 0;
// ─── Secciones normalizadas (mm²) — IEC 60228 ────────────────────────────
exports.NORMALIZED_SECTIONS_MM2 = [
    1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300
];
// ─── Calibres normalizados de PIA (A) ────────────────────────────────────
exports.NORMALIZED_BREAKER_RATINGS = [
    6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250
];
// ─── Error del motor ──────────────────────────────────────────────────────
class EngineError extends Error {
    constructor(message, code, circuitId) {
        super(message);
        this.code = code;
        this.circuitId = circuitId;
        this.name = "EngineError";
    }
}
exports.EngineError = EngineError;
//# sourceMappingURL=index_old.js.map