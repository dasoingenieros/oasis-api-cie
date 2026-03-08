/**
 * Tests: Intensidad nominal + Tablas ITC-BT-19
 *
 * Cobertura:
 *   - calculateNominalCurrent: monofásica, trifásica, con factores, errores
 *   - getAdmissibleCurrent: todos los métodos, PVC/XLPE, Cu/Al
 *   - getCorrectionFactorCa: interpolación, límites
 *   - getCorrectionFactorCg: métodos secos, método D
 */

import { calculateNominalCurrent } from "../calculations/nominal-current";
import {
  getAdmissibleCurrent,
  getAvailableSections,
} from "../tables/itc-bt-19";
import {
  getCorrectionFactorCa,
  getCorrectionFactorCg,
  getCorrectionFactorCt,
  getCorrectionFactors,
} from "../tables/correction-factors";
import { EngineError } from "../types";

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 1: Intensidad nominal
// ════════════════════════════════════════════════════════════════════════════

describe("calculateNominalCurrent", () => {

  // ─── Casos monofásicos ──────────────────────────────────────────────────

  describe("monofásico", () => {

    it("calcula C1 alumbrado: 2300W, cosφ=1, 230V", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 2300,
        powerFactor: 1.0,
      });
      // In = 2300 / (230 × 1.0) = 10A exacto
      expect(result.nominalCurrentA).toBeCloseTo(10, 1);
      expect(result.effectivePowerW).toBe(2300);
      expect(result.voltageV).toBe(230);
    });

    it("calcula C2 TC general: 3450W, cosφ=1, 230V", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 3450,
        powerFactor: 1.0,
      });
      // In = 3450 / 230 = 15A
      expect(result.nominalCurrentA).toBeCloseTo(15, 1);
    });

    it("calcula C3 cocina: 5400W, cosφ=1, 230V", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 5400,
        powerFactor: 1.0,
      });
      // In = 5400 / 230 ≈ 23.48A
      expect(result.nominalCurrentA).toBeCloseTo(23.48, 1);
    });

    it("aplica factor de simultaneidad Ks=0.66", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 3000,
        powerFactor: 1.0,
        simultaneityFactor: 0.66,
      });
      // P_ef = 3000 × 0.66 = 1980W; In = 1980/230 ≈ 8.61A
      expect(result.effectivePowerW).toBeCloseTo(1980, 0);
      expect(result.nominalCurrentA).toBeCloseTo(8.61, 1);
    });

    it("aplica factor de utilización Fu=0.8", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 5000,
        powerFactor: 1.0,
        loadFactor: 0.8,
      });
      // P_ef = 5000 × 0.8 = 4000W; In = 4000/230 ≈ 17.39A
      expect(result.effectivePowerW).toBeCloseTo(4000, 0);
      expect(result.nominalCurrentA).toBeCloseTo(17.39, 1);
    });

    it("aplica cosφ=0.85 (carga inductiva)", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 2300,
        powerFactor: 0.85,
      });
      // In = 2300 / (230 × 0.85) ≈ 11.76A
      expect(result.nominalCurrentA).toBeCloseTo(11.76, 1);
    });

    it("usa tensión personalizada 220V", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 2200,
        powerFactor: 1.0,
        voltageV: 220,
      });
      // In = 2200/220 = 10A
      expect(result.nominalCurrentA).toBeCloseTo(10, 1);
      expect(result.voltageV).toBe(220);
    });

    it("genera pasos de trazabilidad", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 2300,
        powerFactor: 1.0,
      });
      expect(result.steps.length).toBeGreaterThanOrEqual(2);
      expect(result.steps[0]?.description).toContain("Potencia efectiva");
      expect(result.steps[1]?.formula).toContain("In = P_ef");
    });

  });

  // ─── Casos trifásicos ───────────────────────────────────────────────────

  describe("trifásico", () => {

    it("calcula motor 3kW, cosφ=0.85, 400V", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "three",
        loadPowerW: 3000,
        powerFactor: 0.85,
      });
      // In = 3000 / (√3 × 400 × 0.85) ≈ 5.09A
      expect(result.nominalCurrentA).toBeCloseTo(5.09, 1);
      expect(result.voltageV).toBe(400);
    });

    it("calcula carga 18kW trifásica, cosφ=0.9", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "three",
        loadPowerW: 18000,
        powerFactor: 0.9,
      });
      // In = 18000 / (√3 × 400 × 0.9) ≈ 28.87A
      expect(result.nominalCurrentA).toBeCloseTo(28.87, 1);
    });

    it("incluye formula trifásica en los pasos", () => {
      const result = calculateNominalCurrent({
        phaseSystem: "three",
        loadPowerW: 6000,
        powerFactor: 0.9,
      });
      const step2 = result.steps[1];
      expect(step2?.formula).toContain("√3");
    });

  });

  // ─── Validaciones de error ──────────────────────────────────────────────

  describe("errores de validación", () => {

    it("lanza EngineError para potencia 0", () => {
      expect(() => calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 0,
        powerFactor: 1.0,
      })).toThrow(EngineError);
    });

    it("lanza EngineError para potencia negativa", () => {
      expect(() => calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: -500,
        powerFactor: 1.0,
      })).toThrow(EngineError);
    });

    it("lanza EngineError para cosφ = 0", () => {
      expect(() => calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 2300,
        powerFactor: 0,
      })).toThrow(EngineError);
    });

    it("lanza EngineError para cosφ > 1", () => {
      expect(() => calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 2300,
        powerFactor: 1.5,
      })).toThrow(EngineError);
    });

    it("lanza EngineError para Ks fuera de rango", () => {
      expect(() => calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 2300,
        powerFactor: 1.0,
        simultaneityFactor: 1.5,
      })).toThrow(EngineError);
    });

    it("lanza EngineError para Ks = 0", () => {
      expect(() => calculateNominalCurrent({
        phaseSystem: "single",
        loadPowerW: 2300,
        powerFactor: 1.0,
        simultaneityFactor: 0,
      })).toThrow(EngineError);
    });

    it("el error incluye el circuitId si se proporciona", () => {
      try {
        calculateNominalCurrent({
          phaseSystem: "single",
          loadPowerW: 0,
          powerFactor: 1.0,
          circuitId: "C1-salon",
        });
        fail("Debe lanzar error");
      } catch (e) {
        expect(e).toBeInstanceOf(EngineError);
        expect((e as EngineError).circuitId).toBe("C1-salon");
      }
    });

    it("NUNCA produce NaN", () => {
      // Este test es la regla más importante del motor
      const safeInput = {
        phaseSystem: "single" as const,
        loadPowerW: 1000,
        powerFactor: 0.9,
      };
      const result = calculateNominalCurrent(safeInput);
      expect(isNaN(result.nominalCurrentA)).toBe(false);
      expect(isFinite(result.nominalCurrentA)).toBe(true);
      expect(result.nominalCurrentA).toBeGreaterThan(0);
    });

  });

});

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 2: Tabla ITC-BT-19 — getAdmissibleCurrent
// ════════════════════════════════════════════════════════════════════════════

describe("getAdmissibleCurrent (ITC-BT-19)", () => {

  describe("Cobre PVC — valores críticos de tabla", () => {

    it("A1 / 1.5mm² / PVC / Cu = 13A", () => {
      expect(getAdmissibleCurrent("A1", 1.5, "PVC", "Cu")).toBe(13);
    });

    it("A1 / 2.5mm² / PVC / Cu = 17.5A", () => {
      expect(getAdmissibleCurrent("A1", 2.5, "PVC", "Cu")).toBe(17.5);
    });

    it("B1 / 6mm² / PVC / Cu = 36A (circuito C3 cocina)", () => {
      expect(getAdmissibleCurrent("B1", 6, "PVC", "Cu")).toBe(36);
    });

    it("C / 16mm² / PVC / Cu = 76A", () => {
      expect(getAdmissibleCurrent("C", 16, "PVC", "Cu")).toBe(76);
    });

    it("E / 50mm² / PVC / Cu = 168A", () => {
      expect(getAdmissibleCurrent("E", 50, "PVC", "Cu")).toBe(168);
    });

  });

  describe("Cobre XLPE — valores críticos", () => {

    it("A1 / 1.5mm² / XLPE / Cu = 15.5A", () => {
      expect(getAdmissibleCurrent("A1", 1.5, "XLPE", "Cu")).toBe(15.5);
    });

    it("B2 / 4mm² / XLPE / Cu = 31A", () => {
      expect(getAdmissibleCurrent("B2", 4, "XLPE", "Cu")).toBe(31);
    });

    it("C / 25mm² / XLPE / Cu = 119A", () => {
      expect(getAdmissibleCurrent("C", 25, "XLPE", "Cu")).toBe(119);
    });

    it("F / 240mm² / XLPE / Cu = 641A (línea principal)", () => {
      expect(getAdmissibleCurrent("F", 240, "XLPE", "Cu")).toBe(641);
    });

  });

  describe("Aluminio", () => {

    it("C / 16mm² / PVC / Al = 59A", () => {
      expect(getAdmissibleCurrent("C", 16, "PVC", "Al")).toBe(59);
    });

    it("D / 95mm² / XLPE / Al = 199A", () => {
      expect(getAdmissibleCurrent("D", 95, "XLPE", "Al")).toBe(199);
    });

  });

  describe("EPR — trata igual que XLPE", () => {

    it("A1 / 1.5mm² / EPR / Cu = igual que XLPE = 15.5A", () => {
      expect(getAdmissibleCurrent("A1", 1.5, "EPR", "Cu")).toBe(15.5);
    });

  });

  describe("Errores", () => {

    it("lanza error para sección no existente en tabla", () => {
      expect(() => getAdmissibleCurrent("A1", 3, "PVC", "Cu")).toThrow();
    });

    it("lanza error para método inválido", () => {
      // @ts-expect-error — probando input inválido en runtime
      expect(() => getAdmissibleCurrent("Z1", 2.5, "PVC", "Cu")).toThrow();
    });

  });

  describe("getAvailableSections", () => {

    it("A1/PVC/Cu devuelve 16 secciones", () => {
      const sections = getAvailableSections("A1", "PVC", "Cu");
      expect(sections).toHaveLength(16);
      expect(sections[0]).toBe(1.5);
      expect(sections[sections.length - 1]).toBe(300);
    });

    it("A1/PVC/Al devuelve solo secciones ≥ 16mm²", () => {
      const sections = getAvailableSections("A1", "PVC", "Al");
      expect(sections.every(s => s >= 16)).toBe(true);
    });

    it("devuelve secciones ordenadas ascendentemente", () => {
      const sections = getAvailableSections("C", "XLPE", "Cu");
      for (let i = 1; i < sections.length; i++) {
        expect(sections[i]!).toBeGreaterThan(sections[i - 1]!);
      }
    });

  });

});

// ════════════════════════════════════════════════════════════════════════════
// SECCIÓN 3: Factores de corrección
// ════════════════════════════════════════════════════════════════════════════

describe("Factores de corrección", () => {

  describe("getCorrectionFactorCa — temperatura ambiente", () => {

    it("PVC / 40°C = 0.87 (temperatura base ITC-BT-19)", () => {
      expect(getCorrectionFactorCa("PVC", 40)).toBeCloseTo(0.87, 2);
    });

    it("XLPE / 40°C = 0.91", () => {
      expect(getCorrectionFactorCa("XLPE", 40)).toBeCloseTo(0.91, 2);
    });

    it("PVC / 25°C — interpolación", () => {
      // Entre 20°C (1.12) y 30°C (1.00): 25°C → 1.06
      expect(getCorrectionFactorCa("PVC", 25)).toBeCloseTo(1.06, 2);
    });

    it("Ca < 1 cuando temperatura > temperatura de referencia tabla", () => {
      const ca50 = getCorrectionFactorCa("PVC", 50);
      expect(ca50).toBeLessThan(1.0);
    });

    it("Ca > 1 cuando temperatura < temperatura de referencia tabla", () => {
      const ca20 = getCorrectionFactorCa("PVC", 20);
      expect(ca20).toBeGreaterThan(1.0);
    });

    it("nunca devuelve NaN", () => {
      expect(isNaN(getCorrectionFactorCa("PVC", 40))).toBe(false);
      expect(isNaN(getCorrectionFactorCa("XLPE", 90))).toBe(false);
    });

  });

  describe("getCorrectionFactorCg — agrupamiento", () => {

    it("1 circuito = 1.0", () => {
      expect(getCorrectionFactorCg(1, "B1")).toBe(1.0);
    });

    it("3 circuitos = 0.70", () => {
      expect(getCorrectionFactorCg(3, "B1")).toBe(0.70);
    });

    it("6 circuitos = 0.57", () => {
      expect(getCorrectionFactorCg(6, "C")).toBe(0.57);
    });

    it("método D siempre devuelve 1.0 (enterrados)", () => {
      expect(getCorrectionFactorCg(5, "D")).toBe(1.0);
      expect(getCorrectionFactorCg(20, "D")).toBe(1.0);
    });

    it("siempre < 1 para n > 1 en métodos no enterrados", () => {
      expect(getCorrectionFactorCg(2, "B1")).toBeLessThan(1.0);
      expect(getCorrectionFactorCg(10, "C")).toBeLessThan(1.0);
    });

  });

  describe("getCorrectionFactorCt — resistividad terreno", () => {

    it("2.5 K·m/W (referencia) = 1.0", () => {
      expect(getCorrectionFactorCt(2.5)).toBeCloseTo(1.0, 2);
    });

    it("1.0 K·m/W (suelo húmedo) > 1.0", () => {
      expect(getCorrectionFactorCt(1.0)).toBeGreaterThan(1.0);
    });

    it("4.0 K·m/W (suelo seco) < 1.0", () => {
      expect(getCorrectionFactorCt(4.0)).toBeLessThan(1.0);
    });

  });

  describe("getCorrectionFactors — combinado", () => {

    it("condiciones normales: combined ≈ Ca × Cg", () => {
      const result = getCorrectionFactors({
        insulationType: "PVC",
        ambientTempC: 40,
        groupingCircuits: 3,
        method: "B1",
      });
      expect(result.Ca).toBeCloseTo(0.87, 2);
      expect(result.Cg).toBeCloseTo(0.70, 2);
      expect(result.Ct).toBe(1.0);
      expect(result.combined).toBeCloseTo(result.Ca * result.Cg * result.Ct, 4);
    });

    it("enterrado con resistividad custom incluye Ct", () => {
      const result = getCorrectionFactors({
        insulationType: "XLPE",
        ambientTempC: 25,
        groupingCircuits: 1,
        method: "D",
        soilResistivityKmW: 1.0,
      });
      expect(result.Ct).toBeGreaterThan(1.0);
      expect(result.combined).toBeGreaterThan(1.0);
    });

    it("el resultado combined nunca es NaN ni negativo", () => {
      const result = getCorrectionFactors({
        insulationType: "PVC",
        ambientTempC: 35,
        groupingCircuits: 5,
        method: "C",
      });
      expect(isNaN(result.combined)).toBe(false);
      expect(result.combined).toBeGreaterThan(0);
    });

  });

});
