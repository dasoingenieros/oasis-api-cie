"use strict";
/**
 * Tests de humo: verifica que todas las exportaciones del motor existen.
 * El index.ts es el punto de entrada único del paquete.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const engine = __importStar(require("./index"));
describe("index — smoke tests (exportaciones)", () => {
    const FUNCIONES_MOTOR = [
        "calculateNominalCurrent",
        "selectSection",
        "generateJustification",
        "calculateCircuit",
        "calculateInstallation",
    ];
    it("exporta las 5 funciones principales del motor", () => {
        for (const name of FUNCIONES_MOTOR) {
            expect(engine[name]).toBeDefined();
            expect(typeof engine[name]).toBe("function");
        }
    });
    it("ENGINE_VERSION es 1.0.0", () => {
        expect(engine.ENGINE_VERSION).toBe("1.0.0");
    });
    it("NORM_VERSION está definido", () => {
        expect(engine.NORM_VERSION).toBeDefined();
        expect(typeof engine.NORM_VERSION).toBe("string");
    });
    it("EngineError es una clase", () => {
        expect(engine.EngineError).toBeDefined();
        expect(typeof engine.EngineError).toBe("function");
    });
    it("exporta funciones de tablas necesarias para el motor", () => {
        expect(typeof engine.getAdmissibleCurrent).toBe("function");
        expect(typeof engine.getCorrectionFactorCa).toBe("function");
        expect(typeof engine.getCircuitTemplate).toBe("function");
        expect(typeof engine.calculateVoltageDrop).toBe("function");
        expect(typeof engine.selectPIA).toBe("function");
        expect(typeof engine.getMinTubeDiameter).toBe("function");
    });
    it("exporta constantes NORMALIZED_SECTIONS_MM2 y NORMALIZED_BREAKER_RATINGS", () => {
        expect(Array.isArray(engine.NORMALIZED_SECTIONS_MM2)).toBe(true);
        expect(Array.isArray(engine.NORMALIZED_BREAKER_RATINGS)).toBe(true);
    });
});
//# sourceMappingURL=index.test.js.map