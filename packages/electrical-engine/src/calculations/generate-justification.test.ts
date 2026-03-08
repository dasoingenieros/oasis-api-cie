/**
 * Tests: generateJustification() — memoria técnica paso a paso
 *
 * Cobertura:
 *   - Monofásico y trifásico
 *   - Criterios térmico, CdT, ITC-BT-25
 *   - Circuitos C1, C3, CUSTOM
 *   - Nunca pasos vacíos
 */

import { selectSection } from "./select-section";
import { generateJustification } from "./generate-justification";
import type { CircuitInput } from "../types";

function makeCircuitInput(overrides: Partial<CircuitInput> = {}): CircuitInput {
  return {
    id: "test-1",
    label: "Test",
    code: "C1",
    phaseSystem: "single",
    loadPowerW: 2300,
    powerFactor: 1.0,
    simultaneityFactor: 1.0,
    loadFactor: 1.0,
    conductorMaterial: "Cu",
    insulationType: "PVC",
    installationMethod: "B1",
    lengthM: 10,
    ambientTempC: 40,
    groupingCircuits: 1,
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// Estructura básica
// ════════════════════════════════════════════════════════════════════════════

describe("generateJustification", () => {
  it("nunca devuelve array vacío", () => {
    const input = makeCircuitInput();
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);
    expect(steps.length).toBeGreaterThan(0);
  });

  it("cada paso tiene step, concept, formula, values, result, normRef", () => {
    const input = makeCircuitInput();
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    for (const s of steps) {
      expect(typeof s.step).toBe("number");
      expect(typeof s.concept).toBe("string");
      expect(s.concept.length).toBeGreaterThan(0);
      expect(typeof s.formula).toBe("string");
      expect(s.formula.length).toBeGreaterThan(0);
      expect(s.values).toBeDefined();
      expect(typeof s.values).toBe("object");
      expect(s.result).toBeDefined();
      expect(typeof s.normRef).toBe("string");
      expect(s.normRef.length).toBeGreaterThan(0);
    }
  });

  it("pasos numerados secuencialmente", () => {
    const input = makeCircuitInput();
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    for (let i = 0; i < steps.length; i++) {
      expect(steps[i]?.step).toBe(i + 1);
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Contenido de pasos
// ════════════════════════════════════════════════════════════════════════════

describe("generateJustification — pasos de cálculo", () => {
  it("paso 1: potencia efectiva con P_ef = P × Ks × Fu", () => {
    const input = makeCircuitInput({
      loadPowerW: 3000,
      simultaneityFactor: 0.8,
      loadFactor: 0.9,
    });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const step1 = steps.find((s) => s.step === 1);
    expect(step1).toBeDefined();
    expect(step1?.concept).toMatch(/potencia efectiva/i);
    expect(step1?.formula).toMatch(/Ks.*Fu/);
    expect(step1?.values.P_instalada).toBe(3000);
    expect(step1?.values.Ks).toBe(0.8);
    expect(step1?.values.Fu).toBe(0.9);
    expect(step1?.result).toBe(2160); // 3000 * 0.8 * 0.9
    expect(step1?.normRef).toMatch(/ITC-BT-19/);
  });

  it("paso 2: intensidad nominal monofásica", () => {
    const input = makeCircuitInput({ loadPowerW: 2300 });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const step2 = steps.find((s) => s.step === 2);
    expect(step2).toBeDefined();
    expect(step2?.concept).toMatch(/intensidad nominal/i);
    expect(step2?.formula).toMatch(/V × cosφ/);
    expect(step2?.result).toBe(10);
    expect(step2?.normRef).toMatch(/ITC-BT-19/);
  });

  it("usa voltageV personalizado cuando se proporciona", () => {
    const input = makeCircuitInput({ voltageV: 220, loadPowerW: 2200 });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);
    const step2 = steps.find((s) => s.step === 2);
    expect(step2?.values.V).toBe(220);
  });

  it("paso 2: intensidad nominal trifásica", () => {
    const input = makeCircuitInput({
      phaseSystem: "three",
      loadPowerW: 18000,
      powerFactor: 0.9,
    });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const step2 = steps.find((s) => s.step === 2);
    expect(step2).toBeDefined();
    expect(step2?.formula).toMatch(/√3/);
    expect(step2?.normRef).toMatch(/ITC-BT-19/);
  });

  it("pasos 3–5: factores de corrección Ca, Cg, combinado", () => {
    const input = makeCircuitInput({
      ambientTempC: 40,
      groupingCircuits: 3,
    });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const step3 = steps.find((s) => s.step === 3);
    expect(step3?.concept).toMatch(/temperatura|Ca/i);
    expect(step3?.normRef).toMatch(/ITC-BT-19 Tabla 3/);

    const step4 = steps.find((s) => s.step === 4);
    expect(step4?.concept).toMatch(/agrupamiento|Cg/i);
    expect(step4?.normRef).toMatch(/ITC-BT-19 Tabla 4/);

    const step5 = steps.find((s) => s.step === 5);
    expect(step5?.concept).toMatch(/combinado|Ca × Cg/i);
  });

  it("paso 6: criterio térmico con Iz e In", () => {
    const input = makeCircuitInput({ loadPowerW: 2300 });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const step6 = steps.find((s) => s.step === 6);
    expect(step6).toBeDefined();
    expect(step6?.concept).toMatch(/térmico/i);
    expect(step6?.formula).toMatch(/Iz.*In/);
    expect(step6?.values.In).toBe(10);
    expect(step6?.result).toMatch(/mm²/);
    expect(step6?.normRef).toMatch(/ITC-BT-19 Tabla 1/);
  });

  it("paso 7: criterio caída de tensión", () => {
    const input = makeCircuitInput({ code: "C1", lengthM: 30 });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const step7 = steps.find((s) => s.step === 7);
    expect(step7).toBeDefined();
    expect(step7?.concept).toMatch(/caída de tensión/i);
    expect(step7?.normRef).toMatch(/ITC-BT-19 §2.2/);
    expect(step7?.normRef).toMatch(/3%|5%/);
    expect(step7?.values.limite_pct).toBeDefined();
  });

  it("paso 8: criterio ITC-BT-25 cuando circuito tiene código", () => {
    const input = makeCircuitInput({ code: "C3" });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const step8 = steps.find((s) => s.step === 8);
    expect(step8).toBeDefined();
    expect(step8?.concept).toMatch(/ITC-BT-25/i);
    expect(step8?.values.circuito).toBe("C3");
    expect(step8?.normRef).toMatch(/ITC-BT-25/);
  });

  it("no incluye paso ITC-BT-25 para CUSTOM", () => {
    const input = makeCircuitInput({ code: "CUSTOM" });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const stepItc25 = steps.find((s) => s.concept.includes("ITC-BT-25") && s.step === 8);
    expect(stepItc25).toBeUndefined();
  });

  it("paso final: sección elegida y criterio determinante", () => {
    const input = makeCircuitInput();
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const lastStep = steps[steps.length - 1];
    expect(lastStep).toBeDefined();
    expect(lastStep?.concept).toMatch(/sección final|elegida/i);
    expect(lastStep?.formula).toMatch(/max\(/);
    expect(lastStep?.values.criterio_determinante).toBeDefined();
    expect(lastStep?.result).toMatch(/mm²/);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Circuitos variados
// ════════════════════════════════════════════════════════════════════════════

describe("generateJustification — circuitos variados", () => {
  it("C1 alumbrado: límite 3% CdT", () => {
    const input = makeCircuitInput({ code: "C1" });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);
    const step7 = steps.find((s) => s.step === 7);
    expect(step7?.values.limite_pct).toBe(3);
  });

  it("C2 TC general: límite 5% CdT", () => {
    const input = makeCircuitInput({ code: "C2" });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);
    const step7 = steps.find((s) => s.step === 7);
    expect(step7?.values.limite_pct).toBe(5);
  });

  it("C3 cocina: incluye paso ITC-BT-25 con S_min 6mm²", () => {
    const input = makeCircuitInput({ code: "C3", loadPowerW: 1000 });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);
    const step8 = steps.find((s) => s.step === 8);
    expect(step8?.values.S_min).toBe(6);
  });

  it("aluminio: valores correctos en los pasos", () => {
    const input = makeCircuitInput({
      conductorMaterial: "Al",
      loadPowerW: 5000,
    });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);
    expect(steps.length).toBeGreaterThan(0);
    const step6 = steps.find((s) => s.step === 6);
    expect(step6?.values.S_térmica).toBeGreaterThanOrEqual(16);
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Referencias normativas
// ════════════════════════════════════════════════════════════════════════════

describe("generateJustification — referencias normativas", () => {
  it("todos los pasos incluyen normRef no vacía", () => {
    const input = makeCircuitInput();
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    for (const s of steps) {
      expect(s.normRef.length).toBeGreaterThan(0);
      expect(s.normRef).not.toMatch(/^\s*$/);
    }
  });

  it("cita ITC-BT-19 en potencia e intensidad", () => {
    const input = makeCircuitInput();
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const refs = steps.map((s) => s.normRef).join(" ");
    expect(refs).toMatch(/ITC-BT-19/);
  });

  it("C11 domótica: límite 3% (alumbrado)", () => {
    const input = makeCircuitInput({ code: "C11" });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);
    const step7 = steps.find((s) => s.step === 7);
    expect(step7?.values.limite_pct).toBe(3);
  });

  it("cita ITC-BT-25 cuando circuito tiene código", () => {
    const input = makeCircuitInput({ code: "C2" });
    const selectResult = selectSection(input);
    const steps = generateJustification(input, selectResult);

    const refs = steps.map((s) => s.normRef).join(" ");
    expect(refs).toMatch(/ITC-BT-25/);
  });
});
