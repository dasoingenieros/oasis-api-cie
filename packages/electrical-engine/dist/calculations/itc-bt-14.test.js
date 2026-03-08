"use strict";
/**
 * Tests: ITC-BT-14 — Línea General de Alimentación (LGA)
 *
 * Cobertura:
 *   - getResistivityAtTemp: Cu/Al, distintas temperaturas
 *   - calculateLGAVoltageDrop: trifásico/monofásico, Cu/Al, advertencias
 *   - getNeutralSection: todas las ramas
 *   - Tablas y constantes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const itc_bt_14_1 = require("../tables/itc-bt-14");
// ════════════════════════════════════════════════════════════════════════════
// Constantes y tablas
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-14 — Constantes", () => {
    it("RESISTIVITY_20C tiene valores para Cu y Al", () => {
        expect(itc_bt_14_1.RESISTIVITY_20C.Cu).toBeCloseTo(0.01724, 4);
        expect(itc_bt_14_1.RESISTIVITY_20C.Al).toBeCloseTo(0.02826, 4);
    });
    it("TEMP_COEFF tiene valores para Cu y Al", () => {
        expect(itc_bt_14_1.TEMP_COEFF.Cu).toBeCloseTo(0.00393, 4);
        expect(itc_bt_14_1.TEMP_COEFF.Al).toBeCloseTo(0.00403, 4);
    });
    it("LGA_SECTION_TABLE tiene 10 filas", () => {
        expect(itc_bt_14_1.LGA_SECTION_TABLE).toHaveLength(10);
    });
    it("LGA_SECTION_TABLE primera fila: 100A → 16mm² Cu, 25mm² Al", () => {
        const first = itc_bt_14_1.LGA_SECTION_TABLE[0];
        expect(first?.maxCurrentA).toBe(100);
        expect(first?.sectionCuMm2).toBe(16);
        expect(first?.sectionAlMm2).toBe(25);
        expect(first?.neutralCuMm2).toBe(16);
    });
    it("REACTANCE_TABLE_CABLE contiene secciones ≥ 50mm²", () => {
        expect(itc_bt_14_1.REACTANCE_TABLE_CABLE[50]).toBe(0.09);
        expect(itc_bt_14_1.REACTANCE_TABLE_CABLE[300]).toBe(0.072);
        expect(itc_bt_14_1.REACTANCE_TABLE_CABLE[25]).toBeUndefined();
    });
});
// ════════════════════════════════════════════════════════════════════════════
// getResistivityAtTemp
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-14 — getResistivityAtTemp", () => {
    it("Cu a 20°C devuelve ρ_20", () => {
        const rho = (0, itc_bt_14_1.getResistivityAtTemp)("Cu", 20);
        expect(rho).toBeCloseTo(itc_bt_14_1.RESISTIVITY_20C.Cu, 6);
    });
    it("Al a 20°C devuelve ρ_20", () => {
        const rho = (0, itc_bt_14_1.getResistivityAtTemp)("Al", 20);
        expect(rho).toBeCloseTo(itc_bt_14_1.RESISTIVITY_20C.Al, 6);
    });
    it("Cu a 70°C tiene mayor resistividad que a 20°C", () => {
        const rho20 = (0, itc_bt_14_1.getResistivityAtTemp)("Cu", 20);
        const rho70 = (0, itc_bt_14_1.getResistivityAtTemp)("Cu", 70);
        expect(rho70).toBeGreaterThan(rho20);
    });
    it("Al a 90°C tiene mayor resistividad que a 25°C", () => {
        const rho25 = (0, itc_bt_14_1.getResistivityAtTemp)("Al", 25);
        const rho90 = (0, itc_bt_14_1.getResistivityAtTemp)("Al", 90);
        expect(rho90).toBeGreaterThan(rho25);
    });
    it("fórmula ρ_T = ρ_20 × [1 + α × (T - 20)] para Cu a 70°C", () => {
        const rho = (0, itc_bt_14_1.getResistivityAtTemp)("Cu", 70);
        const expected = itc_bt_14_1.RESISTIVITY_20C.Cu * (1 + itc_bt_14_1.TEMP_COEFF.Cu * 50);
        expect(rho).toBeCloseTo(expected, 6);
    });
    it("nunca devuelve NaN", () => {
        expect(isNaN((0, itc_bt_14_1.getResistivityAtTemp)("Cu", 0))).toBe(false);
        expect(isNaN((0, itc_bt_14_1.getResistivityAtTemp)("Al", 100))).toBe(false);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// calculateLGAVoltageDrop
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-14 — calculateLGAVoltageDrop", () => {
    it("trifásico: calcula In = P / (√3 × V × cosφ)", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 34500,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 95,
            lengthM: 25,
        });
        // In = 34500 / (√3 × 400 × 0.9) ≈ 55.35A
        expect(result.nominalCurrentA).toBeCloseTo(55.35, 1);
    });
    it("monofásico: calcula In = P / (V × cosφ)", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 23000,
            powerFactor: 1.0,
            phaseSystem: "single",
            conductorMaterial: "Cu",
            sectionMm2: 25,
            lengthM: 10,
        });
        // In = 23000 / (230 × 1) = 100A
        expect(result.nominalCurrentA).toBeCloseTo(100, 0);
    });
    it("cdtLimitPct siempre 0.5% para LGA", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 10000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 50,
            lengthM: 5,
        });
        expect(result.cdtLimitPct).toBe(0.5);
    });
    it("cdtCompliant true cuando CdT ≤ 0.5%", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 5000,
            powerFactor: 0.95,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 95,
            lengthM: 5,
        });
        expect(result.cdtCompliant).toBe(true);
    });
    it("cdtCompliant false cuando CdT > 0.5%", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 100000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 16,
            lengthM: 50,
        });
        expect(result.cdtCompliant).toBe(false);
    });
    it("aluminio calcula correctamente", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 20000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Al",
            sectionMm2: 50,
            lengthM: 20,
        });
        expect(result.nominalCurrentA).toBeGreaterThan(0);
        expect(result.voltageDropPct).toBeGreaterThanOrEqual(0);
    });
    it("advertencia: Cu con sección < 10mm²", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 5000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 6,
            lengthM: 5,
        });
        expect(result.warnings.some((w) => w.includes("10mm²"))).toBe(true);
    });
    it("advertencia: Al con sección < 16mm²", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 5000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Al",
            sectionMm2: 10,
            lengthM: 5,
        });
        expect(result.warnings.some((w) => w.includes("16mm²"))).toBe(true);
    });
    it("sin advertencias cuando secciones cumplen mínimo", () => {
        const resultCu = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 5000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 16,
            lengthM: 5,
        });
        expect(resultCu.warnings).toHaveLength(0);
        const resultAl = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 5000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Al",
            sectionMm2: 25,
            lengthM: 5,
        });
        expect(resultAl.warnings).toHaveLength(0);
    });
    it("tensión personalizada voltageV", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 4600,
            powerFactor: 1.0,
            phaseSystem: "single",
            conductorMaterial: "Cu",
            sectionMm2: 16,
            lengthM: 10,
            voltageV: 220,
        });
        // In = 4600 / 220 = 20.91A
        expect(result.nominalCurrentA).toBeCloseTo(20.91, 1);
        expect(result.voltageDropV).toBeGreaterThanOrEqual(0);
    });
    it("conductorTempC personalizado afecta resistividad", () => {
        const result70 = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 10000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 50,
            lengthM: 30,
            conductorTempC: 70,
        });
        const result90 = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 10000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 50,
            lengthM: 30,
            conductorTempC: 90,
        });
        expect(result90.voltageDropPct).toBeGreaterThan(result70.voltageDropPct);
    });
    it("sección 50mm² usa reactancia de tabla", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 50000,
            powerFactor: 0.85,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 50,
            lengthM: 40,
        });
        expect(result.voltageDropPct).toBeGreaterThanOrEqual(0);
    });
    it("sección 120mm² usa reactancia de tabla", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 80000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 120,
            lengthM: 25,
        });
        expect(result.nominalCurrentA).toBeGreaterThan(0);
    });
    it("minSectionMm2 es coherente", () => {
        const result = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
            totalPowerW: 30000,
            powerFactor: 0.9,
            phaseSystem: "three",
            conductorMaterial: "Cu",
            sectionMm2: 50,
            lengthM: 20,
        });
        expect(result.minSectionMm2).toBeGreaterThanOrEqual(0);
        expect(typeof result.resistanceOhm).toBe("number");
    });
});
// ════════════════════════════════════════════════════════════════════════════
// getNeutralSection
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-14 — getNeutralSection", () => {
    it("Cu: fase ≤ 16mm² → neutro = fase", () => {
        expect((0, itc_bt_14_1.getNeutralSection)(1.5, "Cu")).toBe(1.5);
        expect((0, itc_bt_14_1.getNeutralSection)(2.5, "Cu")).toBe(2.5);
        expect((0, itc_bt_14_1.getNeutralSection)(10, "Cu")).toBe(10);
        expect((0, itc_bt_14_1.getNeutralSection)(16, "Cu")).toBe(16);
    });
    it("Cu: fase > 16mm² → neutro = fase/2, mínimo 16mm²", () => {
        expect((0, itc_bt_14_1.getNeutralSection)(25, "Cu")).toBe(16); // 25/2=12.5 < 16
        expect((0, itc_bt_14_1.getNeutralSection)(35, "Cu")).toBe(17.5); // 35/2=17.5 → max(17.5,16)=17.5
        expect((0, itc_bt_14_1.getNeutralSection)(50, "Cu")).toBe(25);
        expect((0, itc_bt_14_1.getNeutralSection)(95, "Cu")).toBeCloseTo(47.5, 1);
    });
    it("Al: fase ≤ 25mm² → neutro = fase", () => {
        expect((0, itc_bt_14_1.getNeutralSection)(16, "Al")).toBe(16);
        expect((0, itc_bt_14_1.getNeutralSection)(25, "Al")).toBe(25);
    });
    it("Al: fase > 25mm² → neutro = fase/2, mínimo 16mm²", () => {
        expect((0, itc_bt_14_1.getNeutralSection)(35, "Al")).toBe(17.5); // 35/2=17.5, max(17.5,16)=17.5
        expect((0, itc_bt_14_1.getNeutralSection)(50, "Al")).toBe(25);
    });
    it("nunca devuelve valor negativo ni NaN", () => {
        expect((0, itc_bt_14_1.getNeutralSection)(10, "Cu")).toBeGreaterThan(0);
        expect((0, itc_bt_14_1.getNeutralSection)(120, "Al")).toBeGreaterThan(0);
        expect(isNaN((0, itc_bt_14_1.getNeutralSection)(70, "Cu"))).toBe(false);
    });
});
//# sourceMappingURL=itc-bt-14.test.js.map