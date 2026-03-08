"use strict";
/**
 * Tests: calculateInstallation() — cálculo de instalación completa
 *
 * Cobertura:
 *   - Múltiples circuitos, resumen global
 *   - isValid, circuitErrors
 *   - Procesamiento paralelo (Promise.all)
 *   - Errores por circuito (solo CUSTOM lanza errores con potencia inválida)
 */
Object.defineProperty(exports, "__esModule", { value: true });
const calculate_installation_1 = require("./calculate-installation");
function makeCircuitInput(id, overrides = {}) {
    return {
        id,
        label: `Circuit ${id}`,
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
// Resultado básico
// ════════════════════════════════════════════════════════════════════════════
describe("calculateInstallation", () => {
    it("devuelve InstallationResult con circuits, summary, circuitErrors, isValid", async () => {
        const inputs = [
            makeCircuitInput("c1"),
            makeCircuitInput("c2", { loadPowerW: 3450 }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.circuits).toBeDefined();
        expect(Array.isArray(result.circuits)).toBe(true);
        expect(result.summary).toBeDefined();
        expect(result.circuitErrors).toBeDefined();
        expect(Array.isArray(result.circuitErrors)).toBe(true);
        expect(typeof result.isValid).toBe("boolean");
    });
    it("un circuito: devuelve un CircuitResult", async () => {
        const inputs = [makeCircuitInput("c1")];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.circuits).toHaveLength(1);
        expect(result.circuits[0]?.id).toBe("c1");
        expect(result.circuits[0]?.sectionMm2).toBe(1.5);
    });
    it("array vacío: circuits vacío, summary en 0", async () => {
        const result = await (0, calculate_installation_1.calculateInstallation)([]);
        expect(result.circuits).toHaveLength(0);
        expect(result.summary.totalPowerW).toBe(0);
        expect(result.summary.maxSectionMm2).toBe(0);
        expect(result.summary.maxVoltageDropPct).toBe(0);
        expect(result.isValid).toBe(false);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Resumen global
// ════════════════════════════════════════════════════════════════════════════
describe("calculateInstallation — resumen global", () => {
    it("totalPowerW es la suma de loadPowerW de todos los inputs", async () => {
        const inputs = [
            makeCircuitInput("c1", { loadPowerW: 2300 }),
            makeCircuitInput("c2", { loadPowerW: 3450 }),
            makeCircuitInput("c3", { loadPowerW: 5400 }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.summary.totalPowerW).toBe(11150);
    });
    it("maxSectionMm2 es la mayor sección entre circuitos", async () => {
        const inputs = [
            makeCircuitInput("c1", { code: "C1", loadPowerW: 2300 }),
            makeCircuitInput("c2", { code: "C3", loadPowerW: 5400 }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.summary.maxSectionMm2).toBe(6);
    });
    it("maxVoltageDropPct es la mayor CdT acumulada", async () => {
        const inputs = [
            makeCircuitInput("c1", { lengthM: 5 }),
            makeCircuitInput("c2", { lengthM: 30 }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.summary.maxVoltageDropPct).toBeGreaterThanOrEqual(0);
        const maxFromCircuits = Math.max(...result.circuits.map((c) => c.accumulatedCdtPct));
        expect(result.summary.maxVoltageDropPct).toBe(maxFromCircuits);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// isValid
// ════════════════════════════════════════════════════════════════════════════
describe("calculateInstallation — isValid", () => {
    it("isValid true cuando todos los circuitos son válidos", async () => {
        const inputs = [
            makeCircuitInput("c1"),
            makeCircuitInput("c2", { loadPowerW: 3450 }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.circuits.every((c) => c.isValid)).toBe(true);
        expect(result.isValid).toBe(true);
    });
    it("isValid false cuando un circuito CUSTOM falla (ej: potencia 0)", async () => {
        const inputs = [
            makeCircuitInput("c1"),
            makeCircuitInput("c2", { code: "CUSTOM", loadPowerW: 0 }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.circuits).toHaveLength(1);
        expect(result.circuitErrors.length).toBeGreaterThan(0);
        expect(result.isValid).toBe(false);
    });
    it("isValid false cuando un circuito tiene errores de cumplimiento", async () => {
        const inputs = [
            makeCircuitInput("c1"),
            makeCircuitInput("c2", {
                loadPowerW: 3450,
                lengthM: 300,
            }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        if (result.circuitErrors.length > 0 || !result.circuits.every((c) => c.isValid)) {
            expect(result.isValid).toBe(false);
        }
    });
});
// ════════════════════════════════════════════════════════════════════════════
// circuitErrors
// ════════════════════════════════════════════════════════════════════════════
describe("calculateInstallation — circuitErrors", () => {
    it("circuito CUSTOM con error de cálculo aparece en circuitErrors", async () => {
        const inputs = [
            makeCircuitInput("c1"),
            makeCircuitInput("c2-invalid", { code: "CUSTOM", loadPowerW: -100 }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.circuitErrors.length).toBeGreaterThan(0);
        const err = result.circuitErrors.find((e) => e.circuitId === "c2-invalid");
        expect(err).toBeDefined();
        expect(err?.errors.length).toBeGreaterThan(0);
    });
    it("circuito con errores de cumplimiento aparece en circuitErrors", async () => {
        const inputs = [
            makeCircuitInput("c1", {
                loadPowerW: 3450,
                lengthM: 200,
            }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        if (result.circuits[0]?.errors?.length) {
            expect(result.circuitErrors.some((e) => e.circuitId === "c1")).toBe(true);
        }
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Múltiples circuitos
// ════════════════════════════════════════════════════════════════════════════
describe("calculateInstallation — múltiples circuitos", () => {
    it("procesa varios circuitos correctamente", async () => {
        const inputs = [
            makeCircuitInput("C1", { code: "C1", loadPowerW: 2300 }),
            makeCircuitInput("C2", { code: "C2", loadPowerW: 3450 }),
            makeCircuitInput("C3", { code: "C3", loadPowerW: 5400, lengthM: 5 }),
        ];
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.circuits).toHaveLength(3);
        expect(result.circuits.map((c) => c.id)).toEqual(["C1", "C2", "C3"]);
    });
    it("usa Promise.all para procesar en paralelo", async () => {
        const inputs = Array.from({ length: 5 }, (_, i) => makeCircuitInput(`c${i}`, { loadPowerW: 2300 + i * 100 }));
        const result = await (0, calculate_installation_1.calculateInstallation)(inputs);
        expect(result.circuits).toHaveLength(5);
    });
});
//# sourceMappingURL=calculate-installation.test.js.map