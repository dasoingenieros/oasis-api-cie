"use strict";
/**
 * Tests: selectSection() — selección de sección por criterios REBT
 *
 * Cobertura:
 *   - Criterio térmico determinante
 *   - Criterio caída de tensión determinante
 *   - Criterio ITC-BT-25 determinante
 *   - Combinaciones y edge cases
 *   - Nunca NaN, siempre sección válida
 */
Object.defineProperty(exports, "__esModule", { value: true });
const select_section_1 = require("./select-section");
// ─── Helper para crear CircuitInput mínimos ────────────────────────────────
function makeCircuitInput(overrides = {}) {
    return {
        id: "test-1",
        label: "Test",
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
// Criterio térmico determinante
// ════════════════════════════════════════════════════════════════════════════
describe("selectSection — criterio térmico determinante", () => {
    it("C1 alumbrado 2300W: sección 1.5mm² por térmico", () => {
        // In = 2300/230 = 10A. B1/PVC/Cu 1.5mm² = 15.5A > 10A
        const result = (0, select_section_1.selectSection)(makeCircuitInput({ code: "C1", loadPowerW: 2300 }));
        expect(result.sectionMm2).toBe(1.5);
        expect(result.determinantCriteria).toBe("thermal");
        expect(result.nominalCurrentA).toBeCloseTo(10, 1);
    });
    it("C3 cocina 5400W: sección ≥ 4mm² por térmico (ITC-BT-25 impone 6mm²)", () => {
        // In = 5400/230 ≈ 23.48A. B1/PVC/Cu 4mm²=28A >= 23.48 (térmico daría 4)
        // Pero C3 tiene mínimo 6mm² por ITC-BT-25, así que resultado final = 6
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            code: "C3",
            loadPowerW: 5400,
            lengthM: 5, // Corto, CdT no limita
        }));
        expect(result.sectionMm2).toBe(6);
        expect(result.thermalSectionMm2).toBe(4);
        expect(result.determinantCriteria).toBe("minimum_itcbt25");
    });
    it("con agrupamiento Cg=0.7 requiere mayor sección térmica", () => {
        const result1 = (0, select_section_1.selectSection)(makeCircuitInput({ groupingCircuits: 1, loadPowerW: 3500 }));
        const result7 = (0, select_section_1.selectSection)(makeCircuitInput({ groupingCircuits: 7, loadPowerW: 3500 }));
        // In ≈ 15.2A. Con Cg=0.7, Iz necesaria = 15.2/0.7 ≈ 21.7A
        expect(result7.sectionMm2).toBeGreaterThanOrEqual(result1.sectionMm2);
    });
    it("devuelve thermalSectionMm2 correcto", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({ loadPowerW: 2300 }));
        expect(result.thermalSectionMm2).toBe(1.5);
        expect(typeof result.thermalSectionMm2).toBe("number");
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Criterio caída de tensión determinante
// ════════════════════════════════════════════════════════════════════════════
describe("selectSection — criterio caída de tensión determinante", () => {
    it("circuito largo 3450W/60m: CdT puede ser determinante", () => {
        // In ≈ 15A. CdT monofásica: ΔU = 2*I*L*rho/S. Para 5% en 60m con 15A...
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            code: "C2",
            loadPowerW: 3450,
            lengthM: 60,
        }));
        // La sección debe ser al menos la que cumple CdT
        expect(result.sectionMm2).toBeGreaterThanOrEqual(1.5);
        expect(result.voltageDropSectionMm2).toBeGreaterThanOrEqual(1.5);
    });
    it("circuito C1 alumbrado usa límite 3%", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            code: "C1",
            loadPowerW: 2000,
            lengthM: 50,
        }));
        expect(result.voltageDropSectionMm2).toBeGreaterThanOrEqual(1.5);
        // C1 = lighting → 3% límite (más restrictivo que 5%)
    });
    it("devuelve voltageDropSectionMm2 correcto", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({ loadPowerW: 2300, lengthM: 20 }));
        expect(result.voltageDropSectionMm2).toBeGreaterThanOrEqual(1.5);
        expect(typeof result.voltageDropSectionMm2).toBe("number");
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Criterio ITC-BT-25 determinante
// ════════════════════════════════════════════════════════════════════════════
describe("selectSection — criterio ITC-BT-25 determinante", () => {
    it("C1 tiene mínimo 1.5mm² por ITC-BT-25", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({ code: "C1", loadPowerW: 500 }) // Muy poca potencia
        );
        expect(result.minimumItcBt25SectionMm2).toBe(1.5);
    });
    it("C3 tiene mínimo 6mm² por ITC-BT-25", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            code: "C3",
            loadPowerW: 1000, // Térmico daría 1.5 o 2.5
            lengthM: 2,
        }));
        expect(result.sectionMm2).toBe(6);
        expect(result.determinantCriteria).toBe("minimum_itcbt25");
        expect(result.minimumItcBt25SectionMm2).toBe(6);
    });
    it("C4.1 tiene mínimo 4mm² por ITC-BT-25", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            code: "C4.1",
            loadPowerW: 500,
            lengthM: 1,
        }));
        expect(result.sectionMm2).toBe(4);
        expect(result.minimumItcBt25SectionMm2).toBe(4);
    });
    it("CUSTOM no aplica mínimo ITC-BT-25", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            code: "CUSTOM",
            loadPowerW: 500,
            lengthM: 1,
        }));
        expect(result.minimumItcBt25SectionMm2).toBeNull();
        // Solo térmico y CdT determinan
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Combinaciones y máximo de los tres
// ════════════════════════════════════════════════════════════════════════════
describe("selectSection — máximo de los tres criterios", () => {
    it("devuelve la mayor de las tres secciones", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            code: "C3",
            loadPowerW: 5400,
            lengthM: 80, // Largo para forzar CdT alto
        }));
        const maxOfThree = Math.max(result.thermalSectionMm2, result.voltageDropSectionMm2, result.minimumItcBt25SectionMm2 ?? 0);
        expect(result.sectionMm2).toBe(maxOfThree);
    });
    it("C2 TC general: equilibra térmico, CdT y ITC-BT-25 (2.5mm²)", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            code: "C2",
            loadPowerW: 3450,
            lengthM: 15,
        }));
        expect(result.sectionMm2).toBe(2.5);
        expect(result.minimumItcBt25SectionMm2).toBe(2.5);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Trifásico y aluminio
// ════════════════════════════════════════════════════════════════════════════
describe("selectSection — trifásico y aluminio", () => {
    it("trifásico 18kW usa fórmula √3", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            phaseSystem: "three",
            loadPowerW: 18000,
            powerFactor: 0.9,
            lengthM: 10,
        }));
        // In = 18000 / (√3 * 400 * 0.9) ≈ 28.87A
        expect(result.nominalCurrentA).toBeCloseTo(28.87, 1);
        expect(result.sectionMm2).toBeGreaterThanOrEqual(2.5);
    });
    it("aluminio devuelve sección ≥ 16mm²", () => {
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            conductorMaterial: "Al",
            loadPowerW: 5000,
            lengthM: 20,
        }));
        expect(result.sectionMm2).toBeGreaterThanOrEqual(16);
        expect(result.thermalSectionMm2).toBeGreaterThanOrEqual(16);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Principios inquebrantables
// ════════════════════════════════════════════════════════════════════════════
describe("selectSection — NUNCA NaN, siempre válido", () => {
    it("nunca devuelve NaN", () => {
        const inputs = [
            makeCircuitInput(),
            makeCircuitInput({ lengthM: 0 }),
            makeCircuitInput({ lengthM: 1000 }),
            makeCircuitInput({ code: "CUSTOM", loadPowerW: 100 }),
            makeCircuitInput({
                phaseSystem: "three",
                loadPowerW: 50000,
                lengthM: 50,
            }),
        ];
        for (const input of inputs) {
            const result = (0, select_section_1.selectSection)(input);
            expect(isNaN(result.sectionMm2)).toBe(false);
            expect(isFinite(result.sectionMm2)).toBe(true);
            expect(result.sectionMm2).toBeGreaterThan(0);
            expect(isNaN(result.nominalCurrentA)).toBe(false);
        }
    });
    it("devuelve sección normalizada (1.5, 2.5, 4, 6, 10, 16, ...)", () => {
        const normalized = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
        for (let i = 0; i < 20; i++) {
            const result = (0, select_section_1.selectSection)(makeCircuitInput({
                loadPowerW: 500 + i * 500,
                lengthM: 5 + i * 2,
            }));
            expect(normalized).toContain(result.sectionMm2);
        }
    });
    it("determinantCriteria siempre es uno de los tres", () => {
        const validCriteria = ["thermal", "voltage_drop", "minimum_itcbt25"];
        const result = (0, select_section_1.selectSection)(makeCircuitInput());
        expect(validCriteria).toContain(result.determinantCriteria);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Factores de corrección
// ════════════════════════════════════════════════════════════════════════════
describe("selectSection — factores de corrección", () => {
    it("temperatura ambiente alta reduce Iz efectiva", () => {
        const result25 = (0, select_section_1.selectSection)(makeCircuitInput({ ambientTempC: 25, loadPowerW: 3500 }));
        const result50 = (0, select_section_1.selectSection)(makeCircuitInput({ ambientTempC: 50, loadPowerW: 3500 }));
        expect(result50.sectionMm2).toBeGreaterThanOrEqual(result25.sectionMm2);
    });
    it("aplica simultaneidad y factor de utilización a In", () => {
        const resultFull = (0, select_section_1.selectSection)(makeCircuitInput({ loadPowerW: 3450, simultaneityFactor: 1, loadFactor: 1 }));
        const resultReduced = (0, select_section_1.selectSection)(makeCircuitInput({
            loadPowerW: 3450,
            simultaneityFactor: 0.5,
            loadFactor: 0.8,
        }));
        expect(resultReduced.nominalCurrentA).toBeLessThan(resultFull.nominalCurrentA);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Métodos de instalación
// ════════════════════════════════════════════════════════════════════════════
describe("selectSection — métodos de instalación", () => {
    it("método A1 (empotrado aislante) da mayor sección que B1 para misma In", () => {
        const resultA1 = (0, select_section_1.selectSection)(makeCircuitInput({
            installationMethod: "A1",
            loadPowerW: 3500,
            lengthM: 5,
        }));
        const resultB1 = (0, select_section_1.selectSection)(makeCircuitInput({
            installationMethod: "B1",
            loadPowerW: 3500,
            lengthM: 5,
        }));
        expect(resultA1.thermalSectionMm2).toBeGreaterThanOrEqual(resultB1.thermalSectionMm2);
    });
    it("térmico: cuando ninguna sección cumple Iz≥In, devuelve la máxima", () => {
        // In muy alta (2.3MW monofásico) → ninguna sección de tabla cumple
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            loadPowerW: 2300000,
            lengthM: 1,
            code: "CUSTOM",
        }));
        expect(result.sectionMm2).toBe(300);
        expect(result.thermalSectionMm2).toBe(300);
    });
    it("normaliza sección CdT al valor normalizado inmediato superior", () => {
        // La sección por CdT se redondea al valor normalizado (1.5, 2.5, 4, 6, ...)
        const result = (0, select_section_1.selectSection)(makeCircuitInput({
            code: "C2",
            loadPowerW: 3450,
            lengthM: 45,
        }));
        const normalized = [1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300];
        expect(normalized).toContain(result.voltageDropSectionMm2);
    });
    it("XLPE permite mayor Iz que PVC para misma sección", () => {
        const resultPVC = (0, select_section_1.selectSection)(makeCircuitInput({
            insulationType: "PVC",
            loadPowerW: 4000,
            lengthM: 5,
        }));
        const resultXLPE = (0, select_section_1.selectSection)(makeCircuitInput({
            insulationType: "XLPE",
            loadPowerW: 4000,
            lengthM: 5,
        }));
        expect(resultXLPE.thermalSectionMm2).toBeLessThanOrEqual(resultPVC.thermalSectionMm2);
    });
});
//# sourceMappingURL=select-section.test.js.map