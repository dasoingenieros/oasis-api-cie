import { calculateBuildingSupply } from "./calculate-building-supply";
import type { BuildingSupplyInput } from "./calculate-building-supply";

describe("calculateBuildingSupply — Edificio multivivienda", () => {
  // ─── Helper ───
  const baseInput: BuildingSupplyInput = {
    nDwellings: 10,
    electrificationGrade: "basic",
    lgaConductorMaterial: "Cu",
    lgaLengthM: 15,
    diConductorMaterial: "Cu",
    diLengthM: 10,
  };

  // ─── 1. Previsión de cargas ───

  describe("Previsión de cargas (ITC-BT-10)", () => {
    it("10 viviendas básicas: coeff 7.38, total = 7.38 × 5750W", () => {
      const result = calculateBuildingSupply(baseInput);
      expect(result.loadForecast.powerPerDwellingW).toBe(5750);
      expect(result.loadForecast.simultaneityCoeff).toBe(7.38);
      expect(result.loadForecast.dwellingsTotalW).toBe(42435);
      expect(result.loadForecast.additionalTotalW).toBe(0);
      expect(result.loadForecast.buildingTotalW).toBe(42435);
    });

    it("20 viviendas elevadas: coeff 12.18, total = 12.18 × 9200W", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        nDwellings: 20,
        electrificationGrade: "elevated",
      });
      expect(result.loadForecast.powerPerDwellingW).toBe(9200);
      expect(result.loadForecast.simultaneityCoeff).toBe(12.18);
      expect(result.loadForecast.dwellingsTotalW).toBe(112056);
    });

    it("con cargas adicionales (servicios generales + local)", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        additionalLoads: [
          { name: "Servicios generales", powerW: 5000 },
          { name: "Local comercial PB", powerW: 10000 },
        ],
      });
      expect(result.loadForecast.additionalTotalW).toBe(15000);
      expect(result.loadForecast.buildingTotalW).toBe(42435 + 15000);
    });

    it("1 vivienda: coeff 1.0, potencia = potencia vivienda", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        nDwellings: 1,
      });
      expect(result.loadForecast.simultaneityCoeff).toBe(1.0);
      expect(result.loadForecast.dwellingsTotalW).toBe(5750);
    });

    it("potencia por vivienda personalizada", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        nDwellings: 5,
        powerPerDwellingW: 7000,
      });
      expect(result.loadForecast.powerPerDwellingW).toBe(7000);
      // coeff para 5 viviendas = 4.22
      expect(result.loadForecast.dwellingsTotalW).toBe(Math.round(4.22 * 7000));
    });
  });

  // ─── 2. LGA ───

  describe("LGA (ITC-BT-14)", () => {
    it("10 viviendas básicas: sección LGA ≥ 16mm² Cu", () => {
      const result = calculateBuildingSupply(baseInput);
      expect(result.lga.sectionMm2).toBeGreaterThanOrEqual(16);
    });

    it("CdT LGA ≤ 0.5%", () => {
      const result = calculateBuildingSupply(baseInput);
      expect(result.lga.cdtResult.cdtCompliant).toBe(true);
      expect(result.lga.cdtResult.voltageDropPct).toBeLessThanOrEqual(0.5);
    });

    it("neutro correcto para sección ≤ 16mm²: neutro = fase", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        nDwellings: 2, // Poca potencia → sección pequeña
      });
      if (result.lga.sectionMm2 <= 16) {
        expect(result.lga.neutralSectionMm2).toBe(result.lga.sectionMm2);
      }
    });

    it("neutro correcto para sección > 16mm²: neutro = fase/2, mín 16", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        nDwellings: 20,
        electrificationGrade: "elevated",
      });
      if (result.lga.sectionMm2 > 16) {
        expect(result.lga.neutralSectionMm2).toBeGreaterThanOrEqual(16);
        expect(result.lga.neutralSectionMm2).toBeLessThanOrEqual(result.lga.sectionMm2);
      }
    });

    it("LGA aluminio: sección mínima 16mm²", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        lgaConductorMaterial: "Al",
      });
      expect(result.lga.sectionMm2).toBeGreaterThanOrEqual(16);
    });

    it("LGA larga (50m): incrementa sección para cumplir CdT", () => {
      const shortResult = calculateBuildingSupply({ ...baseInput, lgaLengthM: 5 });
      const longResult = calculateBuildingSupply({ ...baseInput, lgaLengthM: 50 });
      expect(longResult.lga.sectionMm2).toBeGreaterThanOrEqual(shortResult.lga.sectionMm2);
      expect(longResult.lga.cdtResult.cdtCompliant).toBe(true);
    });

    it("usuario fuerza sección mayor → respeta", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        lgaSectionMm2: 95,
      });
      expect(result.lga.sectionMm2).toBeGreaterThanOrEqual(95);
    });

    it("edificio grande (30 viviendas elevadas): sección adecuada", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        nDwellings: 30,
        electrificationGrade: "elevated",
        lgaLengthM: 20,
      });
      expect(result.lga.sectionMm2).toBeGreaterThanOrEqual(50);
      expect(result.lga.cdtResult.cdtCompliant).toBe(true);
    });
  });

  // ─── 3. DI tipo ───

  describe("DI tipo vivienda", () => {
    it("vivienda básica: IGA 25A", () => {
      const result = calculateBuildingSupply(baseInput);
      expect(result.dwellingSupply.iga.ratingA).toBe(25);
    });

    it("vivienda elevada: IGA 40A", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        electrificationGrade: "elevated",
      });
      expect(result.dwellingSupply.iga.ratingA).toBe(40);
    });

    it("DI cumple CdT ≤ 1%", () => {
      const result = calculateBuildingSupply(baseInput);
      expect(result.dwellingSupply.di.cdtResult.cdtCompliant).toBe(true);
    });

    it("incluye diferenciales", () => {
      const result = calculateBuildingSupply(baseInput);
      expect(result.dwellingSupply.differentials.length).toBeGreaterThan(0);
    });

    it("incluye conductor PE", () => {
      const result = calculateBuildingSupply(baseInput);
      expect(result.dwellingSupply.protectionConductorMm2).toBeGreaterThan(0);
    });
  });

  // ─── 4. Validación global ───

  describe("Validación global", () => {
    it("edificio estándar: isValid = true", () => {
      const result = calculateBuildingSupply(baseInput);
      expect(result.isValid).toBe(true);
    });

    it("warnings vacíos en caso normal", () => {
      const result = calculateBuildingSupply(baseInput);
      // Puede haber warnings informativos, pero no de incumplimiento
      const criticalWarnings = result.warnings.filter(w =>
        w.includes("supera") || w.includes("inferior")
      );
      expect(criticalWarnings.length).toBe(0);
    });

    it("LGA con longitud extrema (200m): warning CdT si no cumple", () => {
      const result = calculateBuildingSupply({
        ...baseInput,
        nDwellings: 30,
        electrificationGrade: "elevated",
        lgaLengthM: 200,
        lgaSectionMm2: 16, // Forzar sección pequeña
      });
      // O cumple con sección grande, o tiene warning
      if (!result.lga.cdtResult.cdtCompliant) {
        expect(result.warnings.some(w => w.includes("LGA") && w.includes("CdT"))).toBe(true);
        expect(result.isValid).toBe(false);
      }
    });
  });
});
