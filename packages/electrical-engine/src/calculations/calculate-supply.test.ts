/**
 * Tests para calculateSupply — Cálculo de suministro (IGA + DI + diferenciales)
 */
import { calculateSupply } from "./calculate-supply";
import type { SupplyInput } from "./calculate-supply";

describe("calculateSupply()", () => {
  // ─── Vivienda electrificación básica ──────────────────────

  describe("Vivienda electrificación básica (5.750W)", () => {
    const baseInput: SupplyInput = {
      installationType: "residential",
      phaseSystem: "single",
      diConductorMaterial: "Cu",
      diLengthM: 10,
      surfaceM2: 90,
      hasElectricHeating: false,
      hasAirConditioning: false,
    };

    it("determina grado básico y potencia 5.750W", () => {
      const r = calculateSupply(baseInput);
      expect(r.electrificationGrade).toBe("basic");
      expect(r.designPowerW).toBe(5750);
    });

    it("selecciona IGA 25A para 5.750W monofásico", () => {
      const r = calculateSupply(baseInput);
      expect(r.iga.ratingA).toBe(25);
    });

    it("selecciona sección DI ≥ 6mm² Cu", () => {
      const r = calculateSupply(baseInput);
      expect(r.di.sectionMm2).toBeGreaterThanOrEqual(6);
    });

    it("CdT DI cumple ≤ 1%", () => {
      const r = calculateSupply(baseInput);
      expect(r.di.cdtResult.cdtCompliant).toBe(true);
      expect(r.di.cdtResult.voltageDropPct).toBeLessThanOrEqual(1.0);
    });

    it("devuelve 2 diferenciales de 30mA", () => {
      const r = calculateSupply(baseInput);
      expect(r.differentials).toHaveLength(2);
      expect(r.differentials[0]!.sensitivityMa).toBe(30);
      expect(r.differentials[1]!.sensitivityMa).toBe(30);
    });

    it("conductor de protección PE correcto", () => {
      const r = calculateSupply(baseInput);
      // PE = fase si fase ≤ 16mm²
      expect(r.protectionConductorMm2).toBeGreaterThanOrEqual(6);
    });

    it("isValid = true para instalación correcta", () => {
      const r = calculateSupply(baseInput);
      expect(r.isValid).toBe(true);
    });
  });

  // ─── Vivienda electrificación elevada ─────────────────────

  describe("Vivienda electrificación elevada (9.200W)", () => {
    const input: SupplyInput = {
      installationType: "residential",
      phaseSystem: "single",
      diConductorMaterial: "Cu",
      diLengthM: 15,
      surfaceM2: 180, // > 160m² → elevada
      hasElectricHeating: false,
      hasAirConditioning: false,
    };

    it("determina grado elevado", () => {
      const r = calculateSupply(input);
      expect(r.electrificationGrade).toBe("elevated");
      expect(r.designPowerW).toBe(9200);
    });

    it("selecciona IGA 40A para 9.200W", () => {
      const r = calculateSupply(input);
      expect(r.iga.ratingA).toBe(40);
    });

    it("sección DI ≥ 10mm²", () => {
      const r = calculateSupply(input);
      expect(r.di.sectionMm2).toBeGreaterThanOrEqual(10);
    });
  });

  describe("Vivienda con calefacción eléctrica → elevada", () => {
    it("calefacción fuerza grado elevado", () => {
      const r = calculateSupply({
        installationType: "residential",
        phaseSystem: "single",
        diConductorMaterial: "Cu",
        diLengthM: 8,
        surfaceM2: 60, // Pequeña pero con calefacción
        hasElectricHeating: true,
        hasAirConditioning: false,
      });
      expect(r.electrificationGrade).toBe("elevated");
      expect(r.designPowerW).toBe(9200);
    });
  });

  // ─── Potencia explícita ───────────────────────────────────

  describe("Potencia contratada explícita", () => {
    it("usa potencia contratada si es mayor que mínima", () => {
      const r = calculateSupply({
        installationType: "residential",
        phaseSystem: "single",
        contractedPowerW: 11500,
        diConductorMaterial: "Cu",
        diLengthM: 12,
      });
      expect(r.designPowerW).toBe(11500);
      expect(r.iga.ratingA).toBe(50);
    });

    it("ajusta al mínimo si potencia contratada < mínima", () => {
      const r = calculateSupply({
        installationType: "residential",
        phaseSystem: "single",
        contractedPowerW: 3000, // < 5750
        diConductorMaterial: "Cu",
        diLengthM: 5,
      });
      expect(r.designPowerW).toBe(5750);
      expect(r.warnings.length).toBeGreaterThan(0);
    });
  });

  // ─── Trifásico ────────────────────────────────────────────

  describe("Suministro trifásico", () => {
    it("calcula IGA trifásico correctamente", () => {
      const r = calculateSupply({
        installationType: "commercial",
        phaseSystem: "three",
        contractedPowerW: 34641, // ~50A trifásico
        diConductorMaterial: "Cu",
        diLengthM: 20,
      });
      expect(r.iga.ratingA).toBe(50);
      expect(r.di.cdtResult.cdtCompliant).toBe(true);
    });
  });

  // ─── Aluminio ─────────────────────────────────────────────

  describe("Conductor aluminio", () => {
    it("selecciona sección Al correcta", () => {
      const r = calculateSupply({
        installationType: "residential",
        phaseSystem: "single",
        diConductorMaterial: "Al",
        diLengthM: 10,
      });
      expect(r.di.sectionMm2).toBeGreaterThanOrEqual(10); // Mínimo Al para básica
    });
  });

  // ─── DI larga → sección mayor por CdT ────────────────────

  describe("DI larga requiere sección mayor", () => {
    it("aumenta sección para cumplir CdT 1% en DI de 30m", () => {
      const rCorta = calculateSupply({
        installationType: "residential",
        phaseSystem: "single",
        diConductorMaterial: "Cu",
        diLengthM: 5,
      });
      const rLarga = calculateSupply({
        installationType: "residential",
        phaseSystem: "single",
        diConductorMaterial: "Cu",
        diLengthM: 30,
      });
      expect(rLarga.di.sectionMm2).toBeGreaterThanOrEqual(rCorta.di.sectionMm2);
      expect(rLarga.di.cdtResult.cdtCompliant).toBe(true);
    });
  });

  // ─── Comercial ────────────────────────────────────────────

  describe("Local comercial", () => {
    it("lanza error sin potencia contratada", () => {
      expect(() => calculateSupply({
        installationType: "commercial",
        phaseSystem: "single",
        diConductorMaterial: "Cu",
        diLengthM: 10,
      })).toThrow("contractedPowerW");
    });

    it("calcula correctamente con potencia explícita", () => {
      const r = calculateSupply({
        installationType: "commercial",
        phaseSystem: "single",
        contractedPowerW: 8050,
        diConductorMaterial: "Cu",
        diLengthM: 15,
      });
      expect(r.designPowerW).toBe(8050);
      expect(r.iga.ratingA).toBe(40); // 8050/230 = 35A → IGA 40A
      expect(r.isValid).toBe(true);
    });
  });

  // ─── Sección explícita del usuario ────────────────────────

  describe("Sección DI forzada por usuario", () => {
    it("respeta sección mayor del usuario", () => {
      const r = calculateSupply({
        installationType: "residential",
        phaseSystem: "single",
        diConductorMaterial: "Cu",
        diLengthM: 5,
        diSectionMm2: 25, // Usuario fuerza 25mm²
      });
      expect(r.di.sectionMm2).toBe(25);
    });

    it("ignora sección menor que la mínima requerida", () => {
      const r = calculateSupply({
        installationType: "residential",
        phaseSystem: "single",
        diConductorMaterial: "Cu",
        diLengthM: 5,
        diSectionMm2: 2.5, // Demasiado pequeña
      });
      expect(r.di.sectionMm2).toBeGreaterThanOrEqual(6);
    });
  });
});
