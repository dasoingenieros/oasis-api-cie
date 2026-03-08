"use strict";
/**
 * CÁLCULO DE SUMINISTRO PARA EDIFICIO MULTIVIVIENDA
 *
 * Integra: ITC-BT-10 (previsión cargas edificio) + ITC-BT-14 (LGA) +
 *          ITC-BT-15 (DI) + ITC-BT-17 (IGA + diferenciales)
 *
 * Para un edificio con múltiples viviendas, calcula:
 *   1. Previsión de cargas total del edificio (ITC-BT-10, coeficiente simultaneidad)
 *   2. LGA: sección + CdT ≤ 0.5% (ITC-BT-14)
 *   3. Por cada vivienda: DI + IGA + diferenciales (reutiliza calculateSupply)
 *
 * Opcionalmente incluye servicios generales y locales comerciales.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateBuildingSupply = calculateBuildingSupply;
const itc_bt_10_1 = require("../tables/itc-bt-10");
const itc_bt_14_1 = require("../tables/itc-bt-14");
const calculate_supply_1 = require("./calculate-supply");
// ─── Secciones normalizadas para LGA (Cu) ──────────────────
const LGA_SECTIONS_CU = [10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240];
const LGA_SECTIONS_AL = [16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300, 400];
// ─── Función principal ─────────────────────────────────────
/**
 * Calcula el suministro completo de un edificio multivivienda:
 * previsión de cargas + LGA + DI tipo.
 */
function calculateBuildingSupply(input) {
    const warnings = [];
    const cosφ = input.powerFactor ?? 0.9;
    const lgaPhase = input.lgaPhaseSystem ?? "three";
    const V = input.voltageV ?? (lgaPhase === "three" ? 400 : 230);
    // ─── 1. Previsión de cargas (ITC-BT-10) ───
    const powerPerDwelling = input.powerPerDwellingW
        ?? itc_bt_10_1.ELECTRIFICATION_GRADES[input.electrificationGrade].minPowerW;
    const buildingLoad = (0, itc_bt_10_1.calculateBuildingLoad)(input.nDwellings, powerPerDwelling);
    const dwellingsTotalW = buildingLoad.totalPowerW;
    // Cargas adicionales (servicios generales, locales, garaje)
    const additionalTotalW = (input.additionalLoads ?? [])
        .reduce((sum, l) => sum + l.powerW, 0);
    const buildingTotalW = dwellingsTotalW + additionalTotalW;
    // ─── 2. LGA (ITC-BT-14) ───
    const SQRT3 = Math.sqrt(3);
    const lgaCurrentA = lgaPhase === "three"
        ? buildingTotalW / (SQRT3 * V * cosφ)
        : buildingTotalW / (V * cosφ);
    // Sección mínima por tabla ITC-BT-14
    const tableEntry = itc_bt_14_1.LGA_SECTION_TABLE.find(e => e.maxCurrentA >= lgaCurrentA);
    const minSectionTableMm2 = input.lgaConductorMaterial === "Cu"
        ? (tableEntry?.sectionCuMm2 ?? 240)
        : (tableEntry?.sectionAlMm2 ?? 400);
    // Sección mínima absoluta según ITC-BT-14
    const absMinSection = input.lgaConductorMaterial === "Cu" ? 10 : 16;
    const effectiveMinTable = Math.max(minSectionTableMm2, absMinSection);
    // Sección mínima por CdT (probar secciones hasta cumplir ≤ 0.5%)
    const availableSections = input.lgaConductorMaterial === "Cu"
        ? LGA_SECTIONS_CU : LGA_SECTIONS_AL;
    let minSectionCdtMm2 = effectiveMinTable;
    if (input.lgaLengthM > 0) {
        for (const s of availableSections) {
            if (s < effectiveMinTable)
                continue;
            const cdtCheck = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
                totalPowerW: buildingTotalW,
                powerFactor: cosφ,
                phaseSystem: lgaPhase,
                conductorMaterial: input.lgaConductorMaterial,
                sectionMm2: s,
                lengthM: input.lgaLengthM,
                conductorTempC: input.lgaConductorTempC,
                voltageV: V,
            });
            if (cdtCheck.cdtCompliant) {
                minSectionCdtMm2 = s;
                break;
            }
        }
    }
    // Sección final LGA
    const autoLgaSection = Math.max(effectiveMinTable, minSectionCdtMm2);
    const lgaSection = input.lgaSectionMm2
        ? Math.max(input.lgaSectionMm2, autoLgaSection)
        : autoLgaSection;
    // Normalizar a sección comercial disponible
    const normalizedLgaSection = availableSections.find(s => s >= lgaSection)
        ?? availableSections[availableSections.length - 1];
    // CdT final con sección elegida
    const lgaCdtResult = (0, itc_bt_14_1.calculateLGAVoltageDrop)({
        totalPowerW: buildingTotalW,
        powerFactor: cosφ,
        phaseSystem: lgaPhase,
        conductorMaterial: input.lgaConductorMaterial,
        sectionMm2: normalizedLgaSection,
        lengthM: input.lgaLengthM,
        conductorTempC: input.lgaConductorTempC,
        voltageV: V,
    });
    if (!lgaCdtResult.cdtCompliant) {
        warnings.push(`LGA: CdT ${lgaCdtResult.voltageDropPct.toFixed(3)}% supera el 0.5% con sección ${normalizedLgaSection}mm². Revisar longitud o sección.`);
    }
    // Neutro
    const neutralSectionMm2 = (0, itc_bt_14_1.getNeutralSection)(normalizedLgaSection, input.lgaConductorMaterial);
    // Advertencias LGA
    warnings.push(...lgaCdtResult.warnings);
    if (!tableEntry) {
        warnings.push(`LGA: Intensidad ${lgaCurrentA.toFixed(1)}A supera la tabla ITC-BT-14 (máx 1000A). Revisar diseño.`);
    }
    // ─── 3. DI tipo (para una vivienda representativa) ───
    const diInput = {
        installationType: "residential",
        phaseSystem: "single", // DI de vivienda normalmente monofásica
        contractedPowerW: powerPerDwelling,
        surfaceM2: undefined,
        hasElectricHeating: input.electrificationGrade === "elevated",
        diConductorMaterial: input.diConductorMaterial,
        diLengthM: input.diLengthM,
        powerFactor: cosφ,
        circuitCodes: input.circuitCodes,
    };
    const dwellingSupply = (0, calculate_supply_1.calculateSupply)(diInput);
    warnings.push(...dwellingSupply.warnings.map(w => `DI: ${w}`));
    // ─── 4. Validación global ───
    const isValid = lgaCdtResult.cdtCompliant && dwellingSupply.isValid;
    return {
        loadForecast: {
            powerPerDwellingW: powerPerDwelling,
            simultaneityCoeff: buildingLoad.simultaneityCoeff,
            dwellingsTotalW,
            additionalTotalW,
            buildingTotalW,
        },
        lga: {
            sectionMm2: normalizedLgaSection,
            neutralSectionMm2,
            minSectionTableMm2: effectiveMinTable,
            minSectionCdtMm2,
            cdtResult: lgaCdtResult,
        },
        dwellingSupply,
        warnings,
        isValid,
    };
}
//# sourceMappingURL=calculate-building-supply.js.map