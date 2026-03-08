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

// ─── Definición de volúmenes ──────────────────────────────────────────────

export type BathroomVolume = 0 | 1 | 2 | "outside";

export interface VolumeSpec {
  volume: BathroomVolume;
  label: string;
  minIPRating: string;        // Grado de protección mínimo IP
  allowedDevices: string[];
  prohibitedDevices: string[];
  notes: string;
}

export const BATHROOM_VOLUMES: Record<string, VolumeSpec> = {
  "0": {
    volume: 0,
    label: "Volumen 0 — Interior de la bañera/ducha",
    minIPRating: "IPX7",
    allowedDevices: [
      "Equipos de ducha con clasificación IPX7",
      "Calentadores de agua sumergibles certificados",
    ],
    prohibitedDevices: [
      "Tomas de corriente",
      "Interruptores",
      "Luminarias sin certificación específica",
      "Cualquier mecanismo eléctrico convencional",
    ],
    notes: "Solo aparatos específicamente diseñados para inmersión. SELV ≤ 12V AC / 30V DC.",
  },
  "1": {
    volume: 1,
    label: "Volumen 1 — Sobre la bañera/ducha (0–2.25m altura)",
    minIPRating: "IPX4",
    allowedDevices: [
      "Calentadores de agua de acumulación (termo) si están homologados vol.1",
      "Luminarias IPX4",
      "Ventiladores de baño IPX4",
      "Equipos SELV 12V AC / 30V DC",
    ],
    prohibitedDevices: [
      "Tomas de corriente estándar",
      "Interruptores estándar",
      "Cuadros eléctricos",
    ],
    notes: "Se puede instalar termo eléctrico si está certificado para vol.1. Diferencial 30mA obligatorio.",
  },
  "2": {
    volume: 2,
    label: "Volumen 2 — Zona perimetral (60cm alrededor del vol.1)",
    minIPRating: "IPX4",
    allowedDevices: [
      "Tomas de corriente tipo SCHUKO con diferencial 30mA o SELV",
      "Interruptores con IP44 mínimo",
      "Luminarias IPX4",
      "Calentadores fijos IPX4",
    ],
    prohibitedDevices: [
      "Tomas de corriente sin diferencial 30mA",
      "Cuadros eléctricos",
    ],
    notes: "Las tomas de corriente deben estar protegidas por diferencial 30mA. Distancia mínima a bañera: 60cm.",
  },
  "outside": {
    volume: "outside",
    label: "Fuera de los volúmenes",
    minIPRating: "IP2X",
    allowedDevices: [
      "Tomas de corriente con diferencial 30mA",
      "Interruptores y pulsadores normales",
      "Luminarias estándar",
    ],
    prohibitedDevices: [],
    notes: "Instalación normal. Diferencial 30mA obligatorio en todo el baño (C5). Distancia mínima al borde bañera: 60cm para tomas.",
  },
};

// ─── Requisitos de equipotencialidad en baños ─────────────────────────────
// ITC-BT-27 §5 / IEC 60364-7-701

export interface EquipotentialityRequirement {
  element: string;
  mustConnect: boolean;
  minSectionMm2: number;
  notes: string;
}

export const BATHROOM_EQUIPOTENTIALITY: EquipotentialityRequirement[] = [
  {
    element: "Bañera / Plato de ducha metálico",
    mustConnect: true,
    minSectionMm2: 2.5,
    notes: "Conductor suplementario de equipotencialidad local (conductor CP).",
  },
  {
    element: "Tuberías de agua fría y caliente",
    mustConnect: true,
    minSectionMm2: 2.5,
    notes: "En la entrada al baño. Conectar al bus de tierra.",
  },
  {
    element: "Tuberías de calefacción y gas",
    mustConnect: true,
    minSectionMm2: 2.5,
    notes: "Todas las cañerías metálicas accesibles.",
  },
  {
    element: "Partes metálicas accesibles de aparatos de clase I",
    mustConnect: true,
    minSectionMm2: 2.5,
    notes: "Termos, radiadores toallero, etc.",
  },
  {
    element: "Rejillas metálicas de suelo radiante",
    mustConnect: true,
    minSectionMm2: 2.5,
    notes: "Si el sistema de suelo radiante tiene partes metálicas accesibles.",
  },
];

// ─── Función de validación de instalación ────────────────────────────────

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
export function checkBathroomDevice(
  deviceType: "socket" | "switch" | "luminaire" | "heater" | "other",
  volume: BathroomVolume
): BathroomDeviceCheck {
  const normRef = "ITC-BT-27 §3 / IEC 60364-7-701";

  const rules: Record<typeof deviceType, Record<string, { allowed: boolean; reason: string }>> = {
    socket: {
      "0": { allowed: false, reason: "Prohibido en vol.0. Solo equipos IPX7 certificados." },
      "1": { allowed: false, reason: "Prohibido en vol.1. Solo SELV ≤ 12V AC." },
      "2": { allowed: true,  reason: "Permitido solo con diferencial 30mA o alimentación SELV." },
      "outside": { allowed: true, reason: "Permitido con diferencial 30mA. Mínimo 60cm del borde de bañera." },
    },
    switch: {
      "0": { allowed: false, reason: "Prohibido en vol.0." },
      "1": { allowed: false, reason: "Prohibido en vol.1." },
      "2": { allowed: true,  reason: "Permitido con IP44 mínimo." },
      "outside": { allowed: true, reason: "Permitido. Instalación normal." },
    },
    luminaire: {
      "0": { allowed: false, reason: "Solo luminarias IPX7 certificadas para inmersión." },
      "1": { allowed: true,  reason: "Permitido con IPX4 mínimo y diferencial 30mA." },
      "2": { allowed: true,  reason: "Permitido con IPX4 mínimo." },
      "outside": { allowed: true, reason: "Permitido. Instalación normal." },
    },
    heater: {
      "0": { allowed: false, reason: "Prohibido en vol.0." },
      "1": { allowed: true,  reason: "Termo/calentador permitido si homologado para vol.1 (IPX4+)." },
      "2": { allowed: true,  reason: "Calentador fijo permitido con IPX4 mínimo." },
      "outside": { allowed: true, reason: "Permitido. Instalación normal." },
    },
    other: {
      "0": { allowed: false, reason: "Solo equipos certificados para vol.0 (IPX7)." },
      "1": { allowed: false, reason: "Verificar certificación específica para vol.1." },
      "2": { allowed: true,  reason: "Verificar grado IP mínimo IPX4." },
      "outside": { allowed: true, reason: "Instalación normal." },
    },
  };

  const key = String(volume);
  const rule = rules[deviceType]?.[key] ?? { allowed: false, reason: "Volumen no reconocido." };

  return {
    device: deviceType,
    volume,
    isAllowed: rule.allowed,
    reason: rule.reason,
    normRef,
  };
}
