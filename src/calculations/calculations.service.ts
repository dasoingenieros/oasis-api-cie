// src/calculations/calculations.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InstallationsService } from '../installations/installations.service';
import type { SafeUser } from '../users/users.service';
import type { Circuit, CalculationResult } from '@prisma/client';

// Import from electrical engine
import {
  calculateInstallation,
  calculateSupply,
  calculateDIVoltageDrop,
  getProtectionConductorSection,
  ENGINE_VERSION,
  NORM_VERSION,
} from '@daso/electrical-engine';
import type { CircuitInput, CircuitCode, SupplyInput, DIInput } from '@daso/electrical-engine';

@Injectable()
export class CalculationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly installationsService: InstallationsService,
  ) {}

  /**
   * Run calculation for all circuits of an installation.
   */
  async calculate(
    installationId: string,
    user: SafeUser,
  ): Promise<CalculationResult> {
    // 1. Verify access
    const installation = await this.installationsService.findOne(installationId, user);

    // 2. Get circuits
    const circuits = await this.prisma.circuit.findMany({
      where: { installationId },
      orderBy: { order: 'asc' },
    });

    if (circuits.length === 0) {
      throw new NotFoundException('No hay circuitos definidos para calcular');
    }

    // 3. Map Prisma Circuit → engine CircuitInput
    // ITC-BT-25 codes only apply to viviendas; for all other types force CUSTOM
    const isVivienda = ['VIVIENDA_BASICA', 'VIVIENDA_ELEVADA'].includes(
      (installation as any).supplyType ?? '',
    );
    const inputs: CircuitInput[] = circuits.map((c) =>
      this.mapToEngineInput(c, isVivienda),
    );

    // 4. Run engine
    const result = await calculateInstallation(inputs);

    // 5. Get next version number
    const lastCalc = await this.prisma.calculationResult.findFirst({
      where: { installationId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastCalc?.version ?? 0) + 1;

    // 6. Save calculation result
    const saved = await this.prisma.calculationResult.create({
      data: {
        installationId,
        version: nextVersion,
        engineVersion: ENGINE_VERSION,
        normVersion: NORM_VERSION,
        inputSnapshot: JSON.parse(JSON.stringify(inputs)),
        resultSnapshot: JSON.parse(JSON.stringify(result)),
        allCompliant: result.isValid,
      },
    });

    // 7. Calculation is READ-ONLY — results are stored in CalculationResult only.
    // Circuit records are never modified by the calculation engine.

    // 8. Update installation status
    await this.prisma.installation.update({
      where: { id: installationId },
      data: { status: 'CALCULATED' },
    });

    return saved;
  }

  /**
   * Get the latest calculation result for an installation.
   */
  async getLatest(
    installationId: string,
    user: SafeUser,
  ): Promise<CalculationResult> {
    await this.installationsService.findOne(installationId, user);

    const result = await this.prisma.calculationResult.findFirst({
      where: { installationId },
      orderBy: { version: 'desc' },
    });

    if (!result) {
      throw new NotFoundException('No hay cálculos para esta instalación');
    }

    return result;
  }

  /**
   * Resumen de suministro: lee datos configurados por el usuario (IGA del cuadro,
   * potencia y sección DI de la instalación) y solo calcula CdT DI + PE.
   * NO sobreescribe los valores que el usuario configuró.
   */
  async calculateSupplyForInstallation(
    installationId: string,
    user: SafeUser,
  ) {
    const installation = await this.installationsService.findOne(installationId, user);
    const inst = installation as any;

    // ── Leer panel del usuario (IGA) ───────────────────────
    const panel = await this.prisma.electricalPanel.findUnique({
      where: { installationId },
      include: { differentials: true },
    });

    // ── Valores del usuario ────────────────────────────────
    const voltage = inst.supplyVoltage ?? 230;
    const phaseSystem: 'single' | 'three' = (voltage === 400 || voltage === 380) ? 'three' : 'single';
    const userIgaA = panel?.igaCalibreA ?? inst.igaNominal ?? 25;
    // P. Máx. Admisible: 1) datos-form, 2) derivada del IGA (V × calibre)
    const igaDerivedPowerKw = phaseSystem === 'three'
      ? (Math.sqrt(3) * voltage * userIgaA) / 1000
      : (voltage * userIgaA) / 1000;
    const userPotMaxKw = inst.potMaxAdmisible ?? igaDerivedPowerKw;
    const userSeccionDi = inst.seccionDi ?? 6;
    const diLengthM = inst.longitudDi ?? 10;
    const materialDi: 'Cu' | 'Al' = inst.materialDi === 'AL' ? 'Al' : 'Cu';

    // ── Calcular CdT DI con sección y longitud del usuario ─
    const diInput: DIInput = {
      contractedPowerW: userPotMaxKw * 1000,
      phaseSystem,
      powerFactor: 0.9,
      conductorMaterial: materialDi,
      sectionMm2: userSeccionDi,
      lengthM: diLengthM,
      voltageV: voltage,
    };
    const cdtResult = calculateDIVoltageDrop(diInput);

    // ── PE conductor ───────────────────────────────────────
    const peMm2 = getProtectionConductorSection(userSeccionDi);

    // ── Grado electrificación (informativo) ────────────────
    const isResidential = ['VIVIENDA_BASICA', 'VIVIENDA_ELEVADA'].includes(inst.supplyType);
    const electrificationGrade = isResidential
      ? (inst.supplyType === 'VIVIENDA_ELEVADA' ? 'elevated' : 'basic')
      : undefined;

    // ── Diferenciales del usuario ──────────────────────────
    const userDiffs = (panel?.differentials ?? []).map((d: any) => ({
      ratingA: d.calibreA,
      sensitivityMa: d.sensitivityMa,
      type: d.type,
      poles: d.poles,
      name: d.name,
    }));

    // ── Warnings ───────────────────────────────────────────
    const warnings: string[] = [...cdtResult.warnings];
    if (!cdtResult.cdtCompliant) {
      warnings.push(`CdT DI ${cdtResult.voltageDropPct.toFixed(3)}% supera el límite del 1%. Revisa sección o longitud.`);
    }

    const isValid = cdtResult.cdtCompliant;

    // ── Solo guardar CdT y PE (NO sobreescribir IGA, potencia, sección) ─
    await this.prisma.installation.update({
      where: { id: installationId },
      data: {
        cdtDi: cdtResult.voltageDropPct,
        seccionCondProteccion: peMm2,
        gradoElectrificacion: electrificationGrade === 'elevated' ? 'ELEVADO' : electrificationGrade === 'basic' ? 'BASICO' : undefined,
      },
    });

    // Invalidar unifilar guardado
    await this.prisma.unifilarLayout.deleteMany({ where: { installationId } });

    // ── Resultado con forma SupplyResult usando valores del usuario ─
    return {
      designPowerW: userPotMaxKw * 1000,
      electrificationGrade,
      iga: {
        ratingA: userIgaA,
      },
      di: {
        sectionMm2: userSeccionDi,
        minSectionTableMm2: cdtResult.minSectionCuMm2,
        minSectionCdtMm2: cdtResult.minSectionByLoadMm2,
        cdtResult: {
          voltageDropPct: cdtResult.voltageDropPct,
          voltageDropV: cdtResult.voltageDropV,
          cdtLimitPct: cdtResult.cdtLimitPct,
          cdtCompliant: cdtResult.cdtCompliant,
          nominalCurrentA: cdtResult.nominalCurrentA,
        },
      },
      protectionConductorMm2: peMm2,
      differentials: userDiffs,
      warnings,
      isValid,
    };
  }

  /**
   * Map a Prisma Circuit to the engine's CircuitInput format.
   */
  /** Map cable designation to engine insulation type (ITC-BT-19 tables) */
  private mapInsulationType(designation: string): 'PVC' | 'XLPE' | 'EPR' {
    switch (designation) {
      case 'H07V-K': case 'H07V-U': case 'H07Z1-K': case 'PVC': return 'PVC';
      case 'RV-K': case 'RZ1-K': case 'XLPE': return 'XLPE';
      case 'EPR': return 'EPR';
      default: return 'PVC';
    }
  }

  private mapToEngineInput(circuit: Circuit, isVivienda: boolean): CircuitInput {
    const conductorMaterial = circuit.cableType === 'CU' ? 'Cu' : 'Al';
    const phaseSystem = circuit.phases === 1 ? 'single' : 'three';

    const validCodes = [
      'C1', 'C2', 'C3', 'C4', 'C4.1', 'C4.2', 'C4.3', 'C5',
      'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12',
    ];
    // ITC-BT-25 codes only apply to viviendas
    const code = isVivienda && validCodes.includes(circuit.code ?? '')
      ? (circuit.code as CircuitCode)
      : ('CUSTOM' as CircuitCode);

    return {
      id: circuit.id,
      label: circuit.name,
      code,
      phaseSystem,
      loadPowerW: circuit.power,
      powerFactor: circuit.cosPhi,
      simultaneityFactor: 1,
      loadFactor: 1,
      conductorMaterial,
      insulationType: this.mapInsulationType(circuit.insulationType),
      installationMethod: circuit.installMethod as any,
      lengthM: circuit.length,
      ambientTempC: 30,
      groupingCircuits: 1,
      voltageV: circuit.voltage,
      upstreamCdtPct: 0,
      loadType: (circuit as any).loadType ?? undefined,
    };
  }
}
