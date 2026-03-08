"use strict";
/**
 * CIRCUITOS TIPO ITC-BT-25 — Instalaciones interiores en viviendas
 *
 * Fuente: REBT — ITC-BT-25 Tabla 1
 *
 * Define los circuitos mínimos obligatorios en viviendas, con:
 *   - Potencia prevista
 *   - Sección mínima conductor (fase y neutro)
 *   - Calibre máximo PIA
 *   - Sensibilidad diferencial
 *   - Clavija/enchufe tipo
 *   - Número mínimo de puntos de utilización
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ITC_BT_25_CIRCUITS = void 0;
exports.getCircuitTemplate = getCircuitTemplate;
exports.getMandatoryCircuits = getMandatoryCircuits;
exports.ITC_BT_25_CIRCUITS = {
    C1: {
        code: "C1",
        name: "Alumbrado",
        description: "Puntos de luz, apliques, luminarias",
        powerPerPointW: 200,
        minPoints: { studio: 2, small: 3, medium: 3, large: 4, xlarge: 5 },
        minSectionMm2: 1.5,
        maxBreakerA: 10,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "none",
        notes: "Máx 30 puntos por circuito. 200W/punto para incandescente o equivalente LED.",
    },
    C2: {
        code: "C2",
        name: "Tomas de corriente uso general",
        description: "Enchufes 16A de uso general (salón, dormitorios, pasillos)",
        powerPerPointW: 3450,
        minPoints: { studio: 3, small: 3, medium: 3, large: 4, xlarge: 5 },
        minSectionMm2: 2.5,
        maxBreakerA: 16,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_16A",
        notes: "Máx 20 tomas por circuito. Enchufe 16A tipo schuko.",
    },
    C3: {
        code: "C3",
        name: "Cocina/Horno",
        description: "Cocina vitrocerámica, horno empotrado",
        powerPerPointW: 5400,
        minPoints: { studio: 1, small: 1, medium: 1, large: 1, xlarge: 1 },
        minSectionMm2: 6,
        maxBreakerA: 25,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_25A",
        notes: "Circuito exclusivo. Enchufe 25A o conexión directa para potencias >4.600W.",
    },
    "C4.1": {
        code: "C4.1",
        name: "Lavadora",
        description: "Lavadora automática",
        powerPerPointW: 3450,
        minPoints: { studio: 1, small: 1, medium: 1, large: 1, xlarge: 1 },
        minSectionMm2: 4,
        maxBreakerA: 20,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_16A",
        notes: "Circuito exclusivo en lavadero o cocina.",
    },
    "C4.2": {
        code: "C4.2",
        name: "Lavavajillas",
        description: "Lavavajillas automático",
        powerPerPointW: 3450,
        minPoints: { studio: 0, small: 0, medium: 1, large: 1, xlarge: 1 },
        minSectionMm2: 4,
        maxBreakerA: 20,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_16A",
        notes: "Circuito exclusivo.",
    },
    "C4.3": {
        code: "C4.3",
        name: "Termo eléctrico",
        description: "Acumulador de agua caliente eléctrico (ACS)",
        powerPerPointW: 3450,
        minPoints: { studio: 0, small: 0, medium: 1, large: 1, xlarge: 1 },
        minSectionMm2: 4,
        maxBreakerA: 20,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_16A",
        notes: "Circuito exclusivo si P > 1.000W. Para P < 1.000W puede compartir C2.",
    },
    C4: {
        code: "C4",
        name: "Lavadora/lavavajillas/termo",
        description: "Circuito genérico C4 (equivalente a C4.1)",
        powerPerPointW: 3450,
        minPoints: { studio: 1, small: 1, medium: 1, large: 1, xlarge: 1 },
        minSectionMm2: 4,
        maxBreakerA: 20,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_16A",
        notes: "Alias de C4.1 para compatibilidad con plantillas que usan C4 genérico.",
    },
    C5: {
        code: "C5",
        name: "TC baño y cocina",
        description: "Tomas de corriente 20A en baños y cocina",
        powerPerPointW: 3450,
        minPoints: { studio: 1, small: 1, medium: 1, large: 2, xlarge: 3 },
        minSectionMm2: 2.5,
        maxBreakerA: 16,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_16A",
        notes: "Tomas a ≥ 60cm de bañera/ducha. Diferencial 30mA obligatorio siempre.",
    },
    C6: {
        code: "C6",
        name: "TC adicional alumbrado",
        description: "Circuito adicional de alumbrado cuando C1 supera 30 puntos",
        powerPerPointW: 200,
        minPoints: { studio: 0, small: 0, medium: 0, large: 0, xlarge: 0 },
        minSectionMm2: 1.5,
        maxBreakerA: 10,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "none",
        notes: "Circuito adicional cuando la vivienda supera 30 puntos de luz.",
    },
    C7: {
        code: "C7",
        name: "TC adicional uso general",
        description: "Circuito adicional de TC cuando C2 supera 20 tomas",
        powerPerPointW: 3450,
        minPoints: { studio: 0, small: 0, medium: 0, large: 0, xlarge: 0 },
        minSectionMm2: 2.5,
        maxBreakerA: 16,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_16A",
        notes: "Circuito adicional cuando se superan 20 tomas en C2.",
    },
    C8: {
        code: "C8",
        name: "Calefacción eléctrica",
        description: "Radiadores eléctricos, suelo radiante",
        powerPerPointW: 1500,
        minPoints: { studio: 0, small: 0, medium: 0, large: 0, xlarge: 0 },
        minSectionMm2: 6,
        maxBreakerA: 25,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "none",
        notes: "Potencia de diseño según cálculo de cargas térmicas. Diferencial 30mA.",
    },
    C9: {
        code: "C9",
        name: "Aire acondicionado",
        description: "Unidad split o multisplit de A/C",
        powerPerPointW: 5000,
        minPoints: { studio: 0, small: 0, medium: 0, large: 0, xlarge: 0 },
        minSectionMm2: 6,
        maxBreakerA: 25,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "none",
        notes: "Potencia según equipo. Circuito exclusivo para unidades > 3.000W.",
    },
    C10: {
        code: "C10",
        name: "Secadora",
        description: "Secadora eléctrica de ropa",
        powerPerPointW: 3450,
        minPoints: { studio: 0, small: 0, medium: 1, large: 1, xlarge: 1 },
        minSectionMm2: 4,
        maxBreakerA: 20,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_16A",
        notes: "Circuito exclusivo.",
    },
    C11: {
        code: "C11",
        name: "Automatización / Domótica",
        description: "Bus KNX, pasarelas, controladores domóticos",
        powerPerPointW: 200,
        minPoints: { studio: 0, small: 0, medium: 0, large: 0, xlarge: 0 },
        minSectionMm2: 1.5,
        maxBreakerA: 10,
        breakerCurve: "C",
        rcdSensitivityMa: 300,
        socketType: "none",
        notes: "Circuito exclusivo para instalación domótica. Se puede usar diferencial 300mA.",
    },
    C12: {
        code: "C12",
        name: "TC adicionales circuitos específicos",
        description: "Cualquier circuito adicional específico no contemplado en C1-C11",
        powerPerPointW: 3450,
        minPoints: { studio: 0, small: 0, medium: 0, large: 0, xlarge: 0 },
        minSectionMm2: 2.5,
        maxBreakerA: 16,
        breakerCurve: "C",
        rcdSensitivityMa: 30,
        socketType: "schuko_16A",
        notes: "Circuito genérico adicional. Adaptar sección y protección a la carga real.",
    },
};
/**
 * Obtiene la plantilla de circuito por código.
 */
function getCircuitTemplate(code) {
    return exports.ITC_BT_25_CIRCUITS[code];
}
/**
 * Lista de circuitos obligatorios según superficie de la vivienda.
 * Retorna los códigos de circuito que son obligatorios.
 */
function getMandatoryCircuits(surfaceM2) {
    const mandatory = ["C1", "C2", "C3", "C4.1", "C5"];
    if (surfaceM2 >= 30) {
        mandatory.push("C4.2"); // Lavavajillas
    }
    if (surfaceM2 >= 50) {
        mandatory.push("C4.3"); // Termo
        mandatory.push("C10"); // Secadora
    }
    return mandatory;
}
//# sourceMappingURL=itc-bt-25.js.map