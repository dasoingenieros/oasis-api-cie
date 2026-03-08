/**
 * Tests: ITC-BT-18 — Puesta a tierra
 *
 * Cobertura:
 *   - MAX_CONTACT_VOLTAGE_V, ELECTRODE_TYPES, SOIL_RESISTIVITY_TABLE, EARTH_CONDUCTOR_SECTIONS
 *   - getMaxEarthResistance: dry, humid, outdoor
 *   - calcPikeResistance: validación, fórmula
 *   - getRequiredPikes
 */

import {
  MAX_CONTACT_VOLTAGE_V,
  ELECTRODE_TYPES,
  SOIL_RESISTIVITY_TABLE,
  EARTH_CONDUCTOR_SECTIONS,
  getMaxEarthResistance,
  calcPikeResistance,
  getRequiredPikes,
  type LocationType,
} from "../tables/itc-bt-18";

// ════════════════════════════════════════════════════════════════════════════
// Constantes
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-18 — Constantes", () => {
  it("MAX_CONTACT_VOLTAGE_V: dry 50V, humid/outdoor 24V", () => {
    expect(MAX_CONTACT_VOLTAGE_V.dry).toBe(50);
    expect(MAX_CONTACT_VOLTAGE_V.humid).toBe(24);
    expect(MAX_CONTACT_VOLTAGE_V.outdoor).toBe(24);
  });

  it("ELECTRODE_TYPES tiene pica, conductor, placa, anillo", () => {
    expect(ELECTRODE_TYPES.pica_vertical).toBeDefined();
    expect(ELECTRODE_TYPES.conductor_horizontal).toBeDefined();
    expect(ELECTRODE_TYPES.placa).toBeDefined();
    expect(ELECTRODE_TYPES.anillo).toBeDefined();
  });

  it("SOIL_RESISTIVITY_TABLE tiene entradas", () => {
    expect(SOIL_RESISTIVITY_TABLE.length).toBeGreaterThan(5);
  });

  it("EARTH_CONDUCTOR_SECTIONS tiene conductor principal y suplementario", () => {
    expect(EARTH_CONDUCTOR_SECTIONS.length).toBeGreaterThanOrEqual(4);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getMaxEarthResistance
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-18 — getMaxEarthResistance", () => {
  it("local seco 30mA: R ≤ 50/0.03 = 1666.67Ω", () => {
    const r = getMaxEarthResistance(0.03, "dry");
    expect(r.maxResistanceOhm).toBeCloseTo(1666.67, 1);
    expect(r.maxContactVoltageV).toBe(50);
  });

  it("local húmedo 30mA: R ≤ 24/0.03 = 800Ω", () => {
    const r = getMaxEarthResistance(0.03, "humid");
    expect(r.maxResistanceOhm).toBeCloseTo(800, 0);
    expect(r.maxContactVoltageV).toBe(24);
  });

  it("outdoor 30mA: R ≤ 800Ω", () => {
    const r = getMaxEarthResistance(0.03, "outdoor");
    expect(r.maxResistanceOhm).toBeCloseTo(800, 0);
  });

  it("formula contiene Uc e Id", () => {
    const r = getMaxEarthResistance(0.03, "dry");
    expect(r.formula).toContain("50");
    expect(r.formula).toContain("30");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// calcPikeResistance
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-18 — calcPikeResistance", () => {
  it("lanza error si pikeLengthM <= 0", () => {
    expect(() => calcPikeResistance(100, 0)).toThrow("Longitud de pica debe ser > 0");
    expect(() => calcPikeResistance(100, -1)).toThrow("Longitud de pica debe ser > 0");
  });

  it("R = ρ / L para ρ=100, L=2", () => {
    expect(calcPikeResistance(100, 2)).toBe(50);
  });

  it("R = ρ / L para ρ=300, L=3", () => {
    expect(calcPikeResistance(300, 3)).toBe(100);
  });

  it("L mayor reduce R", () => {
    expect(calcPikeResistance(200, 4)).toBeLessThan(calcPikeResistance(200, 2));
  });
});

// ════════════════════════════════════════════════════════════════════════════
// getRequiredPikes
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-18 — getRequiredPikes", () => {
  it("1 pica suficiente cuando R_pica ≤ R_objetivo", () => {
    expect(getRequiredPikes(50, 100)).toBe(1);
  });

  it("ceil(singlePike/target)", () => {
    expect(getRequiredPikes(100, 50)).toBe(2);
    expect(getRequiredPikes(150, 50)).toBe(3);
  });

  it("picas exactas", () => {
    expect(getRequiredPikes(100, 25)).toBe(4);
  });
});
