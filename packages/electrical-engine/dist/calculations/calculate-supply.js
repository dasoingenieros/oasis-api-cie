"use strict";
/**
 * CÁLCULO DE SUMINISTRO — Tramo de enlace para instalación individual
 *
 * Integra: ITC-BT-10 (previsión cargas) + ITC-BT-15 (DI) + ITC-BT-17 (IGA + diferenciales)
 *
 * Para una instalación individual (vivienda o local), calcula:
 *   1. Potencia prevista y grado de electrificación
 *   2. IGA (calibre)
 *   3. Derivación Individual (sección, CdT)
 *   4. Diferenciales requeridos
 *   5. Conductor de protección
 *
 * NO calcula LGA (eso es para edificios con múltiples viviendas).
 * La LGA se calcula aparte con calculateLGAVoltageDrop() si es edificio.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateSupply = calculateSupply;
const itc_bt_17_1 = require("../tables/itc-bt-17");
const itc_bt_15_1 = require("../tables/itc-bt-15");
const itc_bt_10_1 = require("../tables/itc-bt-10");
const types_1 = require("../types");
// ─── Función principal ─────────────────────────────────────
/**
 * Calcula el suministro completo de una instalación individual.
 */
function calculateSupply(input) {
    const warnings = [];
    const cosφ = input.powerFactor ?? 0.9;
    // 1. Determinar potencia de diseño
    let designPowerW;
    let electrificationGrade;
    if (input.contractedPowerW && input.contractedPowerW > 0) {
        // Potencia explícita
        designPowerW = input.contractedPowerW;
        // Aún así determinamos grado para viviendas
        if (input.installationType === "residential") {
            electrificationGrade = (0, itc_bt_10_1.determineElectrificationGrade)({
                surfaceM2: input.surfaceM2 ?? 90,
                hasElectricHeating: input.hasElectricHeating ?? false,
                hasAirConditioning: input.hasAirConditioning ?? false,
            });
            const minPower = itc_bt_10_1.ELECTRIFICATION_GRADES[electrificationGrade].minPowerW;
            if (designPowerW < minPower) {
                warnings.push(`Potencia contratada ${designPowerW}W inferior al mínimo para electrificación ${electrificationGrade}: ${minPower}W. Se usa ${minPower}W.`);
                designPowerW = minPower;
            }
        }
    }
    else if (input.installationType === "residential") {
        // Calcular por grado electrificación
        electrificationGrade = (0, itc_bt_10_1.determineElectrificationGrade)({
            surfaceM2: input.surfaceM2 ?? 90,
            hasElectricHeating: input.hasElectricHeating ?? false,
            hasAirConditioning: input.hasAirConditioning ?? false,
        });
        designPowerW = itc_bt_10_1.ELECTRIFICATION_GRADES[electrificationGrade].minPowerW;
    }
    else {
        // Comercial sin potencia → error
        throw new Error("SUPPLY: Para instalaciones comerciales se requiere contractedPowerW.");
    }
    // 2. IGA
    const iga = (0, itc_bt_17_1.selectIGARating)({
        contractedPowerW: designPowerW,
        phaseSystem: input.phaseSystem,
        powerFactor: 1.0, // IGA se calcula con cosφ=1 (potencia aparente de contrato)
    });
    // 3. Derivación Individual — buscar sección mínima
    const V = input.voltageV ?? (input.phaseSystem === "three" ? 400 : 230);
    const SQRT3 = Math.sqrt(3);
    // Intensidad de cálculo DI — usa cosφ de la carga (default 0.9)
    // La corriente real que circula por la DI incluye el factor de potencia
    const In = input.phaseSystem === "three"
        ? designPowerW / (SQRT3 * V * cosφ)
        : designPowerW / (V * cosφ);
    // Sección mínima por tabla ITC-BT-15
    const tableEntry = itc_bt_15_1.DI_SECTION_TABLE.find(e => e.maxCurrentA >= In)
        ?? itc_bt_15_1.DI_SECTION_TABLE[itc_bt_15_1.DI_SECTION_TABLE.length - 1]; // Usar última entrada si In excede tabla
    const minSectionTableMm2 = input.diConductorMaterial === "Cu"
        ? tableEntry.sectionCuMm2
        : tableEntry.sectionAlMm2;
    // Calcular sección mínima por CdT probando secciones normalizadas
    let minSectionCdtMm2 = minSectionTableMm2;
    if (input.diLengthM > 0) {
        for (const s of types_1.NORMALIZED_SECTIONS_MM2) {
            if (s < minSectionTableMm2)
                continue;
            const cdtCheck = (0, itc_bt_15_1.calculateDIVoltageDrop)({
                contractedPowerW: designPowerW,
                phaseSystem: input.phaseSystem,
                powerFactor: cosφ,
                conductorMaterial: input.diConductorMaterial,
                sectionMm2: s,
                lengthM: input.diLengthM,
                conductorTempC: input.diConductorTempC,
                voltageV: input.voltageV,
            });
            if (cdtCheck.cdtCompliant) {
                minSectionCdtMm2 = s;
                break;
            }
        }
    }
    // Sección final = la mayor entre tabla, CdT y la elegida por el usuario
    const autoSection = Math.max(minSectionTableMm2, minSectionCdtMm2);
    const finalSection = input.diSectionMm2
        ? Math.max(input.diSectionMm2, autoSection)
        : autoSection;
    // Normalizar a sección comercial
    const normalizedSection = types_1.NORMALIZED_SECTIONS_MM2.find(s => s >= finalSection) ?? 300;
    // CdT con la sección final
    const cdtResult = (0, itc_bt_15_1.calculateDIVoltageDrop)({
        contractedPowerW: designPowerW,
        phaseSystem: input.phaseSystem,
        powerFactor: cosφ,
        conductorMaterial: input.diConductorMaterial,
        sectionMm2: normalizedSection,
        lengthM: input.diLengthM,
        conductorTempC: input.diConductorTempC,
        voltageV: input.voltageV,
    });
    if (!cdtResult.cdtCompliant) {
        warnings.push(`DI: CdT ${cdtResult.voltageDropPct.toFixed(2)}% supera el 1% con sección ${normalizedSection}mm². Revisar longitud o sección.`);
    }
    // 4. Conductor de protección
    const protectionConductorMm2 = (0, itc_bt_17_1.getProtectionConductorSection)(normalizedSection);
    // 5. Diferenciales
    const circuitCodes = input.circuitCodes ?? ["C1", "C2", "C3", "C4.1", "C5"];
    const differentials = (0, itc_bt_17_1.getRequiredDifferentials)({
        phaseSystem: input.phaseSystem,
        contractedPowerW: designPowerW,
        circuits: circuitCodes,
    });
    // 6. Validaciones adicionales
    if (normalizedSection < 6 && input.diConductorMaterial === "Cu") {
        warnings.push("ITC-BT-15: Sección mínima DI es 6mm² Cu.");
    }
    // Verificar IGA ≤ intensidad admisible DI (simplificado)
    if (iga.ratingA > In * 1.5) {
        // No es un error per se, pero avisar
        warnings.push(`IGA ${iga.ratingA}A muy superior a la intensidad nominal ${In.toFixed(1)}A. Verificar potencia contratada.`);
    }
    warnings.push(...cdtResult.warnings);
    const isValid = cdtResult.cdtCompliant;
    return {
        designPowerW,
        electrificationGrade,
        iga,
        di: {
            sectionMm2: normalizedSection,
            minSectionTableMm2,
            minSectionCdtMm2,
            cdtResult,
        },
        protectionConductorMm2,
        differentials,
        warnings,
        isValid,
    };
}
//# sourceMappingURL=calculate-supply.js.map