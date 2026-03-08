/**
 * Tests de humo: verifica que todas las exportaciones del motor existen.
 * El index.ts es el punto de entrada único del paquete.
 */

import * as engine from "./index";

describe("index — smoke tests (exportaciones)", () => {
  const FUNCIONES_MOTOR = [
    "calculateNominalCurrent",
    "selectSection",
    "generateJustification",
    "calculateCircuit",
    "calculateInstallation",
  ] as const;

  it("exporta las 5 funciones principales del motor", () => {
    for (const name of FUNCIONES_MOTOR) {
      expect(engine[name]).toBeDefined();
      expect(typeof engine[name]).toBe("function");
    }
  });

  it("ENGINE_VERSION es 1.0.0", () => {
    expect(engine.ENGINE_VERSION).toBe("1.0.0");
  });

  it("NORM_VERSION está definido", () => {
    expect(engine.NORM_VERSION).toBeDefined();
    expect(typeof engine.NORM_VERSION).toBe("string");
  });

  it("EngineError es una clase", () => {
    expect(engine.EngineError).toBeDefined();
    expect(typeof engine.EngineError).toBe("function");
  });

  it("exporta funciones de tablas necesarias para el motor", () => {
    expect(typeof engine.getAdmissibleCurrent).toBe("function");
    expect(typeof engine.getCorrectionFactorCa).toBe("function");
    expect(typeof engine.getCircuitTemplate).toBe("function");
    expect(typeof engine.calculateVoltageDrop).toBe("function");
    expect(typeof engine.selectPIA).toBe("function");
    expect(typeof engine.getMinTubeDiameter).toBe("function");
  });

  it("exporta constantes NORMALIZED_SECTIONS_MM2 y NORMALIZED_BREAKER_RATINGS", () => {
    expect(Array.isArray(engine.NORMALIZED_SECTIONS_MM2)).toBe(true);
    expect(Array.isArray(engine.NORMALIZED_BREAKER_RATINGS)).toBe(true);
  });
});
