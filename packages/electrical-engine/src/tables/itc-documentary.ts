/**
 * ITCs DOCUMENTALES Y DE INSTALACIONES ESPECIALES
 *
 * Este archivo recoge las ITCs que no tienen tablas de cálculo ejecutables
 * en el motor, pero cuyos requisitos deben reflejarse en los certificados
 * y en la memoria técnica.
 *
 * Estructura:
 *   - ITC-BT-01: Terminología y definiciones
 *   - ITC-BT-04: Documentación y puesta en servicio
 *   - ITC-BT-05: Verificaciones e inspecciones
 *   - ITC-BT-08: Sistemas de conexión del neutro y masas
 *   - ITC-BT-20: Sistemas de instalación — tabla de compatibilidades
 *   - ITC-BT-26: Instalaciones interiores en viviendas — prescripciones generales
 *   - ITC-BT-28: Locales de pública concurrencia (instalaciones especiales MVP-fase2)
 *   - ITC-BT-29: Locales con riesgo de incendio o explosión — ATEX
 *   - ITC-BT-30: Locales húmedos, mojados y de trabajo agrícola
 *   - ITC-BT-39: Instalaciones de alumbrado exterior
 *   - ITC-BT-40: Instalaciones generadoras de baja tensión
 *   - ITC-BT-52: Infraestructura para recarga de VE
 */

// ─── ITC-BT-01: Terminología ──────────────────────────────────────────────

export const REBT_DEFINITIONS = {
  "Instalación eléctrica":
    "Conjunto de aparatos y circuitos asociados, en previsión de un fin particular: producción, conversión, transformación, transmisión, distribución o utilización de la energía eléctrica.",
  "Tensión nominal":
    "Tensión con que se designa una instalación o parte de ella, y que sirve, junto con la intensidad nominal u otras magnitudes, para designarla.",
  "Corriente de cortocircuito (Icc)":
    "Sobrecorriente resultante de un defecto de impedancia despreciable entre conductores activos que tienen diferente potencial en condiciones normales de funcionamiento.",
  "Intensidad admisible (Iz)":
    "Valor de la corriente eléctrica continua, que puede transportar un conductor en condiciones de servicio especificadas sin que su temperatura en régimen permanente supere un valor especificado.",
  "Caída de tensión (CdT)":
    "Diferencia algebraica entre las tensiones en dos puntos de un circuito, en condiciones de funcionamiento.",
  "Diferencial (ID)":
    "Dispositivo destinado a la protección de las personas contra los choques eléctricos por contactos indirectos.",
  "PIA":
    "Pequeño Interruptor Automático. Dispositivo de protección contra sobreintensidades (sobrecargas y cortocircuitos) de uso doméstico.",
  "CGMP":
    "Cuadro General de Mando y Protección. Cuadro en el que se ubican los dispositivos de mando y protección de los circuitos interiores de la instalación.",
  "Derivación individual (DI)":
    "Parte de la instalación que, partiendo de la línea general de alimentación (LGA) o de los fusibles de seguridad, suministra energía eléctrica a un usuario.",
  "LGA":
    "Línea General de Alimentación. Parte de la instalación comprendida entre la Caja General de Protección (CGP) y el equipo de medida.",
};

// ─── ITC-BT-04: Documentación necesaria para puesta en servicio ───────────

export interface DocumentationRequirement {
  document: string;
  required: boolean;
  responsible: "instalador" | "instalador_autorizado" | "ingeniero" | "organismo";
  notes: string;
}

export const DOCUMENTATION_REQUIREMENTS: DocumentationRequirement[] = [
  {
    document: "Certificado de instalación eléctrica (CIE/BRIE)",
    required: true,
    responsible: "instalador_autorizado",
    notes: "Firmado por instalador autorizado de categoría correspondiente.",
  },
  {
    document: "Memoria técnica de diseño (MTD) o proyecto",
    required: true,
    responsible: "ingeniero",
    notes: "Proyecto por ingeniero titulado para instalaciones > 100kW o especiales.",
  },
  {
    document: "Esquema unifilar",
    required: true,
    responsible: "instalador_autorizado",
    notes: "Refleja los circuitos, secciones, protecciones y cuadros.",
  },
  {
    document: "Acta de verificación (ensayos)",
    required: true,
    responsible: "instalador_autorizado",
    notes: "Resultado de las medidas de verificación UNE 20460: aislamiento, continuidad, Rt.",
  },
  {
    document: "Informe de inspección inicial OCA",
    required: false, // Solo para instalaciones de media tensión o especiales
    responsible: "organismo",
    notes: "Obligatorio para instalaciones de media tensión, locales pública concurrencia, ATEX, etc.",
  },
];

// ─── ITC-BT-05: Verificaciones ────────────────────────────────────────────

export interface VerificationTest {
  test: string;
  standard: string;
  minValue?: string;
  maxValue?: string;
  instrument: string;
  notes: string;
}

export const VERIFICATION_TESTS: VerificationTest[] = [
  {
    test: "Resistencia de aislamiento entre conductores activos y tierra",
    standard: "UNE 20460-6 / IEC 60364-6",
    minValue: "1 MΩ (instalación completa) / 0.5 MΩ (por tramo)",
    instrument: "Megóhmetro 500V CC (PELV) o 1000V CC (FELV)",
    notes: "Con toda la instalación desconectada. Medir fase-PE, neutro-PE, fase-neutro.",
  },
  {
    test: "Continuidad de conductores de protección y equipotencialidad",
    standard: "UNE 20460-6",
    maxValue: "< 1Ω (para longitudes normales)",
    instrument: "Miliohmetro o comprobador de continuidad",
    notes: "Verificar continuidad desde cada masa hasta el borne de tierra del cuadro.",
  },
  {
    test: "Resistencia de puesta a tierra",
    standard: "UNE 20460-6 / ITC-BT-18",
    maxValue: "Según cálculo: típicamente ≤ 20Ω (con diff 30mA, seco)",
    instrument: "Telurómetro (método 3 electrodos / método de caída de potencial)",
    notes: "Con la instalación en servicio o desconectada según método.",
  },
  {
    test: "Polaridad de circuitos",
    standard: "UNE 20460-6",
    instrument: "Comprobador de polaridad / tester",
    notes: "Verificar que fase va a contacto interior de la base de enchufe y a borne Z de la luminaria.",
  },
  {
    test: "Funcionamiento de diferenciales",
    standard: "ITC-BT-24",
    instrument: "Comprobador de diferenciales (pulsador test + medidor tiempo actuación)",
    notes: "Tiempo máximo actuación: < 300ms para 30mA. Verificar con 30mA, 150mA y 300mA.",
  },
  {
    test: "Comprobación de circuitos y cuadro",
    standard: "ITC-BT-17",
    instrument: "Inspección visual + tester",
    notes: "Verificar identificación de circuitos, secciones, calibres y etiquetado del cuadro.",
  },
];

// ─── ITC-BT-08: Sistemas de conexión del neutro ───────────────────────────

export type NetworkSystem = "TT" | "TN-S" | "TN-C" | "TN-CS" | "IT";

export const NETWORK_SYSTEMS: Record<NetworkSystem, {
  label: string;
  description: string;
  typicalUse: string;
  differentialRequired: boolean;
}> = {
  TT: {
    label: "Sistema TT",
    description: "Neutro de la red directo a tierra. Masas de la instalación conectadas a tierra independiente.",
    typicalUse: "España: instalaciones de edificios residenciales y comerciales. El sistema estándar.",
    differentialRequired: true,
  },
  "TN-S": {
    label: "Sistema TN-S",
    description: "Conductor de neutro (N) y conductor de protección (PE) separados en todo el recorrido.",
    typicalUse: "Instalaciones industriales, data centers, hospitales.",
    differentialRequired: false, // La protección es por desconexión automática Icc
  },
  "TN-C": {
    label: "Sistema TN-C",
    description: "Neutro y protección combinados en un solo conductor (PEN). Prohibido para secciones < 10mm² Cu.",
    typicalUse: "Solo en distribución. Prohibido en instalaciones interiores nuevas (ITC-BT-08).",
    differentialRequired: false,
  },
  "TN-CS": {
    label: "Sistema TN-C-S",
    description: "TN-C en parte de la instalación y TN-S en otra. La separación N/PE se hace en el cuadro principal.",
    typicalUse: "Instalaciones industriales con transformador propio.",
    differentialRequired: false,
  },
  IT: {
    label: "Sistema IT",
    description: "Ningún punto de la red conectado directamente a tierra (o conexión a tierra de alta impedancia).",
    typicalUse: "Quirófanos, sistemas de alimentación ininterrumpida, minas.",
    differentialRequired: false,
  },
};

// ─── ITC-BT-20: Sistemas de instalación ──────────────────────────────────

export type InstalledIn = "wall_concealed" | "wall_surface" | "ceiling" | "buried" | "tray" | "duct" | "air";

export const INSTALLATION_METHOD_DESCRIPTIONS: Record<string, string> = {
  A1: "Conductores unipolares aislados bajo tubo empotrado en pared aislante",
  A2: "Cable multiconductor bajo tubo empotrado en pared aislante",
  B1: "Conductores unipolares aislados bajo tubo en montaje superficial en pared",
  B2: "Cable multiconductor bajo tubo en montaje superficial en pared",
  C:  "Cable multiconductor sobre pared, suelo o bandeja sin perforar",
  D:  "Cable multiconductor bajo tubo enterrado en el suelo",
  E:  "Cable multiconductor al aire o sobre bandeja perforada",
  F:  "Conductores unipolares al aire o sobre bandeja perforada (espaciados)",
};

// ─── Instalaciones especiales — fuera del MVP (fase 2+) ──────────────────

export const SPECIAL_INSTALLATIONS = {
  "ITC-BT-28": {
    name: "Locales de pública concurrencia",
    description: "Teatros, cines, discotecas, restaurantes > 50 personas, grandes superficies...",
    keyRequirements: [
      "Alumbrado de emergencia obligatorio",
      "Fuente propia de energía para alumbrado de emergencia (autonomía ≥ 1h)",
      "Circuitos independientes alumbrado / fuerza",
      "Cabinas de proyección con instalación específica",
    ],
    mvpStatus: "fase2",
  },
  "ITC-BT-29": {
    name: "Locales con riesgo de incendio o explosión (ATEX)",
    description: "Gasolineras, plantas químicas, almacenes de materiales inflamables...",
    keyRequirements: [
      "Clasificación de zonas ATEX (0, 1, 2 gas; 20, 21, 22 polvo)",
      "Material certificado ATEX según zona",
      "Cableado y canalizaciones antideflagrantes",
    ],
    mvpStatus: "fase3",
  },
  "ITC-BT-30": {
    name: "Instalaciones en locales húmedos, mojados y de trabajo agrícola",
    description: "Lavaderos, granjas, instalaciones de riego...",
    keyRequirements: [
      "Grado de protección IP según ubicación",
      "Diferencial 30mA en todos los circuitos",
      "Canalización estanca",
    ],
    mvpStatus: "fase2",
  },
  "ITC-BT-52": {
    name: "Infraestructura para recarga de vehículos eléctricos",
    description: "Puntos de recarga en garajes, parkings y vía pública.",
    keyRequirements: [
      "Circuito exclusivo por punto de recarga",
      "Diferencial tipo A (30mA) como mínimo",
      "Modo 1/2/3/4 según IEC 61851",
      "Protección contra corrientes de fuga DC",
    ],
    mvpStatus: "fase2",
  },
  "ITC-BT-40": {
    name: "Instalaciones generadoras de baja tensión (autoconsumo)",
    description: "Instalaciones fotovoltaicas, grupos electrógenos, cogeneración.",
    keyRequirements: [
      "Protección de desconexión de la red (anti-isla)",
      "Interruptor de corte en carga accesible al distribuidor",
      "Contadores bidireccionales",
      "Cumplimiento RD 244/2019 (autoconsumo FV)",
    ],
    mvpStatus: "fase2",
  },
} as const;
