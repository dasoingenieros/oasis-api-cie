import { Injectable, Logger } from '@nestjs/common';
import {
  TIPO_DOCUMENTO,
  TIPO_SUMINISTRO,
  TENSION_SUMINISTRO,
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
   * Los campos de selects ya deben contener los códigos del portal
   * (gracias a la sincronización de selects del frontend).
   */
  mapInstallation(
    installation: any,
    eiciId: string,
    documentPaths: { ciePdf: string; mtdPdf: string; solicitudBtPdf: string; unifilarPdf?: string },
  ): PortalSolicitudData {
    return {
      ocaEici: eiciId,

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
        razonSocial: this.buildNombreTitular(installation),
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
        companiaDistribuidora: installation.distribuidora ?? undefined,
        sistemaConexion: installation.esquemaDistribucion ?? undefined,
        seccionAcometida: installation.seccionAcometida
          ? String(installation.seccionAcometida)
          : undefined,
        instalacionAislada: false,
        viviendaUnifamiliar: false,
      },

      documentos: documentPaths,
    };
  }

  private lookupPoblacion(localidad: string | null | undefined): string {
    if (!localidad) return '';
    const upper = localidad.toUpperCase().trim();
    // Direct match
    if (POBLACIONES_MADRID[upper]) return POBLACIONES_MADRID[upper];
    // Fuzzy: search by includes
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

  private mapTipoSuministro(installation: any): string {
    // Panel voltage 400 → trifásico, else monofásico
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
    // Portal expects kW with decimals (e.g. "5.750")
    return potKw.toFixed(3);
  }

  private buildNombreTitular(installation: any): string {
    const parts = [
      installation.titularNombre,
      installation.titularApellido1,
      installation.titularApellido2,
    ].filter(Boolean);
    return parts.join(' ') || installation.titularName || '';
  }
}
