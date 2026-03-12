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

@Injectable()
export class TramitacionPlaywrightService {
  private readonly logger = new Logger(TramitacionPlaywrightService.name);
  private readonly screenshotsEnabled: boolean;
  private readonly stepTimeout: number;

  constructor(private readonly config: ConfigService) {
    this.screenshotsEnabled =
      this.config.get<string>('TRAMITACION_SCREENSHOTS', 'true') === 'true';
    this.stepTimeout = parseInt(
      this.config.get<string>('TRAMITACION_STEP_TIMEOUT', '15000'),
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
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        locale: 'es-ES',
      });
      const page = await context.newPage();
      page.setDefaultTimeout(this.stepTimeout);

      // Step 1: LOGIN
      await onProgress('LOGIN', 5);
      await this.login(page, credentials);
      await this.screenshot(page, expedienteId, 'LOGIN', screenshots);

      // Step 2: CREATE_SOLICITUD
      await onProgress('CREATE_SOLICITUD', 10);
      await this.crearSolicitud(page);
      await this.screenshot(page, expedienteId, 'CREATE_SOLICITUD', screenshots);

      // Step 3: FILL_OCA_EICI
      await onProgress('FILL_OCA_EICI', 15);
      await this.fillOcaEici(page, data.ocaEici);
      await this.screenshot(page, expedienteId, 'FILL_OCA_EICI', screenshots);

      // Step 4: FILL_EMPLAZAMIENTO
      await onProgress('FILL_EMPLAZAMIENTO', 25);
      await this.fillEmplazamiento(page, data, expedienteId, resolvedInputs);
      await this.screenshot(page, expedienteId, 'FILL_EMPLAZAMIENTO', screenshots);

      // Step 5: FILL_TITULAR
      await onProgress('FILL_TITULAR', 40);
      await this.fillTitular(page, data, expedienteId, resolvedInputs);
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
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      page.setDefaultTimeout(15000);

      await this.login(page, credentials);

      // Verify we're logged in — check for navigation or dashboard element
      const isLoggedIn = await page
        .waitForSelector('[id*="menubar"], [id*="solicitud"], .ui-layout-content', {
          timeout: 5000,
        })
        .then(() => true)
        .catch(() => false);

      if (!isLoggedIn) {
        return { success: false, message: 'Login exitoso pero no se detectó el dashboard' };
      }

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
    await page.goto(PORTAL_URLS.login, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    // Fill login form — typical JSF login form
    const usernameInput = page.locator('input[type="text"][id*="username"], input[name*="username"], input[id*="user"]').first();
    const passwordInput = page.locator('input[type="password"]').first();

    await usernameInput.fill(credentials.username);
    await passwordInput.fill(credentials.password);

    // Submit
    const submitBtn = page.locator('button[type="submit"], input[type="submit"], [id*="login"][class*="button"], a[id*="login"]').first();
    await submitBtn.click();

    // Wait for redirect away from login page
    await page.waitForURL((url) => !url.href.includes('login'), { timeout: 10000 });
    await page.waitForTimeout(1000);
    this.logger.log('Login exitoso');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 2: CREAR SOLICITUD
  // ═══════════════════════════════════════════════════════════════════════════

  private async crearSolicitud(page: Page): Promise<void> {
    // Navigate to alta solicitud page
    await page.goto(PORTAL_URLS.altaSolicitud, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // The page typically has a "Crear Solicitud" button or the form is already there
    // Look for the create button
    const crearBtn = page.locator(
      'button:has-text("Crear"), a:has-text("Crear Solicitud"), [id*="crear"], [id*="nueva"]',
    ).first();

    const crearExists = await crearBtn.isVisible().catch(() => false);
    if (crearExists) {
      await crearBtn.click();
      await page.waitForTimeout(2000);
    }

    // Wait for the form tabs to appear
    await page.waitForSelector('.ui-tabs, [id*="tabs"]', { timeout: 10000 });
    this.logger.log('Solicitud creada, formulario visible');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 3: FILL OCA/EICI (Tab 0)
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillOcaEici(page: Page, eiciId: string): Promise<void> {
    await this.pfSelect(page, 'oca', eiciId);
    await page.waitForTimeout(500);
    this.logger.log('EICI seleccionada');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 4: FILL EMPLAZAMIENTO (Tab 1)
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillEmplazamiento(
    page: Page,
    data: PortalSolicitudData,
    expedienteId: string,
    resolvedInputs?: Record<string, { value: string; label: string }>,
  ): Promise<void> {
    // Click on Emplazamiento tab
    await this.clickTab(page, 1);
    await page.waitForTimeout(500);

    const e = data.emplazamiento;

    // Provincia → wait → Población → wait → Tipo Vía → wait
    await this.pfSelect(page, 'provincia', e.provincia);
    await page.waitForTimeout(1500); // AJAX carga poblaciones

    await this.pfSelect(page, 'poblacion', e.poblacion);
    await page.waitForTimeout(500);

    await this.pfSelect(page, 'tipoVia', e.tipoVia);
    await page.waitForTimeout(500);

    // Vía — RECONO autocomplete
    const viaResolved = resolvedInputs?.['via'];
    await this.resolveReconoVia(page, 'via', e.via, viaResolved?.value, 'FILL_EMPLAZAMIENTO');

    // Inputs de dirección
    await this.pfInput(page, 'numero', e.numero);
    if (e.portal) await this.pfInput(page, 'portal', e.portal);
    if (e.escalera) await this.pfInput(page, 'escalera', e.escalera);
    if (e.piso) await this.pfInput(page, 'piso', e.piso);
    if (e.puerta) await this.pfInput(page, 'puerta', e.puerta);
    await this.pfInput(page, 'codigoPostal', e.codigoPostal);

    this.logger.log('Emplazamiento rellenado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 5: FILL TITULAR (Tab 8)
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillTitular(
    page: Page,
    data: PortalSolicitudData,
    expedienteId: string,
    resolvedInputs?: Record<string, { value: string; label: string }>,
  ): Promise<void> {
    await this.clickTab(page, 8);
    await page.waitForTimeout(500);

    const t = data.titular;

    // Tipo documento
    await this.pfSelect(page, 'tipoDocumentoTITULAR_8', t.tipoDocumento);
    await page.waitForTimeout(300);

    // NIF — autocomplete (RECONO lookup by NIF)
    await this.pfAutoType(page, 'numeroDocumentoTITULAR_8', t.numeroDocumento);
    await page.waitForTimeout(1500); // Wait for RECONO NIF lookup

    // Check if razonSocial was auto-filled by RECONO
    const autoFilled = await page.evaluate(() => {
      const el = document.querySelector('[id$="razonSocialTITULAR_8"]') as HTMLInputElement;
      return el?.value || '';
    });

    if (!autoFilled && t.razonSocial) {
      // Manual fill razón social
      await page.evaluate(
        ({ val }) => {
          const el = document.querySelector('[id$="razonSocialTITULAR_8"]') as HTMLInputElement;
          if (el) { el.value = val; el.dispatchEvent(new Event('change')); }
        },
        { val: t.razonSocial },
      );
    }

    // Dirección titular
    if (t.provincia) {
      await this.pfSelect(page, 'provinciaTITULAR_8', t.provincia);
      await page.waitForTimeout(1500);
    }
    if (t.poblacion) {
      await this.pfSelect(page, 'poblacionTITULAR_8', t.poblacion);
      await page.waitForTimeout(500);
    }
    if (t.tipoVia) {
      await this.pfSelect(page, 'tipoViaTITULAR_8', t.tipoVia);
      await page.waitForTimeout(500);
    }
    if (t.via) {
      const viaTitResolved = resolvedInputs?.['viaTitular'];
      await this.resolveReconoVia(
        page, 'viaTITULAR_8', t.via, viaTitResolved?.value, 'FILL_TITULAR',
      );
    }

    // Inputs dirección titular
    if (t.numero) await this.pfInputBySelector(page, '[id$="numeroTITULAR_8"]', t.numero);
    if (t.portal) await this.pfInputBySelector(page, '[id$="portalTITULAR_8"]', t.portal);
    if (t.escalera) await this.pfInputBySelector(page, '[id$="escaleraTITULAR_8"]', t.escalera);
    if (t.piso) await this.pfInputBySelector(page, '[id$="pisoTITULAR_8"]', t.piso);
    if (t.puerta) await this.pfInputBySelector(page, '[id$="puertaTITULAR_8"]', t.puerta);
    if (t.codigoPostal) await this.pfInputBySelector(page, '[id$="codigoPostalTITULAR_8"]', t.codigoPostal);

    // Contacto
    await this.pfInputBySelector(page, '[id$="telefonoTITULAR_8"]', t.telefono);
    if (t.telefonoMovil) await this.pfInputBySelector(page, '[id$="telefonoMovilTITULAR_8"]', t.telefonoMovil);
    if (t.email) await this.pfInputBySelector(page, '[id$="emailTITULAR_8"]', t.email);

    this.logger.log('Titular rellenado');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 6: FILL DATOS TÉCNICOS (Tab 3)
  // ═══════════════════════════════════════════════════════════════════════════

  private async fillDatosTecnicos(page: Page, data: PortalSolicitudData): Promise<void> {
    await this.clickTab(page, 3);
    await page.waitForTimeout(500);

    const dt = data.datosTecnicos;

    await this.pfSelect(page, 'tipoSuministro', dt.tipoSuministro);
    await page.waitForTimeout(300);

    await this.pfSelect(page, 'tensionSuministro', dt.tensionSuministro);
    await page.waitForTimeout(300);

    if (dt.companiaDistribuidora) {
      await this.pfSelect(page, 'companiaDistribuidora', dt.companiaDistribuidora);
      await page.waitForTimeout(300);
    }

    if (dt.sistemaConexion) {
      await this.pfSelect(page, 'sistemaConexion', dt.sistemaConexion);
      await page.waitForTimeout(300);
    }

    await this.pfInput(page, 'potenciaMaximaAdmisible', dt.potenciaMaximaAdmisible);
    await this.pfInput(page, 'valorInterruptorGral', dt.valorInterruptorGral);

    if (dt.cups) await this.pfInput(page, 'cups', dt.cups);
    if (dt.seccionAcometida) await this.pfInput(page, 'seccionAcometida', dt.seccionAcometida);

    // Checkboxes
    if (dt.instalacionAislada) await this.pfCheckbox(page, 'instalacionAislada', true);
    if (dt.viviendaUnifamiliar) await this.pfCheckbox(page, 'viviendaUnifamiliar', true);

    this.logger.log('Datos técnicos rellenados');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 7: GUARDAR
  // ═══════════════════════════════════════════════════════════════════════════

  private async guardar(page: Page): Promise<void> {
    const guardarBtn = page.locator(
      'a:has-text("Guardar"), button:has-text("Guardar"), [id$="guardar"], [id*="save"]',
    ).first();

    await guardarBtn.click();
    await page.waitForTimeout(3000);

    // Wait for success indicator or page reload
    const hasError = await page.locator('.ui-messages-error, .ui-message-error').isVisible().catch(() => false);
    if (hasError) {
      const errorText = await page.locator('.ui-messages-error, .ui-message-error').textContent().catch(() => '');
      throw new Error(`Error al guardar: ${errorText}`);
    }

    this.logger.log('Solicitud guardada');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PASO 8: SUBIR DOCUMENTOS (Tab 4)
  // ═══════════════════════════════════════════════════════════════════════════

  private async subirDocumentos(
    page: Page,
    docs: PortalSolicitudData['documentos'],
  ): Promise<void> {
    await this.clickTab(page, 4);
    await page.waitForTimeout(1000);

    // Upload each document
    const files = [
      { path: docs.ciePdf, label: 'CIE' },
      { path: docs.mtdPdf, label: 'MTD' },
      { path: docs.solicitudBtPdf, label: 'Solicitud BT' },
    ];
    if (docs.unifilarPdf) {
      files.push({ path: docs.unifilarPdf, label: 'Unifilar' });
    }

    for (const file of files) {
      // Find file input (PrimeFaces fileUpload component)
      const fileInputs = page.locator('input[type="file"]');
      const count = await fileInputs.count();

      if (count > 0) {
        // Use the first available file input
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
  // PASO 9: ENVIAR
  // ═══════════════════════════════════════════════════════════════════════════

  private async enviar(page: Page): Promise<void> {
    const enviarBtn = page.locator(
      'a:has-text("Enviar"), button:has-text("Enviar"), [id$="enviar"], [id*="send"]',
    ).first();

    await enviarBtn.click();
    await page.waitForTimeout(3000);

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
  // PASO 10: VERIFICAR
  // ═══════════════════════════════════════════════════════════════════════════

  private async verificar(page: Page): Promise<string | undefined> {
    await page.waitForTimeout(2000);

    // Try to find the expediente number on the page
    const expedienteNum = await page.evaluate(() => {
      // Look for text patterns like "BT-2026-XXXX" or "Nº Expediente: XXX"
      const body = document.body.innerText;
      const match = body.match(/(?:BT-\d{4}-\d+|N[ºo]\s*(?:Expediente|expediente)[:\s]*(\S+))/);
      return match?.[0] || match?.[1] || undefined;
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
  // ═══════════════════════════════════════════════════════════════════════════

  private async resolveReconoVia(
    page: Page,
    widget: string,
    viaName: string,
    preSelectedUuid?: string,
    step?: PlaywrightStep,
  ): Promise<void> {
    const inputSelector = `input[id$="${widget}_input"]`;

    // If user already resolved (NEEDS_INPUT flow)
    if (preSelectedUuid) {
      await page.fill(inputSelector, '');
      await page.type(inputSelector, viaName.substring(0, 5), { delay: 80 });
      await page.waitForTimeout(1500);

      // Find and click the matching item by UUID
      const clicked = await page.evaluate(
        ({ w, uuid }) => {
          const panel = document.querySelector(`[id$="${w}_panel"]`);
          if (!panel) return false;
          const items = panel.querySelectorAll('li');
          for (const li of items) {
            if (li.getAttribute('data-item-value') === uuid) {
              (li as HTMLElement).click();
              return true;
            }
          }
          return false;
        },
        { w: widget, uuid: preSelectedUuid },
      );

      if (clicked) {
        await page.waitForTimeout(500);
        return;
      }
      // Fallback: set hidden input directly
      await page.evaluate(
        ({ w, uuid }) => {
          const hidden = document.querySelector(`input[id$="${w}_hinput"]`) as HTMLInputElement;
          if (hidden) hidden.value = uuid;
        },
        { w: widget, uuid: preSelectedUuid },
      );
      return;
    }

    // Normal flow: type and search
    const searchTerm = viaName.substring(0, Math.min(5, viaName.length));
    await page.fill(inputSelector, '');
    await page.type(inputSelector, searchTerm, { delay: 80 });
    await page.waitForTimeout(1500);

    // Read suggestions
    const candidates = await page.evaluate((w) => {
      const panel = document.querySelector(`[id$="${w}_panel"]`);
      if (!panel) return [];
      return Array.from(panel.querySelectorAll('li')).map((li) => ({
        uuid: li.getAttribute('data-item-value') || '',
        label: li.textContent?.trim() || '',
      }));
    }, widget);

    if (candidates.length === 0) {
      // Retry with fewer letters
      await page.fill(inputSelector, '');
      await page.type(inputSelector, viaName.substring(0, 3), { delay: 80 });
      await page.waitForTimeout(1500);

      const retry = await page.evaluate((w) => {
        const panel = document.querySelector(`[id$="${w}_panel"]`);
        if (!panel) return [];
        return Array.from(panel.querySelectorAll('li')).map((li) => ({
          uuid: li.getAttribute('data-item-value') || '',
          label: li.textContent?.trim() || '',
        }));
      }, widget);

      if (retry.length > 0) {
        throw new NeedsInputError(
          widget === 'via' ? 'via' : 'viaTitular',
          retry.slice(0, 15).map((c) => ({ ...c, confidence: 50 })),
          (step ?? 'FILL_EMPLAZAMIENTO') as PlaywrightStep,
        );
      }
      throw new Error(`No se encontró la vía "${viaName}" en RECONO`);
    }

    // Fuzzy match
    const normalizedSearch = normalizeViaName(viaName);
    const scored = candidates.map((c) => ({
      ...c,
      confidence: calculateMatchScore(normalizedSearch, normalizeViaName(c.label)),
    }));
    scored.sort((a, b) => b.confidence - a.confidence);

    if (scored[0]!.confidence >= 80) {
      // Auto-select best match
      const bestUuid = scored[0]!.uuid;
      await page.evaluate(
        ({ w, uuid }) => {
          const panel = document.querySelector(`[id$="${w}_panel"]`);
          if (!panel) return;
          const items = panel.querySelectorAll('li');
          for (const li of items) {
            if (li.getAttribute('data-item-value') === uuid) {
              (li as HTMLElement).click();
              return;
            }
          }
        },
        { w: widget, uuid: bestUuid },
      );
      await page.waitForTimeout(500);
      this.logger.log(`RECONO auto-match: "${scored[0]!.label}" (${scored[0]!.confidence}%)`);
    } else {
      // Need user input
      throw new NeedsInputError(
        widget === 'via' ? 'via' : 'viaTitular',
        scored.slice(0, 10),
        (step ?? 'FILL_EMPLAZAMIENTO') as PlaywrightStep,
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS — PrimeFaces API
  // ═══════════════════════════════════════════════════════════════════════════

  private async pfSelect(page: Page, widget: string, value: string): Promise<void> {
    await page.evaluate(
      ({ w, v }) => {
        const pf = (window as any).PF;
        if (!pf) throw new Error('PrimeFaces not loaded');
        const wgt = pf(w);
        if (!wgt) throw new Error(`Widget "${w}" not found`);
        wgt.selectValue(v);
        if (typeof wgt.triggerChange === 'function') wgt.triggerChange();
      },
      { w: widget, v: value },
    );
  }

  private async pfInput(page: Page, widget: string, value: string): Promise<void> {
    if (!value) return;
    await page.evaluate(
      ({ w, v }) => {
        const pf = (window as any).PF;
        if (!pf) return;
        const wgt = pf(w);
        if (wgt?.jq) {
          wgt.jq.val(v);
          wgt.jq.trigger('change');
        }
      },
      { w: widget, v: value },
    );
  }

  private async pfInputBySelector(page: Page, selector: string, value: string): Promise<void> {
    if (!value) return;
    await page.evaluate(
      ({ sel, val }) => {
        const el = document.querySelector(sel) as HTMLInputElement;
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      },
      { sel: selector, val: value },
    );
  }

  private async pfAutoType(page: Page, widget: string, value: string): Promise<void> {
    const inputSelector = `input[id$="${widget}_input"]`;
    await page.fill(inputSelector, '');
    await page.type(inputSelector, value, { delay: 50 });
    await page.waitForTimeout(500);
    // Trigger change for AJAX lookup
    await page.evaluate((sel) => {
      const el = document.querySelector(sel) as HTMLInputElement;
      if (el) el.dispatchEvent(new Event('change', { bubbles: true }));
    }, inputSelector);
  }

  private async pfCheckbox(page: Page, widget: string, checked: boolean): Promise<void> {
    await page.evaluate(
      ({ w, c }) => {
        const pf = (window as any).PF;
        if (!pf) return;
        const wgt = pf(w);
        if (!wgt) return;
        const isChecked = wgt.isChecked?.() || wgt.jq?.find('.ui-chkbox-icon').hasClass('ui-icon-check');
        if (c && !isChecked) wgt.toggle?.() || wgt.check?.();
        if (!c && isChecked) wgt.toggle?.() || wgt.uncheck?.();
      },
      { w: widget, c: checked },
    );
  }

  private async clickTab(page: Page, tabIndex: number): Promise<void> {
    await page.evaluate((idx) => {
      const tabs = document.querySelectorAll('.ui-tabs-nav li a, [role="tab"] a');
      if (tabs[idx]) (tabs[idx] as HTMLElement).click();
    }, tabIndex);
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
