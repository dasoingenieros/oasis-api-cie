import { Injectable, Logger } from '@nestjs/common';
import {
  TIPO_DOCUMENTO,
  TIPO_SUMINISTRO,
  TENSION_SUMINISTRO,
  SISTEMA_CONEXION,
  DISTRIBUIDORA_MAP,
  SUBTIPO_SUFFIX,
  EXPEDIENTE_MAP,
  TIPO_MODIFICACION,
  PROVINCIA,
  POBLACIONES_MADRID,
  TIPO_VIA,
  type PortalSolicitudData,
} from './portal-field-mapping';

/**
 * Transforma una Installation de Prisma al formato PortalSolicitudData
 * que el PlaywrightService usará para rellenar el formulario del portal.
 */
@Injectable()
export class TramitacionMapperService {
  private readonly logger = new Logger(TramitacionMapperService.name);

  /**
   * Mapea una instalación CIE completa al objeto PortalSolicitudData.
   */
  mapInstallation(
    installation: any,
    eiciId: string,
    eiciName: string,
    documentPaths: { ciePdf: string; mtdPdf: string; solicitudBtPdf: string; unifilarPdf?: string },
  ): PortalSolicitudData {
    const tipoExpediente = this.mapTipoExpediente(installation);

    return {
      ocaEici: eiciId,
      ocaEiciName: eiciName,
      tipoExpediente,
      subtipoSolicitud: this.mapSubtipoSolicitud(installation),
      tipoDocumentacion: (installation.tipoDocumentacion ?? 'MTD').toUpperCase() === 'PROYECTO' ? 'PROYECTO' : 'MTD',

      emplazamiento: {
        provincia: installation.emplazProvincia ?? PROVINCIA.MADRID,
        poblacion: this.lookupPoblacion(installation.emplazLocalidad),
        tipoVia: this.lookupTipoVia(installation.emplazTipoVia),
        via: installation.emplazNombreVia ?? '',
        numero: installation.emplazNumero ?? '',
        portal: installation.emplazBloque ?? undefined,
        escalera: installation.emplazEscalera ?? undefined,
        piso: installation.emplazPiso ?? undefined,
        puerta: installation.emplazPuerta ?? undefined,
        codigoPostal: installation.emplazCp ?? '',
      },

      titular: {
        tipoDocumento: this.mapTipoDocumento(installation.holderDocType),
        numeroDocumento: installation.titularNif ?? '',
        nombre: installation.titularNombre ?? undefined,
        apellido1: installation.titularApellido1 ?? undefined,
        apellido2: installation.titularApellido2 ?? undefined,
        provincia: installation.titularProvincia ?? PROVINCIA.MADRID,
        poblacion: this.lookupPoblacion(installation.titularLocalidad),
        tipoVia: this.lookupTipoVia(installation.titularTipoVia),
        via: installation.titularNombreVia ?? undefined,
        numero: installation.titularNumero ?? undefined,
        portal: installation.titularBloque ?? undefined,
        escalera: installation.titularEscalera ?? undefined,
        piso: installation.titularPiso ?? undefined,
        puerta: installation.titularPuerta ?? undefined,
        codigoPostal: installation.titularCp ?? undefined,
        telefono: installation.titularTelefono ?? '',
        telefonoMovil: installation.titularMovil ?? undefined,
        email: installation.titularEmail ?? undefined,
      },

      datosTecnicos: {
        potenciaMaximaAdmisible: this.formatPotencia(installation.potMaxAdmisible),
        valorInterruptorGral: String(installation.igaNominal ?? ''),
        tipoSuministro: this.mapTipoSuministro(installation),
        tensionSuministro: this.mapTension(installation),
        cups: installation.cups ?? undefined,
        companiaDistribuidora: this.mapDistribuidora(installation.distribuidora),
        sistemaConexion: this.mapSistemaConexion(installation.esquemaDistribucion),
        seccionAcometida: installation.seccionAcometida
          ? String(installation.seccionAcometida)
          : undefined,
        instalacionAislada: false,
        viviendaUnifamiliar: false,
        tipoModificacion: this.mapTipoModificacion(installation, tipoExpediente),
      },

      documentos: documentPaths,
    };
  }

  private lookupPoblacion(localidad: string | null | undefined): string {
    if (!localidad) return '';
    const upper = localidad.toUpperCase().trim();
    if (POBLACIONES_MADRID[upper]) return POBLACIONES_MADRID[upper];
    const entry = Object.entries(POBLACIONES_MADRID).find(([k]) =>
      k.includes(upper) || upper.includes(k),
    );
    if (entry) return entry[1];
    this.logger.warn(`Población no encontrada: "${localidad}"`);
    return '';
  }

  private lookupTipoVia(tipoVia: string | null | undefined): string {
    const fallback = TIPO_VIA['CALLE'] ?? '22';
    if (!tipoVia) return fallback;
    const upper = tipoVia.toUpperCase().trim();
    if (TIPO_VIA[upper]) return TIPO_VIA[upper]!;
    this.logger.warn(`Tipo vía no encontrado: "${tipoVia}", usando CALLE`);
    return fallback;
  }

  /**
   * Returns name string ('NIF', 'NIE', 'PASAPORTE') — portal UUIDs are dynamic per session,
   * Playwright will search by name in the select options.
   */
  private mapTipoDocumento(docType: string | null | undefined): string {
    switch (docType?.toUpperCase()) {
      case 'NIE':
        return TIPO_DOCUMENTO.NIE;
      case 'PASAPORTE':
        return TIPO_DOCUMENTO.PASAPORTE;
      default:
        return TIPO_DOCUMENTO.NIF;
    }
  }

  /**
   * Extracts first 4-digit code from distribuidora string and maps to portal value.
   * Our DB stores values like "0021 - I-DE Redes Eléctricas" or just "0021".
   */
  private mapDistribuidora(distribuidora: string | null | undefined): string | undefined {
    if (!distribuidora) return undefined;
    const code = distribuidora.trim().substring(0, 4);
    const portalValue = DISTRIBUIDORA_MAP[code];
    if (portalValue) {
      this.logger.log(`Distribuidora "${code}" → portal "${portalValue}"`);
      return portalValue;
    }
    this.logger.warn(`Distribuidora "${distribuidora}" (code="${code}") no tiene mapeo al portal`);
    return undefined;
  }

  /**
   * Maps raw esquemaDistribucion string (TT, TN-S, etc.) to portal numeric value.
   */
  private mapSistemaConexion(esquema: string | null | undefined): string | undefined {
    if (!esquema) return undefined;
    const upper = esquema.toUpperCase().trim().replace(/[\s-]+/g, '_');
    const map: Record<string, string> = {
      TT: SISTEMA_CONEXION.TT,
      TN_S: SISTEMA_CONEXION.TN_S,
      'TN-S': SISTEMA_CONEXION.TN_S,
      TN_C: SISTEMA_CONEXION.TN_C,
      'TN-C': SISTEMA_CONEXION.TN_C,
      TN_C_S: SISTEMA_CONEXION.TN_C_S,
      'TN-C-S': SISTEMA_CONEXION.TN_C_S,
      IT: SISTEMA_CONEXION.IT,
    };
    const portalValue = map[esquema.trim()] ?? map[upper];
    if (portalValue) return portalValue;
    this.logger.warn(`Sistema conexión "${esquema}" no tiene mapeo al portal`);
    return undefined;
  }

  private mapTipoSuministro(installation: any): string {
    const voltage = installation.supplyVoltage;
    if (voltage === 400) return TIPO_SUMINISTRO.TRIFASICO;
    return TIPO_SUMINISTRO.MONOFASICO;
  }

  private mapTension(installation: any): string {
    const voltage = installation.supplyVoltage;
    if (voltage === 400) return TENSION_SUMINISTRO['400V'];
    return TENSION_SUMINISTRO['230V'];
  }

  private formatPotencia(potKw: number | null | undefined): string {
    if (!potKw) return '';
    return potKw.toFixed(3);
  }

  /**
   * Maps expedienteType/tipoActuacion to portal value using direct EXPEDIENTE_MAP.
   */
  private mapTipoExpediente(installation: any): string {
    const raw = (installation.expedienteType ?? installation.tipoActuacion ?? '')
      .toUpperCase()
      .trim()
      .replace(/\s+/g, '_');

    const mapped = EXPEDIENTE_MAP[raw];
    if (mapped) return mapped;

    // Fallback: check common partial matches
    if (raw.includes('AMPLIACION') && raw.includes('CAMBIO')) return EXPEDIENTE_MAP['AMPLIACION_CAMBIO_TITULAR']!;
    if (raw.includes('MODIFICACION') && raw.includes('CAMBIO')) return EXPEDIENTE_MAP['MODIFICACION_CAMBIO_TITULAR']!;
    if (raw.includes('AMPLIACION')) return EXPEDIENTE_MAP['AMPLIACION']!;
    if (raw.includes('MODIFICACION')) return EXPEDIENTE_MAP['MODIFICACION']!;

    return EXPEDIENTE_MAP['NUEVA_INSTALACION']!;
  }

  /**
   * Maps installationType/supplyType to the subtipo suffix for includes-based matching.
   * Returns the suffix that will be matched via includes() against portal link text.
   */
  private mapSubtipoSolicitud(installation: any): string {
    const instType = (installation.installationType ?? '').toLowerCase();
    const supplyType = (installation.supplyType ?? '').toUpperCase();

    switch (instType) {
      case 'irve':
        return SUBTIPO_SUFFIX['IRVE']!;
      case 'autoconsumo':
        return SUBTIPO_SUFFIX['AUTOCONSUMO']!;
      case 'industrial':
        return SUBTIPO_SUFFIX['INDUSTRIAL']!;
      case 'local':
        return SUBTIPO_SUFFIX['LOCAL_OFICINA']!;
      case 'garaje':
        return SUBTIPO_SUFFIX['GARAJES']!;
      case 'generacion':
        return SUBTIPO_SUFFIX['GENERACION']!;
      case 'alumbrado':
        return SUBTIPO_SUFFIX['ALUMBRADO_EXTERIOR']!;
      case 'enlace':
        return SUBTIPO_SUFFIX['ENLACE_COMUNES']!;
    }

    switch (supplyType) {
      case 'IRVE':
        return SUBTIPO_SUFFIX['IRVE']!;
      case 'LOCAL_COMERCIAL':
        return SUBTIPO_SUFFIX['LOCAL_OFICINA']!;
    }

    this.logger.log(
      `Subtipo no determinado para installationType="${instType}", supplyType="${supplyType}" → default Vivienda`,
    );
    return SUBTIPO_SUFFIX['VIVIENDA']!;
  }

  /**
   * Maps tipoModificacion for MODIFICACION* expedientes.
   */
  private mapTipoModificacion(installation: any, tipoExpediente: string): string | undefined {
    // Only for modification expedientes (portal values 2, 11, 13)
    if (!['2', '11', '13'].includes(tipoExpediente)) return undefined;

    const raw = (installation.tipoModificacion ?? installation.tipoActuacion ?? '')
      .toUpperCase()
      .trim()
      .replace(/[\s-]+/g, '_');

    const map: Record<string, string> = {
      CAMBIO_DI: TIPO_MODIFICACION.CAMBIO_DI,
      CAMBIO_CGBT: TIPO_MODIFICACION.CAMBIO_CGBT,
      SUSTITUCION_SUMINISTRO: TIPO_MODIFICACION.SUSTITUCION_SUMINISTRO,
      REFORMA_INTEGRAL: TIPO_MODIFICACION.REFORMA_INTEGRAL,
      INSTALACION_SINGULAR: TIPO_MODIFICACION.INSTALACION_SINGULAR,
      AMPLIACION_MODIFICACION: TIPO_MODIFICACION.AMPLIACION_MODIFICACION,
      OTRAS_MODIFICACIONES: TIPO_MODIFICACION.OTRAS_MODIFICACIONES,
    };

    return map[raw] ?? TIPO_MODIFICACION.OTRAS_MODIFICACIONES;
  }
}
