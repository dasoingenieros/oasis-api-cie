/**
 * Tests: ITC-BT-17 — Dispositivos generales e individuales
 *
 * Cobertura:
 *   - IGA_RATINGS_A, DIFFERENTIAL_SENSITIVITIES_MA, CONTRACTED_POWERS_W
 *   - selectIGARating: monofásico/trifásico, powerFactor, voltageV
 *   - getRequiredDifferentials: phaseSystem, contractedPowerW, diffRating
 *   - getProtectionConductorSection: S≤16, 16<S≤35, S>35
 *   - verifyProtectionCoordination: cond1, cond2, I2factor
 */

import {
  IGA_RATINGS_A,
  DIFFERENTIAL_SENSITIVITIES_MA,
  CONTRACTED_POWERS_W,
  selectIGARating,
  getRequiredDifferentials,
  getProtectionConductorSection,
  verifyProtectionCoordination,
  type IGARating,
} from "../tables/itc-bt-17";

// ════════════════════════════════════════════════════════════════════════════
// Constantes
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-17 — Constantes", () => {
  it("IGA_RATINGS_A contiene calibres normalizados", () => {
    expect(IGA_RATINGS_A).toContain(25);
    expect(IGA_RATINGS_A).toContain(40);
    expect(IGA_RATINGS_A).toContain(63);
    expect(IGA_RATINGS_A).toContain(400);
  });

  it("DIFFERENTIAL_SENSITIVITIES_MA contiene 30 y 300", () => {
    expect(DIFFERENTIAL_SENSITIVITIES_MA).toContain(30);
    expect(DIFFERENTIAL_SENSITIVITIES_MA).toContain(300);
  });

  it("CONTRACTED_POWERS_W contiene 5750 y 9200", () => {
    expect(CONTRACTED_POWERS_W).toContain(5750);
    expect(CONTRACTED_POWERS_W).toContain(9200);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// selectIGARating
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-17 — selectIGARating", () => {
  it("monofásico 5750W → 25A", () => {
    const r = selectIGARating({ contractedPowerW: 5750, phaseSystem: "single" });
    expect(r.ratingA).toBe(25);
    expect(r.nominalCurrentA).toBeCloseTo(25, 0);
  });

  it("monofásico 9200W → 40A", () => {
    const r = selectIGARating({ contractedPowerW: 9200, phaseSystem: "single" });
    expect(r.ratingA).toBe(40);
  });

  it("monofásico con powerFactor < 1 aumenta In", () => {
    const r = selectIGARating({ contractedPowerW: 9200, phaseSystem: "single", powerFactor: 0.9 });
    expect(r.nominalCurrentA).toBeGreaterThan(40);
    expect(r.ratingA).toBe(50);
  });

  it("trifásico 34641W → 50A", () => {
    const r = selectIGARating({ contractedPowerW: 34641, phaseSystem: "three" });
    expect(r.ratingA).toBe(50);
  });

  it("trifásico 43301W → 63A", () => {
    const r = selectIGARating({ contractedPowerW: 43301, phaseSystem: "three" });
    expect(r.ratingA).toBe(63);
  });

  it("voltageV personalizado afecta In", () => {
    const r = selectIGARating({
      contractedPowerW: 4600,
      phaseSystem: "single",
      voltageV: 220,
    });
    expect(r.nominalCurrentA).toBeCloseTo(4600 / 220, 0);
  });

  it("potencia muy alta devuelve último calibre", () => {
    const r = selectIGARating({ contractedPowerW: 500000, phaseSystem: "three" });
    expect(r.ratingA).toBe(400);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getRequiredDifferentials
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-17 — getRequiredDifferentials", () => {
  it("devuelve 2 diferenciales para vivienda", () => {
    const r = getRequiredDifferentials({
      phaseSystem: "single",
      contractedPowerW: 5750,
      circuits: ["C1", "C2", "C3", "C5"],
    });
    expect(r).toHaveLength(2);
  });

  it("diferencial rating 40 para IGA ≤ 40", () => {
    const r = getRequiredDifferentials({
      phaseSystem: "single",
      contractedPowerW: 9200,
      circuits: ["C1"],
    });
    expect(r[0]?.ratingA).toBe(40);
    expect(r[0]?.sensitivityMa).toBe(30);
  });

  it("diferencial rating 63 para IGA > 40", () => {
    const r = getRequiredDifferentials({
      phaseSystem: "single",
      contractedPowerW: 20000,
      circuits: ["C1"],
    });
    expect(r[0]?.ratingA).toBe(63);
  });

  it("trifásico usa poles 4", () => {
    const r = getRequiredDifferentials({
      phaseSystem: "three",
      contractedPowerW: 34641,
      circuits: ["C1"],
    });
    expect(r[0]?.poles).toBe(4);
  });

  it("monofásico usa poles 2", () => {
    const r = getRequiredDifferentials({
      phaseSystem: "single",
      contractedPowerW: 5750,
      circuits: ["C1"],
    });
    expect(r[0]?.poles).toBe(2);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getProtectionConductorSection
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-17 — getProtectionConductorSection", () => {
  it("S ≤ 16: PE = S", () => {
    expect(getProtectionConductorSection(1.5)).toBe(1.5);
    expect(getProtectionConductorSection(6)).toBe(6);
    expect(getProtectionConductorSection(16)).toBe(16);
  });

  it("16 < S ≤ 35: PE = 16", () => {
    expect(getProtectionConductorSection(25)).toBe(16);
    expect(getProtectionConductorSection(35)).toBe(16);
  });

  it("S > 35: PE = S/2 redondeado", () => {
    expect(getProtectionConductorSection(50)).toBe(25);
    expect(getProtectionConductorSection(70)).toBe(35);
    expect(getProtectionConductorSection(95)).toBe(48);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// verifyProtectionCoordination
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-17 — verifyProtectionCoordination", () => {
  it("coordina cuando Ib ≤ In ≤ Iz e I2 ≤ 1.45×Iz", () => {
    const r = verifyProtectionCoordination({ Ib: 10, In: 16, Iz: 21 });
    expect(r.condition1.ok).toBe(true);
    expect(r.condition2.ok).toBe(true);
    expect(r.isCoordinated).toBe(true);
  });

  it("condición 1 falla si Ib > In", () => {
    const r = verifyProtectionCoordination({ Ib: 20, In: 16, Iz: 25 });
    expect(r.condition1.ok).toBe(false);
    expect(r.isCoordinated).toBe(false);
  });

  it("condición 1 falla si In > Iz", () => {
    const r = verifyProtectionCoordination({ Ib: 10, In: 25, Iz: 16 });
    expect(r.condition1.ok).toBe(false);
    expect(r.isCoordinated).toBe(false);
  });

  it("condición 2 falla si I2 > 1.45×Iz", () => {
    const r = verifyProtectionCoordination({ Ib: 5, In: 25, Iz: 20 });
    expect(r.condition2.ok).toBe(false);
    expect(r.isCoordinated).toBe(false);
  });

  it("I2factor personalizado", () => {
    const r = verifyProtectionCoordination({
      Ib: 10,
      In: 16,
      Iz: 25,
      I2factor: 2.0,
    });
    expect(r.condition2.I2).toBe(16 * 2);
  });

  it("I2factor por defecto 1.45", () => {
    const r = verifyProtectionCoordination({ Ib: 10, In: 20, Iz: 30 });
    expect(r.condition2.I2).toBeCloseTo(20 * 1.45, 0);
  });
});
