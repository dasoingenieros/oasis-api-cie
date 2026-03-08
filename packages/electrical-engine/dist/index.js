"use strict";
/**
 * @daso/electrical-engine
 *
 * Motor de cálculos REBT para instalaciones eléctricas de baja tensión.
 * Plataforma CIE — DASO Ingenieros
 *
 * Normativa cubierta:
 *   - ITC-BT-19: Intensidades admisibles, factores de corrección
 *   - ITC-BT-22: Protecciones (Semana 3)
 *   - ITC-BT-24: Corriente de cortocircuito (Semana 3)
 *   - ITC-BT-25: Circuitos tipo vivienda
 *
 * Versión normativa: REBT RD 842/2002
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMinTubeDiameter = exports.TUBE_DIAMETER_TABLE = exports.NORMALIZED_TUBE_DIAMETERS_MM = exports.getRequiredPikes = exports.calcPikeResistance = exports.getMaxEarthResistance = exports.EARTH_CONDUCTOR_SECTIONS = exports.SOIL_RESISTIVITY_TABLE = exports.ELECTRODE_TYPES = exports.MAX_CONTACT_VOLTAGE_V = exports.verifyProtectionCoordination = exports.getProtectionConductorSection = exports.getRequiredDifferentials = exports.selectIGARating = exports.CONTRACTED_POWERS_W = exports.DIFFERENTIAL_SENSITIVITIES_MA = exports.IGA_RATINGS_A = exports.calculateDIVoltageDrop = exports.DI_CDT_LIMIT_PCT = exports.DI_SECTION_TABLE = exports.getNeutralSection = exports.calculateLGAVoltageDrop = exports.getResistivityAtTemp = exports.REACTANCE_TABLE_CABLE = exports.TEMP_COEFF = exports.RESISTIVITY_20C = exports.LGA_SECTION_TABLE = exports.calculateCommercialLoad = exports.determineElectrificationGrade = exports.calculateBuildingLoad = exports.SIMULTANEITY_COEFFICIENT_RESIDENTIAL = exports.LOAD_DENSITY_TABLE = exports.ELECTRIFICATION_GRADES = exports.getMandatoryCircuits = exports.getCircuitTemplate = exports.ITC_BT_25_CIRCUITS = exports.getCorrectionFactors = exports.getCorrectionFactorCt = exports.getCorrectionFactorCg = exports.getCorrectionFactorCa = exports.CORRECTION_FACTOR_CT = exports.CORRECTION_FACTOR_CG = exports.CORRECTION_FACTOR_CA = exports.getAvailableSections = exports.getAdmissibleCurrent = exports.ITC_BT_19_CURRENT_TABLE_AL = exports.ITC_BT_19_CURRENT_TABLE_CU = exports.NORMALIZED_BREAKER_RATINGS = exports.NORMALIZED_SECTIONS_MM2 = exports.EngineError = void 0;
exports.NORM_VERSION = exports.ENGINE_VERSION = exports.calculateBuildingSupply = exports.calculateSupply = exports.calculateInstallation = exports.calculateCircuit = exports.generateJustification = exports.selectSection = exports.calculateNominalCurrent = exports.SPECIAL_INSTALLATIONS = exports.INSTALLATION_METHOD_DESCRIPTIONS = exports.NETWORK_SYSTEMS = exports.VERIFICATION_TESTS = exports.DOCUMENTATION_REQUIREMENTS = exports.REBT_DEFINITIONS = exports.getMotorDesignCurrent = exports.calculateMotorCurrent = exports.MOTOR_POWER_FACTOR_TYPICAL = exports.MOTOR_EFFICIENCY_TYPICAL = exports.MOTOR_START_TYPES = exports.checkBathroomDevice = exports.BATHROOM_EQUIPOTENTIALITY = exports.BATHROOM_VOLUMES = exports.calculateVoltageDrop = exports.getLoadType = exports.CDT_LIMITS_PCT = exports.verifyIndirectContactProtection = exports.calculateLoopImpedance = exports.TYPICAL_NETWORK_IMPEDANCE = exports.CONDUCTOR_MAX_TEMP_C = exports.NETWORK_VOLTAGE = exports.checkSelectivity = exports.verifyShortCircuitCapacity = exports.selectPIA = exports.getKConstant = exports.MIN_BREAKING_CAPACITY_KA = exports.BREAKING_CAPACITY_KA = exports.BREAKER_CHARACTERISTICS = exports.K_CONSTANT = exports.getMinTubeDiameterForMixedConductors = exports.getMinBendRadius = exports.getConductorCountForCircuit = void 0;
var types_1 = require("./types");
Object.defineProperty(exports, "EngineError", { enumerable: true, get: function () { return types_1.EngineError; } });
Object.defineProperty(exports, "NORMALIZED_SECTIONS_MM2", { enumerable: true, get: function () { return types_1.NORMALIZED_SECTIONS_MM2; } });
Object.defineProperty(exports, "NORMALIZED_BREAKER_RATINGS", { enumerable: true, get: function () { return types_1.NORMALIZED_BREAKER_RATINGS; } });
// ─── Tablas normativas ────────────────────────────────────────────────────
var itc_bt_19_1 = require("./tables/itc-bt-19");
Object.defineProperty(exports, "ITC_BT_19_CURRENT_TABLE_CU", { enumerable: true, get: function () { return itc_bt_19_1.ITC_BT_19_CURRENT_TABLE_CU; } });
Object.defineProperty(exports, "ITC_BT_19_CURRENT_TABLE_AL", { enumerable: true, get: function () { return itc_bt_19_1.ITC_BT_19_CURRENT_TABLE_AL; } });
Object.defineProperty(exports, "getAdmissibleCurrent", { enumerable: true, get: function () { return itc_bt_19_1.getAdmissibleCurrent; } });
Object.defineProperty(exports, "getAvailableSections", { enumerable: true, get: function () { return itc_bt_19_1.getAvailableSections; } });
var correction_factors_1 = require("./tables/correction-factors");
Object.defineProperty(exports, "CORRECTION_FACTOR_CA", { enumerable: true, get: function () { return correction_factors_1.CORRECTION_FACTOR_CA; } });
Object.defineProperty(exports, "CORRECTION_FACTOR_CG", { enumerable: true, get: function () { return correction_factors_1.CORRECTION_FACTOR_CG; } });
Object.defineProperty(exports, "CORRECTION_FACTOR_CT", { enumerable: true, get: function () { return correction_factors_1.CORRECTION_FACTOR_CT; } });
Object.defineProperty(exports, "getCorrectionFactorCa", { enumerable: true, get: function () { return correction_factors_1.getCorrectionFactorCa; } });
Object.defineProperty(exports, "getCorrectionFactorCg", { enumerable: true, get: function () { return correction_factors_1.getCorrectionFactorCg; } });
Object.defineProperty(exports, "getCorrectionFactorCt", { enumerable: true, get: function () { return correction_factors_1.getCorrectionFactorCt; } });
Object.defineProperty(exports, "getCorrectionFactors", { enumerable: true, get: function () { return correction_factors_1.getCorrectionFactors; } });
var itc_bt_25_1 = require("./tables/itc-bt-25");
Object.defineProperty(exports, "ITC_BT_25_CIRCUITS", { enumerable: true, get: function () { return itc_bt_25_1.ITC_BT_25_CIRCUITS; } });
Object.defineProperty(exports, "getCircuitTemplate", { enumerable: true, get: function () { return itc_bt_25_1.getCircuitTemplate; } });
Object.defineProperty(exports, "getMandatoryCircuits", { enumerable: true, get: function () { return itc_bt_25_1.getMandatoryCircuits; } });
// ─── ITC-BT-10: Previsión de cargas ──────────────────────────────────────
var itc_bt_10_1 = require("./tables/itc-bt-10");
Object.defineProperty(exports, "ELECTRIFICATION_GRADES", { enumerable: true, get: function () { return itc_bt_10_1.ELECTRIFICATION_GRADES; } });
Object.defineProperty(exports, "LOAD_DENSITY_TABLE", { enumerable: true, get: function () { return itc_bt_10_1.LOAD_DENSITY_TABLE; } });
Object.defineProperty(exports, "SIMULTANEITY_COEFFICIENT_RESIDENTIAL", { enumerable: true, get: function () { return itc_bt_10_1.SIMULTANEITY_COEFFICIENT_RESIDENTIAL; } });
Object.defineProperty(exports, "calculateBuildingLoad", { enumerable: true, get: function () { return itc_bt_10_1.calculateBuildingLoad; } });
Object.defineProperty(exports, "determineElectrificationGrade", { enumerable: true, get: function () { return itc_bt_10_1.determineElectrificationGrade; } });
Object.defineProperty(exports, "calculateCommercialLoad", { enumerable: true, get: function () { return itc_bt_10_1.calculateCommercialLoad; } });
// ─── ITC-BT-14: LGA ──────────────────────────────────────────────────────
var itc_bt_14_1 = require("./tables/itc-bt-14");
Object.defineProperty(exports, "LGA_SECTION_TABLE", { enumerable: true, get: function () { return itc_bt_14_1.LGA_SECTION_TABLE; } });
Object.defineProperty(exports, "RESISTIVITY_20C", { enumerable: true, get: function () { return itc_bt_14_1.RESISTIVITY_20C; } });
Object.defineProperty(exports, "TEMP_COEFF", { enumerable: true, get: function () { return itc_bt_14_1.TEMP_COEFF; } });
Object.defineProperty(exports, "REACTANCE_TABLE_CABLE", { enumerable: true, get: function () { return itc_bt_14_1.REACTANCE_TABLE_CABLE; } });
Object.defineProperty(exports, "getResistivityAtTemp", { enumerable: true, get: function () { return itc_bt_14_1.getResistivityAtTemp; } });
Object.defineProperty(exports, "calculateLGAVoltageDrop", { enumerable: true, get: function () { return itc_bt_14_1.calculateLGAVoltageDrop; } });
Object.defineProperty(exports, "getNeutralSection", { enumerable: true, get: function () { return itc_bt_14_1.getNeutralSection; } });
// ─── ITC-BT-15: Derivaciones individuales ────────────────────────────────
var itc_bt_15_1 = require("./tables/itc-bt-15");
Object.defineProperty(exports, "DI_SECTION_TABLE", { enumerable: true, get: function () { return itc_bt_15_1.DI_SECTION_TABLE; } });
Object.defineProperty(exports, "DI_CDT_LIMIT_PCT", { enumerable: true, get: function () { return itc_bt_15_1.DI_CDT_LIMIT_PCT; } });
Object.defineProperty(exports, "calculateDIVoltageDrop", { enumerable: true, get: function () { return itc_bt_15_1.calculateDIVoltageDrop; } });
// ─── ITC-BT-17: Dispositivos de mando y protección ───────────────────────
var itc_bt_17_1 = require("./tables/itc-bt-17");
Object.defineProperty(exports, "IGA_RATINGS_A", { enumerable: true, get: function () { return itc_bt_17_1.IGA_RATINGS_A; } });
Object.defineProperty(exports, "DIFFERENTIAL_SENSITIVITIES_MA", { enumerable: true, get: function () { return itc_bt_17_1.DIFFERENTIAL_SENSITIVITIES_MA; } });
Object.defineProperty(exports, "CONTRACTED_POWERS_W", { enumerable: true, get: function () { return itc_bt_17_1.CONTRACTED_POWERS_W; } });
Object.defineProperty(exports, "selectIGARating", { enumerable: true, get: function () { return itc_bt_17_1.selectIGARating; } });
Object.defineProperty(exports, "getRequiredDifferentials", { enumerable: true, get: function () { return itc_bt_17_1.getRequiredDifferentials; } });
Object.defineProperty(exports, "getProtectionConductorSection", { enumerable: true, get: function () { return itc_bt_17_1.getProtectionConductorSection; } });
Object.defineProperty(exports, "verifyProtectionCoordination", { enumerable: true, get: function () { return itc_bt_17_1.verifyProtectionCoordination; } });
// ─── ITC-BT-18: Puesta a tierra ──────────────────────────────────────────
var itc_bt_18_1 = require("./tables/itc-bt-18");
Object.defineProperty(exports, "MAX_CONTACT_VOLTAGE_V", { enumerable: true, get: function () { return itc_bt_18_1.MAX_CONTACT_VOLTAGE_V; } });
Object.defineProperty(exports, "ELECTRODE_TYPES", { enumerable: true, get: function () { return itc_bt_18_1.ELECTRODE_TYPES; } });
Object.defineProperty(exports, "SOIL_RESISTIVITY_TABLE", { enumerable: true, get: function () { return itc_bt_18_1.SOIL_RESISTIVITY_TABLE; } });
Object.defineProperty(exports, "EARTH_CONDUCTOR_SECTIONS", { enumerable: true, get: function () { return itc_bt_18_1.EARTH_CONDUCTOR_SECTIONS; } });
Object.defineProperty(exports, "getMaxEarthResistance", { enumerable: true, get: function () { return itc_bt_18_1.getMaxEarthResistance; } });
Object.defineProperty(exports, "calcPikeResistance", { enumerable: true, get: function () { return itc_bt_18_1.calcPikeResistance; } });
Object.defineProperty(exports, "getRequiredPikes", { enumerable: true, get: function () { return itc_bt_18_1.getRequiredPikes; } });
// ─── ITC-BT-21: Tubos protectores ────────────────────────────────────────
var itc_bt_21_1 = require("./tables/itc-bt-21");
Object.defineProperty(exports, "NORMALIZED_TUBE_DIAMETERS_MM", { enumerable: true, get: function () { return itc_bt_21_1.NORMALIZED_TUBE_DIAMETERS_MM; } });
Object.defineProperty(exports, "TUBE_DIAMETER_TABLE", { enumerable: true, get: function () { return itc_bt_21_1.TUBE_DIAMETER_TABLE; } });
Object.defineProperty(exports, "getMinTubeDiameter", { enumerable: true, get: function () { return itc_bt_21_1.getMinTubeDiameter; } });
Object.defineProperty(exports, "getConductorCountForCircuit", { enumerable: true, get: function () { return itc_bt_21_1.getConductorCountForCircuit; } });
Object.defineProperty(exports, "getMinBendRadius", { enumerable: true, get: function () { return itc_bt_21_1.getMinBendRadius; } });
Object.defineProperty(exports, "getMinTubeDiameterForMixedConductors", { enumerable: true, get: function () { return itc_bt_21_1.getMinTubeDiameterForMixedConductors; } });
// ─── ITC-BT-22: Protección contra sobreintensidades ──────────────────────
var itc_bt_22_1 = require("./tables/itc-bt-22");
Object.defineProperty(exports, "K_CONSTANT", { enumerable: true, get: function () { return itc_bt_22_1.K_CONSTANT; } });
Object.defineProperty(exports, "BREAKER_CHARACTERISTICS", { enumerable: true, get: function () { return itc_bt_22_1.BREAKER_CHARACTERISTICS; } });
Object.defineProperty(exports, "BREAKING_CAPACITY_KA", { enumerable: true, get: function () { return itc_bt_22_1.BREAKING_CAPACITY_KA; } });
Object.defineProperty(exports, "MIN_BREAKING_CAPACITY_KA", { enumerable: true, get: function () { return itc_bt_22_1.MIN_BREAKING_CAPACITY_KA; } });
Object.defineProperty(exports, "getKConstant", { enumerable: true, get: function () { return itc_bt_22_1.getKConstant; } });
Object.defineProperty(exports, "selectPIA", { enumerable: true, get: function () { return itc_bt_22_1.selectPIA; } });
Object.defineProperty(exports, "verifyShortCircuitCapacity", { enumerable: true, get: function () { return itc_bt_22_1.verifyShortCircuitCapacity; } });
Object.defineProperty(exports, "checkSelectivity", { enumerable: true, get: function () { return itc_bt_22_1.checkSelectivity; } });
// ─── ITC-BT-24: Contactos indirectos / Corriente de cortocircuito ────────
var itc_bt_24_1 = require("./tables/itc-bt-24");
Object.defineProperty(exports, "NETWORK_VOLTAGE", { enumerable: true, get: function () { return itc_bt_24_1.NETWORK_VOLTAGE; } });
Object.defineProperty(exports, "CONDUCTOR_MAX_TEMP_C", { enumerable: true, get: function () { return itc_bt_24_1.CONDUCTOR_MAX_TEMP_C; } });
Object.defineProperty(exports, "TYPICAL_NETWORK_IMPEDANCE", { enumerable: true, get: function () { return itc_bt_24_1.TYPICAL_NETWORK_IMPEDANCE; } });
Object.defineProperty(exports, "calculateLoopImpedance", { enumerable: true, get: function () { return itc_bt_24_1.calculateLoopImpedance; } });
Object.defineProperty(exports, "verifyIndirectContactProtection", { enumerable: true, get: function () { return itc_bt_24_1.verifyIndirectContactProtection; } });
// ─── ITC-BT-19 (CdT): Caída de tensión instalaciones interiores ──────────
var itc_bt_19_voltage_drop_1 = require("./tables/itc-bt-19-voltage-drop");
Object.defineProperty(exports, "CDT_LIMITS_PCT", { enumerable: true, get: function () { return itc_bt_19_voltage_drop_1.CDT_LIMITS_PCT; } });
Object.defineProperty(exports, "getLoadType", { enumerable: true, get: function () { return itc_bt_19_voltage_drop_1.getLoadType; } });
Object.defineProperty(exports, "calculateVoltageDrop", { enumerable: true, get: function () { return itc_bt_19_voltage_drop_1.calculateVoltageDrop; } });
// ─── ITC-BT-27: Cuartos de baño ──────────────────────────────────────────
var itc_bt_27_1 = require("./tables/itc-bt-27");
Object.defineProperty(exports, "BATHROOM_VOLUMES", { enumerable: true, get: function () { return itc_bt_27_1.BATHROOM_VOLUMES; } });
Object.defineProperty(exports, "BATHROOM_EQUIPOTENTIALITY", { enumerable: true, get: function () { return itc_bt_27_1.BATHROOM_EQUIPOTENTIALITY; } });
Object.defineProperty(exports, "checkBathroomDevice", { enumerable: true, get: function () { return itc_bt_27_1.checkBathroomDevice; } });
// ─── ITC-BT-47: Motores ──────────────────────────────────────────────────
var itc_bt_47_1 = require("./tables/itc-bt-47");
Object.defineProperty(exports, "MOTOR_START_TYPES", { enumerable: true, get: function () { return itc_bt_47_1.MOTOR_START_TYPES; } });
Object.defineProperty(exports, "MOTOR_EFFICIENCY_TYPICAL", { enumerable: true, get: function () { return itc_bt_47_1.MOTOR_EFFICIENCY_TYPICAL; } });
Object.defineProperty(exports, "MOTOR_POWER_FACTOR_TYPICAL", { enumerable: true, get: function () { return itc_bt_47_1.MOTOR_POWER_FACTOR_TYPICAL; } });
Object.defineProperty(exports, "calculateMotorCurrent", { enumerable: true, get: function () { return itc_bt_47_1.calculateMotorCurrent; } });
Object.defineProperty(exports, "getMotorDesignCurrent", { enumerable: true, get: function () { return itc_bt_47_1.getMotorDesignCurrent; } });
// ─── ITCs documentales ────────────────────────────────────────────────────
var itc_documentary_1 = require("./tables/itc-documentary");
Object.defineProperty(exports, "REBT_DEFINITIONS", { enumerable: true, get: function () { return itc_documentary_1.REBT_DEFINITIONS; } });
Object.defineProperty(exports, "DOCUMENTATION_REQUIREMENTS", { enumerable: true, get: function () { return itc_documentary_1.DOCUMENTATION_REQUIREMENTS; } });
Object.defineProperty(exports, "VERIFICATION_TESTS", { enumerable: true, get: function () { return itc_documentary_1.VERIFICATION_TESTS; } });
Object.defineProperty(exports, "NETWORK_SYSTEMS", { enumerable: true, get: function () { return itc_documentary_1.NETWORK_SYSTEMS; } });
Object.defineProperty(exports, "INSTALLATION_METHOD_DESCRIPTIONS", { enumerable: true, get: function () { return itc_documentary_1.INSTALLATION_METHOD_DESCRIPTIONS; } });
Object.defineProperty(exports, "SPECIAL_INSTALLATIONS", { enumerable: true, get: function () { return itc_documentary_1.SPECIAL_INSTALLATIONS; } });
// ─── Cálculos ─────────────────────────────────────────────────────────────
var nominal_current_1 = require("./calculations/nominal-current");
Object.defineProperty(exports, "calculateNominalCurrent", { enumerable: true, get: function () { return nominal_current_1.calculateNominalCurrent; } });
var select_section_1 = require("./calculations/select-section");
Object.defineProperty(exports, "selectSection", { enumerable: true, get: function () { return select_section_1.selectSection; } });
var generate_justification_1 = require("./calculations/generate-justification");
Object.defineProperty(exports, "generateJustification", { enumerable: true, get: function () { return generate_justification_1.generateJustification; } });
var calculate_circuit_1 = require("./calculations/calculate-circuit");
Object.defineProperty(exports, "calculateCircuit", { enumerable: true, get: function () { return calculate_circuit_1.calculateCircuit; } });
var calculate_installation_1 = require("./calculations/calculate-installation");
Object.defineProperty(exports, "calculateInstallation", { enumerable: true, get: function () { return calculate_installation_1.calculateInstallation; } });
// ─── Cálculo de suministro (IGA + DI + diferenciales) ───────
var calculate_supply_1 = require("./calculations/calculate-supply");
Object.defineProperty(exports, "calculateSupply", { enumerable: true, get: function () { return calculate_supply_1.calculateSupply; } });
// ─── Cálculo de suministro edificio (LGA + DI) ─────────────
var calculate_building_supply_1 = require("./calculations/calculate-building-supply");
Object.defineProperty(exports, "calculateBuildingSupply", { enumerable: true, get: function () { return calculate_building_supply_1.calculateBuildingSupply; } });
// ─── Metadatos ────────────────────────────────────────────────────────────
exports.ENGINE_VERSION = "1.0.0";
exports.NORM_VERSION = "REBT_RD842_2002";
//# sourceMappingURL=index.js.map