/**
 * ITC-BT-27 — INSTALACIONES EN CUARTOS DE BAÑO Y ASEOS
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-27 / IEC 60364-7-701
 *
 * Define los volúmenes de protección alrededor de bañeras y duchas,
 * y las restricciones de instalación en cada volumen.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * VOLÚMENES DE PROTECCIÓN (ITC-BT-27 §2):
 *
 * Volumen 0: Interior de la bañera o ducha
 *   - Ningún mecanismo eléctrico
 *   - Solo equipos diseñados para este volumen (IPX7)
 *
 * Volumen 1: Sobre la bañera / ducha
 *   - Altura: 0 a 2.25m desde el suelo
 *   - Perímetro: limitado por la proyección vertical de la bañera/plato
 *   - Equipos permitidos: solo los diseñados para vol. 1 (IPX4 mínimo)
 *   - Se permite: termo eléctrico con protección adecuada
 *
 * Volumen 2: Exterior inmediato
 *   - 60 cm alrededor del volumen 1 (horizontal)
 *   - Altura: 0 a 2.25m desde el suelo (o hasta el techo si < 2.25m)
 *   - Equipos: IPX4 mínimo (IPX5 si hay ducha manual)
 *   - Se permite: tomas de corriente SOLO con transformador de aislamiento
 *     o protegidas por diferencial 30mA (tipo SELV/PELV 12V)
 *
 * Fuera de los volúmenes:
 *   - Tomas de corriente normales con diferencial 30mA
 *   - Distancia mínima al borde de la bañera: 60cm
 * ─────────────────────────────────────────────────────────────────────────
 */
export type BathroomVolume = 0 | 1 | 2 | "outside";
export interface VolumeSpec {
    volume: BathroomVolume;
    label: string;
    minIPRating: string;
    allowedDevices: string[];
    prohibitedDevices: string[];
    notes: string;
}
export declare const BATHROOM_VOLUMES: Record<string, VolumeSpec>;
export interface EquipotentialityRequirement {
    element: string;
    mustConnect: boolean;
    minSectionMm2: number;
    notes: string;
}
export declare const BATHROOM_EQUIPOTENTIALITY: EquipotentialityRequirement[];
export interface BathroomDeviceCheck {
    device: string;
    volume: BathroomVolume;
    isAllowed: boolean;
    reason: string;
    normRef: string;
}
/**
 * Verifica si un dispositivo puede instalarse en un volumen de baño dado.
 */
export declare function checkBathroomDevice(deviceType: "socket" | "switch" | "luminaire" | "heater" | "other", volume: BathroomVolume): BathroomDeviceCheck;
//# sourceMappingURL=itc-bt-27.d.ts.map