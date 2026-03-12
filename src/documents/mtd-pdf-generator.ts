// ============================================================
// mtd-pdf-generator.ts
// Genera el PDF oficial de la MTD rellenando la plantilla
// de la Comunidad de Madrid con datos de la instalación.
// ============================================================

import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs';
import * as path from 'path';
import {
  PAGE1_FIELDS,
  PAGE1_CHECKBOXES,
  PAGE2_FIELDS,
  PAGE3_LGA_FIELDS,
  PAGE3_DI_FIELDS,
  PAGE3_PROTECCION_FIELDS,
  PAGE3_PUNTO_MEDIDA,
  PAGE4_ROWS,
  PAGE5_CIRCUIT_ROWS,
  PAGE6_MEMORIA_LINES,
  PAGE6_DOC_CHECKBOXES,
} from './mtd-field-mapping';

const TEMPLATE_PATH = path.join(__dirname, 'templates', 'MTD_BASICO.pdf');

// ─── Tipos ──────────────────────────────────────────────────

export interface MtdInstallationData {
  titularNif?: string;
  titularNombre?: string;
  titularApellido1?: string;
  titularApellido2?: string;
  titularDireccion?: string;
  titularLocalidad?: string;
  titularCp?: string;
  emplazDireccion?: string;
  emplazLocalidad?: string;
  emplazCp?: string;
  usoInstalacion?: string;
  tension?: number;
  gradoElectrificacion?: string;
  memoriaPor?: string;
  superficieM2?: number;
  puntoConexion?: string;
  tipoAcometida?: string;
  seccionAcometida?: number;
  materialAcometida?: string;
  tipoCgp?: string;
  inBaseCgp?: number;
  inCartuchoCgp?: number;
  seccionLga?: number;
  materialLga?: string;
  longitudLga?: number;
  aislamientoLga?: string;
  seccionDi?: number;
  materialDi?: string;
  longitudDi?: number;
  numDerivaciones?: number;
  aislamientoDi?: string;
  tipoInstalacionDi?: string;
  igmNominal?: number;
  poderCorte?: number;
  tipoModuloMedida?: string;
  situacionModulo?: string;
  igaNominal?: number;
  diferencialNominal?: number;
  diferencialSensibilidad?: number;
  tipoElectrodos?: string;
  seccionLineaEnlace?: number;
  seccionCondProteccion?: number;
  supplyType?: string;
  potMaxAdmisible?: number;
  presupuestoMateriales?: number;
  presupuestoManoObra?: number;
  presupuestoTotal?: number;
  tipoAutor?: string;
  instaladorNombre?: string;
  instaladorCertNum?: string;
  instaladorDomicilio?: string;
  instaladorNum?: string;
  instaladorLocalidad?: string;
  instaladorCp?: string;
  instaladorTelefono?: string;
  instaladorEmail?: string;
  memoriaDescriptiva?: string;
  firmaLugar?: string;
  esquemaDistribucion?: string;
  // Técnico cualificado
  tecnicoNombre?: string;
  tecnicoColegiado?: string;
  tecnicoDomicilio?: string;
  tecnicoLocalidad?: string;
  tecnicoCp?: string;
  tecnicoTelefono?: string;
  tecnicoEmail?: string;
  tecnicoColegio?: string;
  // Página 2 - Previsión cargas
  phaseSystem?: string; // 'single' | 'three'
  cdtDi?: number; // CdT de la DI en %
  contadorUbicacion?: string;
}

export interface MtdCircuitData {
  code?: string;
  name?: string;
  power: number;
  voltage: number;
  phases: number;
  length: number;
  cableType: string;
  insulationType: string;
  installMethod: string;
  calculatedSection?: number;
  voltageDrop?: number;
  breakerRatingA?: number;
  nominalCurrentA?: number;
  admissibleCurrentA?: number;
  potMaxAdmKw?: number;
}

// ─── Helpers seguros para TS estricto ───────────────────────

type PdfForm = ReturnType<PDFDocument['getForm']>;

function setTextField(form: PdfForm, fieldName: string, value: string): void {
  if (!value) return;
  try {
    form.getTextField(fieldName).setText(value);
  } catch {
    // Campo no encontrado — ignorar
  }
}

function setCheckBox(form: PdfForm, fieldName: string): void {
  try {
    form.getCheckBox(fieldName).check();
  } catch {
    // Checkbox no encontrado
  }
}

function s(v: unknown): string {
  if (v == null || v === '') return '';
  return String(v);
}

// ─── Generador principal ────────────────────────────────────

export async function generateMtdPdf(
  installation: MtdInstallationData,
  circuits: MtdCircuitData[],
): Promise<Buffer> {
  const templateBytes = fs.readFileSync(TEMPLATE_PATH);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  fillPage1(form, installation);
  fillPage2(form, installation, circuits);
  fillPage3(form, installation, circuits);
  fillPage4(form, installation, circuits);
  fillPage5Circuits(form, installation, circuits);
  fillPage6(form, installation);

  // NO aplanar: dejar formulario editable para que el usuario pueda corregir
  // y los botones "Limpiar Campos" e "Imprimir" del PDF original funcionen

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ─── Página 1 ───────────────────────────────────────────────

function fillPage1(form: PdfForm, inst: MtdInstallationData): void {
  const set = (key: keyof typeof PAGE1_FIELDS, value: string): void => {
    setTextField(form, PAGE1_FIELDS[key], value);
  };

  // Titular
  set('titularNif', s(inst.titularNif));
  set('titularNombre', s(inst.titularNombre));
  set('titularApellido1', s(inst.titularApellido1));
  set('titularApellido2', s(inst.titularApellido2));
  set('titularDireccion', s(inst.titularDireccion));
  set('titularLocalidad', s(inst.titularLocalidad));
  set('titularCp', s(inst.titularCp));

  // Emplazamiento
  set('emplazDireccion', s(inst.emplazDireccion));
  set('emplazLocalidad', s(inst.emplazLocalidad));
  set('emplazCp', s(inst.emplazCp));
  set('usoInstalacion', s(inst.usoInstalacion));

  // Datos técnicos
  set('tension', s(inst.tension));
  set('gradoElectrificacion', s(inst.gradoElectrificacion));
  set('memoriaPor', s(inst.memoriaPor || 'N'));
  set('usoInst', s(inst.usoInstalacion));
  set('superficieLocal', s(inst.superficieM2));

  // Acometida
  set('puntoConexion', s(inst.puntoConexion));
  set('tipoAcometida', s(inst.tipoAcometida));
  set('seccionAcometida', s(inst.seccionAcometida));
  set('materialAcometida', s(inst.materialAcometida));

  // CGP
  set('tipoCgp', s(inst.tipoCgp));
  set('inBaseCgp', s(inst.inBaseCgp));
  set('inCartuchoCgp', s(inst.inCartuchoCgp));

  // LGA
  set('seccionLga', s(inst.seccionLga));
  set('materialLga', s(inst.materialLga));

  // DI
  set('seccionDi', s(inst.seccionDi));
  set('materialDi', s(inst.materialDi));

  // IGM
  set('igmNominal', s(inst.igmNominal));
  set('poderCorte', s(inst.poderCorte));
  set('numDerivaciones', s(inst.numDerivaciones || 1));

  // Módulo medida
  set('tipoModuloMedida', s(inst.tipoModuloMedida));
  set('situacionModulo', s(inst.situacionModulo));

  // Protecciones
  set('igaNominal', s(inst.igaNominal));
  set('diferencialNominal', s(inst.diferencialNominal));
  set('diferencialSensibilidad', s(inst.diferencialSensibilidad));
  set('conductorProteccion', s(inst.seccionCondProteccion));

  // Puesta a tierra
  if (inst.tipoElectrodos === 'PICAS') set('tipoPicas', 'X');
  if (inst.tipoElectrodos === 'PLACAS') set('tipoPlacas', 'X');
  if (inst.tipoElectrodos === 'MALLAS') set('tipoMallas', 'X');

  // Instalador (always fill — empresa data shared)
  if (inst.tipoAutor !== 'TECNICO') {
    set('instaladorNombre', s(inst.instaladorNombre));
    set('instaladorCertNum', s(inst.instaladorCertNum));
  }
  set('instaladorDomicilio', s(inst.instaladorDomicilio));
  set('instaladorNum', s(inst.instaladorNum));
  set('instaladorLocalidad', s(inst.instaladorLocalidad));
  set('instaladorCp', s(inst.instaladorCp));
  set('instaladorTelefono', s(inst.instaladorTelefono));
  set('instaladorEmail', s(inst.instaladorEmail));

  // Técnico cualificado
  if (inst.tipoAutor === 'TECNICO') {
    set('tecnicoNombre', s(inst.tecnicoNombre));
    set('tecnicoColegiado', s(inst.tecnicoColegiado));
    set('tecnicoDomicilio', s(inst.tecnicoDomicilio));
    set('tecnicoLocalidad', s(inst.tecnicoLocalidad));
    set('tecnicoCp', s(inst.tecnicoCp));
    set('tecnicoTelefono', s(inst.tecnicoTelefono));
    set('tecnicoEmail', s(inst.tecnicoEmail));
    set('tecnicoColegio', s(inst.tecnicoColegio));
  }

  // Firma
  const now = new Date();
  const meses: string[] = [
    'ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO',
    'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE',
  ];
  const firmante = inst.tipoAutor === 'TECNICO' ? inst.tecnicoNombre : inst.instaladorNombre;
  set('firmaNombre', s(firmante));
  set('firmaLugar', s(inst.firmaLugar || 'MADRID'));
  set('firmaDia', String(now.getDate()));
  set('firmaMes', meses[now.getMonth()] ?? 'ENERO');
  set('firmaAno', String(now.getFullYear()));

  // Checkbox instalador/técnico
  if (inst.tipoAutor !== 'TECNICO') {
    setCheckBox(form, PAGE1_CHECKBOXES.instaladorAutorizado);
  } else {
    setCheckBox(form, PAGE1_CHECKBOXES.tecnicoCualificado);
  }
}

// ─── Página 2: Previsión de Cargas + Presupuesto ────────────

function fillPage2(
  form: PdfForm,
  inst: MtdInstallationData,
  circuits: MtdCircuitData[],
): void {
  const set = (key: string, value: string): void => {
    const fieldName = PAGE2_FIELDS[key];
    if (fieldName) setTextField(form, fieldName, value);
  };

  // Cabecera
  set('numPlantas', '1');
  set('numViviendasPlanta', '1');

  // Potencia máxima admisible en kW
  const potKw = inst.potMaxAdmisible ?? 0;
  const potKwStr = potKw.toFixed(2);

  // Determinar grado de electrificación
  const isElevada = inst.supplyType === 'VIVIENDA_ELEVADA' ||
    inst.gradoElectrificacion?.toUpperCase() === 'ELEVADO';

  if (isElevada) {
    set('elevadaGrado1', '1');      // Nº viviendas de este grado
    set('elevadaTipo1', potKwStr);  // Pot. máxima prevista para tipo vivienda
    set('elevadaPot1', potKwStr);   // kW (tercera columna)
  } else {
    set('basicaGrado1', '1');
    set('basicaTipo1', potKwStr);
    set('basicaPot1', potKwStr);
  }

  // Columnas calculadas
  set('vivNumViviendas', '1');
  set('vivMediaAritmetica', potKwStr);
  // Coeficiente simultaneidad = 1 para 1 vivienda
  set('vivCargaTotal', potKwStr);

  // Carga Prevista Viviendas (A)
  set('cargaPrevistaVivA', potKwStr);

  // CARGA TOTAL PREVISTA EN L.G.A. (A+B+C+D+E)
  set('cargaTotalLga', potKwStr);

  // PRESUPUESTO
  if (inst.presupuestoMateriales) {
    set('matInstalInterior', inst.presupuestoMateriales.toFixed(2));
    set('matTotal', inst.presupuestoMateriales.toFixed(2));
  }
  if (inst.presupuestoManoObra) {
    set('mobraInstalInterior', inst.presupuestoManoObra.toFixed(2));
    set('mobraTotal', inst.presupuestoManoObra.toFixed(2));
  }
  if (inst.presupuestoTotal) {
    set('totalInstalInterior', inst.presupuestoTotal.toFixed(2));
    set('totalTotal', inst.presupuestoTotal.toFixed(2));
  }
}

// ─── Página 3: Resumen Datos Técnicos ───────────────────────

function fillPage3(
  form: PdfForm,
  inst: MtdInstallationData,
  circuits: MtdCircuitData[],
): void {
  const isThreePhase = inst.phaseSystem === 'three' || inst.tension === 400;
  const fases = isThreePhase ? '3F+N' : '1F+N';
  const polos = isThreePhase ? '4' : '2';
  const numCond = isThreePhase ? 4 : 2;

  // ─── DI - Derivación Individual ───
  const setDi = (key: string, value: string): void => {
    const fieldName = (PAGE3_DI_FIELDS as Record<string, string>)[key];
    if (fieldName) setTextField(form, fieldName, value);
  };

  setDi('diTipo', 'Individual');
  setDi('diNum', s(inst.numDerivaciones || 1));
  if (inst.potMaxAdmisible) {
    setDi('diPotMaxPrev', inst.potMaxAdmisible.toFixed(2));
    setDi('diPotMaxAdm', inst.potMaxAdmisible.toFixed(2));
  }
  setDi('diFases', s(numCond));
  if (inst.seccionDi) {
    setDi('diSeccion', s(inst.seccionDi));
  }
  setDi('diMaterial', s(inst.materialDi));
  setDi('diAislamiento', s(inst.aislamientoDi || 'XLPE'));
  if (inst.cdtDi != null) {
    setDi('diCdt', inst.cdtDi.toFixed(2));
  }
  if (inst.igaNominal) {
    setDi('diFusible', s(inst.igaNominal));
  }

  // ─── Dispositivos generales mando y protección ───
  const setProt = (key: string, value: string): void => {
    const fieldName = (PAGE3_PROTECCION_FIELDS as Record<string, string>)[key];
    if (fieldName) setTextField(form, fieldName, value);
  };

  setProt('derivTipo', 'Individual');
  setProt('derivFases', s(numCond));
  if (inst.seccionDi) {
    setProt('derivSeccion', s(inst.seccionDi));
  }
  setProt('igaPolos', polos);
  if (inst.igaNominal) setProt('igaIntNominal', s(inst.igaNominal));
  if (inst.poderCorte) setProt('igaPoderCorte', s(inst.poderCorte));
  setProt('difPolos', polos);
  if (inst.diferencialNominal) setProt('difIntNominal', s(inst.diferencialNominal));
  if (inst.diferencialSensibilidad) setProt('difSensibilidad', s(inst.diferencialSensibilidad));

  // ─── Punto de medida ───
  const setPm = (key: string, value: string): void => {
    const fieldName = (PAGE3_PUNTO_MEDIDA as Record<string, string>)[key];
    if (fieldName) setTextField(form, fieldName, value);
  };

  if (isThreePhase) {
    const potKw = inst.potMaxAdmisible ?? 0;
    if (potKw <= 15) {
      setPm('trifMenor15', '1');
    } else if (potKw <= 43.6) {
      setPm('trifMenor43', '1');
    } else {
      setPm('trifMayor43', '1');
    }
  } else {
    setPm('monofasicos', '1');
  }
  setPm('numPlantas', '1');
  setPm('numContadores', '1');

  // IGM (Interruptor General de Maniobra = fusible de seguridad)
  if (inst.igmNominal) {
    setPm('igmFases', s(numCond));
    setPm('igmIntNominal', s(inst.igmNominal));
    if (inst.poderCorte) setPm('igmPoderCorte', s(inst.poderCorte));
  }

  // Ubicación del módulo de medida
  const ubicacion = inst.contadorUbicacion?.toUpperCase();
  const situacion = inst.situacionModulo?.toUpperCase();
  if (ubicacion === 'CPM' && situacion === 'FACHADA') {
    setPm('cpmArmarioFachada', 'X');
  } else if (ubicacion === 'CPM' || situacion === 'FACHADA') {
    setPm('cpmArmarioFachada', 'X');
  } else if (situacion === 'INTERIOR') {
    setPm('moduloInterior', 'X');
  } else if (ubicacion === 'ARMARIO') {
    setPm('centralizacionModular', 'X');
  } else if (ubicacion === 'LOCAL') {
    setPm('centralizacionPanel', 'X');
  }
}

// ─── Página 4: Resumen Cálculo Instalaciones de Enlace ──────

function fillPage4(
  form: PdfForm,
  inst: MtdInstallationData,
  circuits: MtdCircuitData[],
): void {
  const isThreePhase = inst.phaseSystem === 'three' || inst.tension === 400;
  const numCond = isThreePhase ? 4 : 2;
  const potKw = inst.potMaxAdmisible ?? 0;
  const tension = inst.tension ?? 230;

  // Para vivienda individual unifamiliar (ITC-BT-12):
  // - No hay LGA (suministro directo)
  // - No hay acometida calculable (responsabilidad distribuidora)
  // - Solo se calcula la Derivación Individual (DI)

  const isElevada = inst.supplyType === 'VIVIENDA_ELEVADA' ||
    inst.gradoElectrificacion?.toUpperCase() === 'ELEVADO';
  const diRowKey = isElevada ? 'diElevada1' : 'diBasica1';
  const diRow = PAGE4_ROWS[diRowKey];
  if (diRow) {
    const diInt = potKw > 0 ? ((potKw * 1000) / tension).toFixed(1) : '';
    const cdtVolts = (inst.cdtDi != null && tension) ? (inst.cdtDi * tension / 100).toFixed(2) : '';
    const vals = [
      'Individual',                                      // TIPO
      potKw > 0 ? potKw.toFixed(2) : '',                 // POT
      s(tension),                                         // TENS
      diInt,                                              // INT
      inst.seccionDi ? `${numCond}x${inst.seccionDi}` : '', // NxS
      inst.materialDi || 'CU',                            // MAT
      inst.aislamientoDi ? insulationVoltage(inst.aislamientoDi) : '0.6/1kV', // AISL
      mapInstallMethod(inst.tipoInstalacionDi || ''),     // TIPOINST
      '',                                                 // A: Sección Conducto
      '',                                                 // B: Diámetro Tubos
      '',                                                 // C: Nº Tubos
      inst.longitudDi ? s(inst.longitudDi) : '',          // D: Longitud (m)
      cdtVolts,                                           // E: CdT máxima (V)
      potKw > 0 ? potKw.toFixed(2) : '',                  // F: Pot máx admisible (kW)
      potKw > 0 ? potKw.toFixed(2) : '',                  // G: Pot total instalada (kW)
      inst.igaNominal ? s(inst.igaNominal) : '',           // H: Int fusible (A)
      inst.igaNominal ? s(inst.igaNominal) : '',           // I: Int IGA (A)
      inst.diferencialNominal ? s(inst.diferencialNominal) : '', // J: Int diferencial (A)
    ];
    for (let i = 0; i < diRow.length && i < vals.length; i++) {
      if (diRow[i] && vals[i]) setTextField(form, diRow[i] as string, vals[i] as string);
    }
  }
}

// ─── Página 5: Circuitos internos ───────────────────────────

function fillPage5Circuits(
  form: PdfForm,
  inst: MtdInstallationData,
  circuits: MtdCircuitData[],
): void {
  if (circuits.length === 0) return;

  const isElevada =
    inst.supplyType === 'VIVIENDA_ELEVADA' ||
    inst.gradoElectrificacion?.toUpperCase() === 'ELEVADO';
  const rowOffset = isElevada ? 15 : 0;

  for (let i = 0; i < circuits.length; i++) {
    const rowIdx = rowOffset + i;
    const row = PAGE5_CIRCUIT_ROWS[rowIdx];
    if (!row) break;

    const c: MtdCircuitData = circuits[i]!;

    const potKw = (c.power / 1000).toFixed(2);
    const intensidad = c.nominalCurrentA ? c.nominalCurrentA.toFixed(0) : '';
    const phasesNum = c.phases === 1 ? 2 : 4;
    const seccion = c.calculatedSection
      ? `${phasesNum}X${c.calculatedSection}`
      : '';
    const tipoInst = mapInstallMethod(c.installMethod);
    const cdt =
      c.voltageDrop != null ? c.voltageDrop.toFixed(1) : '';
    const potMaxAdm = c.potMaxAdmKw
      ? c.potMaxAdmKw.toFixed(2)
      : potKw;
    const pia = c.breakerRatingA ? String(c.breakerRatingA) : '';

    const values: string[] = [
      '',  // primera casilla vacía
      potKw,
      String(c.voltage),
      intensidad,
      seccion,
      c.cableType || 'CU',
      insulationVoltage(c.insulationType),
      tipoInst,
      c.length ? c.length.toFixed(0) : '',
      cdt,
      potMaxAdm,
      potKw,
      pia,
    ];

    for (let col = 0; col < values.length; col++) {
      const fieldName = row[col];
      const val = values[col];
      if (fieldName && val) {
        setTextField(form, fieldName, val);
      }
    }
  }
}

// ─── Página 6: Memoria descriptiva ─────────────────────────

function fillPage6(form: PdfForm, inst: MtdInstallationData): void {
  const text = inst.memoriaDescriptiva || generateMemoriaDescriptiva(inst);
  if (text) {
    const lines = splitTextIntoLines(text, 80);
    for (let i = 0; i < lines.length; i++) {
      const fieldName = PAGE6_MEMORIA_LINES[i];
      const line = lines[i];
      if (fieldName && line) {
        setTextField(form, fieldName, line);
      }
    }
  }

  setCheckBox(form, PAGE6_DOC_CHECKBOXES.esquemaUnifilar);
  setCheckBox(form, PAGE6_DOC_CHECKBOXES.croquisTrazado);
}

function generateMemoriaDescriptiva(inst: MtdInstallationData): string {
  const isElevada = inst.supplyType === 'VIVIENDA_ELEVADA' ||
    inst.gradoElectrificacion?.toUpperCase() === 'ELEVADO';
  const grado = isElevada ? 'elevada' : 'básica';
  const potKw = inst.potMaxAdmisible ?? 0;
  const tension = inst.tension ?? 230;
  const isThreePhase = inst.phaseSystem === 'three' || tension === 400;
  const fases = isThreePhase ? 'trifásico' : 'monofásico';

  const parts: string[] = [];

  // Párrafo 1: Objeto
  parts.push(
    `La presente Memoria Técnica de Diseño tiene por objeto describir y justificar ` +
    `la instalación eléctrica en baja tensión correspondiente a una vivienda unifamiliar ` +
    `con grado de electrificación ${grado}, ` +
    `ubicada en ${inst.emplazDireccion || '[dirección]'}, ` +
    `${inst.emplazLocalidad || '[localidad]'} (${inst.emplazCp || '[CP]'}).`,
  );

  // Párrafo 2: Características
  parts.push(
    `La instalación se alimenta en ${fases} a ${tension} V, ` +
    `con una potencia máxima admisible de ${potKw.toFixed(2)} kW. ` +
    `La derivación individual se realiza con conductor de ` +
    `${inst.materialDi || 'Cu'} ${inst.seccionDi ? inst.seccionDi + ' mm²' : ''} ` +
    `con aislamiento ${inst.aislamientoDi || 'XLPE'} 0,6/1 kV` +
    `${inst.longitudDi ? ', longitud ' + inst.longitudDi + ' m' : ''}.`,
  );

  // Párrafo 3: Protecciones
  const protParts: string[] = [];
  if (inst.igaNominal) {
    protParts.push(`IGA de ${inst.igaNominal} A` +
      `${inst.poderCorte ? ' con poder de corte ' + inst.poderCorte + ' kA' : ''}`);
  }
  if (inst.diferencialNominal && inst.diferencialSensibilidad) {
    protParts.push(`interruptor diferencial de ${inst.diferencialNominal} A / ${inst.diferencialSensibilidad} mA`);
  }
  if (protParts.length > 0) {
    parts.push(
      `Las protecciones generales constan de: ${protParts.join(', ')}. ` +
      `Los circuitos interiores se protegen mediante interruptores automáticos ` +
      `magnetotérmicos e interruptores diferenciales según ITC-BT-25.`,
    );
  }

  // Párrafo 4: Puesta a tierra
  if (inst.tipoElectrodos) {
    parts.push(
      `La instalación de puesta a tierra se realiza mediante ${inst.tipoElectrodos.toLowerCase()}` +
      `${inst.seccionCondProteccion ? ', con conductor de protección de ' + inst.seccionCondProteccion + ' mm²' : ''}.`,
    );
  }

  // Párrafo 5: Normativa
  parts.push(
    `La instalación cumple con lo establecido en el REBT (RD 842/2002) ` +
    `y sus Instrucciones Técnicas Complementarias ITC-BT-10, ITC-BT-15, ` +
    `ITC-BT-17, ITC-BT-19, ITC-BT-22, ITC-BT-24, ITC-BT-25 y ITC-BT-26.`,
  );

  return parts.join(' ');
}

// ─── Helpers ────────────────────────────────────────────────

/** Derive insulation voltage rating from engine insulationType (PVC/XLPE/EPR) */
function insulationVoltage(insulationType: string): string {
  switch (insulationType) {
    case 'PVC': return '450/750V';
    case 'XLPE': case 'EPR': return '0.6/1kV';
    default: return '450/750V';
  }
}

function mapInstallMethod(method: string): string {
  const map: Record<string, string> = {
    A1: 'E.T.F.',
    A2: 'E.T.F.',
    B1: 'T.P.',
    B2: 'T.P.',
    C: 'F.D.P.',
    D: 'ENTR',
    E: 'BANDJ',
    F: 'BANDJ',
  };
  return map[method] ?? method;
}

function splitTextIntoLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars) {
      lines.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current.trim()) lines.push(current.trim());
  return lines;
}
