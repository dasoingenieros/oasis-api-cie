"use strict";
/**
 * Tests: ITC-BT-25 — Circuitos tipo vivienda
 *
 * Cobertura:
 *   - getCircuitTemplate: códigos existentes, CUSTOM, no existente
 *   - getMandatoryCircuits: superficies < 30, 30–49, 50–99, 100–149, ≥ 150
 *   - ITC_BT_25_CIRCUITS: estructura de plantillas
 */
Object.defineProperty(exports, "__esModule", { value: true });
const itc_bt_25_1 = require("../tables/itc-bt-25");
// ════════════════════════════════════════════════════════════════════════════
// getCircuitTemplate
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-25 — getCircuitTemplate", () => {
    it("devuelve plantilla para C1", () => {
        const t = (0, itc_bt_25_1.getCircuitTemplate)("C1");
        expect(t).toBeDefined();
        expect(t?.code).toBe("C1");
        expect(t?.name).toBe("Alumbrado");
        expect(t?.minSectionMm2).toBe(1.5);
        expect(t?.maxBreakerA).toBe(10);
        expect(t?.socketType).toBe("none");
    });
    it("devuelve plantilla para C2", () => {
        const t = (0, itc_bt_25_1.getCircuitTemplate)("C2");
        expect(t).toBeDefined();
        expect(t?.minSectionMm2).toBe(2.5);
        expect(t?.socketType).toBe("schuko_16A");
    });
    it("devuelve plantilla para C3", () => {
        const t = (0, itc_bt_25_1.getCircuitTemplate)("C3");
        expect(t).toBeDefined();
        expect(t?.minSectionMm2).toBe(6);
        expect(t?.socketType).toBe("schuko_25A");
    });
    it("devuelve plantilla para C4.1, C4.2, C4.3", () => {
        expect((0, itc_bt_25_1.getCircuitTemplate)("C4.1")?.minSectionMm2).toBe(4);
        expect((0, itc_bt_25_1.getCircuitTemplate)("C4.2")?.minSectionMm2).toBe(4);
        expect((0, itc_bt_25_1.getCircuitTemplate)("C4.3")?.minSectionMm2).toBe(4);
    });
    it("devuelve plantilla para C5, C6, C7", () => {
        expect((0, itc_bt_25_1.getCircuitTemplate)("C5")?.minSectionMm2).toBe(2.5);
        expect((0, itc_bt_25_1.getCircuitTemplate)("C6")?.minSectionMm2).toBe(1.5);
        expect((0, itc_bt_25_1.getCircuitTemplate)("C7")?.minSectionMm2).toBe(2.5);
    });
    it("devuelve plantilla para C8, C9, C10", () => {
        expect((0, itc_bt_25_1.getCircuitTemplate)("C8")?.minSectionMm2).toBe(6);
        expect((0, itc_bt_25_1.getCircuitTemplate)("C9")?.minSectionMm2).toBe(6);
        expect((0, itc_bt_25_1.getCircuitTemplate)("C10")?.minSectionMm2).toBe(4);
    });
    it("devuelve plantilla para C11 (domótica, diferencial 300mA)", () => {
        const t = (0, itc_bt_25_1.getCircuitTemplate)("C11");
        expect(t).toBeDefined();
        expect(t?.rcdSensitivityMa).toBe(300);
        expect(t?.socketType).toBe("none");
    });
    it("devuelve plantilla para C12", () => {
        const t = (0, itc_bt_25_1.getCircuitTemplate)("C12");
        expect(t).toBeDefined();
        expect(t?.minSectionMm2).toBe(2.5);
    });
    it("devuelve undefined para código inexistente", () => {
        expect((0, itc_bt_25_1.getCircuitTemplate)("C99")).toBeUndefined();
        expect((0, itc_bt_25_1.getCircuitTemplate)("X1")).toBeUndefined();
        expect((0, itc_bt_25_1.getCircuitTemplate)("")).toBeUndefined();
    });
    it("CUSTOM no está en tabla (undefined)", () => {
        expect((0, itc_bt_25_1.getCircuitTemplate)("CUSTOM")).toBeUndefined();
    });
    it("plantilla tiene minPoints para todos los tamaños de vivienda", () => {
        const t = (0, itc_bt_25_1.getCircuitTemplate)("C1");
        expect(t?.minPoints).toBeDefined();
        expect(t?.minPoints.studio).toBeDefined();
        expect(t?.minPoints.small).toBeDefined();
        expect(t?.minPoints.medium).toBeDefined();
        expect(t?.minPoints.large).toBeDefined();
        expect(t?.minPoints.xlarge).toBeDefined();
    });
});
// ════════════════════════════════════════════════════════════════════════════
// getMandatoryCircuits
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-25 — getMandatoryCircuits", () => {
    it("superficie < 30m²: C1, C2, C3, C4.1, C5", () => {
        const circuits = (0, itc_bt_25_1.getMandatoryCircuits)(20);
        expect(circuits).toEqual(["C1", "C2", "C3", "C4.1", "C5"]);
    });
    it("superficie 29m²: no incluye C4.2", () => {
        const circuits = (0, itc_bt_25_1.getMandatoryCircuits)(29);
        expect(circuits).not.toContain("C4.2");
        expect(circuits).toEqual(["C1", "C2", "C3", "C4.1", "C5"]);
    });
    it("superficie 30m²: añade C4.2 (lavavajillas)", () => {
        const circuits = (0, itc_bt_25_1.getMandatoryCircuits)(30);
        expect(circuits).toContain("C4.2");
        expect(circuits).toEqual(["C1", "C2", "C3", "C4.1", "C5", "C4.2"]);
    });
    it("superficie 49m²: C4.2 pero no C4.3 ni C10", () => {
        const circuits = (0, itc_bt_25_1.getMandatoryCircuits)(49);
        expect(circuits).toContain("C4.2");
        expect(circuits).not.toContain("C4.3");
        expect(circuits).not.toContain("C10");
    });
    it("superficie 50m²: añade C4.3 y C10", () => {
        const circuits = (0, itc_bt_25_1.getMandatoryCircuits)(50);
        expect(circuits).toContain("C4.2");
        expect(circuits).toContain("C4.3");
        expect(circuits).toContain("C10");
    });
    it("superficie 99m²: incluye todos los obligatorios", () => {
        const circuits = (0, itc_bt_25_1.getMandatoryCircuits)(99);
        expect(circuits).toContain("C1");
        expect(circuits).toContain("C2");
        expect(circuits).toContain("C3");
        expect(circuits).toContain("C4.1");
        expect(circuits).toContain("C5");
        expect(circuits).toContain("C4.2");
        expect(circuits).toContain("C4.3");
        expect(circuits).toContain("C10");
    });
    it("superficie 150m²: mismo conjunto que 50m²", () => {
        const circuits = (0, itc_bt_25_1.getMandatoryCircuits)(150);
        expect(circuits).toEqual(["C1", "C2", "C3", "C4.1", "C5", "C4.2", "C4.3", "C10"]);
    });
    it("superficie 0: devuelve base sin adicionales", () => {
        const circuits = (0, itc_bt_25_1.getMandatoryCircuits)(0);
        expect(circuits).toEqual(["C1", "C2", "C3", "C4.1", "C5"]);
    });
});
// ════════════════════════════════════════════════════════════════════════════
// ITC_BT_25_CIRCUITS estructura
// ════════════════════════════════════════════════════════════════════════════
describe("ITC-BT-25 — ITC_BT_25_CIRCUITS", () => {
    it("contiene al menos 13 circuitos definidos", () => {
        const keys = Object.keys(itc_bt_25_1.ITC_BT_25_CIRCUITS);
        expect(keys.length).toBeGreaterThanOrEqual(13);
    });
    it("cada plantilla tiene campos requeridos", () => {
        for (const [code, t] of Object.entries(itc_bt_25_1.ITC_BT_25_CIRCUITS)) {
            expect(t.code).toBe(code);
            expect(typeof t.name).toBe("string");
            expect(typeof t.minSectionMm2).toBe("number");
            expect(t.maxBreakerA).toBeDefined();
            expect(["B", "C", "D"]).toContain(t.breakerCurve);
            expect([30, 300]).toContain(t.rcdSensitivityMa);
            expect(["schuko_16A", "schuko_25A", "none"]).toContain(t.socketType);
            expect(t.minPoints).toBeDefined();
        }
    });
    it("minSectionMm2 son valores normalizados", () => {
        const valid = [1.5, 2.5, 4, 6, 10, 16, 25];
        for (const t of Object.values(itc_bt_25_1.ITC_BT_25_CIRCUITS)) {
            expect(valid).toContain(t.minSectionMm2);
        }
    });
});
//# sourceMappingURL=itc-bt-25.test.js.map