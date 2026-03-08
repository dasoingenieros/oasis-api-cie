"use strict";
/**
 * CÁLCULO DE INSTALACIÓN — Conjunto de circuitos
 *
 * Recibe un array de CircuitInput y devuelve InstallationResult con
 * resultados por circuito, resumen global y errores.
 * Procesa los circuitos en paralelo con Promise.all.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateInstallation = calculateInstallation;
const calculate_circuit_1 = require("./calculate-circuit");
/**
 * Calcula todos los circuitos de una instalación en paralelo.
 *
 * @param inputs Array de CircuitInput
 * @returns InstallationResult con resultados, resumen y errores
 */
async function calculateInstallation(inputs) {
    const settled = await Promise.allSettled(inputs.map((input) => Promise.resolve().then(() => (0, calculate_circuit_1.calculateCircuit)(input))));
    const circuits = [];
    const circuitErrors = [];
    for (let i = 0; i < settled.length; i++) {
        const result = settled[i];
        const input = inputs[i];
        if (result.status === "fulfilled") {
            const circuit = result.value;
            circuits.push(circuit);
            if (circuit.errors.length > 0) {
                circuitErrors.push({ circuitId: input.id, errors: circuit.errors });
            }
        }
        else {
            const message = result.reason?.message ?? "Error desconocido en cálculo del circuito";
            circuitErrors.push({
                circuitId: input.id,
                errors: [message],
            });
        }
    }
    const totalPowerW = inputs.reduce((sum, inp) => sum + inp.loadPowerW, 0);
    const maxSectionMm2 = circuits.length > 0
        ? Math.max(...circuits.map((c) => c.sectionMm2))
        : 0;
    const maxVoltageDropPct = circuits.length > 0
        ? Math.max(...circuits.map((c) => c.accumulatedCdtPct))
        : 0;
    const allSucceeded = circuits.length === inputs.length;
    const allValid = circuits.length > 0 && circuits.every((c) => c.isValid);
    const isValid = allSucceeded && allValid;
    return {
        circuits,
        summary: {
            totalPowerW,
            maxSectionMm2,
            maxVoltageDropPct,
        },
        circuitErrors,
        isValid,
    };
}
//# sourceMappingURL=calculate-installation.js.map