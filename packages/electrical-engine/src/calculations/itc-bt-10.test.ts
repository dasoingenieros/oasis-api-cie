/**
 * Tests: ITC-BT-10 — Previsión de cargas
 *
 * Cobertura:
 *   - ELECTRIFICATION_GRADES, LOAD_DENSITY_TABLE, SIMULTANEITY_COEFFICIENT_RESIDENTIAL
 *   - calculateBuildingLoad: validación, 1-40 viviendas, > 40 viviendas
 *   - determineElectrificationGrade: básica vs elevada
 *   - calculateCommercialLoad: todos los usos, minLoadW
 */

import {
  ELECTRIFICATION_GRADES,
  LOAD_DENSITY_TABLE,
  SIMULTANEITY_COEFFICIENT_RESIDENTIAL,
  calculateBuildingLoad,
  determineElectrificationGrade,
  calculateCommercialLoad,
  type ElectrificationGrade,
  type BuildingUse,
} from "../tables/itc-bt-10";

// ════════════════════════════════════════════════════════════════════════════
// Constantes y tablas
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-10 — Constantes", () => {
  it("ELECTRIFICATION_GRADES tiene basic y elevated", () => {
    expect(ELECTRIFICATION_GRADES.basic.grade).toBe("basic");
    expect(ELECTRIFICATION_GRADES.basic.minPowerW).toBe(5750);
    expect(ELECTRIFICATION_GRADES.basic.minSectionMm2).toBe(6);
    expect(ELECTRIFICATION_GRADES.elevated.grade).toBe("elevated");
    expect(ELECTRIFICATION_GRADES.elevated.minPowerW).toBe(9200);
    expect(ELECTRIFICATION_GRADES.elevated.minSectionMm2).toBe(10);
  });

  it("LOAD_DENSITY_TABLE tiene todos los tipos de local", () => {
    const uses: BuildingUse[] = [
      "residential", "commercial", "office", "hotel", "hospital",
      "school", "parking", "industrial_light", "industrial_heavy",
    ];
    for (const u of uses) {
      expect(LOAD_DENSITY_TABLE[u]).toBeDefined();
      expect(LOAD_DENSITY_TABLE[u]!.loadDensityWm2).toBeGreaterThanOrEqual(0);
    }
  });

  it("residential tiene loadDensityWm2 = 0 (se calcula por grado)", () => {
    expect(LOAD_DENSITY_TABLE.residential.loadDensityWm2).toBe(0);
  });

  it("commercial y office tienen minLoadW", () => {
    expect(LOAD_DENSITY_TABLE.commercial.minLoadW).toBe(3450);
    expect(LOAD_DENSITY_TABLE.office.minLoadW).toBe(3450);
  });

  it("SIMULTANEITY_COEFFICIENT_RESIDENTIAL para 1-40 viviendas", () => {
    expect(SIMULTANEITY_COEFFICIENT_RESIDENTIAL[1]).toBe(1);
    expect(SIMULTANEITY_COEFFICIENT_RESIDENTIAL[2]).toBe(2);
    expect(SIMULTANEITY_COEFFICIENT_RESIDENTIAL[10]).toBe(7.38);
    expect(SIMULTANEITY_COEFFICIENT_RESIDENTIAL[20]).toBe(12.18);
    expect(SIMULTANEITY_COEFFICIENT_RESIDENTIAL[40]).toBe(15.8);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// calculateBuildingLoad
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-10 — calculateBuildingLoad", () => {
  it("lanza error si nDwellings <= 0", () => {
    expect(() => calculateBuildingLoad(0, 5750)).toThrow("número de viviendas debe ser > 0");
    expect(() => calculateBuildingLoad(-1, 5750)).toThrow("número de viviendas debe ser > 0");
  });

  it("lanza error si potencia por vivienda < 5750", () => {
    expect(() => calculateBuildingLoad(5, 5700)).toThrow("Potencia por vivienda mínima 5.750W");
    expect(() => calculateBuildingLoad(1, 1000)).toThrow("Potencia por vivienda mínima 5.750W");
  });

  it("1 vivienda: coeff = 1, total = powerPerDwelling", () => {
    const r = calculateBuildingLoad(1, 5750);
    expect(r.simultaneityCoeff).toBe(1);
    expect(r.totalPowerW).toBe(5750);
  });

  it("2 viviendas: coeff = 2", () => {
    const r = calculateBuildingLoad(2, 9200);
    expect(r.simultaneityCoeff).toBe(2);
    expect(r.totalPowerW).toBe(18400);
  });

  it("10 viviendas con electrificación básica", () => {
    const r = calculateBuildingLoad(10, 5750);
    expect(r.simultaneityCoeff).toBe(7.38);
    expect(r.totalPowerW).toBe(Math.round(7.38 * 5750));
  });

  it("40 viviendas: coeff = 15.80", () => {
    const r = calculateBuildingLoad(40, 5750);
    expect(r.simultaneityCoeff).toBe(15.8);
    expect(r.totalPowerW).toBe(Math.round(15.8 * 5750));
  });

  it("> 40 viviendas usa coeff 15.80 constante", () => {
    const r = calculateBuildingLoad(100, 5750);
    expect(r.simultaneityCoeff).toBe(15.8);
    expect(r.totalPowerW).toBe(Math.round(15.8 * 5750));
  });

  it("powerPerDwellingW se devuelve en el resultado", () => {
    const r = calculateBuildingLoad(5, 9200);
    expect(r.powerPerDwellingW).toBe(9200);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// determineElectrificationGrade
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-10 — determineElectrificationGrade", () => {
  it("superficie > 160m² → elevated", () => {
    expect(determineElectrificationGrade({ surfaceM2: 161, hasElectricHeating: false, hasAirConditioning: false })).toBe("elevated");
  });

  it("con calefacción eléctrica → elevated", () => {
    expect(determineElectrificationGrade({ surfaceM2: 50, hasElectricHeating: true, hasAirConditioning: false })).toBe("elevated");
  });

  it("con aire acondicionado → elevated", () => {
    expect(determineElectrificationGrade({ surfaceM2: 50, hasElectricHeating: false, hasAirConditioning: true })).toBe("elevated");
  });

  it("vivienda pequeña sin extras → basic", () => {
    expect(determineElectrificationGrade({ surfaceM2: 100, hasElectricHeating: false, hasAirConditioning: false })).toBe("basic");
  });

  it("exactamente 160m² sin extras → basic", () => {
    expect(determineElectrificationGrade({ surfaceM2: 160, hasElectricHeating: false, hasAirConditioning: false })).toBe("basic");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// calculateCommercialLoad
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-10 — calculateCommercialLoad", () => {
  it("commercial: densidad × superficie, con mínimo", () => {
    const r = calculateCommercialLoad("commercial", 50);
    expect(r.loadDensityWm2).toBe(100);
    expect(r.totalPowerW).toBe(Math.max(100 * 50, 3450));
  });

  it("commercial: superficie pequeña usa minLoadW", () => {
    const r = calculateCommercialLoad("commercial", 10);
    expect(r.totalPowerW).toBe(3450);
  });

  it("office: densidad 80 W/m²", () => {
    const r = calculateCommercialLoad("office", 100);
    expect(r.loadDensityWm2).toBe(80);
    expect(r.totalPowerW).toBe(Math.max(80 * 100, 3450));
  });

  it("hotel: sin minLoadW", () => {
    const r = calculateCommercialLoad("hotel", 50);
    expect(r.totalPowerW).toBe(100 * 50);
  });

  it("hospital: alta densidad", () => {
    const r = calculateCommercialLoad("hospital", 100);
    expect(r.totalPowerW).toBe(1500 * 100);
  });

  it("school: 50 W/m²", () => {
    const r = calculateCommercialLoad("school", 200);
    expect(r.totalPowerW).toBe(50 * 200);
  });

  it("parking: 10 W/m²", () => {
    const r = calculateCommercialLoad("parking", 500);
    expect(r.totalPowerW).toBe(10 * 500);
  });

  it("industrial_light: 125 W/m²", () => {
    const r = calculateCommercialLoad("industrial_light", 100);
    expect(r.totalPowerW).toBe(125 * 100);
  });

  it("industrial_heavy: 250 W/m²", () => {
    const r = calculateCommercialLoad("industrial_heavy", 80);
    expect(r.totalPowerW).toBe(250 * 80);
  });
});
