"use strict";
/**
 * Tests: ITC-BT-10 — Previsión de cargas
 *
 * Cobertura:
 *   - ELECTRIFICATION_GRADES, LOAD_DENSITY_TABLE, SIMULTANEITY_COEFFICIENT_RESIDENTIAL
 *   - calculateBuildingLoad: validación, 1-40 viviendas, > 40 viviendas
 *   - determineElectrificationGrade: básica vs elevada
 *   - calculateCommercialLoad: todos los usos, minLoadW
 */
Object.defineProperty(exports, "__esModule", { value: true });
const itc_bt_10_1 = require("../tables/itc-bt-10");
// ════════════════════════════════════════════════════════════════════════════
// Constantes y tablas
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-10 — Constantes", () => {
    it("ELECTRIFICATION_GRADES tiene basic y elevated", () => {
        expect(itc_bt_10_1.ELECTRIFICATION_GRADES.basic.grade).toBe("basic");
        expect(itc_bt_10_1.ELECTRIFICATION_GRADES.basic.minPowerW).toBe(5750);
        expect(itc_bt_10_1.ELECTRIFICATION_GRADES.basic.minSectionMm2).toBe(6);
        expect(itc_bt_10_1.ELECTRIFICATION_GRADES.elevated.grade).toBe("elevated");
        expect(itc_bt_10_1.ELECTRIFICATION_GRADES.elevated.minPowerW).toBe(9200);
        expect(itc_bt_10_1.ELECTRIFICATION_GRADES.elevated.minSectionMm2).toBe(10);
    });
    it("LOAD_DENSITY_TABLE tiene todos los tipos de local", () => {
        const uses = [
            "residential", "commercial", "office", "hotel", "hospital",
            "school", "parking", "industrial_light", "industrial_heavy",
        ];
        for (const u of uses) {
            expect(itc_bt_10_1.LOAD_DENSITY_TABLE[u]).toBeDefined();
            expect(itc_bt_10_1.LOAD_DENSITY_TABLE[u].loadDensityWm2).toBeGreaterThanOrEqual(0);
        }
    });
    it("residential tiene loadDensityWm2 = 0 (se calcula por grado)", () => {
        expect(itc_bt_10_1.LOAD_DENSITY_TABLE.residential.loadDensityWm2).toBe(0);
    });
    it("commercial y office tienen minLoadW", () => {
        expect(itc_bt_10_1.LOAD_DENSITY_TABLE.commercial.minLoadW).toBe(3450);
        expect(itc_bt_10_1.LOAD_DENSITY_TABLE.office.minLoadW).toBe(3450);
    });
    it("SIMULTANEITY_COEFFICIENT_RESIDENTIAL para 1-40 viviendas", () => {
        expect(itc_bt_10_1.SIMULTANEITY_COEFFICIENT_RESIDENTIAL[1]).toBe(1);
        expect(itc_bt_10_1.SIMULTANEITY_COEFFICIENT_RESIDENTIAL[2]).toBe(2);
        expect(itc_bt_10_1.SIMULTANEITY_COEFFICIENT_RESIDENTIAL[10]).toBe(7.38);
        expect(itc_bt_10_1.SIMULTANEITY_COEFFICIENT_RESIDENTIAL[20]).toBe(12.18);
        expect(itc_bt_10_1.SIMULTANEITY_COEFFICIENT_RESIDENTIAL[40]).toBe(15.8);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// calculateBuildingLoad
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-10 — calculateBuildingLoad", () => {
    it("lanza error si nDwellings <= 0", () => {
        expect(() => (0, itc_bt_10_1.calculateBuildingLoad)(0, 5750)).toThrow("número de viviendas debe ser > 0");
        expect(() => (0, itc_bt_10_1.calculateBuildingLoad)(-1, 5750)).toThrow("número de viviendas debe ser > 0");
    });
    it("lanza error si potencia por vivienda < 5750", () => {
        expect(() => (0, itc_bt_10_1.calculateBuildingLoad)(5, 5700)).toThrow("Potencia por vivienda mínima 5.750W");
        expect(() => (0, itc_bt_10_1.calculateBuildingLoad)(1, 1000)).toThrow("Potencia por vivienda mínima 5.750W");
    });
    it("1 vivienda: coeff = 1, total = powerPerDwelling", () => {
        const r = (0, itc_bt_10_1.calculateBuildingLoad)(1, 5750);
        expect(r.simultaneityCoeff).toBe(1);
        expect(r.totalPowerW).toBe(5750);
    });
    it("2 viviendas: coeff = 2", () => {
        const r = (0, itc_bt_10_1.calculateBuildingLoad)(2, 9200);
        expect(r.simultaneityCoeff).toBe(2);
        expect(r.totalPowerW).toBe(18400);
    });
    it("10 viviendas con electrificación básica", () => {
        const r = (0, itc_bt_10_1.calculateBuildingLoad)(10, 5750);
        expect(r.simultaneityCoeff).toBe(7.38);
        expect(r.totalPowerW).toBe(Math.round(7.38 * 5750));
    });
    it("40 viviendas: coeff = 15.80", () => {
        const r = (0, itc_bt_10_1.calculateBuildingLoad)(40, 5750);
        expect(r.simultaneityCoeff).toBe(15.8);
        expect(r.totalPowerW).toBe(Math.round(15.8 * 5750));
    });
    it("> 40 viviendas usa coeff 15.80 constante", () => {
        const r = (0, itc_bt_10_1.calculateBuildingLoad)(100, 5750);
        expect(r.simultaneityCoeff).toBe(15.8);
        expect(r.totalPowerW).toBe(Math.round(15.8 * 5750));
    });
    it("powerPerDwellingW se devuelve en el resultado", () => {
        const r = (0, itc_bt_10_1.calculateBuildingLoad)(5, 9200);
        expect(r.powerPerDwellingW).toBe(9200);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// determineElectrificationGrade
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-10 — determineElectrificationGrade", () => {
    it("superficie > 160m² → elevated", () => {
        expect((0, itc_bt_10_1.determineElectrificationGrade)({ surfaceM2: 161, hasElectricHeating: false, hasAirConditioning: false })).toBe("elevated");
    });
    it("con calefacción eléctrica → elevated", () => {
        expect((0, itc_bt_10_1.determineElectrificationGrade)({ surfaceM2: 50, hasElectricHeating: true, hasAirConditioning: false })).toBe("elevated");
    });
    it("con aire acondicionado → elevated", () => {
        expect((0, itc_bt_10_1.determineElectrificationGrade)({ surfaceM2: 50, hasElectricHeating: false, hasAirConditioning: true })).toBe("elevated");
    });
    it("vivienda pequeña sin extras → basic", () => {
        expect((0, itc_bt_10_1.determineElectrificationGrade)({ surfaceM2: 100, hasElectricHeating: false, hasAirConditioning: false })).toBe("basic");
    });
    it("exactamente 160m² sin extras → basic", () => {
        expect((0, itc_bt_10_1.determineElectrificationGrade)({ surfaceM2: 160, hasElectricHeating: false, hasAirConditioning: false })).toBe("basic");
    });
});
// ════════════════════════════════════════════════════════════════════════════
// calculateCommercialLoad
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-10 — calculateCommercialLoad", () => {
    it("commercial: densidad × superficie, con mínimo", () => {
        const r = (0, itc_bt_10_1.calculateCommercialLoad)("commercial", 50);
        expect(r.loadDensityWm2).toBe(100);
        expect(r.totalPowerW).toBe(Math.max(100 * 50, 3450));
    });
    it("commercial: superficie pequeña usa minLoadW", () => {
        const r = (0, itc_bt_10_1.calculateCommercialLoad)("commercial", 10);
        expect(r.totalPowerW).toBe(3450);
    });
    it("office: densidad 80 W/m²", () => {
        const r = (0, itc_bt_10_1.calculateCommercialLoad)("office", 100);
        expect(r.loadDensityWm2).toBe(80);
        expect(r.totalPowerW).toBe(Math.max(80 * 100, 3450));
    });
    it("hotel: sin minLoadW", () => {
        const r = (0, itc_bt_10_1.calculateCommercialLoad)("hotel", 50);
        expect(r.totalPowerW).toBe(100 * 50);
    });
    it("hospital: alta densidad", () => {
        const r = (0, itc_bt_10_1.calculateCommercialLoad)("hospital", 100);
        expect(r.totalPowerW).toBe(1500 * 100);
    });
    it("school: 50 W/m²", () => {
        const r = (0, itc_bt_10_1.calculateCommercialLoad)("school", 200);
        expect(r.totalPowerW).toBe(50 * 200);
    });
    it("parking: 10 W/m²", () => {
        const r = (0, itc_bt_10_1.calculateCommercialLoad)("parking", 500);
        expect(r.totalPowerW).toBe(10 * 500);
    });
    it("industrial_light: 125 W/m²", () => {
        const r = (0, itc_bt_10_1.calculateCommercialLoad)("industrial_light", 100);
        expect(r.totalPowerW).toBe(125 * 100);
    });
    it("industrial_heavy: 250 W/m²", () => {
        const r = (0, itc_bt_10_1.calculateCommercialLoad)("industrial_heavy", 80);
        expect(r.totalPowerW).toBe(250 * 80);
    });
});
//# sourceMappingURL=itc-bt-10.test.js.map