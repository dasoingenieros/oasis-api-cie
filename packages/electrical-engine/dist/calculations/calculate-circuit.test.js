"use strict";
/**
 * Tests: calculateCircuit() — función principal del motor
 *
 * Cobertura:
 *   - Circuitos tipo ITC-BT-25: valores directos de tabla
 *   - Circuitos CUSTOM: cálculo completo
 *   - EngineError en fallos (solo CUSTOM)
 *   - isValid y isCompliant
 *   - Aumento de sección por CdT
 *   - Campos adicionales para MTD
 */
Object.defineProperty(exports, "__esModule", { value: true });
const calculate_circuit_1 = require("./calculate-circuit");
const types_1 = require("../types");
function makeCircuitInput(overrides = {}) {
    return {
        id: "circ-1",
        label: "C1 Alumbrado",
        code: "C1",
        phaseSystem: "single",
        loadPowerW: 2300,
        powerFactor: 1.0,
        simultaneityFactor: 1.0,
        loadFactor: 1.0,
        conductorMaterial: "Cu",
        insulationType: "PVC",
        installationMethod: "B1",
        lengthM: 10,
        ambientTempC: 40,
        groupingCircuits: 1,
        ...overrides,
    };
}
// ════════════════════════════════════════════════════════════════════════════
// Estructura del resultado
// ════════════════════════════════════════════════════════════════════════════
describe("calculateCircuit", () => {
    it("devuelve CircuitResult completo con todos los campos requeridos", () => {
        const input = makeCircuitInput();
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.id).toBe("circ-1");
        expect(typeof result.nominalCurrentA).toBe("number");
        expect(typeof result.admissibleCurrentA).toBe("number");
        expect(typeof result.sectionMm2).toBe("number");
        expect(result.sectionMm2).toBeGreaterThan(0);
        expect(["thermal", "voltage_drop", "minimum_itcbt25"]).toContain(result.sectionCriteria);
        expect(typeof result.voltageDropPct).toBe("number");
        expect(typeof result.accumulatedCdtPct).toBe("number");
        expect(typeof result.cdtLimitPct).toBe("number");
        expect(typeof result.cdtCompliant).toBe("boolean");
        expect(result.breakerRatingA).toBeDefined();
        expect(result.breakerCurve).toMatch(/^[BCD]$/);
        expect([30, 300, null]).toContain(result.rcdSensitivityMa);
        expect(typeof result.isCompliant).toBe("boolean");
        expect(typeof result.isValid).toBe("boolean");
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.errors)).toBe(true);
        expect(result.justification).toBeDefined();
        expect(result.justification.steps.length).toBeGreaterThan(0);
        expect(result.tubeDiameterMm).toBeDefined();
        expect(result.tubeDiameterMm).toBeGreaterThanOrEqual(16);
    });
    it("isValid es true cuando el circuito cumple todos los criterios", () => {
        const input = makeCircuitInput({ loadPowerW: 2300, lengthM: 5 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.isValid).toBe(true);
        expect(result.isCompliant).toBe(result.isValid);
    });
    it("incluye sección seleccionada y criterio determinante", () => {
        const input = makeCircuitInput();
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect([1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300]).toContain(result.sectionMm2);
        expect(result.sectionCriteria).toBeDefined();
    });
    it("incluye intensidad nominal correcta (PIA para ITC-BT-25)", () => {
        const input = makeCircuitInput({ loadPowerW: 2300 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        // C1 Alumbrado: PIA = 10A
        expect(result.nominalCurrentA).toBe(10);
    });
    it("incluye PIA recomendado (breaker)", () => {
        const input = makeCircuitInput();
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect([6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250]).toContain(result.breakerRatingA);
        expect(result.breakerCurve).toMatch(/^[BCD]$/);
    });
    it("incluye diferencial recomendado (RCD)", () => {
        const input = makeCircuitInput({ code: "C1" });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.rcdSensitivityMa).toBe(30);
        const inputC11 = makeCircuitInput({ code: "C11" });
        const resultC11 = (0, calculate_circuit_1.calculateCircuit)(inputC11);
        expect(resultC11.rcdSensitivityMa).toBe(300);
    });
    it("incluye diámetro de tubo", () => {
        const input = makeCircuitInput();
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.tubeDiameterMm).toBeDefined();
        expect([16, 20, 25, 32, 40, 50, 63]).toContain(result.tubeDiameterMm);
    });
    it("incluye pasos de justificación no vacíos", () => {
        const input = makeCircuitInput();
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.justification.steps.length).toBeGreaterThan(0);
        for (const step of result.justification.steps) {
            expect(step.order).toBeDefined();
            expect(step.description?.length).toBeGreaterThan(0);
            expect(step.result).toBeDefined();
        }
    });
    it("incluye caída de tensión y cumplimiento", () => {
        const input = makeCircuitInput();
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.voltageDropPct).toBeGreaterThanOrEqual(0);
        expect(result.accumulatedCdtPct).toBeGreaterThanOrEqual(0);
        expect(result.cdtLimitPct).toBeGreaterThan(0);
        expect(typeof result.cdtCompliant).toBe("boolean");
    });
});
// ════════════════════════════════════════════════════════════════════════════
// EngineError — Solo aplica a circuitos CUSTOM
// ════════════════════════════════════════════════════════════════════════════
describe("calculateCircuit — EngineError", () => {
    it("lanza EngineError para potencia inválida (0) en CUSTOM", () => {
        const input = makeCircuitInput({ code: "CUSTOM", loadPowerW: 0 });
        expect(() => (0, calculate_circuit_1.calculateCircuit)(input)).toThrow(types_1.EngineError);
    });
    it("lanza EngineError para potencia negativa en CUSTOM", () => {
        const input = makeCircuitInput({ code: "CUSTOM", loadPowerW: -100 });
        expect(() => (0, calculate_circuit_1.calculateCircuit)(input)).toThrow(types_1.EngineError);
    });
    it("lanza EngineError para cosφ inválido en CUSTOM", () => {
        const input = makeCircuitInput({ code: "CUSTOM", powerFactor: 0 });
        expect(() => (0, calculate_circuit_1.calculateCircuit)(input)).toThrow(types_1.EngineError);
    });
    it("el EngineError incluye circuitId", () => {
        const input = makeCircuitInput({
            id: "circuito-test-123",
            code: "CUSTOM",
            loadPowerW: 0,
        });
        try {
            (0, calculate_circuit_1.calculateCircuit)(input);
            fail("Debe lanzar EngineError");
        }
        catch (e) {
            expect(e).toBeInstanceOf(types_1.EngineError);
            expect(e.circuitId).toBe("circuito-test-123");
            expect(e.code).toBeDefined();
        }
    });
    it("circuitos ITC-BT-25 NO lanzan error con potencia 0 (usan PIA de tabla)", () => {
        const input = makeCircuitInput({ code: "C1", loadPowerW: 0 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.nominalCurrentA).toBe(10);
        expect(result.sectionMm2).toBe(1.5);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Circuitos tipo ITC-BT-25 — valores directos de tabla
// ════════════════════════════════════════════════════════════════════════════
describe("calculateCircuit — ITC-BT-25", () => {
    it("C1 alumbrado: sección 1.5mm², PIA 10A, P=2.3kW", () => {
        const input = makeCircuitInput({ code: "C1", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.sectionMm2).toBe(1.5);
        expect(result.breakerRatingA).toBe(10);
        expect(result.nominalCurrentA).toBe(10);
        expect(result.calculatedPowerW).toBe(2300);
        expect(result.numConductors).toBe(2);
        expect(result.sectionCriteria).toBe("minimum_itcbt25");
    });
    it("C2 TC uso general: sección 2.5mm², PIA 16A, P=3.68kW", () => {
        const input = makeCircuitInput({ code: "C2", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.sectionMm2).toBe(2.5);
        expect(result.breakerRatingA).toBe(16);
        expect(result.nominalCurrentA).toBe(16);
        expect(result.calculatedPowerW).toBe(3680);
        expect(result.numConductors).toBe(2);
    });
    it("C3 cocina/horno: sección 6mm², PIA 25A, P=5.75kW", () => {
        const input = makeCircuitInput({ code: "C3", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.sectionMm2).toBe(6);
        expect(result.breakerRatingA).toBe(25);
        expect(result.nominalCurrentA).toBe(25);
        expect(result.calculatedPowerW).toBe(5750);
    });
    it("C4.1 lavadora: sección 4mm², PIA 20A, P=4.6kW", () => {
        const input = makeCircuitInput({ code: "C4.1", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.sectionMm2).toBe(4);
        expect(result.breakerRatingA).toBe(20);
        expect(result.nominalCurrentA).toBe(20);
        expect(result.calculatedPowerW).toBe(4600);
    });
    it("C5 TC baño/cocina: sección 2.5mm², PIA 16A, P=3.68kW", () => {
        const input = makeCircuitInput({ code: "C5", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.sectionMm2).toBe(2.5);
        expect(result.breakerRatingA).toBe(16);
        expect(result.nominalCurrentA).toBe(16);
        expect(result.calculatedPowerW).toBe(3680);
    });
    it("incluye CdT en voltios", () => {
        const input = makeCircuitInput({ code: "C1", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.voltageDropV).toBeDefined();
        expect(result.voltageDropV).toBeGreaterThan(0);
    });
    it("sube sección si CdT excede límite por longitud", () => {
        const input = makeCircuitInput({ code: "C1", lengthM: 50 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.sectionMm2).toBeGreaterThan(1.5);
        expect(result.sectionCriteria).toBe("voltage_drop");
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain("Sección aumentada");
        expect(result.cdtCompliant).toBe(true);
    });
    it("diferencial 300mA para C11 (domótica)", () => {
        const input = makeCircuitInput({ code: "C11", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.rcdSensitivityMa).toBe(300);
    });
    it("C8 calefacción: sección 6mm², PIA 25A", () => {
        const input = makeCircuitInput({ code: "C8", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.sectionMm2).toBe(6);
        expect(result.breakerRatingA).toBe(25);
    });
    it("C9 aire acondicionado: sección 6mm², PIA 25A", () => {
        const input = makeCircuitInput({ code: "C9", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.sectionMm2).toBe(6);
        expect(result.breakerRatingA).toBe(25);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Circuitos variados (CUSTOM y mixtos)
// ════════════════════════════════════════════════════════════════════════════
describe("calculateCircuit — circuitos variados", () => {
    it("C3 cocina: sección 6mm², PIA 25A (ITC-BT-25)", () => {
        const input = makeCircuitInput({
            code: "C3",
            loadPowerW: 5400,
            lengthM: 5,
        });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.sectionMm2).toBe(6);
        expect(result.breakerRatingA).toBe(25);
    });
    it("trifásico CUSTOM: calcula correctamente", () => {
        const input = makeCircuitInput({
            code: "CUSTOM",
            phaseSystem: "three",
            loadPowerW: 18000,
            powerFactor: 0.9,
            lengthM: 15,
        });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        // In = 18000 / (√3 × 400 × 0.9) ≈ 28.87A
        expect(result.nominalCurrentA).toBeCloseTo(28.87, 0);
    });
    it("circuito largo con CdT excedida: isValid puede ser false", () => {
        const input = makeCircuitInput({
            code: "C2",
            loadPowerW: 3450,
            lengthM: 150,
        });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(typeof result.isValid).toBe("boolean");
        expect(result.errors).toBeDefined();
        if (!result.cdtCompliant) {
            expect(result.errors.some((e) => e.includes("Caída de tensión"))).toBe(true);
        }
    });
    it("CUSTOM: usa curva C por defecto", () => {
        const input = makeCircuitInput({
            code: "CUSTOM",
            loadPowerW: 3500,
        });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.breakerCurve).toBe("C");
        expect(result.sectionMm2).toBeGreaterThanOrEqual(2.5);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Campos MTD
// ════════════════════════════════════════════════════════════════════════════
describe("calculateCircuit — campos MTD", () => {
    it("incluye calculatedPowerW para ITC-BT-25", () => {
        const input = makeCircuitInput({ code: "C2" });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.calculatedPowerW).toBe(3680);
    });
    it("incluye numConductors mono = 2", () => {
        const input = makeCircuitInput({ code: "C1", phaseSystem: "single" });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.numConductors).toBe(2);
    });
    it("incluye numConductors tri = 4", () => {
        const input = makeCircuitInput({ code: "C1", phaseSystem: "three" });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.numConductors).toBe(4);
    });
    it("incluye voltageDropV en voltios", () => {
        const input = makeCircuitInput({ code: "C1", lengthM: 10 });
        const result = (0, calculate_circuit_1.calculateCircuit)(input);
        expect(result.voltageDropV).toBeDefined();
        expect(typeof result.voltageDropV).toBe("number");
        expect(result.voltageDropV).toBeGreaterThan(0);
    });
});
//# sourceMappingURL=calculate-circuit.test.js.map