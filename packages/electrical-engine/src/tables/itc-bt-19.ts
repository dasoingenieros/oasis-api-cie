/**
 * TABLA ITC-BT-19 — Intensidades admisibles (A) a temperatura ambiente 40°C
 *
 * Fuente: REBT RD 842/2002 — ITC-BT-19 Tabla 1
 * Condiciones base:
 *   - Temperatura ambiente: 40°C (en aire) / 25°C (enterrado)
 *   - Temperatura máxima conductor: 70°C (PVC) / 90°C (XLPE/EPR)
 *   - Factor de agrupamiento: 1 (circuito aislado)
 *
 * Estructura: tabla[método][sección_mm2] = intensidad_admisible_A
 *
 * Métodos:
 *   A1 — Conductores unipolares aislados en tubo empotrado en pared aislante
 *   A2 — Cable multiconductor en tubo empotrado en pared aislante
 *   B1 — Conductores unipolares aislados en tubo en pared
 *   B2 — Cable multiconductor en tubo en pared
 *   C  — Cable multiconductor sobre pared, bandeja maciza o en suelo
 *   D  — Cable multiconductor enterrado en tubo
 *   E  — Cable multiconductor al aire o en bandeja perforada
 *   F  — Conductores unipolares al aire o en bandeja perforada (espaciados)
 */

import type { InstallationMethod, InsulationType, SectionMm2 } from "../types";

// ─── Estructura de la tabla ───────────────────────────────────────────────

type AdmissibleCurrentTable = Partial<Record<number, number>>;

interface InsulationTable {
  PVC: AdmissibleCurrentTable;
  XLPE: AdmissibleCurrentTable;
}

type FullCurrentTable = Record<InstallationMethod, InsulationTable>;

// ─── TABLA PRINCIPAL (Cobre, corriente alterna) ───────────────────────────
// Valores en Amperios

export const ITC_BT_19_CURRENT_TABLE_CU: FullCurrentTable = {

  // ─── MÉTODO A1 ── Conductores unipolares, tubo empotrado, pared aislante ──
  A1: {
    PVC: {
      1.5:  13,
      2.5:  17.5,
      4:    23,
      6:    29,
      10:   39,
      16:   52,
      25:   68,
      35:   83,
      50:   99,
      70:  125,
      95:  150,
      120: 172,
      150: 196,
      185: 223,
      240: 261,
      300: 298,
    },
    XLPE: {
      1.5:  15.5,
      2.5:  21,
      4:    27,
      6:    34,
      10:   46,
      16:   61,
      25:   80,
      35:   99,
      50:  119,
      70:  151,
      95:  182,
      120: 210,
      150: 240,
      185: 273,
      240: 321,
      300: 367,
    },
  },

  // ─── MÉTODO A2 ── Cable multiconductor, tubo empotrado, pared aislante ───
  A2: {
    PVC: {
      1.5:  13,
      2.5:  17,
      4:    22,
      6:    28,
      10:   37,
      16:   50,
      25:   65,
      35:   80,
      50:   96,
      70:  121,
      95:  146,
      120: 167,
      150: 190,
      185: 217,
      240: 253,
      300: 289,
    },
    XLPE: {
      1.5:  15,
      2.5:  20,
      4:    26,
      6:    33,
      10:   44,
      16:   59,
      25:   77,
      35:   96,
      50:  115,
      70:  146,
      95:  175,
      120: 201,
      150: 232,
      185: 265,
      240: 311,
      300: 354,
    },
  },

  // ─── MÉTODO B1 ── Conductores unipolares, tubo en pared (superficie) ─────
  B1: {
    PVC: {
      1.5:  15.5,
      2.5:  21,
      4:    28,
      6:    36,
      10:   50,
      16:   68,
      25:   89,
      35:  110,
      50:  134,
      70:  171,
      95:  207,
      120: 239,
      150: 275,
      185: 314,
      240: 369,
      300: 423,
    },
    XLPE: {
      1.5:  19,
      2.5:  25,
      4:    33,
      6:    42,
      10:   57,
      16:   76,
      25:  101,
      35:  125,
      50:  151,
      70:  192,
      95:  232,
      120: 269,
      150: 307,
      185: 351,
      240: 413,
      300: 473,
    },
  },

  // ─── MÉTODO B2 ── Cable multiconductor, tubo en pared (superficie) ────────
  B2: {
    PVC: {
      1.5:  15,
      2.5:  20,
      4:    27,
      6:    34,
      10:   46,
      16:   62,
      25:   80,
      35:   99,
      50:  118,
      70:  149,
      95:  179,
      120: 206,
      150: 234,
      185: 266,
      240: 312,
      300: 355,
    },
    XLPE: {
      1.5:  18,
      2.5:  24,
      4:    31,
      6:    40,
      10:   54,
      16:   73,
      25:   95,
      35:  117,
      50:  141,
      70:  179,
      95:  216,
      120: 249,
      150: 285,
      185: 324,
      240: 380,
      300: 435,
    },
  },

  // ─── MÉTODO C ── Cable multiconductor sobre pared / bandeja maciza ────────
  C: {
    PVC: {
      1.5:  17.5,
      2.5:  24,
      4:    32,
      6:    41,
      10:   57,
      16:   76,
      25:   99,
      35:  121,
      50:  145,
      70:  183,
      95:  220,
      120: 253,
      150: 290,
      185: 329,
      240: 386,
      300: 442,
    },
    XLPE: {
      1.5:  22,
      2.5:  30,
      4:    40,
      6:    51,
      10:   70,
      16:   94,
      25:  119,
      35:  147,
      50:  174,
      70:  220,
      95:  265,
      120: 304,
      150: 347,
      185: 394,
      240: 461,
      300: 528,
    },
  },

  // ─── MÉTODO D ── Cable enterrado en tubo ──────────────────────────────────
  // Temperatura ambiente suelo 25°C, resistividad 2.5 K·m/W
  D: {
    PVC: {
      1.5:  22,
      2.5:  29,
      4:    37,
      6:    46,
      10:   61,
      16:   79,
      25:  101,
      35:  122,
      50:  144,
      70:  178,
      95:  211,
      120: 240,
      150: 271,
      185: 304,
      240: 350,
      300: 394,
    },
    XLPE: {
      1.5:  26,
      2.5:  35,
      4:    44,
      6:    56,
      10:   73,
      16:   95,
      25:  121,
      35:  147,
      50:  173,
      70:  213,
      95:  252,
      120: 287,
      150: 323,
      185: 362,
      240: 416,
      300: 467,
    },
  },

  // ─── MÉTODO E ── Cable multiconductor al aire / bandeja perforada ─────────
  E: {
    PVC: {
      1.5:  19.5,
      2.5:  27,
      4:    36,
      6:    46,
      10:   63,
      16:   85,
      25:  112,
      35:  138,
      50:  168,
      70:  213,
      95:  258,
      120: 299,
      150: 344,
      185: 392,
      240: 461,
      300: 530,
    },
    XLPE: {
      1.5:  24,
      2.5:  33,
      4:    44,
      6:    56,
      10:   76,
      16:  101,
      25:  133,
      35:  164,
      50:  198,
      70:  253,
      95:  306,
      120: 354,
      150: 407,
      185: 463,
      240: 546,
      300: 629,
    },
  },

  // ─── MÉTODO F ── Conductores unipolares al aire / bandeja perforada ───────
  // Cables espaciados (no en contacto)
  F: {
    PVC: {
      1.5:  22,
      2.5:  30,
      4:    40,
      6:    51,
      10:   70,
      16:   94,
      25:  119,
      35:  148,
      50:  180,
      70:  232,
      95:  282,
      120: 328,
      150: 379,
      185: 434,
      240: 514,
      300: 593,
    },
    XLPE: {
      1.5:  26,
      2.5:  36,
      4:    49,
      6:    63,
      10:   86,
      16:  115,
      25:  150,
      35:  185,
      50:  225,
      70:  289,
      95:  352,
      120: 410,
      150: 473,
      185: 542,
      240: 641,
      300: 741,
    },
  },
};

// ─── TABLA ALUMINIO ─────────────────────────────────────────────────────────
// Sección mínima Al: 16mm² (no se admite < 16mm² en Al para instalaciones interiores)
// Factor aproximado Cu→Al: 0.78 para PVC, 0.78 para XLPE

export const ITC_BT_19_CURRENT_TABLE_AL: FullCurrentTable = {
  A1: {
    PVC: {
      16:   40,
      25:   53,
      35:   65,
      50:   78,
      70:   98,
      95:  118,
      120: 135,
      150: 155,
      185: 176,
      240: 207,
      300: 236,
    },
    XLPE: {
      16:   47,
      25:   62,
      35:   77,
      50:   92,
      70:  117,
      95:  141,
      120: 162,
      150: 185,
      185: 211,
      240: 248,
      300: 283,
    },
  },
  A2: {
    PVC: {
      16:   39,
      25:   51,
      35:   62,
      50:   75,
      70:   95,
      95:  113,
      120: 130,
      150: 149,
      185: 169,
      240: 198,
      300: 226,
    },
    XLPE: {
      16:   46,
      25:   60,
      35:   74,
      50:   89,
      70:  113,
      95:  135,
      120: 155,
      150: 179,
      185: 204,
      240: 240,
      300: 274,
    },
  },
  B1: {
    PVC: {
      16:   53,
      25:   70,
      35:   86,
      50:  104,
      70:  133,
      95:  161,
      120: 186,
      150: 213,
      185: 243,
      240: 286,
      300: 328,
    },
    XLPE: {
      16:   59,
      25:   78,
      35:   97,
      50:  118,
      70:  150,
      95:  181,
      120: 210,
      150: 240,
      185: 274,
      240: 323,
      300: 369,
    },
  },
  B2: {
    PVC: {
      16:   48,
      25:   62,
      35:   77,
      50:   92,
      70:  116,
      95:  139,
      120: 160,
      150: 182,
      185: 207,
      240: 242,
      300: 276,
    },
    XLPE: {
      16:   57,
      25:   74,
      35:   92,
      50:  110,
      70:  140,
      95:  169,
      120: 195,
      150: 223,
      185: 254,
      240: 298,
      300: 341,
    },
  },
  C: {
    PVC: {
      16:   59,
      25:   77,
      35:   94,
      50:  113,
      70:  143,
      95:  172,
      120: 198,
      150: 227,
      185: 259,
      240: 305,
      300: 349,
    },
    XLPE: {
      16:   73,
      25:   93,
      35:  114,
      50:  136,
      70:  172,
      95:  207,
      120: 239,
      150: 274,
      185: 311,
      240: 365,
      300: 419,
    },
  },
  D: {
    PVC: {
      16:   62,
      25:   80,
      35:   96,
      50:  113,
      70:  140,
      95:  166,
      120: 189,
      150: 213,
      185: 240,
      240: 277,
      300: 312,
    },
    XLPE: {
      16:   74,
      25:   95,
      35:  115,
      50:  135,
      70:  167,
      95:  199,
      120: 226,
      150: 256,
      185: 287,
      240: 330,
      300: 371,
    },
  },
  E: {
    PVC: {
      16:   67,
      25:   87,
      35:  107,
      50:  131,
      70:  167,
      95:  202,
      120: 234,
      150: 269,
      185: 308,
      240: 363,
      300: 419,
    },
    XLPE: {
      16:   80,
      25:  105,
      35:  128,
      50:  156,
      70:  200,
      95:  242,
      120: 281,
      150: 324,
      185: 371,
      240: 439,
      300: 508,
    },
  },
  F: {
    PVC: {
      16:   73,
      25:   94,
      35:  117,
      50:  142,
      70:  183,
      95:  223,
      120: 260,
      150: 301,
      185: 344,
      240: 408,
      300: 472,
    },
    XLPE: {
      16:   90,
      25:  118,
      35:  146,
      50:  179,
      70:  230,
      95:  280,
      120: 326,
      150: 377,
      185: 432,
      240: 513,
      300: 594,
    },
  },
};

// ─── Función de consulta ─────────────────────────────────────────────────────

import type { ConductorMaterial } from "../types";

/**
 * Obtiene la intensidad admisible de tabla ITC-BT-19 para las condiciones dadas.
 * @throws EngineError si la combinación método/sección no está en tabla
 */
export function getAdmissibleCurrent(
  method: InstallationMethod,
  sectionMm2: number,
  insulation: InsulationType,
  material: ConductorMaterial = "Cu"
): number {
  const table = material === "Cu"
    ? ITC_BT_19_CURRENT_TABLE_CU
    : ITC_BT_19_CURRENT_TABLE_AL;

  const methodTable = table[method];
  if (!methodTable) {
    throw new Error(`ITCBT19_METHOD_NOT_FOUND: Método '${method}' no encontrado en tabla ITC-BT-19`);
  }

  // EPR tiene mismos valores que XLPE
  const insulationKey: "PVC" | "XLPE" = insulation === "PVC" ? "PVC" : "XLPE";
  const insulationTable = methodTable[insulationKey];

  const value = insulationTable[sectionMm2];
  if (value === undefined) {
    throw new Error(
      `ITCBT19_SECTION_NOT_FOUND: Sección ${sectionMm2}mm² no disponible para método ${method}/${material}/${insulation}. ` +
      `Secciones disponibles: ${Object.keys(insulationTable).join(", ")}mm²`
    );
  }

  return value;
}

/**
 * Devuelve todas las secciones disponibles para un método e insulación dados.
 */
export function getAvailableSections(
  method: InstallationMethod,
  insulation: InsulationType,
  material: ConductorMaterial = "Cu"
): number[] {
  const table = material === "Cu"
    ? ITC_BT_19_CURRENT_TABLE_CU
    : ITC_BT_19_CURRENT_TABLE_AL;

  const insulationKey: "PVC" | "XLPE" = insulation === "PVC" ? "PVC" : "XLPE";
  const sections = Object.keys(table[method]?.[insulationKey] ?? {}).map(Number);
  return sections.sort((a, b) => a - b);
}
