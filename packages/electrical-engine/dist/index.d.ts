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
export type { InstallationMethod, InsulationType, ConductorMaterial, PhaseSystem, SectionMm2, BreakerRating, BreakerCurve, CircuitCode, CircuitInput, CircuitResult, CalculationJustification, JustificationStep, } from "./types";
export { EngineError, NORMALIZED_SECTIONS_MM2, NORMALIZED_BREAKER_RATINGS } from "./types";
export { ITC_BT_19_CURRENT_TABLE_CU, ITC_BT_19_CURRENT_TABLE_AL, getAdmissibleCurrent, getAvailableSections, } from "./tables/itc-bt-19";
export { CORRECTION_FACTOR_CA, CORRECTION_FACTOR_CG, CORRECTION_FACTOR_CT, getCorrectionFactorCa, getCorrectionFactorCg, getCorrectionFactorCt, getCorrectionFactors, } from "./tables/correction-factors";
export type { CorrectionFactors } from "./tables/correction-factors";
export { ITC_BT_25_CIRCUITS, getCircuitTemplate, getMandatoryCircuits, } from "./tables/itc-bt-25";
export type { CircuitTemplate } from "./tables/itc-bt-25";
export { ELECTRIFICATION_GRADES, LOAD_DENSITY_TABLE, SIMULTANEITY_COEFFICIENT_RESIDENTIAL, calculateBuildingLoad, determineElectrificationGrade, calculateCommercialLoad, } from "./tables/itc-bt-10";
export type { ElectrificationGrade, BuildingUse, LoadDensitySpec } from "./tables/itc-bt-10";
export { LGA_SECTION_TABLE, RESISTIVITY_20C, TEMP_COEFF, REACTANCE_TABLE_CABLE, getResistivityAtTemp, calculateLGAVoltageDrop, getNeutralSection, } from "./tables/itc-bt-14";
export type { LGAInput, LGAResult } from "./tables/itc-bt-14";
export { DI_SECTION_TABLE, DI_CDT_LIMIT_PCT, calculateDIVoltageDrop, } from "./tables/itc-bt-15";
export type { DIInput, DIResult } from "./tables/itc-bt-15";
export { IGA_RATINGS_A, DIFFERENTIAL_SENSITIVITIES_MA, CONTRACTED_POWERS_W, selectIGARating, getRequiredDifferentials, getProtectionConductorSection, verifyProtectionCoordination, } from "./tables/itc-bt-17";
export type { IGARating, DifferentialSensitivity, DifferentialType, DifferentialSpec, ProtectionCoordinationResult, } from "./tables/itc-bt-17";
export { MAX_CONTACT_VOLTAGE_V, ELECTRODE_TYPES, SOIL_RESISTIVITY_TABLE, EARTH_CONDUCTOR_SECTIONS, getMaxEarthResistance, calcPikeResistance, getRequiredPikes, } from "./tables/itc-bt-18";
export type { LocationType, ElectrodeType } from "./tables/itc-bt-18";
export { NORMALIZED_TUBE_DIAMETERS_MM, TUBE_DIAMETER_TABLE, getMinTubeDiameter, getConductorCountForCircuit, getMinBendRadius, getMinTubeDiameterForMixedConductors, } from "./tables/itc-bt-21";
export type { TubeDiameterMm, NumConductors } from "./tables/itc-bt-21";
export { K_CONSTANT, BREAKER_CHARACTERISTICS, BREAKING_CAPACITY_KA, MIN_BREAKING_CAPACITY_KA, getKConstant, selectPIA, verifyShortCircuitCapacity, checkSelectivity, } from "./tables/itc-bt-22";
export type { KConstantKey, BreakerCharacteristics, BreakingCapacityKA, PIASelectionInput, PIASelectionResult, } from "./tables/itc-bt-22";
export { NETWORK_VOLTAGE, CONDUCTOR_MAX_TEMP_C, TYPICAL_NETWORK_IMPEDANCE, calculateLoopImpedance, verifyIndirectContactProtection, } from "./tables/itc-bt-24";
export type { LoopImpedanceInput, LoopImpedanceResult, IndirectContactVerification, } from "./tables/itc-bt-24";
export { CDT_LIMITS_PCT, getLoadType, calculateVoltageDrop, } from "./tables/itc-bt-19-voltage-drop";
export type { CircuitLoadType, VoltagDropInput, VoltageDropResult } from "./tables/itc-bt-19-voltage-drop";
export { BATHROOM_VOLUMES, BATHROOM_EQUIPOTENTIALITY, checkBathroomDevice, } from "./tables/itc-bt-27";
export type { BathroomVolume, VolumeSpec } from "./tables/itc-bt-27";
export { MOTOR_START_TYPES, MOTOR_EFFICIENCY_TYPICAL, MOTOR_POWER_FACTOR_TYPICAL, calculateMotorCurrent, getMotorDesignCurrent, } from "./tables/itc-bt-47";
export type { MotorStartType, MotorInput, MotorResult } from "./tables/itc-bt-47";
export { REBT_DEFINITIONS, DOCUMENTATION_REQUIREMENTS, VERIFICATION_TESTS, NETWORK_SYSTEMS, INSTALLATION_METHOD_DESCRIPTIONS, SPECIAL_INSTALLATIONS, } from "./tables/itc-documentary";
export type { NetworkSystem, DocumentationRequirement, VerificationTest } from "./tables/itc-documentary";
export { calculateNominalCurrent, } from "./calculations/nominal-current";
export type { NominalCurrentInput, NominalCurrentResult, } from "./calculations/nominal-current";
export { selectSection, } from "./calculations/select-section";
export type { SelectSectionResult, SectionCriterion, } from "./calculations/select-section";
export { generateJustification, } from "./calculations/generate-justification";
export type { TechnicalJustificationStep } from "./calculations/generate-justification";
export { calculateCircuit } from "./calculations/calculate-circuit";
export { calculateInstallation } from "./calculations/calculate-installation";
export type { InstallationResult, InstallationSummary, CircuitError, } from "./calculations/calculate-installation";
export { calculateSupply } from "./calculations/calculate-supply";
export type { SupplyInput, SupplyResult } from "./calculations/calculate-supply";
export { calculateBuildingSupply } from "./calculations/calculate-building-supply";
export type { BuildingSupplyInput, BuildingSupplyResult, AdditionalLoad } from "./calculations/calculate-building-supply";
export declare const ENGINE_VERSION = "1.0.0";
export declare const NORM_VERSION = "REBT_RD842_2002";
//# sourceMappingURL=index.d.ts.map