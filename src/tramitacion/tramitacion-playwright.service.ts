import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { chromium, type Browser, type Page } from 'playwright-core';
import {
  PORTAL_URLS,
  normalizeViaName,
  type PortalSolicitudData,
  type PlaywrightStep,
  type ReconoCandidate,
} from './portal-field-mapping';

export class NeedsInputError extends Error {
  constructor(
    public readonly field: string,
    public readonly candidates: ReconoCandidate[],
    public readonly step: PlaywrightStep,
  ) {
    super(`NEEDS_INPUT: campo "${field}" requiere selección manual`);
    this.name = 'NeedsInputError';
  }
}

const BROWSER_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
];

const REAL_USER_AGENT =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

@Injectable()
export class TramitacionPlaywrightService {
  private readonly logger = new Logger(TramitacionPlaywrightService.name);
  private readonly screenshotsEnabled: boolean;
  private readonly stepTimeout: number;

  constructor(private readonly config: ConfigService) {
    this.screenshotsEnabled =
      this.config.get<string>('TRAMITACION_SCREENSHOTS', 'true') === 'true';
    this.stepTimeout = parseInt(
      this.config.get<string>('TRAMITACION_STEP_TIMEOUT', '20000'),
      10,
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FLUJO PRINCIPAL
  // ═══════════════════════════════════════════════════════════════════════════

  async ejecutarTramitacion(
    data: PortalSolicitudData,
    credentials: { username: string; password: string },
    expedienteId: string,
    onProgress: (step: PlaywrightStep, progress: number) => Promise<void>,
    resolvedInputs?: Record<string, { value: string; label: string }>,
  ): Promise<{ portalExpediente?: string; screenshots: string[] }> {
    const screenshots: string[] = [];
    let browser: Browser | null = null;

    try {
      browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        locale: 'es-ES',
        userAgent: REAL_USER_AGENT,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(this.stepTimeout);

      // Step 1: LOGIN
      await onProgress('LOGIN', 5);
      await this.login(page, credentials);
      await this.screenshot(page, expedienteId, 'LOGIN', screenshots);

      // Step 2: CREATE_SOLICITUD
      await onProgress('CREATE_SOLICITUD', 10);
      await this.crearSolicitud(page, data);
      await this.screenshot(page, expedienteId, 'CREATE_SOLICITUD', screenshots);

      // Step 3: FILL_OCA_EICI
      await onProgress('FILL_OCA_EICI', 15);
      await this.fillOcaEici(page, data.ocaEici);
      await this.screenshot(page, expedienteId, 'FILL_OCA_EICI', screenshots);

      // Step 4: FILL_EMPLAZAMIENTO
      await onProgress('FILL_EMPLAZAMIENTO', 25);
      await this.fillEmplazamiento(page, data, resolvedInputs);
      await this.screenshot(page, expedienteId, 'FILL_EMPLAZAMIENTO', screenshots);

      // Step 5: FILL_TITULAR
      await onProgress('FILL_TITULAR', 40);
      await this.fillTitular(page, data, resolvedInputs);
      await this.screenshot(page, expedienteId, 'FILL_TITULAR', screenshots);

      // Step 6: FILL_DATOS_TECNICOS
      await onProgress('FILL_DATOS_TECNICOS', 55);
      await this.fillDatosTecnicos(page, data);
      await this.screenshot(page, expedienteId, 'FILL_DATOS_TECNICOS', screenshots);

      // Step 7: SAVE
      await onProgress('SAVE', 65);
      await this.guardar(page);
      await this.screenshot(page, expedienteId, 'SAVE', screenshots);

      // Step 8: UPLOAD_DOCUMENTS
      await onProgress('UPLOAD_DOCUMENTS', 75);
      await this.subirDocumentos(page, data.documentos);
      await this.screenshot(page, expedienteId, 'UPLOAD_DOCUMENTS', screenshots);

      // Step 9: SEND
      await onProgress('SEND', 90);
      await this.enviar(page);
      await this.screenshot(page, expedienteId, 'SEND', screenshots);

      // Step 10: VERIFY
      await onProgress('VERIFY', 95);
      const portalExpediente = await this.verificar(page);
      await this.screenshot(page, expedienteId, 'VERIFY', screenshots);

      await context.close();
      return { portalExpediente, screenshots };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // TEST CONEXIÓN
  // ═══════════════════════════════════════════════════════════════════════════

  async testConexion(credentials: {
    username: string;
    password: string;
  }): Promise<{ success: boolean; message: string }> {
    let browser: Browser | null = null;
    try {
      browser = await chromium.launch({ headless: true, args: BROWSER_ARGS });
      const context = await browser.newContext({ userAgent: REAL_USER_AGENT });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);

      await this.login(page, credentials);
      return { success: true, message: 'Conexión exitosa al Portal del Instalador' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Error de conexión' };
    } finally {
      if (browser) {
        await browser.close().catch(() => {});
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 1: LOGIN — Selectores verificados:
  //   [id="form_login:username"], [id="form_login:password"], button[type="submit"]
  // ═══════════════════════════════════════════════════════════════════════════

  private async login(
    page: Page,
    credentials: { username: string; password: string },
  ): Promise<void> {
    await page.goto(PORTAL_URLS.login);
    await page.waitForLoadState('networkidle');

    await page.fill('[id="form_login:username"]', credentials.username);
    await page.fill('[id="form_login:password"]', credentials.password);

    // PrimeFaces AJAX submit — NO navegación normal, redirige via JS
    await page.click('button[type="submit"]');

    try {
      await page.waitForURL('**/inicio.jsf', { timeout: 20000 });
    } catch {
      await page.waitForTimeout(5000);
      if (page.url().includes('login')) {
        throw new Error('Login fallido — credenciales incorrectas o reCAPTCHA bloqueó');
      }
    }
    await page.waitForLoadState('networkidle');

    this.logger.log(`Login exitoso — ${page.url()}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 2: CREAR SOLICITUD
  //   Navegación directa + PF widgets + links por texto
  // ═══════════════════════════════════════════════════════════════════════════

  private async crearSolicitud(page: Page, data: PortalSolicitudData): Promise<void> {
    // 2a: Navegar directo a altaSolicitud1 (sin menú)
    await page.goto(PORTAL_URLS.altaSolicitud1);
    await page.waitForLoadState('networkidle');
    this.logger.log('altaSolicitud1.jsf cargado');

    // 2b: Click "INSTALACIONES BAJA TENSIÓN"
    await page.click('a:has-text("INSTALACIONES BAJA TENSIÓN")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    this.logger.log('Campo actuación seleccionado');

    // 2c: Tipo expediente — PF('tipoExpediente')
    const tipoExp = data.tipoExpediente;
    await page.evaluate((val) => {
      const pf = (window as any).PF;
      if (!pf) throw new Error('PrimeFaces not loaded');
      const wgt = pf('tipoExpediente');
      if (!wgt) throw new Error('Widget "tipoExpediente" no encontrado');
      wgt.selectValue(val);
      if (typeof wgt.triggerChange === 'function') wgt.triggerChange();
    }, tipoExp);
    await page.waitForTimeout(2000);
    this.logger.log(`Tipo expediente seleccionado: ${tipoExp}`);

    // 2d: Subtipo — buscar por texto exacto entre links a[id*="btnCampoActuacion"]
    const subtipo = data.subtipoSolicitud;
    const clicked = await page.evaluate((target) => {
      const links = document.querySelectorAll('a[id*="btnCampoActuacion"]');
      for (const link of links) {
        if (link.textContent!.trim() === target) {
          (link as HTMLElement).click();
          return true;
        }
      }
      return false;
    }, subtipo);

    if (!clicked) {
      throw new Error(`Subtipo "${subtipo}" no encontrado en el portal`);
    }
    this.logger.log(`Subtipo seleccionado: ${subtipo}`);
    await page.waitForTimeout(3000);

    // 2e: Puede haber paso MEMORIA/PROYECTO — para Vivienda es automático
    const memoriaLink = page.locator('a:has-text("MEMORIA"), a:has-text("Memoria")').first();
    const memoriaVisible = await memoriaLink.isVisible().catch(() => false);
    if (memoriaVisible) {
      await memoriaLink.click();
      this.logger.log('Tipo documentación seleccionado: MEMORIA');
      await page.waitForTimeout(2000);
    }

    // 2f: Esperar a que form_abm exista (ui-hidden-container → no visible para PW)
    await page.waitForFunction(() => !!document.getElementById('form_abm'), { timeout: 15000 });
    await page.waitForTimeout(1000);
    this.logger.log('Formulario con tabs cargado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 3: FILL OCA/EICI — PF('oca'), sin activar pestaña
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillOcaEici(page: Page, eiciId: string): Promise<void> {
    await page.evaluate((eici) => {
      (window as any).PF('oca').selectValue(eici);
      (window as any).PF('oca').triggerChange();
    }, eiciId);
    await page.waitForTimeout(500);
    this.logger.log('EICI seleccionada');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4: FILL EMPLAZAMIENTO (Tab 1)
  //   PF widgets para selects/inputs SIN activar pestaña.
  //   Activar tab 1 SOLO para RECONO vía (panel visible).
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillEmplazamiento(
    page: Page,
    data: PortalSolicitudData,
    resolvedInputs?: Record<string, { value: string; label: string }>,
  ): Promise<void> {
    const e = data.emplazamiento;

    // Provincia → esperar carga poblaciones
    await page.evaluate((val) => {
      (window as any).PF('provincia').selectValue(val);
      (window as any).PF('provincia').triggerChange();
    }, e.provincia);
    await page.waitForTimeout(1500);

    // Población
    await page.evaluate((val) => {
      (window as any).PF('poblacion').selectValue(val);
      (window as any).PF('poblacion').triggerChange();
    }, e.poblacion);
    await page.waitForTimeout(500);

    // Tipo Vía
    await page.evaluate((val) => {
      (window as any).PF('tipoVia').selectValue(val);
      (window as any).PF('tipoVia').triggerChange();
    }, e.tipoVia);
    await page.waitForTimeout(500);

    // Inputs directos via PF widgets (sin activar pestaña)
    await page.evaluate((data) => {
      const PF = (window as any).PF;
      if (data.numero) PF('numero').jq.val(data.numero);
      if (data.portal) PF('portal').jq.val(data.portal);
      if (data.escalera) PF('escalera').jq.val(data.escalera);
      if (data.piso) PF('piso').jq.val(data.piso);
      if (data.puerta) PF('puerta').jq.val(data.puerta);
      if (data.codigoPostal) PF('codigoPostal').jq.val(data.codigoPostal);
      if (data.descripcion) PF('descripcion').jq.val(data.descripcion);
    }, e);

    // Activar tab 1 para RECONO vía (panel visible)
    await this.activateTab(page, '1');

    // Vía — RECONO autocomplete
    const viaResolved = resolvedInputs?.['via'];
    await this.resolveReconoVia(
      page,
      'form_abm:tabs:via_tab1',
      e.via,
      viaResolved?.value,
      'FILL_EMPLAZAMIENTO',
      'via',
    );

    this.logger.log('Emplazamiento rellenado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 5: FILL TITULAR (Tab 8)
  //   PF widgets para selects SIN activar pestaña.
  //   Activar tab 8 para NIF autocomplete y RECONO vía titular.
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillTitular(
    page: Page,
    data: PortalSolicitudData,
    resolvedInputs?: Record<string, { value: string; label: string }>,
  ): Promise<void> {
    const t = data.titular;

    // Tipo documento (PF select, sin activar pestaña)
    await page.evaluate((val) => {
      (window as any).PF('tipoDocumentoTITULAR_8').selectValue(val);
      (window as any).PF('tipoDocumentoTITULAR_8').triggerChange();
    }, t.tipoDocumento);
    await page.waitForTimeout(500);

    // Activar tab 8 para NIF autocomplete
    await this.activateTab(page, '8');

    // NIF — escribir en input con selector de atributo exacto
    const nifInput = '[id="form_abm:tabs:numeroDocumentoTITULAR_8_tab8_input"]';
    await page.fill(nifInput, '');
    await page.type(nifInput, t.numeroDocumento, { delay: 50 });
    await page.waitForTimeout(1500); // esperar RECONO NIF lookup

    // Si aparecen sugerencias, cerrarlas
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Razón social (puede haberse auto-rellenado tras NIF)
    if (t.razonSocial) {
      await page.evaluate((val) => {
        const el = document.getElementById('form_abm:tabs:razonSocialTITULAR_8_tab8');
        if (el && !(el as HTMLInputElement).disabled && !(el as HTMLInputElement).value) {
          (el as HTMLInputElement).value = val;
        }
      }, t.razonSocial);
    }

    // Dirección titular (PF selects, sin activar pestaña)
    if (t.provincia) {
      await page.evaluate((val) => {
        (window as any).PF('provinciaTITULAR_8').selectValue(val);
        (window as any).PF('provinciaTITULAR_8').triggerChange();
      }, t.provincia);
      await page.waitForTimeout(1500);
    }
    if (t.poblacion) {
      await page.evaluate((val) => {
        (window as any).PF('poblacionTITULAR_8').selectValue(val);
        (window as any).PF('poblacionTITULAR_8').triggerChange();
      }, t.poblacion);
      await page.waitForTimeout(500);
    }
    if (t.tipoVia) {
      await page.evaluate((val) => {
        (window as any).PF('tipoViaTITULAR_8').selectValue(val);
        (window as any).PF('tipoViaTITULAR_8').triggerChange();
      }, t.tipoVia);
      await page.waitForTimeout(500);
    }

    // Vía titular — RECONO autocomplete (tab 8 ya activa)
    if (t.via) {
      const viaTitResolved = resolvedInputs?.['viaTitular'];
      await this.resolveReconoVia(
        page,
        'form_abm:tabs:viaTITULAR_8_tab8',
        t.via,
        viaTitResolved?.value,
        'FILL_TITULAR',
        'viaTitular',
      );
    }

    // Inputs dirección titular via PF widgets
    await page.evaluate((data) => {
      const PF = (window as any).PF;
      if (data.numero) PF('numeroTITULAR_8').jq.val(data.numero);
      if (data.portal) PF('portalTITULAR_8').jq.val(data.portal);
      if (data.escalera) PF('escaleraTITULAR_8').jq.val(data.escalera);
      if (data.piso) PF('pisoTITULAR_8').jq.val(data.piso);
      if (data.puerta) PF('puertaTITULAR_8').jq.val(data.puerta);
      if (data.codigoPostal) PF('codigoPostalTITULAR_8').jq.val(data.codigoPostal);
      if (data.telefono) PF('telefonoTITULAR_8').jq.val(data.telefono);
      if (data.telefonoMovil) PF('telefonoMovilTITULAR_8').jq.val(data.telefonoMovil);
      if (data.email) PF('emailTITULAR_8').jq.val(data.email);
    }, t);

    this.logger.log('Titular rellenado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 6: FILL DATOS TÉCNICOS (Tab 3 — todo via PF widgets, sin activar pestaña)
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillDatosTecnicos(page: Page, data: PortalSolicitudData): Promise<void> {
    const dt = data.datosTecnicos;

    await page.evaluate((data) => {
      const PF = (window as any).PF;

      // Selects con triggerChange
      if (data.tipoSuministro) {
        PF('tipoSuministro').selectValue(data.tipoSuministro);
        PF('tipoSuministro').triggerChange();
      }
      if (data.tensionSuministro) {
        PF('tensionSuministro').selectValue(data.tensionSuministro);
        PF('tensionSuministro').triggerChange();
      }
      if (data.companiaDistribuidora) {
        PF('companiaDistribuidora').selectValue(data.companiaDistribuidora);
        PF('companiaDistribuidora').triggerChange();
      }
      if (data.sistemaConexion) {
        PF('sistemaConexion').selectValue(data.sistemaConexion);
        PF('sistemaConexion').triggerChange();
      }

      // Inputs directos
      if (data.potenciaMaximaAdmisible) PF('potenciaMaximaAdmisible').jq.val(data.potenciaMaximaAdmisible);
      if (data.valorInterruptorGral) PF('valorInterruptorGral').jq.val(data.valorInterruptorGral);
      if (data.cups) PF('cups').jq.val(data.cups);
      if (data.seccionAcometida) PF('seccionAcometida').jq.val(data.seccionAcometida);
      if (data.descripcionInstalacion) PF('descripcionInstalacion').jq.val(data.descripcionInstalacion);
    }, dt);
    await page.waitForTimeout(500);

    this.logger.log('Datos técnicos rellenados');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 7: GUARDAR — ID verificado: form_abm:btnGuardar
  // ═══════════════════════════════════════════════════════════════════════════

  private async guardar(page: Page): Promise<void> {
    await page.evaluate(() => {
      const btn = document.getElementById('form_abm:btnGuardar');
      if (btn) (btn as HTMLElement).click();
    });
    await page.waitForTimeout(5000); // el portal tarda en guardar

    // Check for validation errors
    const hasError = await page.locator('.ui-messages-error, .ui-message-error').isVisible().catch(() => false);
    if (hasError) {
      const errorText = await page.locator('.ui-messages-error, .ui-message-error').textContent().catch(() => '');
      throw new Error(`Error al guardar: ${errorText}`);
    }

    this.logger.log('Solicitud guardada');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 8: SUBIR DOCUMENTOS (Tab 4 — necesita inputs visibles, activar pestaña)
  // ═══════════════════════════════════════════════════════════════════════════

  private async subirDocumentos(
    page: Page,
    docs: PortalSolicitudData['documentos'],
  ): Promise<void> {
    // Activar tab 4
    await this.activateTab(page, '4');
    await page.waitForTimeout(1000);

    const files = [
      { path: docs.ciePdf, label: 'CIE' },
      { path: docs.mtdPdf, label: 'MTD' },
      { path: docs.solicitudBtPdf, label: 'Solicitud BT' },
    ];
    if (docs.unifilarPdf) {
      files.push({ path: docs.unifilarPdf, label: 'Unifilar' });
    }

    for (const file of files) {
      const fileInputs = page.locator('input[type="file"]');
      const count = await fileInputs.count();

      if (count > 0) {
        await fileInputs.first().setInputFiles(file.path);
        await page.waitForTimeout(2000);

        // Click upload button if present
        const uploadBtn = page.locator(
          '.ui-fileupload-upload, button:has-text("Subir"), [class*="upload"]',
        ).first();
        const uploadVisible = await uploadBtn.isVisible().catch(() => false);
        if (uploadVisible) {
          await uploadBtn.click();
          await page.waitForTimeout(2000);
        }

        this.logger.log(`Documento ${file.label} subido`);
      } else {
        this.logger.warn(`No se encontró input de archivo para ${file.label}`);
      }
    }

    this.logger.log('Documentos subidos');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 9: ENVIAR — ID verificado: form_abm:btnEnviar
  // ═══════════════════════════════════════════════════════════════════════════

  private async enviar(page: Page): Promise<void> {
    await page.evaluate(() => {
      const btn = document.getElementById('form_abm:btnEnviar');
      if (btn) (btn as HTMLElement).click();
    });
    await page.waitForTimeout(5000);

    // Handle confirmation dialog if present
    const confirmBtn = page.locator(
      '.ui-confirmdialog-yes, button:has-text("Sí"), button:has-text("Aceptar")',
    ).first();
    const confirmVisible = await confirmBtn.isVisible().catch(() => false);
    if (confirmVisible) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);
    }

    this.logger.log('Solicitud enviada');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 10: VERIFICAR — ID verificado: form_abm:tabs:numeroExpediente1_tab0
  // ═══════════════════════════════════════════════════════════════════════════

  private async verificar(page: Page): Promise<string | undefined> {
    await page.waitForTimeout(2000);

    const expedienteNum = await page.evaluate(() => {
      const el = document.getElementById('form_abm:tabs:numeroExpediente1_tab0');
      return el ? (el as HTMLInputElement).value || undefined : undefined;
    });

    if (expedienteNum) {
      this.logger.log(`Expediente portal: ${expedienteNum}`);
    } else {
      this.logger.log('Enviado correctamente, nº expediente no detectado');
    }

    return expedienteNum;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECONO — Resolución de vías por autocomplete
  //   Usa selectores CSS con IDs exactos del DOM:
  //     input: [id="${widgetPrefix}_input"]
  //     panel: document.getElementById("${widgetPrefix}_panel")
  //     hidden: document.getElementById("${widgetPrefix}_hinput")
  // ═══════════════════════════════════════════════════════════════════════════

  private async resolveReconoVia(
    page: Page,
    widgetPrefix: string,
    viaName: string,
    preSelectedUuid: string | undefined,
    step: PlaywrightStep,
    fieldName: string,
  ): Promise<void> {
    const inputId = widgetPrefix + '_input';
    const panelId = widgetPrefix + '_panel';
    const hiddenId = widgetPrefix + '_hinput';

    // Pre-selected UUID (NEEDS_INPUT resolution)
    if (preSelectedUuid) {
      await page.evaluate(({ hid, uuid }) => {
        const hidden = document.getElementById(hid);
        if (hidden) (hidden as HTMLInputElement).value = uuid;
      }, { hid: hiddenId, uuid: preSelectedUuid });
      return;
    }

    // 1. Escribir primeras letras en el autocomplete
    const searchTerm = viaName.substring(0, 5).toUpperCase();
    const inputSelector = `[id="${inputId}"]`;

    await page.fill(inputSelector, '');
    await page.type(inputSelector, searchTerm, { delay: 100 });
    await page.waitForTimeout(1500);

    // 2. Leer sugerencias del panel
    let candidates = await page.evaluate((pid) => {
      const panel = document.getElementById(pid);
      if (!panel) return [];
      return Array.from(panel.querySelectorAll('li')).map(li => ({
        uuid: li.getAttribute('data-item-value') || '',
        label: li.textContent?.trim() || '',
      }));
    }, panelId);

    // 3. Fuzzy match
    const normalizedSearch = normalizeViaName(viaName);
    let scored = candidates.map((c) => ({
      ...c,
      confidence: calculateMatchScore(normalizedSearch, normalizeViaName(c.label)),
    }));
    scored.sort((a, b) => b.confidence - a.confidence);

    // 4. Decidir
    if (scored.length > 0 && scored[0]!.confidence >= 80) {
      // Match automático — click en el item del panel
      const bestUuid = scored[0]!.uuid;
      await page.evaluate(({ pid, uuid }) => {
        const panel = document.getElementById(pid);
        if (!panel) return;
        const items = panel.querySelectorAll('li');
        for (const item of items) {
          if (item.getAttribute('data-item-value') === uuid) {
            (item as HTMLElement).click();
            return;
          }
        }
      }, { pid: panelId, uuid: bestUuid });
      await page.waitForTimeout(500);
      this.logger.log(`RECONO auto-match: "${scored[0]!.label}" (${scored[0]!.confidence}%)`);
    } else if (scored.length > 0) {
      // Sin match claro — NEEDS_INPUT
      throw new NeedsInputError(fieldName, scored.slice(0, 10), step);
    } else {
      // Sin resultados — reintentar con menos letras
      await page.fill(inputSelector, '');
      await page.type(inputSelector, viaName.substring(0, 3).toUpperCase(), { delay: 100 });
      await page.waitForTimeout(1500);

      candidates = await page.evaluate((pid) => {
        const panel = document.getElementById(pid);
        if (!panel) return [];
        return Array.from(panel.querySelectorAll('li')).map(li => ({
          uuid: li.getAttribute('data-item-value') || '',
          label: li.textContent?.trim() || '',
        }));
      }, panelId);

      if (candidates.length > 0) {
        throw new NeedsInputError(
          fieldName,
          candidates.slice(0, 15).map((c) => ({ ...c, confidence: 50 })),
          step,
        );
      }
      throw new Error(`No se encontró la vía "${viaName}" en RECONO`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Activar pestaña del formulario por su ID (0, 1, 3, 4, 8, etc.).
   * Dentro de page.evaluate NO escapar ":" — es JS nativo, no CSS de Playwright.
   */
  private async activateTab(page: Page, tabId: string): Promise<void> {
    await page.evaluate((id) => {
      const link = document.querySelector(
        `a[href="#form_abm:tabs:tabView_id_${id}"]`,
      ) as HTMLElement;
      if (link) link.click();
    }, tabId);
    await page.waitForTimeout(500);
  }

  private async screenshot(
    page: Page,
    expedienteId: string,
    step: string,
    screenshots: string[],
  ): Promise<void> {
    if (!this.screenshotsEnabled) return;
    try {
      const path = `/tmp/tramitacion/${expedienteId}_${step}.png`;
      await page.screenshot({ path, fullPage: false });
      screenshots.push(path);
    } catch {
      // Non-critical
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Fuzzy match score (Levenshtein-based)
// ═══════════════════════════════════════════════════════════════════════════

function calculateMatchScore(a: string, b: string): number {
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 90;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 100;
  const m: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    m[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) {
        m[0]![j] = j;
      } else {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        m[i]![j] = Math.min(
          m[i - 1]![j]! + 1,
          m[i]![j - 1]! + 1,
          m[i - 1]![j - 1]! + cost,
        );
      }
    }
  }
  const dist = m[a.length]![b.length]!;
  return Math.max(0, Math.round((1 - dist / maxLen) * 100));
}
