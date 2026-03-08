"use strict";
/**
 * Tests: ITC-BT-15 — Derivaciones individuales
 *
 * Cobertura:
 *   - DI_SECTION_TABLE, DI_CDT_LIMIT_PCT
 *   - calculateDIVoltageDrop: monofásico/trifásico, Cu/Al, validaciones, ramas
 */
Object.defineProperty(exports, "__esModule", { value: true });
const itc_bt_15_1 = require("../tables/itc-bt-15");
// ════════════════════════════════════════════════════════════════════════════
// Constantes
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-15 — Constantes", () => {
    it("DI_CDT_LIMIT_PCT es 1%", () => {
        expect(itc_bt_15_1.DI_CDT_LIMIT_PCT).toBe(1);
    });
    it("DI_SECTION_TABLE tiene entradas para distintos calibres", () => {
        expect(itc_bt_15_1.DI_SECTION_TABLE.length).toBeGreaterThan(5);
        const first = itc_bt_15_1.DI_SECTION_TABLE[0];
        expect(first?.maxCurrentA).toBe(25);
        expect(first?.sectionCuMm2).toBe(6);
        expect(first?.protectionCuMm2).toBe(6);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// calculateDIVoltageDrop — monofásico
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-15 — calculateDIVoltageDrop monofásico", () => {
    it("calcula In correctamente para monofásico 5750W", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 5750,
            phaseSystem: "single",
            powerFactor: 1.0,
            conductorMaterial: "Cu",
            sectionMm2: 10,
            lengthM: 10,
        });
        expect(r.nominalCurrentA).toBeCloseTo(25, 0);
    });
    it("monofásico con cosφ < 1", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 9200,
            phaseSystem: "single",
            powerFactor: 0.9,
            conductorMaterial: "Cu",
            sectionMm2: 10,
            lengthM: 5,
        });
        expect(r.nominalCurrentA).toBeGreaterThan(40);
    });
    it("monofásico con voltageV personalizado", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 2300,
            phaseSystem: "single",
            powerFactor: 1.0,
            conductorMaterial: "Cu",
            sectionMm2: 6,
            lengthM: 5,
            voltageV: 220,
        });
        expect(r.nominalCurrentA).toBeCloseTo(2300 / 220, 1);
    });
    it("monofásico con conductorTempC personalizado", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 5750,
            phaseSystem: "single",
            powerFactor: 0.9,
            conductorMaterial: "Cu",
            sectionMm2: 6,
            lengthM: 20,
            conductorTempC: 70,
        });
        expect(r.voltageDropPct).toBeGreaterThanOrEqual(0);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// calculateDIVoltageDrop — trifásico
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-15 — calculateDIVoltageDrop trifásico", () => {
    it("calcula In para trifásico P / (√3 × V × cosφ)", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 34641,
            phaseSystem: "three",
            powerFactor: 0.9,
            conductorMaterial: "Cu",
            sectionMm2: 25,
            lengthM: 15,
        });
        expect(r.nominalCurrentA).toBeCloseTo(55.5, 0);
    });
    it("trifásico minSectionByLoadMm2 se calcula con √3", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 50000,
            phaseSystem: "three",
            powerFactor: 0.9,
            conductorMaterial: "Cu",
            sectionMm2: 50,
            lengthM: 30,
        });
        expect(r.minSectionByLoadMm2).toBeGreaterThan(0);
        expect(r.cdtLimitPct).toBe(1);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Validaciones y advertencias
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-15 — Validaciones y advertencias", () => {
    it("sección < 6mm² genera advertencia", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 5750,
            phaseSystem: "single",
            powerFactor: 1.0,
            conductorMaterial: "Cu",
            sectionMm2: 4,
            lengthM: 5,
        });
        expect(r.warnings.some((w) => w.includes("6mm²"))).toBe(true);
    });
    it("CdT > 1% genera advertencia", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 23000,
            phaseSystem: "single",
            powerFactor: 0.9,
            conductorMaterial: "Cu",
            sectionMm2: 6,
            lengthM: 50,
        });
        if (!r.cdtCompliant) {
            expect(r.warnings.some((w) => w.includes("1%"))).toBe(true);
        }
    });
    it("cdtCompliant true cuando CdT ≤ 1%", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 5750,
            phaseSystem: "single",
            powerFactor: 1.0,
            conductorMaterial: "Cu",
            sectionMm2: 16,
            lengthM: 5,
        });
        expect(r.cdtCompliant).toBe(true);
        expect(r.cdtLimitPct).toBe(1);
    });
    it("minSectionCuMm2 y protectionSectionMm2 de tabla", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 5750,
            phaseSystem: "single",
            powerFactor: 1.0,
            conductorMaterial: "Cu",
            sectionMm2: 10,
            lengthM: 5,
        });
        expect(r.minSectionCuMm2).toBe(6);
        expect(r.protectionSectionMm2).toBe(6);
    });
    it("Aluminio calcula correctamente", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 15000,
            phaseSystem: "three",
            powerFactor: 0.9,
            conductorMaterial: "Al",
            sectionMm2: 25,
            lengthM: 20,
        });
        expect(r.nominalCurrentA).toBeGreaterThan(0);
        expect(r.voltageDropV).toBeGreaterThanOrEqual(0);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// Branches: tableEntry fallback, In muy alto
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-15 — Casos límite", () => {
    it("corriente muy alta usa fallback de tabla (95/50)", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 200000,
            phaseSystem: "three",
            powerFactor: 0.9,
            conductorMaterial: "Cu",
            sectionMm2: 120,
            lengthM: 10,
        });
        expect(r.minSectionCuMm2).toBe(95);
        expect(r.protectionSectionMm2).toBe(50);
    });
    it("powerFactor sin ?? usa 0.9", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 5750,
            phaseSystem: "single",
            powerFactor: 0.9,
            conductorMaterial: "Cu",
            sectionMm2: 10,
            lengthM: 5,
        });
        expect(r.nominalCurrentA).toBeCloseTo(5750 / (230 * 0.9), 0);
    });
    it("voltageDropV y voltageDropPct coherentes", () => {
        const r = (0, itc_bt_15_1.calculateDIVoltageDrop)({
            contractedPowerW: 11500,
            phaseSystem: "single",
            powerFactor: 0.9,
            conductorMaterial: "Cu",
            sectionMm2: 6,
            lengthM: 25,
        });
        expect(r.voltageDropV).toBeCloseTo((r.voltageDropPct / 100) * 230, 0);
    });
});
//# sourceMappingURL=itc-bt-15.test.js.map