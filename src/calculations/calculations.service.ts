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
  ENGINE_VERSION,
  NORM_VERSION,
} from '@daso/electrical-engine';
import type { CircuitInput, CircuitCode, SupplyInput } from '@daso/electrical-engine';

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
    const inputs: CircuitInput[] = circuits.map((c) => this.mapToEngineInput(c));

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

    // 7. Update each circuit with its results
    for (const circuitResult of result.circuits) {
      const prismaCircuit = circuits.find((c) => c.id === circuitResult.id);
      if (!prismaCircuit) continue;

      await this.prisma.circuit.update({
        where: { id: prismaCircuit.id },
        data: {
          calculatedSection: circuitResult.sectionMm2,
          assignedBreaker: `PIA ${circuitResult.breakerRatingA}A curva ${circuitResult.breakerCurve}`,
          assignedRCD: circuitResult.rcdSensitivityMa
            ? `Diferencial ${circuitResult.rcdSensitivityMa}mA`
            : null,
          voltageDrop: circuitResult.voltageDropPct,
          voltageDropAcc: circuitResult.accumulatedCdtPct,
          compliance: circuitResult.isValid,
          justification: circuitResult.justification
            ? JSON.parse(JSON.stringify(circuitResult.justification))
            : undefined,
        },
      });
    }

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
   * Calcula IGA + DI + diferenciales para una instalación.
   * Usa datos de la instalación (tipo, tensión, superficie, circuitos).
   */
  async calculateSupplyForInstallation(
    installationId: string,
    user: SafeUser,
  ) {
    const installation = await this.installationsService.findOne(installationId, user);
    const inst = installation as any;

    // Determinar tipo
    const isResidential = ['VIVIENDA_BASICA', 'VIVIENDA_ELEVADA'].includes(inst.supplyType);

    // Obtener códigos de circuitos
    const circuitCodes = (
      await this.prisma.circuit.findMany({
        where: { installationId },
        select: { code: true },
      })
    )
      .map((c) => c.code)
      .filter(Boolean) as string[];

    // Construir input para el motor
    const input: SupplyInput = {
      installationType: isResidential ? 'residential' : 'commercial',
      phaseSystem: inst.supplyVoltage === 400 ? 'three' : 'single',
      diConductorMaterial: inst.materialDi === 'AL' ? 'Al' : 'Cu',
      diLengthM: inst.longitudDi ?? 10, // TODO: campo longitudDi pendiente en schema
      diSectionMm2: inst.seccionDi ?? undefined,
      surfaceM2: inst.superficieM2 ?? undefined,
      hasElectricHeating: inst.supplyType === 'VIVIENDA_ELEVADA',
      hasAirConditioning: inst.supplyType === 'VIVIENDA_ELEVADA',
      circuitCodes: circuitCodes.length > 0 ? circuitCodes : undefined,
    };

    // Si es comercial, necesitamos potencia contratada
    // Para viviendas se calcula automáticamente por grado electrificación
    if (!isResidential) {
      // Intentar usar potencia total de circuitos como estimación
      const circuits = await this.prisma.circuit.findMany({
        where: { installationId },
        select: { power: true },
      });
      const totalPower = circuits.reduce((sum, c) => sum + c.power, 0);
      if (totalPower > 0) {
        input.contractedPowerW = totalPower;
      } else {
        // Mínimo para local comercial
        input.contractedPowerW = 3450;
      }
    }

    const result = calculateSupply(input);

    // Guardar todos los resultados del suministro en la instalación
    await this.prisma.installation.update({
      where: { id: installationId },
      data: {
        seccionDi: result.di.sectionMm2,
        potMaxAdmisible: result.designPowerW / 1000, // W → kW
        gradoElectrificacion: result.electrificationGrade?.toUpperCase() ?? undefined,
        igaNominal: result.iga.ratingA,
        seccionCondProteccion: result.protectionConductorMm2,
        diferencialNominal: result.differentials[0]?.ratingA ?? undefined,
        diferencialSensibilidad: result.differentials[0]?.sensitivitityMa ?? undefined,
        cdtDi: result.di.cdtResult.voltageDropPct,
      },
    });

    return result;
  }

  /**
   * Map a Prisma Circuit to the engine's CircuitInput format.
   */
  private mapToEngineInput(circuit: Circuit): CircuitInput {
    const conductorMaterial = circuit.cableType === 'CU' ? 'Cu' : 'Al';
    const phaseSystem = circuit.phases === 1 ? 'single' : 'three';

    const validCodes = [
      'C1', 'C2', 'C3', 'C4', 'C4.1', 'C4.2', 'C4.3', 'C5',
      'C6', 'C7', 'C8', 'C9', 'C10', 'C11', 'C12',
    ];
    const code = validCodes.includes(circuit.code ?? '')
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
      insulationType: circuit.insulationType as 'PVC' | 'XLPE' | 'EPR',
      installationMethod: circuit.installMethod as any,
      lengthM: circuit.length,
      ambientTempC: 40,
      groupingCircuits: 1,
      voltageV: circuit.voltage,
      upstreamCdtPct: 0,
    };
  }
}
