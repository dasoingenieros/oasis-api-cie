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
}

// ─── Resultado del cálculo de un circuito ────────────────────────────────

export interface CircuitResult {
  id: string;

  // Intensidades
  nominalCurrentA: number;     // In calculada
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
