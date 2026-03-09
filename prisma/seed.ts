/**
 * Seed: Instalación CIE completa de prueba
 *
 * Ejecutar:
 *   npx ts-node prisma/seed.ts
 *   # o dentro del container:
 *   docker exec oasis-api-cie npx ts-node prisma/seed.ts
 *
 * Usa el usuario dasoingenieros@gmail.com existente en LXC 104.
 * Crea: 1 instalación completa + 1 panel + 2 diferenciales + 5 circuitos
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── Buscar usuario David ──────────────────────────────────────────────────
  const user = await prisma.user.findFirst({
    where: { email: 'dasoingenieros@gmail.com' },
  });
  if (!user) {
    console.error('ERROR: Usuario dasoingenieros@gmail.com no encontrado.');
    console.error('Registra primero un usuario en https://cie.oasisplatform.es/register');
    process.exit(1);
  }

  console.log(`Usuario: ${user.name} (${user.email})`);
  console.log(`Tenant:  ${user.tenantId}`);

  // ── Actualizar datos empresa en Tenant ────────────────────────────────────
  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: {
      empresaNif: 'B12345678',
      empresaNombre: 'DASO Ingenieros S.L.',
      empresaCategoria: 'Básica',
      empresaRegNum: 'REIE-2024/001234',
      empresaTipoVia: 'Calle',
      empresaNombreVia: 'Gran Vía',
      empresaNumero: '42',
      empresaLocalidad: 'Madrid',
      empresaProvincia: 'Madrid',
      empresaCp: '28013',
      empresaTelefono: '915551234',
      empresaMovil: '666123456',
      empresaEmail: 'info@dasoingenieros.com',
      distribuidoraHab: 'UFD Distribución Electricidad S.A.',
    },
  });
  console.log('Tenant actualizado con datos empresa.');

  // ── Actualizar datos instalador en User ───────────────────────────────────
  await prisma.user.update({
    where: { id: user.id },
    data: {
      instaladorNombre: 'David Herranz López',
      instaladorNif: '12345678Z',
      instaladorCertNum: 'CERT-MAD-2024/0567',
    },
  });
  console.log('User actualizado con datos instalador.');

  // ── Crear Instalación completa ────────────────────────────────────────────
  const installation = await prisma.installation.create({
    data: {
      tenantId: user.tenantId,
      userId: user.id,
      status: 'CALCULATED',

      // ── Tipo documentación
      tipoDocumentacion: 'MTD',

      // ── Titular
      titularNif: '51234567B',
      titularNombre: 'María',
      titularApellido1: 'García',
      titularApellido2: 'López',
      titularTipoVia: 'Calle',
      titularNombreVia: 'Alcalá',
      titularNumero: '120',
      titularBloque: '2',
      titularEscalera: 'A',
      titularPiso: '3',
      titularPuerta: 'D',
      titularLocalidad: 'Madrid',
      titularProvincia: 'Madrid',
      titularCp: '28009',
      titularEmail: 'maria.garcia@example.com',
      titularTelefono: '914567890',
      titularMovil: '612345678',
      representanteNombre: null,
      representanteNif: null,

      // ── Legacy (frontend)
      titularName: 'María García López',
      titularAddress: 'Calle Alcalá 120, 3ºD',
      address: 'Calle Alcalá 120, 3ºD, 28009 Madrid',
      contractedPower: 5.75,
      installerName: 'David Herranz López',
      installerNif: '12345678Z',
      installerRegNum: 'REIE-2024/001234',

      // ── Emplazamiento
      emplazTipoVia: 'Calle',
      emplazNombreVia: 'Alcalá',
      emplazNumero: '120',
      emplazBloque: '2',
      emplazEscalera: 'A',
      emplazPiso: '3',
      emplazPuerta: 'D',
      emplazLocalidad: 'Madrid',
      emplazProvincia: 'Madrid',
      emplazCp: '28009',
      superficieM2: 85.5,
      cups: 'ES0031405871234567AB',

      // ── Datos técnicos
      supplyType: 'VIVIENDA_ELEVADA',
      supplyVoltage: 230,
      tipoActuacion: 'NUEVA',
      tipoMemoria: 'N',
      usoInstalacion: 'Vivienda unifamiliar',
      aforo: null,
      tipoInstalacionCie: 'Vivienda',
      gradoElectrificacion: 'ELEVADO',
      temporalidad: null,
      numRegistroExistente: null,

      // ── Potencias
      potMaxAdmisible: 9.2,
      potAmpliacion: null,
      potOriginal: null,

      // ── Acometida
      puntoConexion: 'Caja General de Protección en fachada',
      tipoAcometida: 'Subterránea',
      seccionAcometida: 16,
      materialAcometida: 'CU',

      // ── CGP
      tipoCgp: 'CGP-9-160',
      inBaseCgp: 160,
      inCartuchoCgp: 63,

      // ── LGA
      seccionLga: 16,
      materialLga: 'CU',
      longitudLga: 12.5,
      aislamientoLga: 'XLPE',

      // ── Derivación Individual
      seccionDi: 10,
      cdtDi: 0.85,
      materialDi: 'CU',
      longitudDi: 18.0,
      numDerivaciones: 1,
      aislamientoDi: 'XLPE',
      tipoInstalacionDi: 'Empotrada bajo tubo',

      // ── Módulo de medida
      tipoModuloMedida: 'TMF1',
      situacionModulo: 'Centralización en planta baja',
      contadorUbicacion: 'Centralización de contadores',

      // ── Puesta a tierra
      tipoElectrodos: 'Pica vertical 2m',
      seccionLineaEnlace: 16,
      seccionCondProteccion: 16,
      resistenciaTierra: 15.0,
      resistenciaAislamiento: 0.5,
      esquemaDistribucion: 'TT',
      protSobretensiones: false,

      // ── Protecciones generales
      igaNominal: 40,
      igaPoderCorte: 6,
      diferencialNominal: 40,
      diferencialSensibilidad: 30,

      // ── Verificaciones
      otrasVerificaciones: 'Continuidad conductores protección OK. Resistencia aislamiento > 0.5 MΩ.',

      // ── Empresa instaladora (snapshot)
      empresaNif: 'B12345678',
      empresaNombre: 'DASO Ingenieros S.L.',
      empresaCategoria: 'Básica',
      empresaRegNum: 'REIE-2024/001234',
      instaladorNombre: 'David Herranz López',
      instaladorNif: '12345678Z',
      instaladorCertNum: 'CERT-MAD-2024/0567',
      empresaTipoVia: 'Calle',
      empresaNombreVia: 'Gran Vía',
      empresaNumero: '42',
      empresaLocalidad: 'Madrid',
      empresaProvincia: 'Madrid',
      empresaCp: '28013',
      empresaTelefono: '915551234',
      empresaMovil: '666123456',
      empresaEmail: 'info@dasoingenieros.com',

      // ── Distribuidora
      distribuidora: 'UFD Distribución Electricidad S.A.',

      // ── Presupuesto
      presupuestoMateriales: 1850.00,
      presupuestoManoObra: 1200.00,
      presupuestoTotal: 3050.00,

      // ── Info adicional
      infoAdicional: 'Instalación nueva en vivienda unifamiliar. Grado de electrificación elevado con previsión de punto de recarga VE.',

      // ── CIE específicos
      identificadorCie: 'CIE-2026-MAD-00001',
      aplicaReeae: false,
      potLuminariasReeae: null,
      aplicaItcBt51: false,

      // ── MTD
      tipoAutor: 'Instalador autorizado',
      memoriaDescriptiva: 'Memoria técnica de diseño para instalación eléctrica de baja tensión en vivienda unifamiliar de nueva construcción. Grado de electrificación elevado (9.200 W). La instalación comprende circuitos de alumbrado, tomas generales, cocina/horno, lavadora/lavavajillas y tomas de baño, conforme a ITC-BT-25.',

      // ── Firma
      firmaLugar: 'Madrid',
      firmaFecha: new Date('2026-03-08'),
    },
  });

  console.log(`Instalación creada: ${installation.id}`);

  // ── Crear Panel Eléctrico ─────────────────────────────────────────────────
  const panel = await prisma.electricalPanel.create({
    data: {
      installationId: installation.id,
      igaCalibreA: 40,
      igaCurve: 'C',
      igaPowerCutKa: 6,
      igaPoles: 2,
      voltage: 230,
      maxPowerW: 9200,
    },
  });

  console.log(`Panel creado: ${panel.id}`);

  // ── Crear Diferenciales ───────────────────────────────────────────────────
  const diff1 = await prisma.differential.create({
    data: {
      panelId: panel.id,
      name: 'Diferencial 1 — Alumbrado y TC generales',
      order: 1,
      calibreA: 40,
      sensitivityMa: 30,
      type: 'AC',
      poles: 2,
    },
  });

  const diff2 = await prisma.differential.create({
    data: {
      panelId: panel.id,
      name: 'Diferencial 2 — Cocina, lavadora y baños',
      order: 2,
      calibreA: 40,
      sensitivityMa: 30,
      type: 'AC',
      poles: 2,
    },
  });

  console.log(`Diferenciales: ${diff1.id}, ${diff2.id}`);

  // ── Crear Circuitos (ITC-BT-25 vivienda elevada) ─────────────────────────
  const circuitsData = [
    {
      name: 'C1 — Alumbrado',
      code: 'C1',
      order: 1,
      power: 2300,
      voltage: 230,
      phases: 1,
      length: 20,
      cableType: 'CU' as const,
      insulationType: 'PVC' as const,
      installMethod: 'A1' as const,
      cosPhi: 1.0,
      breakerCurve: 'C',
      breakerCutKa: 6,
      installedPowerW: 2300,
      differentialId: diff1.id,
      // Resultados calculados
      calculatedSection: 1.5,
      assignedBreaker: 'C10',
      assignedRCD: '40/30mA AC',
      voltageDrop: 1.82,
      voltageDropAcc: 2.67,
      shortCircuit: 0.87,
      compliance: true,
    },
    {
      name: 'C2 — Tomas de corriente generales',
      code: 'C2',
      order: 2,
      power: 3450,
      voltage: 230,
      phases: 1,
      length: 15,
      cableType: 'CU' as const,
      insulationType: 'PVC' as const,
      installMethod: 'A1' as const,
      cosPhi: 1.0,
      breakerCurve: 'C',
      breakerCutKa: 6,
      installedPowerW: 3450,
      differentialId: diff1.id,
      calculatedSection: 2.5,
      assignedBreaker: 'C16',
      assignedRCD: '40/30mA AC',
      voltageDrop: 1.23,
      voltageDropAcc: 2.08,
      shortCircuit: 1.15,
      compliance: true,
    },
    {
      name: 'C3 — Cocina y horno',
      code: 'C3',
      order: 3,
      power: 5400,
      voltage: 230,
      phases: 1,
      length: 12,
      cableType: 'CU' as const,
      insulationType: 'PVC' as const,
      installMethod: 'A1' as const,
      cosPhi: 1.0,
      breakerCurve: 'C',
      breakerCutKa: 6,
      installedPowerW: 5400,
      differentialId: diff2.id,
      calculatedSection: 6.0,
      assignedBreaker: 'C25',
      assignedRCD: '40/30mA AC',
      voltageDrop: 0.64,
      voltageDropAcc: 1.49,
      shortCircuit: 2.30,
      compliance: true,
    },
    {
      name: 'C4 — Lavadora, lavavajillas y termo',
      code: 'C4',
      order: 4,
      power: 3450,
      voltage: 230,
      phases: 1,
      length: 18,
      cableType: 'CU' as const,
      insulationType: 'PVC' as const,
      installMethod: 'A1' as const,
      cosPhi: 1.0,
      breakerCurve: 'C',
      breakerCutKa: 6,
      installedPowerW: 3450,
      differentialId: diff2.id,
      calculatedSection: 4.0,
      assignedBreaker: 'C20',
      assignedRCD: '40/30mA AC',
      voltageDrop: 0.92,
      voltageDropAcc: 1.77,
      shortCircuit: 1.52,
      compliance: true,
    },
    {
      name: 'C5 — Tomas baño y cocina',
      code: 'C5',
      order: 5,
      power: 3450,
      voltage: 230,
      phases: 1,
      length: 14,
      cableType: 'CU' as const,
      insulationType: 'PVC' as const,
      installMethod: 'A1' as const,
      cosPhi: 1.0,
      breakerCurve: 'C',
      breakerCutKa: 6,
      installedPowerW: 3450,
      differentialId: diff2.id,
      calculatedSection: 2.5,
      assignedBreaker: 'C16',
      assignedRCD: '40/30mA AC',
      voltageDrop: 1.15,
      voltageDropAcc: 2.00,
      shortCircuit: 1.22,
      compliance: true,
    },
  ];

  for (const c of circuitsData) {
    await prisma.circuit.create({
      data: {
        installationId: installation.id,
        ...c,
        tempCorrFactor: 1.0,
        groupCorrFactor: 1.0,
      },
    });
  }

  console.log(`5 circuitos creados (C1-C5 ITC-BT-25).`);

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n═══ SEED COMPLETADO ═══');
  console.log(`Instalación: ${installation.id}`);
  console.log(`  Titular:   María García López — 51234567B`);
  console.log(`  Dirección: Calle Alcalá 120, 3ºD, 28009 Madrid`);
  console.log(`  Tipo:      Vivienda elevada (9.2 kW) — MTD`);
  console.log(`  Panel:     IGA 40A C/6kA + 2 diferenciales 40/30mA`);
  console.log(`  Circuitos: C1(alumbrado) C2(TC) C3(cocina) C4(lavadora) C5(baño)`);
  console.log(`  Status:    CALCULATED`);
  console.log(`\nAbre: https://cie.oasisplatform.es`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
