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

// ─── Tipos ────────────────────────────────────────────────────────────────
export type {
  InstallationMethod,
  InsulationType,
  ConductorMaterial,
  PhaseSystem,
  SectionMm2,
  BreakerRating,
  BreakerCurve,
  CircuitCode,
  CircuitInput,
  CircuitResult,
  CalculationJustification,
  JustificationStep,
} from "./types";
export { EngineError, NORMALIZED_SECTIONS_MM2, NORMALIZED_BREAKER_RATINGS } from "./types";

// ─── Tablas normativas ────────────────────────────────────────────────────
export {
  ITC_BT_19_CURRENT_TABLE_CU,
  ITC_BT_19_CURRENT_TABLE_AL,
  getAdmissibleCurrent,
  getAvailableSections,
} from "./tables/itc-bt-19";

export {
  CORRECTION_FACTOR_CA,
  CORRECTION_FACTOR_CG,
  CORRECTION_FACTOR_CT,
  getCorrectionFactorCa,
  getCorrectionFactorCg,
  getCorrectionFactorCt,
  getCorrectionFactors,
} from "./tables/correction-factors";
export type { CorrectionFactors } from "./tables/correction-factors";

export {
  ITC_BT_25_CIRCUITS,
  getCircuitTemplate,
  getMandatoryCircuits,
} from "./tables/itc-bt-25";
export type { CircuitTemplate } from "./tables/itc-bt-25";

// ─── ITC-BT-10: Previsión de cargas ──────────────────────────────────────
export {
  ELECTRIFICATION_GRADES,
  LOAD_DENSITY_TABLE,
  SIMULTANEITY_COEFFICIENT_RESIDENTIAL,
  calculateBuildingLoad,
  determineElectrificationGrade,
  calculateCommercialLoad,
} from "./tables/itc-bt-10";
export type { ElectrificationGrade, BuildingUse, LoadDensitySpec } from "./tables/itc-bt-10";

// ─── ITC-BT-14: LGA ──────────────────────────────────────────────────────
export {
  LGA_SECTION_TABLE,
  RESISTIVITY_20C,
  TEMP_COEFF,
  REACTANCE_TABLE_CABLE,
  getResistivityAtTemp,
  calculateLGAVoltageDrop,
  getNeutralSection,
} from "./tables/itc-bt-14";
export type { LGAInput, LGAResult } from "./tables/itc-bt-14";

// ─── ITC-BT-15: Derivaciones individuales ────────────────────────────────
export {
  DI_SECTION_TABLE,
  DI_CDT_LIMIT_PCT,
  calculateDIVoltageDrop,
} from "./tables/itc-bt-15";
export type { DIInput, DIResult } from "./tables/itc-bt-15";

// ─── ITC-BT-17: Dispositivos de mando y protección ───────────────────────
export {
  IGA_RATINGS_A,
  DIFFERENTIAL_SENSITIVITIES_MA,
  CONTRACTED_POWERS_W,
  selectIGARating,
  getRequiredDifferentials,
  getProtectionConductorSection,
  verifyProtectionCoordination,
} from "./tables/itc-bt-17";
export type {
  IGARating,
  DifferentialSensitivity,
  DifferentialType,
  DifferentialSpec,
  ProtectionCoordinationResult,
} from "./tables/itc-bt-17";

// ─── ITC-BT-18: Puesta a tierra ──────────────────────────────────────────
export {
  MAX_CONTACT_VOLTAGE_V,
  ELECTRODE_TYPES,
  SOIL_RESISTIVITY_TABLE,
  EARTH_CONDUCTOR_SECTIONS,
  getMaxEarthResistance,
  calcPikeResistance,
  getRequiredPikes,
} from "./tables/itc-bt-18";
export type { LocationType, ElectrodeType } from "./tables/itc-bt-18";

// ─── ITC-BT-21: Tubos protectores ────────────────────────────────────────
export {
  NORMALIZED_TUBE_DIAMETERS_MM,
  TUBE_DIAMETER_TABLE,
  getMinTubeDiameter,
  getConductorCountForCircuit,
  getMinBendRadius,
  getMinTubeDiameterForMixedConductors,
} from "./tables/itc-bt-21";
export type { TubeDiameterMm, NumConductors } from "./tables/itc-bt-21";

// ─── ITC-BT-22: Protección contra sobreintensidades ──────────────────────
export {
  K_CONSTANT,
  BREAKER_CHARACTERISTICS,
  BREAKING_CAPACITY_KA,
  MIN_BREAKING_CAPACITY_KA,
  getKConstant,
  selectPIA,
  verifyShortCircuitCapacity,
  checkSelectivity,
} from "./tables/itc-bt-22";
export type {
  KConstantKey,
  BreakerCharacteristics,
  BreakingCapacityKA,
  PIASelectionInput,
  PIASelectionResult,
} from "./tables/itc-bt-22";

// ─── ITC-BT-24: Contactos indirectos / Corriente de cortocircuito ────────
export {
  NETWORK_VOLTAGE,
  CONDUCTOR_MAX_TEMP_C,
  TYPICAL_NETWORK_IMPEDANCE,
  calculateLoopImpedance,
  verifyIndirectContactProtection,
} from "./tables/itc-bt-24";
export type {
  LoopImpedanceInput,
  LoopImpedanceResult,
  IndirectContactVerification,
} from "./tables/itc-bt-24";

// ─── ITC-BT-19 (CdT): Caída de tensión instalaciones interiores ──────────
export {
  CDT_LIMITS_PCT,
  getLoadType,
  calculateVoltageDrop,
} from "./tables/itc-bt-19-voltage-drop";
export type { CircuitLoadType, VoltagDropInput, VoltageDropResult } from "./tables/itc-bt-19-voltage-drop";

// ─── ITC-BT-27: Cuartos de baño ──────────────────────────────────────────
export {
  BATHROOM_VOLUMES,
  BATHROOM_EQUIPOTENTIALITY,
  checkBathroomDevice,
} from "./tables/itc-bt-27";
export type { BathroomVolume, VolumeSpec } from "./tables/itc-bt-27";

// ─── ITC-BT-47: Motores ──────────────────────────────────────────────────
export {
  MOTOR_START_TYPES,
  MOTOR_EFFICIENCY_TYPICAL,
  MOTOR_POWER_FACTOR_TYPICAL,
  calculateMotorCurrent,
  getMotorDesignCurrent,
} from "./tables/itc-bt-47";
export type { MotorStartType, MotorInput, MotorResult } from "./tables/itc-bt-47";

// ─── ITCs documentales ────────────────────────────────────────────────────
export {
  REBT_DEFINITIONS,
  DOCUMENTATION_REQUIREMENTS,
  VERIFICATION_TESTS,
  NETWORK_SYSTEMS,
  INSTALLATION_METHOD_DESCRIPTIONS,
  SPECIAL_INSTALLATIONS,
} from "./tables/itc-documentary";
export type { NetworkSystem, DocumentationRequirement, VerificationTest } from "./tables/itc-documentary";

// ─── Cálculos ─────────────────────────────────────────────────────────────
export {
  calculateNominalCurrent,
} from "./calculations/nominal-current";
export type {
  NominalCurrentInput,
  NominalCurrentResult,
} from "./calculations/nominal-current";

export {
  selectSection,
} from "./calculations/select-section";
export type {
  SelectSectionResult,
  SectionCriterion,
} from "./calculations/select-section";

export {
  generateJustification,
} from "./calculations/generate-justification";
export type { TechnicalJustificationStep } from "./calculations/generate-justification";

export { calculateCircuit } from "./calculations/calculate-circuit";

export { calculateInstallation } from "./calculations/calculate-installation";
export type {
  InstallationResult,
  InstallationSummary,
  CircuitError,
} from "./calculations/calculate-installation";

// ─── Cálculo de suministro (IGA + DI + diferenciales) ───────
export { calculateSupply } from "./calculations/calculate-supply";
export type { SupplyInput, SupplyResult } from "./calculations/calculate-supply";

// ─── Cálculo de suministro edificio (LGA + DI) ─────────────
export { calculateBuildingSupply } from "./calculations/calculate-building-supply";
export type { BuildingSupplyInput, BuildingSupplyResult, AdditionalLoad } from "./calculations/calculate-building-supply";

// ─── Metadatos ────────────────────────────────────────────────────────────
export const ENGINE_VERSION = "1.0.0";
export const NORM_VERSION = "REBT_RD842_2002";
