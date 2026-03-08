/**
 * ITC-BT-21 — TUBOS PROTECTORES
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-21
 *
 * Establece los diámetros mínimos de tubo (corrugado flexible, rígido,
 * o de pared delgada) según el número y sección de conductores que aloja.
 *
 * Regla general (ITC-BT-21 §1):
 *   La sección interior del tubo debe ser ≥ 2.5 veces la sección total
 *   ocupada por los conductores (incluyendo aislamiento).
 *
 * En la práctica se usan las tablas normalizadas de diámetros exteriores
 * de tubo (Ø exterior en mm) en función de la sección del conductor y
 * el número de conductores (1, 2, 3 o 4).
 *
 * Tipos de tubo (ITC-BT-21 Tabla 2):
 *   - Corrugado flexible (empotrado en obra): ENF → diámetro interior libre ≥ tabla
 *   - Rígido curvable en caliente (superficie/empotrado): EFC
 *   - Rígido blindado (superficiales con protección mecánica): ERF
 */

// ─── Diámetros exteriores normalizados de tubo (mm) ──────────────────────

export const NORMALIZED_TUBE_DIAMETERS_MM = [16, 20, 25, 32, 40, 50, 63] as const;
export type TubeDiameterMm = (typeof NORMALIZED_TUBE_DIAMETERS_MM)[number];

// ─── Tabla de diámetro mínimo de tubo ────────────────────────────────────
// ITC-BT-21 Tabla 5
// Estructura: tabla[sección_mm²][n_conductores] = diámetro_exterior_mm

type TubeTableEntry = {
  1: TubeDiameterMm;
  2: TubeDiameterMm;
  3: TubeDiameterMm;
  4: TubeDiameterMm;
  5: TubeDiameterMm;
};

/**
 * Diámetros exteriores mínimos de tubo (mm) para conductores unipolares
 * con aislamiento de PVC o XLPE (R2V, H07V-K, etc.)
 *
 * Aplicable a: tubo corrugado (empotrado), tubo rígido curvable, tubo rígido liso.
 *
 * Nota: Para cables multipolares la sección equivalente es la suma de
 * todas las secciones de conductores incluidos (fase + neutro + PE si van en el mismo tubo).
 */
export const TUBE_DIAMETER_TABLE: Partial<Record<number, TubeTableEntry>> = {
  // sección conductor → { 1 conductor, 2 conductores, 3 conductores, 4 conductores, 5 conductores }
  1.5:  { 1: 16, 2: 16, 3: 16, 4: 20, 5: 20 },
  2.5:  { 1: 16, 2: 20, 3: 20, 4: 20, 5: 25 },
  4:    { 1: 16, 2: 20, 3: 20, 4: 25, 5: 25 },
  6:    { 1: 16, 2: 20, 3: 25, 4: 25, 5: 32 },
  10:   { 1: 20, 2: 25, 3: 32, 4: 32, 5: 40 },
  16:   { 1: 20, 2: 32, 3: 32, 4: 40, 5: 40 },
  25:   { 1: 25, 2: 40, 3: 40, 4: 50, 5: 50 },
  35:   { 1: 25, 2: 40, 3: 50, 4: 50, 5: 63 },
  50:   { 1: 32, 2: 50, 3: 50, 4: 63, 5: 63 },
  70:   { 1: 40, 2: 63, 3: 63, 4: 63, 5: 63 },
  95:   { 1: 40, 2: 63, 3: 63, 4: 63, 5: 63 },
  120:  { 1: 50, 2: 63, 3: 63, 4: 63, 5: 63 },
  150:  { 1: 50, 2: 63, 3: 63, 4: 63, 5: 63 },
  185:  { 1: 63, 2: 63, 3: 63, 4: 63, 5: 63 },
  240:  { 1: 63, 2: 63, 3: 63, 4: 63, 5: 63 },
};

// ─── Función de consulta ──────────────────────────────────────────────────

export type NumConductors = 1 | 2 | 3 | 4 | 5;

/**
 * Diámetro mínimo de tubo para un conductor y número de hilos dados.
 * ITC-BT-21 Tabla 5
 *
 * @param sectionMm2 Sección del conductor más grueso (mm²)
 * @param numConductors Número de conductores en el tubo (incluyendo PE)
 */
export function getMinTubeDiameter(
  sectionMm2: number,
  numConductors: NumConductors
): TubeDiameterMm {
  const entry = TUBE_DIAMETER_TABLE[sectionMm2];

  if (!entry) {
    // Para secciones no tabuladas, buscar la sección superior más cercana
    const sections = Object.keys(TUBE_DIAMETER_TABLE).map(Number).sort((a, b) => a - b);
    const nextSection = sections.find(s => s >= sectionMm2);
    if (!nextSection) {
      // Sección muy grande: devolver máximo
      return 63;
    }
    return getMinTubeDiameter(nextSection, numConductors);
  }

  return entry[numConductors];
}

/**
 * Número típico de conductores según tipo de circuito.
 * Ayuda al usuario a no tener que contar manualmente.
 *
 * Monofásico: L + N + PE = 3 conductores
 * Trifásico sin neutro: 3L + PE = 4 conductores
 * Trifásico con neutro: 3L + N + PE = 5 conductores
 */
export function getConductorCountForCircuit(params: {
  phaseSystem: "single" | "three";
  includeNeutral: boolean;
  includeProtection: boolean;
}): NumConductors {
  let count = params.phaseSystem === "three" ? 3 : 1;
  if (params.includeNeutral) count += 1;
  if (params.includeProtection) count += 1;

  // Clamp a 1-5
  const clamped = Math.max(1, Math.min(5, count)) as NumConductors;
  return clamped;
}

// ─── Radios mínimos de curvatura (ITC-BT-21 §2) ──────────────────────────

/**
 * Radio mínimo de curvatura de tubo para no dañar los conductores.
 * Radio mínimo = 6 × diámetro exterior del tubo (regla general)
 */
export function getMinBendRadius(tubeDiameterMm: TubeDiameterMm): number {
  return tubeDiameterMm * 6;
}

// ─── Número máximo de conductores por tubo ────────────────────────────────

/**
 * Diámetro mínimo de tubo para una combinación arbitraria de conductores.
 * Útil cuando en el mismo tubo van conductores de distintas secciones.
 *
 * Método: se usa la sección del conductor de mayor sección como referencia
 * y se busca el número total de conductores.
 */
export function getMinTubeDiameterForMixedConductors(conductors: {
  sectionMm2: number;
  count: number;
}[]): TubeDiameterMm {
  const totalCount = conductors.reduce((sum, c) => sum + c.count, 0);
  const maxSection = Math.max(...conductors.map(c => c.sectionMm2));
  const n = Math.min(totalCount, 5) as NumConductors;
  return getMinTubeDiameter(maxSection, n);
}
