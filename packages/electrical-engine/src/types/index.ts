/**
 * @daso/electrical-engine — Tipos base
 * Normativa: REBT (RD 842/2002), ITC-BT-19, ITC-BT-22, ITC-BT-24, ITC-BT-25
 */

// ─── Métodos de instalación (ITC-BT-19 Tabla 1) ───────────────────────────

export type InstallationMethod =
  | "A1"  // Conductores aislados en tubos en paredes aislantes (empotrado)
  | "A2"  // Cable multiconductor en tubos en paredes aislantes (empotrado)
  | "B1"  // Conductores aislados en tubos en pared (superficie/empotrado)
  | "B2"  // Cable multiconductor en tubos en pared (superficie/empotrado)
  | "C"   // Cable multiconductor sobre pared (bandeja maciza / grapa)
  | "D"   // Cable multiconductor enterrado en tubo (con cobertura arena)
  | "E"   // Cable multiconductor al aire libre (percha / bandeja perforada)
  | "F";  // Conductores unipolares al aire (bandeja perforada / espaciados)

// ─── Tipo de aislamiento ──────────────────────────────────────────────────

export type InsulationType =
  | "PVC"   // Policloruro de vinilo — 70°C conductor, 160°C cortocircuito
  | "XLPE"  // Polietileno reticulado — 90°C conductor, 250°C cortocircuito
  | "EPR";  // Etileno propileno — 90°C conductor

// ─── Material del conductor ───────────────────────────────────────────────

export type ConductorMaterial = "Cu" | "Al";

// ─── Sistema de tensión ───────────────────────────────────────────────────

export type PhaseSystem =
  | "single"    // Monofásico 230V L+N
  | "three";    // Trifásico 400V 3L+N

// ─── Secciones normalizadas (mm²) — IEC 60228 ────────────────────────────

export const NORMALIZED_SECTIONS_MM2 = [
  1.5, 2.5, 4, 6, 10, 16, 25, 35, 50, 70, 95, 120, 150, 185, 240, 300
] as const;

export type SectionMm2 = (typeof NORMALIZED_SECTIONS_MM2)[number];

// ─── Calibres normalizados de PIA (A) ────────────────────────────────────

export const NORMALIZED_BREAKER_RATINGS = [
  6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250
] as const;

export type BreakerRating = (typeof NORMALIZED_BREAKER_RATINGS)[number];

// ─── Curvas de disparo magnético ─────────────────────────────────────────

export type BreakerCurve =
  | "B"   // Corriente de disparo 3-5×In (cargas resistivas, alumbrado)
  | "C"   // Corriente de disparo 5-10×In (uso general, motores pequeños)
  | "D";  // Corriente de disparo 10-20×In (motores, transformadores, cargas con punta)

// ─── Tipo de circuito (ITC-BT-25) ────────────────────────────────────────

export type CircuitCode =
  | "C1"   // Alumbrado
  | "C2"   // TC uso general 16A
  | "C3"   // Cocina/Horno
  | "C4"   // Alias genérico lavadora/lavavajillas/termo
  | "C4.1" // Lavadora
  | "C4.2" // Lavavajillas
  | "C4.3" // Termo eléctrico
  | "C5"   // TC baño y cocina (20A)
  | "C6"   // TC adicional alumbrado
  | "C7"   // TC adicional uso general
  | "C8"   // Calefacción eléctrica
  | "C9"   // Aire acondicionado
  | "C10"  // Secadora
  | "C11"  // Sistema automatización/domótica
  | "C12"  // TC adicionales circuitos específicos
  | "CUSTOM"; // Circuito personalizado

// ─── Tipo de instalación para MTD ───────────────────────────────────────

/** Tipo instalación interior — ITC-BT-26 */
export type InstallationTypeItcBt26 =
  | "E.T.F."   // Empotrado en Tubo Flexible
  | "E.T.C."   // Empotrado en Tubo Curvable
  | "S.T.C."   // Superficial en Tubo Curvable
  | "S.T.R."   // Superficial en Tubo Rígido
  | "S.C.P."   // Superficial en Canal Protector cerrado
  | "S.C.P.F."; // Superficial en Canalización Prefabricada

/** Tipo instalación enlace — ITC-BT-20 */
export type InstallationTypeItcBt20 =
  | "T.P."     // Bajo Tubo Protector
  | "F.D.P."   // Fijado Directamente sobre Pared
  | "ENTR."    // Enterrado
  | "D.E.E."   // Directamente Empotrados en Estructura
  | "AERO"     // Aéreo
  | "I.H.C."   // Interior Huecos de la Construcción
  | "C.P."     // Bajo Canales Protectores
  | "MOLD."    // Bajo Moldura
  | "BANDJ."   // En Bandeja
  | "C.E.P.";  // En Canalización Eléctrica Prefabricada

/** Tensión nominal de aislamiento del cable */
export type InsulationVoltage =
  | "450/750V"  // Cable H07Z1-K, H07V-K — instalación interior
  | "0.6/1kV";  // Cable RZ1-K, RV-K — LGA, derivaciones, exterior

// ─── Datos de entrada de un circuito ─────────────────────────────────────

export interface CircuitInput {
  id: string;
  label: string;
  code: CircuitCode;

  // Carga
  phaseSystem: PhaseSystem;
  loadPowerW: number;          // Potencia total instalada en W
  powerFactor: number;         // cosφ (0.8–1.0)
  simultaneityFactor: number;  // Ks (0–1): factor de simultaneidad
  loadFactor: number;          // Fu (0–1): factor de utilización

  // Conductor
  conductorMaterial: ConductorMaterial;
  insulationType: InsulationType;
  installationMethod: InstallationMethod;
  lengthM: number;             // Longitud del circuito en metros

  // Corrección
  ambientTempC: number;        // Temperatura ambiente (°C)
  groupingCircuits: number;    // Nº de circuitos agrupados (para factor Cg)

  // Tensión nominal (V)
  voltageV?: number;           // Default: 230 monofásico, 400 trifásico

  // CdT acumulada desde origen (%)
  upstreamCdtPct?: number;    // CdT acumulada aguas arriba (default: 0)

  // Campos adicionales para MTD (opcionales)
  installedPowerW?: number;          // Potencia total instalada real (la introduce el usuario)
  installationTypeItcBt26?: InstallationTypeItcBt26;  // Tipo instalación interior (default: E.T.F.)
  installationTypeItcBt20?: InstallationTypeItcBt20;  // Tipo instalación enlace (default: T.P.)
  insulationVoltage?: InsulationVoltage;               // Tensión aislamiento (default: 450/750V interior, 0.6/1kV enlace)

  // Tipo de carga (override para CdT limit)
  loadType?: string;  // FUERZA, ALUMBRADO, ALUMBRADO_EMERGENCIA, MOTOR, RESISTIVO, IRVE, DOMOTICA
}

// ─── Resultado del cálculo de un circuito ────────────────────────────────

export interface CircuitResult {
  id: string;

  // Intensidades
  nominalCurrentA: number;     // In — intensidad de cálculo (= PIA para ITC-BT-25)
  admissibleCurrentA: number;  // Iz corregida para la sección elegida
  correctedIzA: number;        // Iz de tabla × factores de corrección

  // Sección elegida y criterio determinante
  sectionMm2: SectionMm2;
  sectionCriteria: "thermal" | "voltage_drop" | "short_circuit" | "minimum_itcbt25";

  // Caída de tensión
  voltageDropPct: number;      // CdT de este tramo (%)
  accumulatedCdtPct: number;  // CdT acumulada desde origen (%)
  cdtLimitPct: number;         // Límite aplicable (3% alumbrado / 5% fuerza)
  cdtCompliant: boolean;

  // Protección seleccionada
  breakerRatingA: BreakerRating;
  breakerCurve: BreakerCurve;
  rcdSensitivityMa: 30 | 300 | null;

  // Cortocircuito (simplificado Semana 1, completo Semana 3)
  shortCircuitKa?: number;

  // Validación global
  isCompliant: boolean;
  isValid: boolean;           // Alias de validez (cumple todos los criterios)
  tubeDiameterMm?: number;    // Diámetro mínimo de tubo ITC-BT-21
  warnings: string[];
  errors: string[];

  // Trazabilidad
  justification: CalculationJustification;

  // ─── Campos adicionales para MTD (Memoria Técnica de Diseño) ──────────
  calculatedPowerW?: number;    // Potencia de cálculo = V × I_PIA (W)
  numConductors?: number;       // Nº conductores sin PE: 2 (mono) / 4 (tri)
  voltageDropV?: number;        // CdT en Voltios (para columna MTD)
}

// ─── Trazabilidad de cálculo ──────────────────────────────────────────────

export interface CalculationJustification {
  formulasUsed: string[];
  tableReferences: string[];
  steps: JustificationStep[];
  normReferences: string[];
}

export interface JustificationStep {
  order: number;
  description: string;
  formula?: string;
  inputValues: Record<string, number | string>;
  result: number | string;
  unit?: string;
  normRef?: string;
}

// ─── Error del motor ──────────────────────────────────────────────────────

export class EngineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly circuitId?: string
  ) {
    super(message);
    this.name = "EngineError";
  }
}
