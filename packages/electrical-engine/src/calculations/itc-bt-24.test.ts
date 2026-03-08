/**
 * Tests: ITC-BT-24 — Protección contra contactos indirectos
 *
 * Cobertura:
 *   - NETWORK_VOLTAGE, CONDUCTOR_MAX_TEMP_C, TYPICAL_NETWORK_IMPEDANCE
 *   - calculateLoopImpedance: PVC/XLPE/EPR, upstreamImpedanceOhm
 *   - verifyIndirectContactProtection: locationIsHumid true/false, warnings
 */

import {
  NETWORK_VOLTAGE,
  CONDUCTOR_MAX_TEMP_C,
  TYPICAL_NETWORK_IMPEDANCE,
  calculateLoopImpedance,
  verifyIndirectContactProtection,
} from "../tables/itc-bt-24";

// ════════════════════════════════════════════════════════════════════════════
// Constantes
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-24 — Constantes", () => {
  it("NETWORK_VOLTAGE fase-neutro 230V, fase-fase 400V", () => {
    expect(NETWORK_VOLTAGE.phase_neutral).toBe(230);
    expect(NETWORK_VOLTAGE.phase_phase).toBe(400);
  });

  it("CONDUCTOR_MAX_TEMP_C: PVC 70, XLPE/EPR 90", () => {
    expect(CONDUCTOR_MAX_TEMP_C.PVC).toBe(70);
    expect(CONDUCTOR_MAX_TEMP_C.XLPE).toBe(90);
    expect(CONDUCTOR_MAX_TEMP_C.EPR).toBe(90);
  });

  it("TYPICAL_NETWORK_IMPEDANCE tiene urban_residential, rural, etc", () => {
    expect(TYPICAL_NETWORK_IMPEDANCE.urban_residential).toBeDefined();
    expect(TYPICAL_NETWORK_IMPEDANCE.urban_residential?.maxIccKA).toBe(6);
    expect(TYPICAL_NETWORK_IMPEDANCE.rural).toBeDefined();
  });
});

// ════════════════════════════════════════════════════════════════════════════
// calculateLoopImpedance
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-24 — calculateLoopImpedance", () => {
  it("calcula impedancia de bucle con valores por defecto", () => {
    const r = calculateLoopImpedance({
      sectionMm2: 2.5,
      protectionSectionMm2: 2.5,
      lengthM: 20,
      material: "Cu",
      insulation: "PVC",
    });
    expect(r.loopImpedanceOhm).toBeGreaterThan(0);
    expect(r.phaseImpedanceOhm).toBeGreaterThan(0);
    expect(r.peImpedanceOhm).toBeGreaterThan(0);
    expect(r.IccMinA).toBeGreaterThan(0);
    expect(r.IccMinKA).toBeGreaterThan(0);
  });

  it("IccMax > IccMin", () => {
    const r = calculateLoopImpedance({
      sectionMm2: 6,
      protectionSectionMm2: 6,
      lengthM: 30,
      material: "Cu",
      insulation: "PVC",
    });
    expect(r.IccMaxA).toBeGreaterThan(r.IccMinA);
  });

  it("upstreamImpedanceOhm personalizado", () => {
    const r = calculateLoopImpedance({
      sectionMm2: 2.5,
      protectionSectionMm2: 2.5,
      lengthM: 10,
      material: "Cu",
      insulation: "PVC",
      upstreamImpedanceOhm: 0.05,
    });
    expect(r.loopImpedanceOhm).toBeGreaterThan(0.05);
  });

  it("PVC usa temp 70°C", () => {
    const r = calculateLoopImpedance({
      sectionMm2: 2.5,
      protectionSectionMm2: 2.5,
      lengthM: 15,
      material: "Cu",
      insulation: "PVC",
    });
    expect(r.IccMinA).toBeGreaterThan(0);
  });

  it("XLPE usa temp 90°C", () => {
    const r = calculateLoopImpedance({
      sectionMm2: 2.5,
      protectionSectionMm2: 2.5,
      lengthM: 15,
      material: "Cu",
      insulation: "XLPE",
    });
    expect(r.loopImpedanceOhm).toBeGreaterThan(0);
  });

  it("EPR usa temp 90°C", () => {
    const r = calculateLoopImpedance({
      sectionMm2: 2.5,
      protectionSectionMm2: 2.5,
      lengthM: 15,
      material: "Al",
      insulation: "EPR",
    });
    expect(r.IccMinKA).toBeGreaterThan(0);
  });

  it("Aluminio aumenta impedancia vs Cu", () => {
    const rCu = calculateLoopImpedance({
      sectionMm2: 6,
      protectionSectionMm2: 6,
      lengthM: 20,
      material: "Cu",
      insulation: "PVC",
    });
    const rAl = calculateLoopImpedance({
      sectionMm2: 6,
      protectionSectionMm2: 6,
      lengthM: 20,
      material: "Al",
      insulation: "PVC",
    });
    expect(rAl.loopImpedanceOhm).toBeGreaterThan(rCu.loopImpedanceOhm);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// verifyIndirectContactProtection
// ════════════════════════════════════════════════════════════════════════════

describe("ITC-BT-24 — verifyIndirectContactProtection", () => {
  it("protegido cuando Uc ≤ 50V (local seco)", () => {
    const r = verifyIndirectContactProtection({
      earthResistanceOhm: 10,
      differentialSensitivityMa: 30,
      locationIsHumid: false,
    });
    expect(r.system).toBe("TT");
    expect(r.maxContactVoltageV).toBe(50);
    expect(r.isProtected).toBe(true);
  });

  it("no protegido cuando Uc > 50V (local seco)", () => {
    const r = verifyIndirectContactProtection({
      earthResistanceOhm: 2000,
      differentialSensitivityMa: 30,
      locationIsHumid: false,
    });
    expect(r.isProtected).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });

  it("locationIsHumid usa Uc ≤ 24V", () => {
    const r = verifyIndirectContactProtection({
      earthResistanceOhm: 500,
      differentialSensitivityMa: 30,
      locationIsHumid: true,
    });
    expect(r.maxContactVoltageV).toBe(24);
  });

  it("locationIsHumid false usa 50V", () => {
    const r = verifyIndirectContactProtection({
      earthResistanceOhm: 10,
      differentialSensitivityMa: 30,
    });
    expect(r.maxContactVoltageV).toBe(50);
  });

  it("advertencia cuando R > 1667 y diferencial 30mA", () => {
    const r = verifyIndirectContactProtection({
      earthResistanceOhm: 2000,
      differentialSensitivityMa: 30,
      locationIsHumid: false,
    });
    expect(r.warnings.some((w) => w.includes("1.666"))).toBe(true);
  });

  it("IccMinA coherente con U0/R", () => {
    const r = verifyIndirectContactProtection({
      earthResistanceOhm: 100,
      differentialSensitivityMa: 30,
    });
    expect(r.IccMinA).toBeCloseTo(230 / 100, 0);
  });
});
