// ============================================================
// mtd-field-mapping.ts
// Mapeo de campos de la instalación → campos del formulario PDF MTD
// Comunidad de Madrid - Memoria Técnica de Diseño (6 páginas)
// ============================================================

// ─── PÁGINA 1: Datos Administrativos + Técnicos ─────────────

export const PAGE1_FIELDS = {
  // TITULAR DE LA INSTALACIÓN
  titularNif: 'Texto2',
  titularNombre: 'Texto3',
  titularApellido1: 'Texto4',
  titularApellido2: 'Texto5',
  titularDireccion: 'Texto6',
  titularLocalidad: 'Texto7',
  titularCp: 'Texto8',

  // EMPLAZAMIENTO
  emplazDireccion: 'Texto9',
  emplazLocalidad: 'Texto10',
  emplazCp: 'Texto11',
  usoInstalacion: 'Texto12',

  // DATOS TÉCNICOS
  tension: 'Texto13',
  gradoElectrificacion: 'Texto15',
  memoriaPor: 'Texto17',
  usoInst: 'Texto19',
  superficieLocal: 'Texto20',

  // ACOMETIDA
  puntoConexion: 'Texto21',
  tipoAcometida: 'Texto22',
  seccionAcometida: 'Texto23',
  materialAcometida: 'Texto24',

  // C.G.P.
  tipoCgp: 'Texto25',
  inBaseCgp: 'Texto26',
  inCartuchoCgp: 'Texto27',

  // LÍNEA GENERAL DE ALIMENTACIÓN
  seccionLga: 'Texto28',
  materialLga: 'Texto29',

  // DERIVACIÓN INDIVIDUAL
  seccionDi: 'Texto30',
  materialDi: 'Texto31',

  // IGM
  igmNominal: 'Texto32',
  poderCorte: 'Texto33',
  numDerivaciones: 'Texto34',

  // MÓDULO DE MEDIDA
  tipoModuloMedida: 'Texto36',
  situacionModulo: 'Texto37',

  // PROTECCIÓN MAGNETOTÉRMICA/DIFERENCIAL
  igaNominal: 'Texto38',
  diferencialNominal: 'Texto39',
  diferencialSensibilidad: 'Texto40',

  // PUESTA A TIERRA
  tipoPicas: 'Texto41',
  tipoPlacas: 'Texto42',
  tipoMallas: 'Texto43',
  lineaEnlaceMm2: 'Texto46',
  conductorProteccion: 'Texto48',

  // INSTALADOR AUTORIZADO
  instaladorNombre: 'Texto35',
  instaladorCertNum: 'Texto49',
  instaladorDomicilio: 'Texto50',
  instaladorNum: 'Texto51',
  instaladorLocalidad: 'Texto52',
  instaladorCp: 'Texto55',
  instaladorTelefono: 'Texto53',
  instaladorEmail: 'Texto56',

  // TÉCNICO CUALIFICADO
  tecnicoNombre: 'Texto57',
  tecnicoColegiado: 'Texto58',
  tecnicoDomicilio: 'Texto59',
  tecnicoNum: 'Texto60',
  tecnicoLocalidad: 'Texto61',
  tecnicoCp: 'Texto62',
  tecnicoTelefono: 'Texto63',
  tecnicoEmail: 'Texto65',
  tecnicoColegio: 'Texto66',

  // FIRMA
  firmaNombre: 'Texto70',
  firmaLugar: 'Texto71',
  firmaDia: 'Texto72',
  firmaMes: 'Texto73',
  firmaAno: 'Texto74',
};

// Checkboxes de página 1
export const PAGE1_CHECKBOXES = {
  instaladorAutorizado: 'Casilla de verificación69',
  tecnicoCualificado: 'Casilla de verificación70',
};

// ─── PÁGINA 2: Previsión de Cargas (ITC-BT-10) ─────────────
export const PAGE2_FIELDS: Record<string, string> = {
  // Cabecera
  numPlantas: 'Texto76',
  numViviendasPlanta: 'Texto77',
  numLocales: 'Texto78',

  // VIVIENDAS - Básica (3 filas)
  basicaGrado1: 'Texto79', basicaTipo1: 'Texto80', basicaPot1: 'Texto81',
  basicaGrado2: 'Texto85', basicaTipo2: 'Texto86', basicaPot2: 'Texto87',
  basicaGrado3: 'Texto88', basicaTipo3: 'Texto89', basicaPot3: 'Texto90',

  // VIVIENDAS - Elevada (3 filas)
  elevadaGrado1: 'Texto91', elevadaTipo1: 'Texto92', elevadaPot1: 'Texto93',
  elevadaGrado2: 'Texto94', elevadaTipo2: 'Texto95', elevadaPot2: 'Texto96',
  elevadaGrado3: 'Texto97', elevadaTipo3: 'Texto98', elevadaPot3: 'Texto99',

  // Filas extra + Tarifa Nocturna
  extraGrado1: 'Texto100', extraTipo1: 'Texto101', extraPot1: 'Texto102',
  noctGrado1: 'Texto103', noctTipo1: 'Texto104', noctPot1: 'Texto105',
  noctGrado2: 'Texto106', noctTipo2: 'Texto107', noctPot2: 'Texto108',

  // Columnas calculadas viviendas
  vivNumViviendas: 'Texto130',     // Nº Viviendas
  vivMediaAritmetica: 'Texto131',  // Media aritmética
  vivCargaTotal: 'Texto132',       // Carga Total (fila Básica/Elevada)
  vivNoctNumViv: 'Texto133',       // Nº viviendas tarifa nocturna
  vivNoctMedia: 'Texto134',        // Media tarifa nocturna
  vivNoctCarga: 'Texto135',        // Carga total nocturna
  cargaPrevistaVivA: 'Texto112',   // Carga Prevista Viviendas (A)

  // SERVICIOS GENERALES
  sgAscensores: 'Texto113', sgFrioCalor: 'Texto114', sgGrupos: 'Texto115',
  sgAlumbrado: 'Texto116', sgPiscinas: 'Texto117', sgOtros: 'Texto118',
  sgTotalSuma: 'Texto119',
  cargaPrevistaSgB: 'Texto120',    // Carga Prevista Servicios Generales (B)

  // GARAJE
  garajeNat1: 'Texto121', garajeNat2: 'Texto122', garajeNat3: 'Texto123', garajeNat4: 'Texto124',
  garajeForz1: 'Texto125', garajeForz2: 'Texto126', garajeForz3: 'Texto127', garajeForz4: 'Texto128',
  cargaPrevistaGarajeC: 'Texto129',

  // LOCALES COMERCIALES (9 filas x 6 cols = 54 campos: Texto136-Texto189)
  cargaPrevistaLocalesD: 'Texto190',

  // OTRAS INSTALACIONES (4 filas x 4 cols: Texto191-Texto210)
  cargaPrevistaOtrasE: 'Texto211',

  // CARGA TOTAL PREVISTA LGA (A+B+C+D+E)
  cargaTotalLga: 'Texto212',

  // PRESUPUESTO - Materiales (7 columnas)
  matPuestaTierra: 'Texto213', matLga: 'Texto214', matPuntoMedida: 'Texto215',
  matDerivIndiv: 'Texto216', matInstalInterior: 'Texto217', matOtros: 'Texto218',
  matTotal: 'Texto219',

  // PRESUPUESTO - Mano Obra (7 columnas)
  mobraPuestaTierra: 'Texto220', mobraLga: 'Texto221', mobraPuntoMedida: 'Texto222',
  mobraDerivIndiv: 'Texto223', mobraInstalInterior: 'Texto224', mobraOtros: 'Texto225',
  mobraTotal: 'Texto226',

  // PRESUPUESTO - Total (7 columnas)
  totalPuestaTierra: 'Texto227', totalLga: 'Texto228', totalPuntoMedida: 'Texto229',
  totalDerivIndiv: 'Texto230', totalInstalInterior: 'Texto231', totalOtros: 'Texto232',
  totalTotal: 'Texto233',
};

// ─── PÁGINA 3: Resumen Datos Técnicos ───────────────────────

export const PAGE3_LGA_FIELDS: Record<string, string> = {
  // LGA fila I
  lgaPotMaxCalc: 'Texto234',
  lgaPotMaxAdm: 'Texto235',
  lgaFases: 'Texto236',
  lgaSeccion: 'Texto237',
  lgaMaterial: 'Texto238',
  lgaTipoAislamiento: 'Texto239',
  lgaLongitud: 'Texto240',
  lgaCdt: 'Texto241',
  lgaProteccion: 'Texto242',
  // LGA fila II
  lgaPotMaxCalc2: 'Texto243',
  lgaPotMaxAdm2: 'Texto244',
  lgaFases2: 'Texto245',
  lgaSeccion2: 'Texto246',
  lgaMaterial2: 'Texto247',
  lgaTipoAislamiento2: 'Texto248',
  lgaLongitud2: 'Texto249',
  lgaCdt2: 'Texto250',
  lgaProteccion2: 'Texto251',
};

export const PAGE3_PUNTO_MEDIDA: Record<string, string> = {
  numSuministros: 'Texto252',   // etiqueta, no rellenar
  monofasicos: 'Texto252',
  trifMenor15: 'Texto253',
  trifMenor43: 'Texto254',
  trifMayor43: 'Texto255',
  numPlantas: 'Texto256',
  numContadores: 'Texto257',
  // Emplazamiento
  plantaBaja: 'Texto259',
  entresuelo: 'Texto260',
  primerSotano: 'Texto261',
  cada6Plantas: 'Texto262',
  enCadaPlanta: 'Texto263',
  marcaModelo: 'Texto264',
  // IGM - Interruptor General de Maniobra
  igmFases: 'Texto265',
  igmIntNominal: 'Texto266',
  igmPoderCorte: 'Texto267',
  // Ubicación checkboxes (campos texto)
  centralizacionModular: 'Texto268',
  centralizacionPanel: 'Texto269',
  moduloInterior: 'Texto270',
  cpmArmarioFachada: 'Texto271',
  otros: 'Texto272',
};

export const PAGE3_DI_FIELDS: Record<string, string> = {
  // Derivaciones individuales - fila 1
  diTipo: 'Texto273',
  diNum: 'Texto274',
  diPotMaxPrev: 'Texto275',
  diPotMaxAdm: 'Texto276',
  diFases: 'Texto277',
  diSeccion: 'Texto278',
  diMaterial: 'Texto279',
  diAislamiento: 'Texto280',
  diCdt: 'Texto281',
  diFusible: 'Texto282',
  // fila 2
  diTipo2: 'Texto283',
  diNum2: 'Texto284',
  diPotMaxPrev2: 'Texto285',
  diPotMaxAdm2: 'Texto286',
  diFases2: 'Texto287',
  diSeccion2: 'Texto288',
  diMaterial2: 'Texto289',
  diAislamiento2: 'Texto290',
  diCdt2: 'Texto291',
  diFusible2: 'Texto292',
};

export const PAGE3_PROTECCION_FIELDS: Record<string, string> = {
  // Dispositivos generales mando y protección - fila 1 (suministro principal)
  derivTipo: 'Texto313',
  derivFases: 'Texto314',
  derivSeccion: 'Texto315',
  tipoCajaIcp1: 'Texto316',
  tipoCajaIcp2: 'Texto317',
  igaPolos: 'Texto318',
  igaIntNominal: 'Texto319',
  igaPoderCorte: 'Texto320',
  difPolos: 'Texto321',
  difIntNominal: 'Texto322',
  difSensibilidad: 'Texto323',
};

// ─── PÁGINA 5: Circuitos Internos del Suministro ────────────
// 13 columnas por fila:
// [0] Potencia cálculo (kW)
// [1] Tensión cálculo (V)
// [2] Intensidad cálculo (A)
// [3] Nº Conductores x Sección (mm²)
// [4] Material (Cu o Al)
// [5] Tensión Nominal Aislamiento (kV)
// [6] Tipo Instalación
// [7] Longitud Máxima (m)
// [8] Caída de Tensión Máxima (V)
// [9] Potencia Máxima Admisible (kW)
// [10] Potencia Total Instalada (kW)
// [11] Intensidad Fusible o PIA (A)
// [12] (último campo adicional)

// ─── PÁGINA 4: Resumen Cálculo Instalaciones de Enlace ──────
// 18 columnas por fila: Pot(kW), Tensión(V), Intensidad(A), NºCond, Sección(mm²),
// Material, Tens.Nominal, TipoInst, SecciónConducto, DiámetroTubos, NºTubos,
// Longitud(m), CdT(V), PotMaxAdm(kW), PotTotalInst(kW), IntFusible(A), IntIGA(A), IntDif(A)

export const PAGE4_ROWS: Record<string, string[]> = {
  // Acometida: 18 campos
  acometida: [
    'Texto347','Texto348','Texto350','Texto351','Texto352','Texto353','Texto354',
    'Texto355','Texto356','Texto357','Texto358','Texto359','Texto360','Texto361',
    'Texto362','Texto363','Texto364',
  ],
  // LGA I
  lgaI: [
    'Texto365','Texto366','Texto367','Texto368','Texto369','Texto370','Texto371',
    'Texto372','Texto373','Texto374','Texto375','Texto376','Texto377','Texto378',
    'Texto379','Texto380','Texto381',
  ],
  // LGA II
  lgaII: [
    'Texto382','Texto383','Texto384','Texto385','Texto386','Texto387','Texto388',
    'Texto389','Texto390','Texto391','Texto392','Texto393','Texto394','Texto395',
    'Texto396','Texto397','Texto398',
  ],
  // DI Básica fila 1-6
  diBasica1: ['Texto416','Texto399','Texto400','Texto401','Texto402','Texto403','Texto404','Texto405','Texto406','Texto407','Texto408','Texto409','Texto410','Texto411','Texto412','Texto413','Texto414','Texto415'],
  diBasica2: ['Texto417','Texto418','Texto349','Texto419','Texto420','Texto421','Texto422','Texto423','Texto424','Texto425','Texto426','Texto427','Texto428','Texto429','Texto430','Texto431','Texto432','Texto433'],
  // DI Elevada fila 1-6
  diElevada1: [
    'Texto507','Texto508','Texto509','Texto510','Texto511','Texto512','Texto513',
    'Texto514','Texto515','Texto516','Texto517','Texto518','Texto519','Texto520',
    'Texto521','Texto522','Texto523','Texto524',
  ],
  diElevada2: [
    'Texto525','Texto526','Texto527','Texto528','Texto529','Texto530','Texto531',
    'Texto532','Texto533','Texto534','Texto535','Texto536','Texto537','Texto538',
    'Texto539','Texto540','Texto541','Texto542',
  ],
};

// Filas de circuitos en página 5 (field IDs por fila, 36 filas x 13 cols)
// Sección "Electrificación básica" - 3 bloques de 5 circuitos (C1-C5 x 3 viviendas)
// Sección "Electrificación elevada" - 12 circuitos (C1-C12)
// etc.

export const PAGE5_CIRCUIT_ROWS: string[][] = [
  // Electrificación básica - Bloque 1 (C1-C5)
  ['Texto899','Texto900','Texto901','Texto902','Texto903','Texto904','Texto905','Texto906','Texto907','Texto908','Texto909','Texto910','Texto911'],
  ['Texto912','Texto913','Texto914','Texto915','Texto916','Texto917','Texto918','Texto919','Texto920','Texto921','Texto922','Texto923','Texto924'],
  ['Texto925','Texto926','Texto927','Texto928','Texto929','Texto930','Texto931','Texto932','Texto933','Texto934','Texto935','Texto936','Texto937'],
  ['Texto938','Texto939','Texto940','Texto941','Texto942','Texto943','Texto944','Texto945','Texto946','Texto947','Texto948','Texto949','Texto950'],
  ['Texto951','Texto952','Texto953','Texto954','Texto955','Texto956','Texto957','Texto958','Texto959','Texto960','Texto961','Texto962','Texto963'],
  // Electrificación básica - Bloque 2 (C1-C5)
  ['Texto965','Texto966','Texto967','Texto968','Texto969','Texto970','Texto971','Texto972','Texto973','Texto974','Texto975','Texto976','Texto977'],
  ['Texto978','Texto979','Texto980','Texto981','Texto982','Texto983','Texto984','Texto985','Texto986','Texto987','Texto988','Texto989','Texto990'],
  ['Texto991','Texto992','Texto993','Texto994','Texto995','Texto996','Texto997','Texto998','Texto999','Texto1000','Texto1001','Texto1002','Texto1003'],
  ['Texto1004','Texto1005','Texto1006','Texto1007','Texto1008','Texto1009','Texto1010','Texto1011','Texto1012','Texto1013','Texto1014','Texto1015','Texto1016'],
  ['Texto1017','Texto1018','Texto1019','Texto1020','Texto1021','Texto1022','Texto1023','Texto1024','Texto1025','Texto1026','Texto1027','Texto1028','Texto1029'],
  // Electrificación básica - Bloque 3 (C1-C5)
  ['Texto1031','Texto1032','Texto1033','Texto1034','Texto1035','Texto1036','Texto1037','Texto1038','Texto1039','Texto1040','Texto1041','Texto1042','Texto1043'],
  ['Texto1044','Texto1045','Texto1046','Texto1047','Texto1048','Texto1049','Texto1050','Texto1051','Texto1052','Texto1053','Texto1054','Texto1055','Texto1056'],
  ['Texto1057','Texto1058','Texto1059','Texto1060','Texto1061','Texto1062','Texto1063','Texto1064','Texto1065','Texto1066','Texto1067','Texto1068','Texto1069'],
  ['Texto1070','Texto1071','Texto1072','Texto1073','Texto1074','Texto1075','Texto1076','Texto1077','Texto1078','Texto1079','Texto1080','Texto1081','Texto1082'],
  ['Texto1083','Texto1084','Texto1085','Texto1086','Texto1087','Texto1088','Texto1089','Texto1090','Texto1091','Texto1092','Texto1093','Texto1094','Texto1095'],
  // Electrificación elevada C1-C12
  ['Texto1096','Texto1097','Texto1098','Texto1099','Texto1100','Texto1101','Texto1102','Texto1103','Texto1104','Texto1105','Texto1106','Texto1107','Texto1108'],
  ['Texto1110','Texto1111','Texto1112','Texto1113','Texto1114','Texto1115','Texto1116','Texto1117','Texto1118','Texto1119','Texto1120','Texto1121','Texto1122'],
  ['Texto1123','Texto1124','Texto1125','Texto1126','Texto1127','Texto1128','Texto1129','Texto1130','Texto1131','Texto1132','Texto1133','Texto1134','Texto1135'],
  ['Texto1136','Texto1137','Texto1138','Texto1139','Texto1140','Texto1141','Texto1142','Texto1143','Texto1144','Texto1145','Texto1146','Texto1147','Texto1148'],
  ['Texto1149','Texto1150','Texto1151','Texto1152','Texto1153','Texto1154','Texto1155','Texto1156','Texto1157','Texto1158','Texto1159','Texto1160','Texto1161'],
  ['Texto1162','Texto1163','Texto1164','Texto1165','Texto1166','Texto1167','Texto1168','Texto1169','Texto1170','Texto1171','Texto1172','Texto1173','Texto1174'],
  ['Texto1175','Texto1176','Texto1177','Texto1178','Texto1179','Texto1180','Texto1181','Texto1182','Texto1183','Texto1184','Texto1185','Texto1186','Texto1187'],
  ['Texto1188','Texto1189','Texto1190','Texto1191','Texto1192','Texto1193','Texto1194','Texto1195','Texto1196','Texto1197','Texto1198','Texto1199','Texto1200'],
  ['Texto1201','Texto1202','Texto1203','Texto1204','Texto1205','Texto1206','Texto1207','Texto1208','Texto1209','Texto1210','Texto1211','Texto1212','Texto1213'],
  ['Texto1214','Texto1215','Texto1216','Texto1217','Texto1218','Texto1219','Texto1220','Texto1221','Texto1222','Texto1223','Texto1224','Texto1225','Texto1226'],
  ['Texto1227','Texto1228','Texto1229','Texto1230','Texto1231','Texto1232','Texto1233','Texto1234','Texto1235','Texto1236','Texto1237','Texto1238','Texto1239'],
  ['Texto1240','Texto1241','Texto1242','Texto1243','Texto1244','Texto1245','Texto1246','Texto1247','Texto1248','Texto1249','Texto1250','Texto1251','Texto1252'],
];

// Columnas del circuito
export enum CircuitCol {
  POT_CALC_KW = 0,
  TENSION_V = 1,
  INTENSIDAD_A = 2,
  CONDUCTORES_SECCION = 3,
  MATERIAL = 4,
  TENSION_NOM_KV = 5,
  TIPO_INSTALACION = 6,
  LONGITUD_M = 7,
  CDT_V = 8,
  POT_MAX_ADM_KW = 9,
  POT_TOTAL_INST_KW = 10,
  INT_FUSIBLE_PIA = 11,
  EXTRA = 12,
}

// ─── PÁGINA 6: Memoria Descriptiva ──────────────────────────

export const PAGE6_MEMORIA_LINES: string[] = [
  'Texto1590', 'Texto1591', 'Texto1592', 'Texto1593', 'Texto1594',
  'Texto1595', 'Texto1596', 'Texto1597', 'Texto1598', 'Texto1599',
  'Texto1600', 'Texto1601', 'Texto1602', 'Texto1603', 'Texto1604',
  'Texto1605', 'Texto1606', 'Texto1607', 'Texto1608', 'Texto1609',
  'Texto1610', 'Texto1611', 'Texto1612',
];

// Checkboxes documentación adjunta (página 6)
export const PAGE6_DOC_CHECKBOXES = {
  esquemaUnifilar: 'Casilla de verificación1613',
  planoPlanta: 'Casilla de verificación1614',
  croquisTrazado: 'Casilla de verificación1615',
  otros: 'Casilla de verificación1616',
};

// ─── HELPER: Obtener filas de circuito según tipo suministro ─

export function getCircuitRowOffset(
  supplyType: string,
  gradoElectrificacion: string,
): number {
  // Para vivienda básica: filas 0-4 (C1-C5)
  // Para vivienda elevada: filas 15-26 (C1-C12)
  // Para local comercial / IRVE: no hay sección predefinida, se usan las filas de "otras instalaciones"
  if (supplyType === 'VIVIENDA_BASICA') return 0;
  if (supplyType === 'VIVIENDA_ELEVADA') return 15;
  // Para locales/IRVE usamos las filas del bloque genérico
  return 0;
}
