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
export declare const NORMALIZED_TUBE_DIAMETERS_MM: readonly [16, 20, 25, 32, 40, 50, 63];
export type TubeDiameterMm = (typeof NORMALIZED_TUBE_DIAMETERS_MM)[number];
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
export declare const TUBE_DIAMETER_TABLE: Partial<Record<number, TubeTableEntry>>;
export type NumConductors = 1 | 2 | 3 | 4 | 5;
/**
 * Diámetro mínimo de tubo para un conductor y número de hilos dados.
 * ITC-BT-21 Tabla 5
 *
 * @param sectionMm2 Sección del conductor más grueso (mm²)
 * @param numConductors Número de conductores en el tubo (incluyendo PE)
 */
export declare function getMinTubeDiameter(sectionMm2: number, numConductors: NumConductors): TubeDiameterMm;
/**
 * Número típico de conductores según tipo de circuito.
 * Ayuda al usuario a no tener que contar manualmente.
 *
 * Monofásico: L + N + PE = 3 conductores
 * Trifásico sin neutro: 3L + PE = 4 conductores
 * Trifásico con neutro: 3L + N + PE = 5 conductores
 */
export declare function getConductorCountForCircuit(params: {
    phaseSystem: "single" | "three";
    includeNeutral: boolean;
    includeProtection: boolean;
}): NumConductors;
/**
 * Radio mínimo de curvatura de tubo para no dañar los conductores.
 * Radio mínimo = 6 × diámetro exterior del tubo (regla general)
 */
export declare function getMinBendRadius(tubeDiameterMm: TubeDiameterMm): number;
/**
 * Diámetro mínimo de tubo para una combinación arbitraria de conductores.
 * Útil cuando en el mismo tubo van conductores de distintas secciones.
 *
 * Método: se usa la sección del conductor de mayor sección como referencia
 * y se busca el número total de conductores.
 */
export declare function getMinTubeDiameterForMixedConductors(conductors: {
    sectionMm2: number;
    count: number;
}[]): TubeDiameterMm;
export {};
//# sourceMappingURL=itc-bt-21.d.ts.map