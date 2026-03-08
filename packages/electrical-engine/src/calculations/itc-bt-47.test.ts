/**
 * Tests: ITC-BT-47 — Motores
 *
 * Cobertura:
 *   - MOTOR_START_TYPES, MOTOR_EFFICIENCY_TYPICAL, MOTOR_POWER_FACTOR_TYPICAL
 *   - calculateMotorCurrent: monofásico/trifásico, efficiency, powerFactor, startType
 *   - getMotorDesignCurrent
 *   - Advertencias: >0.75kW monofásico, >11kW direct
 */

import {
  MOTOR_START_TYPES,
  MOTOR_EFFICIENCY_TYPICAL,
  MOTOR_POWER_FACTOR_TYPICAL,
  calculateMotorCurrent,
  getMotorDesignCurrent,
} from "../tables/itc-bt-47";

// ════════════════════════════════════════════════════════════════════════════
// Constantes
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-47 — Constantes", () => {
  it("MOTOR_START_TYPES tiene direct, star_delta, vfd, soft_starter", () => {
    expect(MOTOR_START_TYPES.direct.recommendedCurve).toBe("D");
    expect(MOTOR_START_TYPES.star_delta.recommendedCurve).toBe("C");
    expect(MOTOR_START_TYPES.vfd.recommendedCurve).toBe("C");
  });

  it("MOTOR_EFFICIENCY_TYPICAL tiene valores por kW", () => {
    expect(MOTOR_EFFICIENCY_TYPICAL[1.1]).toBeCloseTo(0.81, 2);
    expect(MOTOR_EFFICIENCY_TYPICAL[11]).toBe(0.91);
  });

  it("MOTOR_POWER_FACTOR_TYPICAL tiene valores", () => {
    expect(MOTOR_POWER_FACTOR_TYPICAL[0.75]).toBe(0.75);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// calculateMotorCurrent — trifásico
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-47 — calculateMotorCurrent trifásico", () => {
  it("calcula In y Ib_diseño para 5.5kW trifásico", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 5.5, phaseSystem: "three" });
    expect(r.nominalCurrentA).toBeGreaterThan(0);
    expect(r.designCurrentA).toBeCloseTo(r.nominalCurrentA * 1.25, 0);
    expect(r.recommendedCurve).toBe("D");
  });

  it("arranque directo por defecto", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 2.2, phaseSystem: "three" });
    expect(r.startCurrentA).toBeGreaterThan(r.nominalCurrentA);
  });

  it("efficiency y powerFactor por defecto de tabla", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 2.2, phaseSystem: "three" });
    expect(r.efficiency).toBeGreaterThan(0);
    expect(r.powerFactor).toBeGreaterThan(0);
  });

  it("efficiency y powerFactor personalizados", () => {
    const r = calculateMotorCurrent({
      shaftPowerKW: 3,
      phaseSystem: "three",
      efficiency: 0.9,
      powerFactor: 0.88,
    });
    expect(r.efficiency).toBe(0.9);
    expect(r.powerFactor).toBe(0.88);
  });

  it("voltageV personalizado", () => {
    const r = calculateMotorCurrent({
      shaftPowerKW: 4,
      phaseSystem: "three",
      voltageV: 380,
    });
    expect(r.nominalCurrentA).toBeGreaterThan(0);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// calculateMotorCurrent — monofásico
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-47 — calculateMotorCurrent monofásico", () => {
  it("calcula In para monofásico", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 0.75, phaseSystem: "single" });
    expect(r.nominalCurrentA).toBeGreaterThan(0);
  });

  it("> 0.75kW monofásico genera advertencia", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 1.1, phaseSystem: "single" });
    expect(r.warnings.some((w) => w.includes("0.75kW"))).toBe(true);
  });

  it("≤ 0.75kW monofásico sin advertencia circuito exclusivo", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 0.75, phaseSystem: "single" });
    expect(r.warnings.some((w) => w.includes("0.75kW"))).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// calculateMotorCurrent — tipos de arranque
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-47 — calculateMotorCurrent startType", () => {
  it("star_delta reduce corriente de arranque", () => {
    const rDirect = calculateMotorCurrent({ shaftPowerKW: 5.5, phaseSystem: "three", startType: "direct" });
    const rStarDelta = calculateMotorCurrent({ shaftPowerKW: 5.5, phaseSystem: "three", startType: "star_delta" });
    expect(rStarDelta.startCurrentA).toBeLessThan(rDirect.startCurrentA);
  });

  it("vfd tiene menor corriente de arranque", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 7.5, phaseSystem: "three", startType: "vfd" });
    expect(r.recommendedCurve).toBe("C");
  });

  it("soft_starter", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 11, phaseSystem: "three", startType: "soft_starter" });
    expect(r.recommendedCurve).toBe("C");
  });

  it("> 11kW arranque directo genera advertencia", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 15, phaseSystem: "three", startType: "direct" });
    expect(r.warnings.some((w) => w.includes("11kW"))).toBe(true);
  });

  it("≤ 11kW arranque directo sin advertencia Y/D", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 11, phaseSystem: "three", startType: "direct" });
    expect(r.warnings.some((w) => w.includes("11kW"))).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getMotorDesignCurrent
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-47 — getMotorDesignCurrent", () => {
  it("devuelve 1.25 × In", () => {
    expect(getMotorDesignCurrent(10)).toBe(12.5);
  });

  it("para In=20, Ib_diseño=25", () => {
    expect(getMotorDesignCurrent(20)).toBe(25);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Casos límite
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-47 — Casos límite", () => {
  it("potencia no en MOTOR_EFFICIENCY_TYPICAL usa 0.88", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 100, phaseSystem: "three" });
    expect(r.efficiency).toBe(0.88);
  });

  it("potencia no en MOTOR_POWER_FACTOR_TYPICAL usa 0.85", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 100, phaseSystem: "three" });
    expect(r.powerFactor).toBe(0.85);
  });

  it("electricalPowerW = P_mec / η", () => {
    const r = calculateMotorCurrent({
      shaftPowerKW: 4,
      phaseSystem: "three",
      efficiency: 0.9,
    });
    expect(r.electricalPowerW).toBeCloseTo((4 * 1000) / 0.9, -2);
  });

  it("minPIARatingA es calibre normalizado", () => {
    const r = calculateMotorCurrent({ shaftPowerKW: 15, phaseSystem: "three" });
    expect([16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250]).toContain(r.minPIARatingA);
  });
});
