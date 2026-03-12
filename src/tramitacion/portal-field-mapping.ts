/**
 * PORTAL DEL INSTALADOR (ASEICAM) — Constantes y mapeos
 *
 * Valores oficiales del portal para selects, lookups y secuencia de campos.
 * Compartido entre TramitacionMapper, PlaywrightService y frontend.
 */

// =============================================================================
// URLs del portal
// =============================================================================

export const PORTAL_URLS = {
  login:
    'https://app.elportaldelinstalador.com/aseicam/pdi/pages/seguridad/login.jsf',
  home: 'https://app.elportaldelinstalador.com/aseicam/pdi/pages/gestion/solicitud/listaSolicitud.jsf',
  altaSolicitud:
    'https://app.elportaldelinstalador.com/aseicam/pdi/pages/gestion/solicitud/altaSolicitud2.jsf',
} as const;

export const FORM_PREFIX = 'form_abm:tabs:';

// =============================================================================
// Valores de selects — IDs internos del portal
// =============================================================================

export const TIPO_DOCUMENTO = {
  NIF: 'f90d83c7-a4e0-4aec-8e71-e85bf0748482',
  NIE: '3f21e642-c892-425d-bd60-8f5961029af9',
  PASAPORTE: 'a0a5c6fc-2899-4983-b7c6-c7a4f6d7b25b',
} as const;

export const TIPO_SUMINISTRO = {
  MONOFASICO: '8901',
  TRIFASICO: '8902',
  NIO: '8903',
} as const;

export const TENSION_SUMINISTRO = {
  '127V': '9001',
  '220V': '9002',
  '230V': '9003',
  '380V': '9004',
  '400V': '9005',
  ALTA_TENSION: '9006',
  OTROS: '9007',
  NIO: '9008',
} as const;

export const COMPANIA_DISTRIBUIDORA = {
  'I-DE': '9101',
  UFD: '9102',
  HIDROCANTABRICO: '9103',
  E_DISTRIBUCION: '9107',
  TAJUNA: '9104',
  POZO_TIO_RAIMUNDO: '9105',
  HIDROELECTRICA_VEGA: '9106',
  LAS_MERCEDES: '9108',
  VIESGO: '9109',
} as const;

export const SISTEMA_CONEXION = {
  TT: 'TT',
  TN_S: 'TN-S',
  TN_C: 'TN-C',
  TN_C_S: 'TN-C-S',
  IT: 'IT',
} as const;

export const PROVINCIA = {
  MADRID: '31',
} as const;

export const TIPO_VIA: Record<string, string> = {
  ACCESO: '11',
  ALAMEDA: '12',
  APARTAMENTO: '13',
  ARROYO: '14',
  AUTOVIA: '16',
  AVENIDA: '17',
  BARRIADA: '18',
  BARRIO: '19',
  BARRANCO: '20',
  BULEVAR: '21',
  CALLE: '22',
  CAMPAMENTO: '23',
  CAÑADA: '24',
  CARRERA: '25',
  CASERIO: '26',
  CERRO: '27',
  CONJUNTO: '28',
  CALLEJA: '29',
  CALLEJON: '30',
  CAMINO: '31',
  COLONIA: '32',
  COMPLEJO: '33',
  CARRIL: '34',
  COSTANILLA: '35',
  CARRETERA: '36',
  CUESTA: '37',
  DISEMINADO: '38',
  ESCALINATA: '39',
  ESTACION: '40',
  ESTADIO: '41',
  EXTRARRADIO: '42',
  'FUNDACION BENEFICA DOCENTE': '43',
  'FERROCARRIL DESMANTELADO': '44',
  FINCA: '45',
  GALERIA: '46',
  GRUPO: '47',
  GLORIETA: '48',
  'GRAN VIA': '49',
  JARDIN: '50',
  LUGAR: '51',
  PARAJE: '52',
  PARTICULAR: '53',
  PASEO: '54',
  PISTA: '55',
  PLAZA: '56',
  PLAZUELA: '57',
  PUENTE: '58',
  POBLADO: '59',
  POLIGONO: '60',
  PARQUE: '61',
  PROLONGACION: '62',
  PASAJE: '63',
  PUERTA: '64',
  PASADIZO: '65',
  RIO: '66',
  RINCONADA: '67',
  RINCON: '68',
  RONDA: '69',
  ROTONDA: '70',
  SECTOR: '71',
  SENDA: '72',
  SITIO: '73',
  SUBIDA: '74',
  TRAVESIA: '75',
  URBANIZACION: '77',
  VIA: '78',
  VEREDA: '79',
  ZONA: '80',
};

export const OCA_EICI: Record<string, string> = {
  BUREAU_VERITAS: '3b424b82-2261-45d3-965e-bda0282e1669',
  ISPEN: '26d7c29e-149e-4e87-b7ce-ca5a8130e40d',
  TUV_RHEINLAND: 'c5036225-0c3f-49c0-9301-3a237a629238',
  NOVOCONTROL: 'cedba94d-96f3-41bf-9d87-394f54fcc2fd',
  PROTEX: 'e1280b5b-06bb-472c-8dc5-dbbd9c3c4d0a',
  ALDEC: '7de580e8-9f7b-48ae-9320-1a5c5e5441fc',
  ADDIENT: 'b5d36aeb-5de9-453f-b4de-45bbc395a0a5',
  TUV_SUD_ATISAE: '5eb2e755-0251-4565-8e97-1e84b2b2cd41',
  INGEIN: 'f2164508-5d30-49f7-a721-084039a78c0e',
};

// =============================================================================
// Poblaciones de Madrid (180 poblaciones — código del portal)
// =============================================================================

export const POBLACIONES_MADRID: Record<string, string> = {
  'ACEBEDA, LA': '1', 'AJALVIR': '2', 'ALAMEDA DEL VALLE': '3', 'ÁLAMO, EL': '4',
  'ALCALÁ DE HENARES': '5', 'ALCOBENDAS': '6', 'ALCORCÓN': '7', 'ALDEA DEL FRESNO': '8',
  'ALGETE': '9', 'ALPEDRETE': '10', 'AMBITE': '11', 'ANCHUELO': '12',
  'ARANJUEZ': '13', 'ARGANDA DEL REY': '14', 'ARROYOMOLINOS': '15', 'ATAZAR, EL': '16',
  'BATRES': '17', 'BECERRIL DE LA SIERRA': '18', 'BELMONTE DE TAJO': '19', 'BERRUECO, EL': '20',
  'BERZOSA DEL LOZOYA': '21', 'BOADILLA DEL MONTE': '22', 'BOALO, EL': '23', 'BRAOJOS': '24',
  'BREA DE TAJO': '25', 'BRUNETE': '26', 'BUITRAGO DEL LOZOYA': '27', 'BUSTARVIEJO': '28',
  'CABANILLAS DE LA SIERRA': '29', 'CABRERA, LA': '30', 'CADALSO DE LOS VIDRIOS': '31',
  'CAMARMA DE ESTERUELAS': '32', 'CAMPO REAL': '33', 'CANENCIA': '34', 'CARABAÑA': '35',
  'CASARRUBUELOS': '36', 'CENICIENTOS': '37', 'CERCEDILLA': '38', 'CERVERA DE BUITRAGO': '39',
  'CHAPINERÍA': '40', 'CHINCHÓN': '41', 'CIEMPOZUELOS': '42', 'COBEÑA': '43',
  'COLLADO MEDIANO': '44', 'COLLADO VILLALBA': '45', 'COLMENAR DE OREJA': '46',
  'COLMENAR DEL ARROYO': '47', 'COLMENAR VIEJO': '48', 'COLMENAREJO': '49', 'CORPA': '50',
  'COSLADA': '51', 'CUBAS DE LA SAGRA': '52', 'DAGANZO DE ARRIBA': '53', 'DESCONOCIDO': '54',
  'ESCORIAL, EL': '55', 'ESTREMERA': '56', 'FRESNEDILLAS DE LA OLIVA': '57',
  'FRESNO DE TOROTE': '58', 'FUENLABRADA': '59', 'FUENTE EL SAZ DE JARAMA': '60',
  'FUENTIDUEÑA DE TAJO': '61', 'GALAPAGAR': '62', 'GARGANTA DE LOS MONTES': '63',
  'GARGANTILLA DEL LOZOYA Y PINILLA DE BUITRAGO': '64', 'GASCONES': '65', 'GETAFE': '66',
  'GRIÑÓN': '67', 'GUADALIX DE LA SIERRA': '68', 'GUADARRAMA': '69', 'HIRUELA, LA': '70',
  'HORCAJO DE LA SIERRA': '71', 'HORCAJUELO DE LA SIERRA': '72', 'HOYO DE MANZANARES': '73',
  'HUMANES DE MADRID': '74', 'LEGANÉS': '75', 'LOECHES': '76', 'LOZOYA': '77',
  'LOZOYUELA-NAVAS-SIETEIGLESIAS': '78', 'MADARCOS': '79', 'MADRID': '80',
  'MAJADAHONDA': '81', 'MANZANARES EL REAL': '82', 'MECO': '83', 'MEJORADA DEL CAMPO': '84',
  'MIRAFLORES DE LA SIERRA': '85', 'MOLAR, EL': '86', 'MOLINOS, LOS': '87',
  'MONTEJO DE LA SIERRA': '88', 'MORALEJA DE ENMEDIO': '89', 'MORALZARZAL': '90',
  'MORATA DE TAJUÑA': '91', 'MÓSTOLES': '92', 'NAVACERRADA': '93', 'NAVALAFUENTE': '94',
  'NAVALAGAMELLA': '95', 'NAVALCARNERO': '96', 'NAVARREDONDA Y SAN MAMÉS': '97',
  'NAVAS DEL REY': '98', 'NUEVO BAZTÁN': '99', 'OLMEDA DE LAS FUENTES': '100',
  'ORUSCO DE TAJUÑA': '101', 'PARACUELLOS DE JARAMA': '102', 'PARLA': '103',
  'PATONES': '104', 'PEDREZUELA': '105', 'PELAYOS DE LA PRESA': '106',
  'PERALES DE TAJUÑA': '107', 'PEZUELA DE LAS TORRES': '108', 'PINILLA DEL VALLE': '109',
  'PINTO': '110', 'PIÑUÉCAR-GANDULLAS': '111', 'POZUELO DE ALARCÓN': '112',
  'POZUELO DEL REY': '113', 'PRÁDENA DEL RINCÓN': '114', 'PUEBLA DE LA SIERRA': '115',
  'PUENTES VIEJAS': '116', 'QUIJORNA': '117', 'RASCAFRÍA': '118', 'REDUEÑA': '119',
  'RIBATEJADA': '120', 'RIVAS-VACIAMADRID': '121', 'ROBLEDILLO DE LA JARA': '122',
  'ROBLEDO DE CHAVELA': '123', 'ROBREGORDO': '124', 'ROZAS DE MADRID, LAS': '125',
  'ROZAS DE PUERTO REAL': '126', 'SAN AGUSTÍN DEL GUADALIX': '127',
  'SAN FERNANDO DE HENARES': '128', 'SAN LORENZO DE EL ESCORIAL': '129',
  'SAN MARTÍN DE LA VEGA': '130', 'SAN MARTÍN DE VALDEIGLESIAS': '131',
  'SAN SEBASTIÁN DE LOS REYES': '132', 'SANTA MARÍA DE LA ALAMEDA': '133',
  'SANTORCAZ': '134', 'SANTOS DE LA HUMOSA, LOS': '135', 'SERNA DEL MONTE, LA': '136',
  'SERRANILLOS DEL VALLE': '137', 'SEVILLA LA NUEVA': '138', 'SOMOSIERRA': '139',
  'SOTO DEL REAL': '140', 'TALAMANCA DE JARAMA': '141', 'TIELMES': '142',
  'TITULCIA': '143', 'TORREJÓN DE ARDOZ': '144', 'TORREJÓN DE LA CALZADA': '145',
  'TORREJÓN DE VELASCO': '146', 'TORRELAGUNA': '147', 'TORRELODONES': '148',
  'TORREMOCHA DE JARAMA': '149', 'TORRES DE LA ALAMEDA': '150', 'TRES CANTOS': '151',
  'VALDARACETE': '152', 'VALDEAVERO': '153', 'VALDELAGUNA': '154', 'VALDEMANCO': '155',
  'VALDEMAQUEDA': '156', 'VALDEMORILLO': '157', 'VALDEMORO': '158',
  'VALDEOLMOS-ALALPARDO': '159', 'VALDEPIÉLAGOS': '160', 'VALDETORRES DE JARAMA': '161',
  'VALDILECHA': '162', 'VALVERDE DE ALCALÁ': '163', 'VELILLA DE SAN ANTONIO': '164',
  'VELLÓN, EL': '165', 'VENTURADA': '166', 'VILLACONEJOS': '167', 'VILLA DEL PRADO': '168',
  'VILLALBILLA': '169', 'VILLAMANRIQUE DE TAJO': '170', 'VILLAMANTA': '171',
  'VILLAMANTILLA': '172', 'VILLANUEVA DE LA CAÑADA': '173', 'VILLANUEVA DEL PARDILLO': '174',
  'VILLANUEVA DE PERALES': '175', 'VILLAR DEL OLMO': '176', 'VILLAREJO DE SALVANÉS': '177',
  'VILLAVICIOSA DE ODÓN': '178', 'VILLAVIEJA DEL LOZOYA': '179', 'ZARZALEJO': '180',
};

// =============================================================================
// PrimeFaces widgets — mapeo de widgets a rellenar
// =============================================================================

export const PF_WIDGETS = {
  // Tab 0
  oca: { type: 'SELECT' as const, ajax: true },
  // Tab 1 — Emplazamiento
  provincia: { type: 'SELECT' as const, ajax: true, waitAfter: 1500 },
  poblacion: { type: 'SELECT' as const, ajax: true, waitAfter: 500 },
  tipoVia: { type: 'SELECT' as const, ajax: true, waitAfter: 500 },
  via: { type: 'AUTO' as const, ajax: false },
  numero: { type: 'INPUT' as const, ajax: false },
  portal: { type: 'INPUT' as const, ajax: false },
  escalera: { type: 'INPUT' as const, ajax: false },
  piso: { type: 'INPUT' as const, ajax: false },
  puerta: { type: 'INPUT' as const, ajax: false },
  codigoPostal: { type: 'INPUT' as const, ajax: false },
  // Tab 3 — Datos técnicos
  tipoSuministro: { type: 'SELECT' as const, ajax: true },
  tensionSuministro: { type: 'SELECT' as const, ajax: true },
  companiaDistribuidora: { type: 'SELECT' as const, ajax: true },
  sistemaConexion: { type: 'SELECT' as const, ajax: true },
  potenciaMaximaAdmisible: { type: 'INPUT' as const, ajax: false },
  valorInterruptorGral: { type: 'INPUT' as const, ajax: false },
  cups: { type: 'INPUT' as const, ajax: false },
  seccionAcometida: { type: 'INPUT' as const, ajax: false },
  instalacionAislada: { type: 'CHECK' as const, ajax: false },
  viviendaUnifamiliar: { type: 'CHECK' as const, ajax: false },
  // Tab 8 — Titular
  tipoDocumentoTITULAR_8: { type: 'SELECT' as const, ajax: true },
  numeroDocumentoTITULAR_8: { type: 'AUTO' as const, ajax: false },
  provinciaTITULAR_8: { type: 'SELECT' as const, ajax: true, waitAfter: 1500 },
  poblacionTITULAR_8: { type: 'SELECT' as const, ajax: true, waitAfter: 500 },
  tipoViaTITULAR_8: { type: 'SELECT' as const, ajax: true, waitAfter: 500 },
  viaTITULAR_8: { type: 'AUTO' as const, ajax: false },
} as const;

export const PLAYWRIGHT_STEPS = [
  'LOGIN',
  'CREATE_SOLICITUD',
  'FILL_OCA_EICI',
  'FILL_EMPLAZAMIENTO',
  'FILL_TITULAR',
  'FILL_DATOS_TECNICOS',
  'SAVE',
  'UPLOAD_DOCUMENTS',
  'SEND',
  'VERIFY',
] as const;

export type PlaywrightStep = (typeof PLAYWRIGHT_STEPS)[number];

// =============================================================================
// Interfaz de datos mapeados para el portal
// =============================================================================

export interface PortalSolicitudData {
  ocaEici: string;
  observaciones?: string;

  emplazamiento: {
    provincia: string;
    poblacion: string;
    tipoVia: string;
    via: string;
    numero: string;
    portal?: string;
    escalera?: string;
    piso?: string;
    puerta?: string;
    codigoPostal: string;
    descripcion?: string;
  };

  titular: {
    tipoDocumento: string;
    numeroDocumento: string;
    razonSocial?: string;
    provincia?: string;
    poblacion?: string;
    tipoVia?: string;
    via?: string;
    numero?: string;
    portal?: string;
    escalera?: string;
    piso?: string;
    puerta?: string;
    codigoPostal?: string;
    telefono: string;
    telefonoMovil?: string;
    email?: string;
  };

  datosTecnicos: {
    potenciaMaximaAdmisible: string;
    valorInterruptorGral: string;
    tipoSuministro: string;
    tensionSuministro: string;
    cups?: string;
    companiaDistribuidora?: string;
    sistemaConexion?: string;
    seccionAcometida?: string;
    instalacionAislada?: boolean;
    viviendaUnifamiliar?: boolean;
    descripcionInstalacion?: string;
  };

  documentos: {
    ciePdf: string;
    mtdPdf: string;
    solicitudBtPdf: string;
    unifilarPdf?: string;
  };
}

export interface ReconoCandidate {
  uuid: string;
  label: string;
  confidence: number;
}

export function normalizeViaName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/^(DE LA |DEL |DE LOS |DE LAS |DE |EL |LA |LOS |LAS )/, '')
    .trim();
}
