/**
 * ITCs DOCUMENTALES Y DE INSTALACIONES ESPECIALES
 *
 * Este archivo recoge las ITCs que no tienen tablas de cálculo ejecutables
 * en el motor, pero cuyos requisitos deben reflejarse en los certificados
 * y en la memoria técnica.
 *
 * Estructura:
 *   - ITC-BT-01: Terminología y definiciones
 *   - ITC-BT-04: Documentación y puesta en servicio
 *   - ITC-BT-05: Verificaciones e inspecciones
 *   - ITC-BT-08: Sistemas de conexión del neutro y masas
 *   - ITC-BT-20: Sistemas de instalación — tabla de compatibilidades
 *   - ITC-BT-26: Instalaciones interiores en viviendas — prescripciones generales
 *   - ITC-BT-28: Locales de pública concurrencia (instalaciones especiales MVP-fase2)
 *   - ITC-BT-29: Locales con riesgo de incendio o explosión — ATEX
 *   - ITC-BT-30: Locales húmedos, mojados y de trabajo agrícola
 *   - ITC-BT-39: Instalaciones de alumbrado exterior
 *   - ITC-BT-40: Instalaciones generadoras de baja tensión
 *   - ITC-BT-52: Infraestructura para recarga de VE
 */
export declare const REBT_DEFINITIONS: {
    "Instalaci\u00F3n el\u00E9ctrica": string;
    "Tensi\u00F3n nominal": string;
    "Corriente de cortocircuito (Icc)": string;
    "Intensidad admisible (Iz)": string;
    "Ca\u00EDda de tensi\u00F3n (CdT)": string;
    "Diferencial (ID)": string;
    PIA: string;
    CGMP: string;
    "Derivaci\u00F3n individual (DI)": string;
    LGA: string;
};
export interface DocumentationRequirement {
    document: string;
    required: boolean;
    responsible: "instalador" | "instalador_autorizado" | "ingeniero" | "organismo";
    notes: string;
}
export declare const DOCUMENTATION_REQUIREMENTS: DocumentationRequirement[];
export interface VerificationTest {
    test: string;
    standard: string;
    minValue?: string;
    maxValue?: string;
    instrument: string;
    notes: string;
}
export declare const VERIFICATION_TESTS: VerificationTest[];
export type NetworkSystem = "TT" | "TN-S" | "TN-C" | "TN-CS" | "IT";
export declare const NETWORK_SYSTEMS: Record<NetworkSystem, {
    label: string;
    description: string;
    typicalUse: string;
    differentialRequired: boolean;
}>;
export type InstalledIn = "wall_concealed" | "wall_surface" | "ceiling" | "buried" | "tray" | "duct" | "air";
export declare const INSTALLATION_METHOD_DESCRIPTIONS: Record<string, string>;
export declare const SPECIAL_INSTALLATIONS: {
    readonly "ITC-BT-28": {
        readonly name: "Locales de pública concurrencia";
        readonly description: "Teatros, cines, discotecas, restaurantes > 50 personas, grandes superficies...";
        readonly keyRequirements: readonly ["Alumbrado de emergencia obligatorio", "Fuente propia de energía para alumbrado de emergencia (autonomía ≥ 1h)", "Circuitos independientes alumbrado / fuerza", "Cabinas de proyección con instalación específica"];
        readonly mvpStatus: "fase2";
    };
    readonly "ITC-BT-29": {
        readonly name: "Locales con riesgo de incendio o explosión (ATEX)";
        readonly description: "Gasolineras, plantas químicas, almacenes de materiales inflamables...";
        readonly keyRequirements: readonly ["Clasificación de zonas ATEX (0, 1, 2 gas; 20, 21, 22 polvo)", "Material certificado ATEX según zona", "Cableado y canalizaciones antideflagrantes"];
        readonly mvpStatus: "fase3";
    };
    readonly "ITC-BT-30": {
        readonly name: "Instalaciones en locales húmedos, mojados y de trabajo agrícola";
        readonly description: "Lavaderos, granjas, instalaciones de riego...";
        readonly keyRequirements: readonly ["Grado de protección IP según ubicación", "Diferencial 30mA en todos los circuitos", "Canalización estanca"];
        readonly mvpStatus: "fase2";
    };
    readonly "ITC-BT-52": {
        readonly name: "Infraestructura para recarga de vehículos eléctricos";
        readonly description: "Puntos de recarga en garajes, parkings y vía pública.";
        readonly keyRequirements: readonly ["Circuito exclusivo por punto de recarga", "Diferencial tipo A (30mA) como mínimo", "Modo 1/2/3/4 según IEC 61851", "Protección contra corrientes de fuga DC"];
        readonly mvpStatus: "fase2";
    };
    readonly "ITC-BT-40": {
        readonly name: "Instalaciones generadoras de baja tensión (autoconsumo)";
        readonly description: "Instalaciones fotovoltaicas, grupos electrógenos, cogeneración.";
        readonly keyRequirements: readonly ["Protección de desconexión de la red (anti-isla)", "Interruptor de corte en carga accesible al distribuidor", "Contadores bidireccionales", "Cumplimiento RD 244/2019 (autoconsumo FV)"];
        readonly mvpStatus: "fase2";
    };
};
//# sourceMappingURL=itc-documentary.d.ts.map