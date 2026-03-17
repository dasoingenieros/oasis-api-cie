// src/installations/field-config/documentation-triage.ts
// Triaje MTD vs PROYECTO segun ITC-BT-04 por tipo de instalacion.

/**
 * Determina si una instalacion requiere MTD o Proyecto Tecnico.
 * Basado en ITC-BT-04 tabla de grupos y limites de potencia por tipo.
 *
 * @param installationType - Tipo wizard (vivienda, local, industrial, etc.)
 * @param potenciaTotal - Potencia total en W (opcional, si no se conoce usa default)
 * @param extras - Datos adicionales para tipos especificos
 * @returns 'MTD' o 'PROYECTO'
 */
export function determineDocumentationType(
  installationType: string,
  potenciaTotal?: number,
  extras?: {
    esEdificio?: boolean;
    irveExterior?: boolean;
    irveModo4?: boolean;
  },
): 'MTD' | 'PROYECTO' {
  const tipo = installationType?.toLowerCase();
  const p = potenciaTotal ?? 0;
  const hasP = potenciaTotal !== undefined && potenciaTotal !== null;

  switch (tipo) {
    // ── Vivienda (grupo f/e) ──
    // Unifamiliar: MTD si P <= 50kW; Edificio: MTD si P <= 100kW
    case 'vivienda':
      if (!hasP) return 'MTD'; // default
      if (extras?.esEdificio) return p <= 100_000 ? 'MTD' : 'PROYECTO';
      return p <= 50_000 ? 'MTD' : 'PROYECTO';

    // ── Local / Oficina (grupo e) ──
    // MTD si P <= 100kW por CGP
    case 'local':
      if (!hasP) return 'MTD';
      return p <= 100_000 ? 'MTD' : 'PROYECTO';

    // ── Industrial (grupo a) ──
    // MTD si P <= 20kW
    case 'industrial':
      if (!hasP) return 'MTD';
      return p <= 20_000 ? 'MTD' : 'PROYECTO';

    // ── Garaje NO LPC (grupo h) ──
    // MTD si <= 5 plazas ventilacion natural (simplificado: P <= 10kW)
    case 'garaje':
      if (!hasP) return 'MTD';
      return p <= 10_000 ? 'MTD' : 'PROYECTO';

    // ── Enlace y Comunes (grupo e) ──
    // Siempre MTD salvo > 100kW
    case 'enlace':
      if (!hasP) return 'MTD';
      return p <= 100_000 ? 'MTD' : 'PROYECTO';

    // ── Temporal (grupo d) ──
    // MTD si P <= 50kW
    case 'temporal':
      if (!hasP) return 'MTD';
      return p <= 50_000 ? 'MTD' : 'PROYECTO';

    // ── IRVE (grupo z) ──
    // MTD si P <= 50kW interior; PROYECTO si exterior >10kW o Modo 4
    case 'irve':
      if (extras?.irveModo4) return 'PROYECTO';
      if (extras?.irveExterior && hasP && p > 10_000) return 'PROYECTO';
      if (!hasP) return 'MTD';
      return p <= 50_000 ? 'MTD' : 'PROYECTO';

    // ── Autoconsumo / FV (grupo o) ──
    // MTD si P <= 100kW
    case 'autoconsumo':
      if (!hasP) return 'MTD';
      return p <= 100_000 ? 'MTD' : 'PROYECTO';

    // ── Generacion (grupo c) ──
    // MTD si P <= 10kW
    case 'generacion':
      if (!hasP) return 'MTD';
      return p <= 10_000 ? 'MTD' : 'PROYECTO';

    // ── Local Mojado (grupo c) ──
    // MTD si P <= 10kW
    case 'mojado':
      if (!hasP) return 'MTD';
      return p <= 10_000 ? 'MTD' : 'PROYECTO';

    // ── Conductores Aislados Caldeo (grupo c) ──
    // MTD si P <= 10kW
    case 'caldeo':
      if (!hasP) return 'MTD';
      return p <= 10_000 ? 'MTD' : 'PROYECTO';

    // ── Tipos que SIEMPRE requieren Proyecto ──
    case 'lpc_host':      // Hosteleria LPC (grupo i)
    case 'lpc_espec':     // Espectaculos LPC (grupo i)
    case 'lpc_reun':      // Reunion y Trabajo LPC (grupo i)
    case 'lpc_otros':     // Otros LPC (grupo i)
    case 'garaje_lpc':    // Garaje LPC (grupo g)
    case 'temporal_lpc':  // Temporal LPC (grupo i)
    case 'elevacion':     // Elevacion y Transporte (grupo j)
    case 'rotulos':       // Rotulos Luminosos (grupo j)
    case 'local_esp':     // Local Especial / Bombas (grupo j)
      return 'PROYECTO';

    default:
      return 'MTD';
  }
}

/** Descripcion humana de por que se asigna un tipo de documentacion */
export function getDocumentationReason(
  installationType: string,
): string {
  const tipo = installationType?.toLowerCase();

  const alwaysProyecto = [
    'lpc_host', 'lpc_espec', 'lpc_reun', 'lpc_otros',
    'garaje_lpc', 'temporal_lpc', 'elevacion', 'rotulos', 'local_esp',
  ];

  if (alwaysProyecto.includes(tipo)) {
    return 'Este tipo de instalacion requiere siempre Proyecto Tecnico (ITC-BT-04).';
  }

  const limits: Record<string, string> = {
    vivienda: 'MTD si potencia <= 50kW (unifamiliar) o <= 100kW (edificio)',
    local: 'MTD si potencia <= 100kW por CGP',
    industrial: 'MTD si potencia <= 20kW',
    garaje: 'MTD si <= 5 plazas con ventilacion natural',
    enlace: 'MTD salvo potencia > 100kW',
    temporal: 'MTD si potencia <= 50kW',
    irve: 'MTD si potencia <= 50kW interior, sin Modo 4',
    autoconsumo: 'MTD si potencia <= 100kW',
    generacion: 'MTD si potencia <= 10kW',
    mojado: 'MTD si potencia <= 10kW',
    caldeo: 'MTD si potencia <= 10kW',
  };

  return limits[tipo] || 'Consultar ITC-BT-04 para el tipo de documentacion aplicable.';
}
