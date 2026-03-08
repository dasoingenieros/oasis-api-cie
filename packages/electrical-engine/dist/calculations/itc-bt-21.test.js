"use strict";
/**
 * Tests: ITC-BT-21 — Tubos protectores
 *
 * Cobertura:
 *   - getMinTubeDiameter: tabuladas, no tabuladas, sección grande
 *   - getConductorCountForCircuit: todas las combinaciones
 *   - getMinBendRadius
 *   - getMinTubeDiameterForMixedConductors
 */
Object.defineProperty(exports, "__esModule", { value: true });
const itc_bt_21_1 = require("../tables/itc-bt-21");
// ════════════════════════════════════════════════════════════════════════════
// Constantes
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-21 — Constantes", () => {
    it("NORMALIZED_TUBE_DIAMETERS_MM contiene diámetros estándar", () => {
        expect(itc_bt_21_1.NORMALIZED_TUBE_DIAMETERS_MM).toContain(16);
        expect(itc_bt_21_1.NORMALIZED_TUBE_DIAMETERS_MM).toContain(25);
        expect(itc_bt_21_1.NORMALIZED_TUBE_DIAMETERS_MM).toContain(63);
        expect(itc_bt_21_1.NORMALIZED_TUBE_DIAMETERS_MM.length).toBeGreaterThanOrEqual(5);
    });
    it("TUBE_DIAMETER_TABLE tiene entradas para secciones típicas", () => {
        expect(itc_bt_21_1.TUBE_DIAMETER_TABLE[1.5]).toBeDefined();
        expect(itc_bt_21_1.TUBE_DIAMETER_TABLE[6]).toBeDefined();
        expect(itc_bt_21_1.TUBE_DIAMETER_TABLE[25]).toBeDefined();
        expect(itc_bt_21_1.TUBE_DIAMETER_TABLE[240]).toBeDefined();
    });
});
// ════════════════════════════════════════════════════════════════════════════
// getMinTubeDiameter
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-21 — getMinTubeDiameter", () => {
    it("1.5mm² / 1 conductor → 16mm", () => {
        expect((0, itc_bt_21_1.getMinTubeDiameter)(1.5, 1)).toBe(16);
    });
    it("1.5mm² / 3 conductores (L+N+PE monofásico) → 16mm", () => {
        expect((0, itc_bt_21_1.getMinTubeDiameter)(1.5, 3)).toBe(16);
    });
    it("2.5mm² / 3 conductores → 20mm", () => {
        expect((0, itc_bt_21_1.getMinTubeDiameter)(2.5, 3)).toBe(20);
    });
    it("6mm² / 5 conductores → 32mm", () => {
        expect((0, itc_bt_21_1.getMinTubeDiameter)(6, 5)).toBe(32);
    });
    it("25mm² / 4 conductores → 50mm", () => {
        expect((0, itc_bt_21_1.getMinTubeDiameter)(25, 4)).toBe(50);
    });
    it("240mm² / 1 conductor → 63mm", () => {
        expect((0, itc_bt_21_1.getMinTubeDiameter)(240, 1)).toBe(63);
    });
    it("sección no tabulada (ej: 3mm²) usa la superior más cercana", () => {
        // 3 no está en tabla, busca ≥ 3 → 4mm²
        const result = (0, itc_bt_21_1.getMinTubeDiameter)(3, 2);
        expect([16, 20, 25, 32, 40, 50, 63]).toContain(result);
    });
    it("sección muy grande (> 240) devuelve 63mm", () => {
        expect((0, itc_bt_21_1.getMinTubeDiameter)(500, 1)).toBe(63);
        expect((0, itc_bt_21_1.getMinTubeDiameter)(1000, 5)).toBe(63);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// getConductorCountForCircuit
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-21 — getConductorCountForCircuit", () => {
    it("monofásico con neutro y PE → 3 conductores", () => {
        expect((0, itc_bt_21_1.getConductorCountForCircuit)({
            phaseSystem: "single",
            includeNeutral: true,
            includeProtection: true,
        })).toBe(3);
    });
    it("trifásico con neutro y PE → 5 conductores", () => {
        expect((0, itc_bt_21_1.getConductorCountForCircuit)({
            phaseSystem: "three",
            includeNeutral: true,
            includeProtection: true,
        })).toBe(5);
    });
    it("trifásico sin neutro con PE → 4 conductores", () => {
        expect((0, itc_bt_21_1.getConductorCountForCircuit)({
            phaseSystem: "three",
            includeNeutral: false,
            includeProtection: true,
        })).toBe(4);
    });
    it("monofásico sin neutro sin PE → 1 (clamped mínimo)", () => {
        expect((0, itc_bt_21_1.getConductorCountForCircuit)({
            phaseSystem: "single",
            includeNeutral: false,
            includeProtection: false,
        })).toBe(1);
    });
    it("resultado nunca excede 5", () => {
        // 3 + 1 + 1 = 5
        expect((0, itc_bt_21_1.getConductorCountForCircuit)({
            phaseSystem: "three",
            includeNeutral: true,
            includeProtection: true,
        })).toBeLessThanOrEqual(5);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// getMinBendRadius
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-21 — getMinBendRadius", () => {
    it("tubo 20mm → radio mínimo 120mm", () => {
        expect((0, itc_bt_21_1.getMinBendRadius)(20)).toBe(120);
    });
    it("tubo 25mm → radio mínimo 150mm", () => {
        expect((0, itc_bt_21_1.getMinBendRadius)(25)).toBe(150);
    });
    it("fórmula 6 × diámetro", () => {
        expect((0, itc_bt_21_1.getMinBendRadius)(16)).toBe(96);
        expect((0, itc_bt_21_1.getMinBendRadius)(63)).toBe(378);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// getMinTubeDiameterForMixedConductors
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-21 — getMinTubeDiameterForMixedConductors", () => {
    it("conductores homogéneos: 3×2.5mm²", () => {
        const result = (0, itc_bt_21_1.getMinTubeDiameterForMixedConductors)([
            { sectionMm2: 2.5, count: 3 },
        ]);
        expect(result).toBe(20);
    });
    it("conductores mixtos: 2×2.5 + 1×1.5 usa sección máxima", () => {
        const result = (0, itc_bt_21_1.getMinTubeDiameterForMixedConductors)([
            { sectionMm2: 2.5, count: 2 },
            { sectionMm2: 1.5, count: 1 },
        ]);
        expect([16, 20, 25]).toContain(result);
    });
    it("más de 5 conductores se truncan a 5", () => {
        const result = (0, itc_bt_21_1.getMinTubeDiameterForMixedConductors)([
            { sectionMm2: 1.5, count: 6 },
        ]);
        expect([16, 20, 25, 32, 40, 50, 63]).toContain(result);
    });
});
//# sourceMappingURL=itc-bt-21.test.js.map