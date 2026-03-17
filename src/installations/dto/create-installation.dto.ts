// src/installations/dto/create-installation.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsInt,
  Min,
} from 'class-validator';
import { SupplyType } from '@prisma/client';

export class CreateInstallationDto {
  // ═══ TIPO DOCUMENTACIÓN ═══════════════════════════════════════
  @IsString() @IsOptional() tipoDocumentacion?: string; // MTD | PROYECTO

  // ═══ TITULAR ═══════════════════════════════════════════════════
  @IsString() @IsOptional() holderDocType?: string; // NIF, NIE, PASAPORTE
  @IsString() @IsOptional() titularNif?: string;
  @IsString() @IsOptional() titularNombre?: string;
  @IsString() @IsOptional() titularApellido1?: string;
  @IsString() @IsOptional() titularApellido2?: string;
  @IsString() @IsOptional() titularTipoVia?: string;
  @IsString() @IsOptional() titularNombreVia?: string;
  @IsString() @IsOptional() titularNumero?: string;
  @IsString() @IsOptional() titularBloque?: string;
  @IsString() @IsOptional() titularEscalera?: string;
  @IsString() @IsOptional() titularPiso?: string;
  @IsString() @IsOptional() titularPuerta?: string;
  @IsString() @IsOptional() titularLocalidad?: string;
  @IsString() @IsOptional() titularProvincia?: string;
  @IsString() @IsOptional() titularCp?: string;
  @IsString() @IsOptional() titularEmail?: string;
  @IsString() @IsOptional() titularTelefono?: string;
  @IsString() @IsOptional() titularMovil?: string;
  @IsString() @IsOptional() representanteNombre?: string;
  @IsString() @IsOptional() representanteNif?: string;

  // ═══ EMPLAZAMIENTO ═════════════════════════════════════════════
  @IsString() @IsOptional() emplazTipoVia?: string;
  @IsString() @IsOptional() emplazNombreVia?: string;
  @IsString() @IsOptional() emplazNumero?: string;
  @IsString() @IsOptional() emplazBloque?: string;
  @IsString() @IsOptional() emplazEscalera?: string;
  @IsString() @IsOptional() emplazPiso?: string;
  @IsString() @IsOptional() emplazPuerta?: string;
  @IsString() @IsOptional() emplazLocalidad?: string;
  @IsString() @IsOptional() emplazProvincia?: string;
  @IsString() @IsOptional() emplazCp?: string;
  @IsNumber() @IsOptional() superficieM2?: number;
  @IsString() @IsOptional() cups?: string;

  // ═══ DATOS TÉCNICOS ════════════════════════════════════════════
  @IsEnum(SupplyType) @IsOptional() supplyType?: SupplyType;
  @IsNumber() @IsOptional() supplyVoltage?: number;
  @IsString() @IsOptional() tipoActuacion?: string;
  @IsString() @IsOptional() tipoMemoria?: string;
  @IsString() @IsOptional() usoInstalacion?: string;
  @IsString() @IsOptional() aforo?: string;
  @IsString() @IsOptional() tipoInstalacionCie?: string;
  @IsString() @IsOptional() installationType?: string;
  @IsString() @IsOptional() expedienteType?: string;
  @IsString() @IsOptional() referencia?: string;
  @IsInt() @IsOptional() puntosRecarga?: number;
  @IsString() @IsOptional() esquemaIve?: string;
  @IsNumber() @IsOptional() potenciaPico?: number;
  @IsString() @IsOptional() modalidadAutoconsumo?: string;
  @IsString() @IsOptional() gradoElectrificacion?: string;
  @IsInt() @IsOptional() temporalidad?: number;
  @IsString() @IsOptional() numRegistroExistente?: string;

  // ═══ POTENCIAS (CIE) ══════════════════════════════════════════
  @IsNumber() @IsOptional() potMaxAdmisible?: number;
  @IsNumber() @IsOptional() potAmpliacion?: number;
  @IsNumber() @IsOptional() potOriginal?: number;

  // ═══ ACOMETIDA ═════════════════════════════════════════════════
  @IsString() @IsOptional() puntoConexion?: string;
  @IsString() @IsOptional() tipoAcometida?: string;
  @IsNumber() @IsOptional() seccionAcometida?: number;
  @IsString() @IsOptional() materialAcometida?: string;

  // ═══ CGP ═══════════════════════════════════════════════════════
  @IsString() @IsOptional() tipoCgp?: string;
  @IsString() @IsOptional() esquemaCgp?: string;
  @IsNumber() @IsOptional() inBaseCgp?: number;
  @IsNumber() @IsOptional() inCartuchoCgp?: number;

  // ═══ LGA ═══════════════════════════════════════════════════════
  @IsNumber() @IsOptional() seccionLga?: number;
  @IsString() @IsOptional() materialLga?: string;
  @IsNumber() @IsOptional() longitudLga?: number;
  @IsString() @IsOptional() aislamientoLga?: string;

  // ═══ DERIVACIÓN INDIVIDUAL ════════════════════════════════════
  @IsNumber() @IsOptional() seccionDi?: number;
  @IsString() @IsOptional() materialDi?: string;
  @IsNumber() @IsOptional() longitudDi?: number;
  @IsNumber() @IsOptional() numDerivaciones?: number;
  @IsString() @IsOptional() aislamientoDi?: string;
  @IsString() @IsOptional() tipoInstalacionDi?: string;

  // ═══ MÓDULO DE MEDIDA ═════════════════════════════════════════
  @IsString() @IsOptional() tipoModuloMedida?: string;
  @IsString() @IsOptional() situacionModulo?: string;
  @IsString() @IsOptional() contadorUbicacion?: string;

  // ═══ PROTECCIONES (calculado+guardado) ════════════════════════
  @IsNumber() @IsOptional() igaNominal?: number;
  @IsNumber() @IsOptional() igaPoderCorte?: number;
  @IsNumber() @IsOptional() diferencialNominal?: number;
  @IsInt() @IsOptional() diferencialSensibilidad?: number;

  // ═══ PUESTA A TIERRA ══════════════════════════════════════════
  @IsString() @IsOptional() tipoElectrodos?: string;
  @IsNumber() @IsOptional() seccionLineaEnlace?: number;
  @IsNumber() @IsOptional() seccionCondProteccion?: number;
  @IsNumber() @IsOptional() resistenciaTierra?: number;
  @IsNumber() @IsOptional() resistenciaAislamiento?: number;
  @IsString() @IsOptional() esquemaDistribucion?: string;
  @IsBoolean() @IsOptional() protSobretensiones?: boolean;

  // ═══ VERIFICACIONES ═══════════════════════════════════════════
  @IsString() @IsOptional() otrasVerificaciones?: string;

  // ═══ EMPRESA INSTALADORA ══════════════════════════════════════
  @IsString() @IsOptional() empresaNif?: string;
  @IsString() @IsOptional() empresaNombre?: string;
  @IsString() @IsOptional() empresaCategoria?: string;
  @IsString() @IsOptional() empresaRegNum?: string;
  @IsString() @IsOptional() instaladorNombre?: string;
  @IsString() @IsOptional() instaladorNif?: string;
  @IsString() @IsOptional() instaladorCertNum?: string;
  @IsString() @IsOptional() empresaTipoVia?: string;
  @IsString() @IsOptional() empresaNombreVia?: string;
  @IsString() @IsOptional() empresaNumero?: string;
  @IsString() @IsOptional() empresaLocalidad?: string;
  @IsString() @IsOptional() empresaProvincia?: string;
  @IsString() @IsOptional() empresaCp?: string;
  @IsString() @IsOptional() empresaTelefono?: string;
  @IsString() @IsOptional() empresaMovil?: string;
  @IsString() @IsOptional() empresaEmail?: string;

  // ═══ DISTRIBUIDORA ════════════════════════════════════════════
  @IsString() @IsOptional() distribuidora?: string;

  // ═══ CIE ESPECÍFICOS ══════════════════════════════════════════
  @IsString() @IsOptional() identificadorCie?: string;
  @IsBoolean() @IsOptional() aplicaReeae?: boolean;
  @IsNumber() @IsOptional() potLuminariasReeae?: number;
  @IsBoolean() @IsOptional() aplicaItcBt51?: boolean;

  // ═══ MTD — AUTOR Y MEMORIA ════════════════════════════════════
  @IsString() @IsOptional() tipoAutor?: string;
  @IsString() @IsOptional() installerId?: string;
  @IsString() @IsOptional() technicianId?: string;
  @IsString() @IsOptional() memoriaDescriptiva?: string;

  // ═══ PRESUPUESTO ══════════════════════════════════════════════
  @IsNumber() @IsOptional() presupuestoMateriales?: number;
  @IsNumber() @IsOptional() presupuestoManoObra?: number;
  @IsNumber() @IsOptional() presupuestoTotal?: number;

  // ═══ INFO ADICIONAL ═══════════════════════════════════════════
  @IsString() @IsOptional() infoAdicional?: string;
  @IsString() @IsOptional() firmaLugar?: string;

  // ═══ LEGACY (compatibilidad) ══════════════════════════════════
  @IsString() @IsOptional() titularName?: string;
  @IsString() @IsOptional() titularAddress?: string;
  @IsString() @IsOptional() address?: string;
  @IsNumber() @Min(0) @IsOptional() contractedPower?: number;
  @IsString() @IsOptional() installerName?: string;
  @IsString() @IsOptional() installerNif?: string;
  @IsString() @IsOptional() installerRegNum?: string;
}
