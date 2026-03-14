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
    public readonly searchTerm?: string,
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
  // FLUJO PRINCIPAL — stops at SAVED state (no auto-send)
  // ═══════════════════════════════════════════════════════════════════════════

  async ejecutarTramitacion(
    data: PortalSolicitudData,
    credentials: { username: string; password: string },
    expedienteId: string,
    onProgress: (step: PlaywrightStep, progress: number) => Promise<void>,
    resolvedInputs?: Record<string, { value: string; label: string }>,
  ): Promise<{ screenshots: string[] }> {
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

      // Step 3: SKIP — OCA/EICI (Tab 0) se deja por defecto (portal ya tiene la correcta)

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

      // Step 7: SAVE — guardar y fin (estado SAVED)
      await onProgress('SAVE', 90);
      await this.guardar(page);
      await this.screenshot(page, expedienteId, 'SAVE', screenshots);

      await context.close();
      return { screenshots };
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
  // PASO 1: LOGIN
  // ═══════════════════════════════════════════════════════════════════════════

  private async login(
    page: Page,
    credentials: { username: string; password: string },
  ): Promise<void> {
    await page.goto(PORTAL_URLS.login);
    await page.waitForLoadState('networkidle');

    await page.fill('[id="form_login:username"]', credentials.username);
    await page.fill('[id="form_login:password"]', credentials.password);

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
  // PASO 2: CREAR SOLICITUD — includes-based subtipo matching + PROYECTO/MTD button IDs
  // ═══════════════════════════════════════════════════════════════════════════

  private async crearSolicitud(page: Page, data: PortalSolicitudData): Promise<void> {
    // 2a: Navigate to altaSolicitud1
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

    // 2d: Subtipo — match by includes(suffix) instead of exact text
    const suffix = data.subtipoSolicitud;
    const clicked = await page.evaluate((target) => {
      const links = document.querySelectorAll('a[id*="btnCampoActuacion"]');
      for (const link of links) {
        if (link.textContent!.trim().includes(target)) {
          (link as HTMLElement).click();
          return link.textContent!.trim();
        }
      }
      return null;
    }, suffix);

    if (!clicked) {
      throw new Error(`Subtipo con sufijo "${suffix}" no encontrado en el portal`);
    }
    this.logger.log(`Subtipo seleccionado: "${clicked}" (matched suffix "${suffix}")`);
    await page.waitForTimeout(3000);

    // 2e: PROYECTO vs MTD — use exact button IDs
    const tipoDoc = data.tipoDocumentacion;
    if (tipoDoc === 'PROYECTO') {
      // Button ID index 0 = PROYECTO
      const btnId = 'form_altaSolicitud:lstVariantes:0:btnVarianteTipoSolicitud';
      const proyectoClicked = await page.evaluate((id) => {
        const btn = document.getElementById(id);
        if (btn) { (btn as HTMLElement).click(); return true; }
        return false;
      }, btnId);
      if (proyectoClicked) {
        this.logger.log('Tipo documentación: PROYECTO');
      } else {
        this.logger.warn('Botón PROYECTO no encontrado, puede ser automático');
      }
    } else {
      // Button ID index 1 = MEMORIA TÉCNICA DE DISEÑO (MTD)
      const btnId = 'form_altaSolicitud:lstVariantes:1:btnVarianteTipoSolicitud';
      const mtdClicked = await page.evaluate((id) => {
        const btn = document.getElementById(id);
        if (btn) { (btn as HTMLElement).click(); return true; }
        return false;
      }, btnId);
      if (mtdClicked) {
        this.logger.log('Tipo documentación: MTD');
      } else {
        this.logger.warn('Botón MTD no encontrado, puede ser automático');
      }
    }
    await page.waitForTimeout(2000);

    // 2f: Wait for form_abm
    await page.waitForFunction(() => !!document.getElementById('form_abm'), { timeout: 15000 });
    await page.waitForTimeout(1000);
    this.logger.log('Formulario con tabs cargado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4: FILL EMPLAZAMIENTO (Tab 1)
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillEmplazamiento(
    page: Page,
    data: PortalSolicitudData,
    resolvedInputs?: Record<string, { value: string; label: string }>,
  ): Promise<void> {
    const e = data.emplazamiento;

    // Provincia → wait for poblaciones to load (AJAX)
    await this.pfSelectAndVerify(page, 'provincia', e.provincia, {
      dependentWidget: 'poblacion',
      minDependentOptions: 2,
      waitMs: 2000,
      retryWaitMs: 3000,
    });

    await this.pfSelectAndVerify(page, 'poblacion', e.poblacion, {
      waitMs: 1000,
    });

    await this.pfSelectAndVerify(page, 'tipoVia', e.tipoVia, {
      waitMs: 500,
    });

    // Direct inputs via PF widgets (no tab activation needed)
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

    // Pre-RECONO check
    const pre = await page.evaluate(() => ({
      prov: (window as any).PF('provincia').getSelectedValue(),
      pob: (window as any).PF('poblacion').getSelectedValue(),
      tv: (window as any).PF('tipoVia').getSelectedValue(),
    }));
    this.logger.log(`Pre-RECONO check: prov=${pre.prov}, pob=${pre.pob}, tv=${pre.tv}`);
    if (!pre.prov || !pre.pob || !pre.tv) {
      throw new Error(
        `Provincia/Población/TipoVía no seteados antes de RECONO (prov=${pre.prov}, pob=${pre.pob}, tv=${pre.tv})`,
      );
    }

    // Activate tab 1 for RECONO vía (panel must be visible)
    await this.activateTab(page, '1');

    // Vía — RECONO autocomplete
    await this.resolveReconoVia(
      page,
      'form_abm:tabs:via_tab1',
      e.via,
      resolvedInputs?.['via'],
      'FILL_EMPLAZAMIENTO',
      'via',
    );

    this.logger.log('Emplazamiento rellenado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 5: FILL TITULAR (Tab 8)
  //   Fix: NIF via PF search, tipoDocumento by name, split name fields
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillTitular(
    page: Page,
    data: PortalSolicitudData,
    resolvedInputs?: Record<string, { value: string; label: string }>,
  ): Promise<void> {
    const t = data.titular;

    // Tipo documento — search by name in select options (UUIDs are dynamic)
    await page.evaluate((docTypeName) => {
      const select = document.getElementById('form_abm:tabs:tipoDocumentoTITULAR_8_tab8_input') as HTMLSelectElement;
      if (!select) throw new Error('Select tipoDocumento no encontrado');
      const option = Array.from(select.options).find(o =>
        o.text.toUpperCase().includes(docTypeName.toUpperCase()),
      );
      if (!option) {
        const available = Array.from(select.options).map(o => o.text).join(', ');
        throw new Error(`Tipo documento "${docTypeName}" no encontrado. Disponibles: ${available}`);
      }
      const PF = (window as any).PF;
      PF('tipoDocumentoTITULAR_8').selectValue(option.value);
      if (typeof PF('tipoDocumentoTITULAR_8').triggerChange === 'function') {
        PF('tipoDocumentoTITULAR_8').triggerChange();
      }
    }, t.tipoDocumento);
    await page.waitForTimeout(500);
    this.logger.log(`Tipo documento seleccionado por nombre: "${t.tipoDocumento}"`);

    // Activate tab 8 for NIF autocomplete
    await this.activateTab(page, '8');

    // NIF — use PF('numeroDocumentoTITULAR_8').search(nif) instead of page.fill/type
    await page.evaluate((nif) => {
      const PF = (window as any).PF;
      PF('numeroDocumentoTITULAR_8').search(nif);
    }, t.numeroDocumento);
    await page.waitForTimeout(2000); // wait for RECONO NIF lookup

    // If suggestions appear, close them
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Check if name fields were auto-populated (disabled = auto-filled by NIF lookup)
    const nameFieldsDisabled = await page.evaluate(() => {
      const nombre = document.getElementById('form_abm:tabs:nombreTITULAR_8_tab8') as HTMLInputElement;
      return nombre?.disabled ?? false;
    });

    if (!nameFieldsDisabled) {
      // Name fields not auto-populated — fill manually
      await page.evaluate((data) => {
        const setField = (id: string, val: string | undefined) => {
          if (!val) return;
          const el = document.getElementById(id) as HTMLInputElement;
          if (el && !el.disabled && !el.value) el.value = val;
        };
        setField('form_abm:tabs:nombreTITULAR_8_tab8', data.nombre);
        setField('form_abm:tabs:apellido1TITULAR_8_tab8', data.apellido1);
        setField('form_abm:tabs:apellido2TITULAR_8_tab8', data.apellido2);
      }, t);
      this.logger.log('Nombre titular rellenado manualmente');
    } else {
      this.logger.log('Nombre titular auto-rellenado por NIF lookup');
    }

    // Dirección titular (PF selects)
    if (t.provincia) {
      await this.pfSelectAndVerify(page, 'provinciaTITULAR_8', t.provincia, {
        dependentWidget: 'poblacionTITULAR_8',
        minDependentOptions: 2,
        waitMs: 2000,
        retryWaitMs: 3000,
      });
    }
    if (t.poblacion) {
      await this.pfSelectAndVerify(page, 'poblacionTITULAR_8', t.poblacion, {
        waitMs: 1000,
      });
    }
    if (t.tipoVia) {
      await this.pfSelectAndVerify(page, 'tipoViaTITULAR_8', t.tipoVia, {
        waitMs: 500,
      });
    }

    // Pre-RECONO check titular
    if (t.via) {
      const pre = await page.evaluate(() => ({
        prov: (window as any).PF('provinciaTITULAR_8').getSelectedValue(),
        pob: (window as any).PF('poblacionTITULAR_8').getSelectedValue(),
        tv: (window as any).PF('tipoViaTITULAR_8').getSelectedValue(),
      }));
      this.logger.log(`Pre-RECONO titular check: prov=${pre.prov}, pob=${pre.pob}, tv=${pre.tv}`);
      if (!pre.prov || !pre.pob || !pre.tv) {
        throw new Error(
          `Titular: Provincia/Población/TipoVía no seteados antes de RECONO (prov=${pre.prov}, pob=${pre.pob}, tv=${pre.tv})`,
        );
      }

      // Vía titular — RECONO autocomplete (tab 8 already active)
      await this.resolveReconoVia(
        page,
        'form_abm:tabs:viaTITULAR_8_tab8',
        t.via,
        resolvedInputs?.['viaTitular'],
        'FILL_TITULAR',
        'viaTitular',
      );
    }

    // Direct address inputs
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
  // PASO 6: FILL DATOS TÉCNICOS (Tab 3 — all via PF widgets)
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillDatosTecnicos(page: Page, data: PortalSolicitudData): Promise<void> {
    const dt = data.datosTecnicos;

    await page.evaluate((data) => {
      const PF = (window as any).PF;

      // Selects
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
      if (data.tipoModificacion) {
        PF('tipoModificacion').selectValue(data.tipoModificacion);
        PF('tipoModificacion').triggerChange();
      }

      // Inputs
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
  // PASO 7: GUARDAR — ID: form_abm:btnGuardar
  // ═══════════════════════════════════════════════════════════════════════════

  private async guardar(page: Page): Promise<void> {
    await page.evaluate(() => {
      const btn = document.getElementById('form_abm:btnGuardar');
      if (btn) (btn as HTMLElement).click();
    });
    await page.waitForTimeout(5000);

    const hasError = await page.locator('.ui-messages-error, .ui-message-error').isVisible().catch(() => false);
    if (hasError) {
      const errorText = await page.locator('.ui-messages-error, .ui-message-error').textContent().catch(() => '');
      throw new Error(`Error al guardar: ${errorText}`);
    }

    this.logger.log('Solicitud guardada');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RECONO — Vía autocomplete resolution (6 chars, strip article prefixes)
  // ═══════════════════════════════════════════════════════════════════════════

  private async resolveReconoVia(
    page: Page,
    widgetPrefix: string,
    viaName: string,
    resolved: { value?: string; searchTerm?: string } | undefined,
    step: PlaywrightStep,
    fieldName: string,
  ): Promise<void> {
    const panelId = widgetPrefix + '_panel';
    const hiddenId = widgetPrefix + '_hinput';

    // Extract PF widget name from prefix
    const pfWidgetName = widgetPrefix.replace('form_abm:tabs:', '').replace(/_tab\d+$/, '');

    // Pre-selected UUID (NEEDS_INPUT resolution)
    if (resolved?.value) {
      await page.evaluate(({ hid, uuid }) => {
        const hidden = document.getElementById(hid);
        if (hidden) (hidden as HTMLInputElement).value = uuid;
      }, { hid: hiddenId, uuid: resolved.value });
      return;
    }

    const effectiveViaName = resolved?.searchTerm || viaName;

    // Strip article prefixes before searching, use first 6 chars
    const normalized = normalizeViaName(effectiveViaName);
    const searchTerm = normalized.substring(0, 6).toUpperCase();
    this.logger.log(`RECONO search: PF('${pfWidgetName}').search('${searchTerm}')`);

    await page.evaluate(({ wn, term }) => {
      (window as any).PF(wn).search(term);
    }, { wn: pfWidgetName, term: searchTerm });
    await page.waitForTimeout(2000);

    // Read suggestions
    let candidates = await page.evaluate((pid) => {
      const panel = document.getElementById(pid);
      if (!panel) return [];
      return Array.from(panel.querySelectorAll('li')).map(li => ({
        uuid: li.getAttribute('data-item-value') || '',
        label: li.textContent?.trim() || '',
      }));
    }, panelId);

    this.logger.log(`RECONO candidates (${candidates.length}): ${candidates.map(c => c.label).join(', ')}`);

    // Fuzzy match
    const normalizedSearch = normalizeViaName(viaName);
    let scored = candidates.map((c) => ({
      ...c,
      confidence: calculateMatchScore(normalizedSearch, normalizeViaName(c.label)),
    }));
    scored.sort((a, b) => b.confidence - a.confidence);

    if (scored.length > 0 && scored[0]!.confidence >= 80) {
      // Auto-match — click the item
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

      const hiddenVal = await page.evaluate((hid) => {
        return (document.getElementById(hid) as HTMLInputElement)?.value || '';
      }, hiddenId);
      this.logger.log(`RECONO auto-match: "${scored[0]!.label}" (${scored[0]!.confidence}%) → UUID: ${hiddenVal}`);
    } else if (scored.length > 0) {
      throw new NeedsInputError(fieldName, scored.slice(0, 10), step, effectiveViaName);
    } else {
      // No results — retry with fewer chars
      const shortTerm = normalized.substring(0, 3).toUpperCase();
      this.logger.log(`RECONO retry: PF('${pfWidgetName}').search('${shortTerm}')`);

      await page.evaluate(({ wn, term }) => {
        (window as any).PF(wn).search(term);
      }, { wn: pfWidgetName, term: shortTerm });
      await page.waitForTimeout(2000);

      candidates = await page.evaluate((pid) => {
        const panel = document.getElementById(pid);
        if (!panel) return [];
        return Array.from(panel.querySelectorAll('li')).map(li => ({
          uuid: li.getAttribute('data-item-value') || '',
          label: li.textContent?.trim() || '',
        }));
      }, panelId);

      this.logger.log(`RECONO retry candidates (${candidates.length}): ${candidates.map(c => c.label).join(', ')}`);

      if (candidates.length > 0) {
        throw new NeedsInputError(
          fieldName,
          candidates.slice(0, 15).map((c) => ({ ...c, confidence: 50 })),
          step,
          effectiveViaName,
        );
      }
      throw new NeedsInputError(fieldName, [], step, effectiveViaName);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async activateTab(page: Page, tabId: string): Promise<void> {
    await page.evaluate((id) => {
      const link = document.querySelector(
        `a[href="#form_abm:tabs:tabView_id_${id}"]`,
      ) as HTMLElement;
      if (link) link.click();
    }, tabId);
    await page.waitForTimeout(500);
  }

  private async pfSelectAndVerify(
    page: Page,
    widgetName: string,
    value: string,
    opts?: {
      dependentWidget?: string;
      minDependentOptions?: number;
      waitMs?: number;
      retryWaitMs?: number;
    },
  ): Promise<void> {
    const {
      dependentWidget,
      minDependentOptions = 2,
      waitMs = 1500,
      retryWaitMs = 3000,
    } = opts ?? {};

    await page.evaluate(({ w, v }) => {
      (window as any).PF(w).selectValue(v);
      (window as any).PF(w).triggerChange();
    }, { w: widgetName, v: value });
    await page.waitForTimeout(waitMs);

    const applied = await page.evaluate(({ w, v }) =>
      (window as any).PF(w).getSelectedValue() === v,
    { w: widgetName, v: value });

    if (!applied) {
      this.logger.warn(`PF('${widgetName}') valor no aplicado, reintentando...`);
      await page.evaluate(({ w, v }) => {
        (window as any).PF(w).selectValue(v);
        (window as any).PF(w).triggerChange();
      }, { w: widgetName, v: value });
      await page.waitForTimeout(retryWaitMs);

      const applied2 = await page.evaluate(({ w, v }) =>
        (window as any).PF(w).getSelectedValue() === v,
      { w: widgetName, v: value });
      if (!applied2) {
        const actual = await page.evaluate(({ w }) =>
          (window as any).PF(w).getSelectedValue(),
        { w: widgetName });
        throw new Error(
          `PF('${widgetName}') no aceptó valor "${value}" (actual: "${actual}")`,
        );
      }
    }

    this.logger.log(`PF('${widgetName}') = "${value}" ✓`);

    if (dependentWidget) {
      const optCount = await page.evaluate(({ w }) => {
        const widget = (window as any).PF(w);
        if (!widget) return 0;
        const items = widget.items;
        return items ? items.length : 0;
      }, { w: dependentWidget });

      this.logger.log(`PF('${dependentWidget}') opciones: ${optCount}`);

      if (optCount < minDependentOptions) {
        this.logger.warn(
          `PF('${dependentWidget}') solo tiene ${optCount} opciones, esperando...`,
        );
        await page.waitForTimeout(2000);

        const optCount2 = await page.evaluate(({ w }) => {
          const widget = (window as any).PF(w);
          if (!widget) return 0;
          const items = widget.items;
          return items ? items.length : 0;
        }, { w: dependentWidget });

        if (optCount2 < minDependentOptions) {
          throw new Error(
            `PF('${dependentWidget}') no cargó opciones tras PF('${widgetName}') = "${value}" (opciones: ${optCount2})`,
          );
        }
      }
    }
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
