# @daso/electrical-engine

Motor de cálculos REBT para instalaciones eléctricas de baja tensión.  
Librería TypeScript pura — sin dependencias en runtime, totalmente testeable.

## Normativa cubierta

| ITC | Contenido | Estado |
|-----|-----------|--------|
| ITC-BT-19 | Intensidades admisibles por sección y método | ✅ Semana 1 |
| ITC-BT-19 | Factores de corrección (Ca, Cg, Ct) | ✅ Semana 1 |
| ITC-BT-25 | Circuitos tipo vivienda (C1–C12) | ✅ Semana 1 |
| ITC-BT-19 | Selección de sección (3 criterios) | 🔜 Semana 2 |
| ITC-BT-22 | Selección de protecciones | 🔜 Semana 3 |
| ITC-BT-24 | Corriente de cortocircuito | 🔜 Semana 3 |

## Instalación

```bash
# Dentro del monorepo, ya está disponible como workspace:
yarn workspace @daso/api add @daso/electrical-engine
```

## Uso básico

```typescript
import {
  calculateNominalCurrent,
  getAdmissibleCurrent,
  getCorrectionFactors,
} from "@daso/electrical-engine";

// 1. Calcular intensidad nominal
const { nominalCurrentA, steps } = calculateNominalCurrent({
  phaseSystem: "single",
  loadPowerW: 3450,       // C2 — tomas de uso general
  powerFactor: 1.0,
  voltageV: 230,
});
// → nominalCurrentA: 15A

// 2. Consultar intensidad admisible de tabla ITC-BT-19
const Iz_tabla = getAdmissibleCurrent(
  "B1",    // Método: tubo en pared
  2.5,     // Sección: 2.5mm²
  "PVC",   // Aislamiento
  "Cu"     // Material: cobre
);
// → 21A (tabla ITC-BT-19 método B1, Cu, PVC)

// 3. Aplicar factores de corrección
const { Ca, Cg, combined } = getCorrectionFactors({
  insulationType: "PVC",
  ambientTempC: 40,
  groupingCircuits: 3,
  method: "B1",
});
// → Ca: 0.87, Cg: 0.70, combined: 0.609

const Iz_corregida = Iz_tabla * combined;
// → 21 × 0.609 = 12.79A

// 4. Verificar: Iz_corregida ≥ In
// 12.79A < 15A → ¡Necesita sección mayor!
```

## API

### `calculateNominalCurrent(input)`

Calcula la intensidad nominal de un circuito.

**Parámetros:**
- `phaseSystem`: `"single"` | `"three"`
- `loadPowerW`: Potencia instalada en W (> 0)
- `powerFactor`: cosφ, rango (0, 1]
- `simultaneityFactor?`: Ks, rango (0, 1], default 1.0
- `loadFactor?`: Fu, rango (0, 1], default 1.0
- `voltageV?`: Tensión nominal en V, default 230/400

**Retorna:** `{ nominalCurrentA, effectivePowerW, voltageV, steps }`  
**Lanza:** `EngineError` si parámetros inválidos

---

### `getAdmissibleCurrent(method, sectionMm2, insulation, material?)`

Consulta la tabla ITC-BT-19.

**Parámetros:**
- `method`: `"A1" | "A2" | "B1" | "B2" | "C" | "D" | "E" | "F"`
- `sectionMm2`: `1.5 | 2.5 | 4 | 6 | 10 | ... | 300`
- `insulation`: `"PVC" | "XLPE" | "EPR"`
- `material?`: `"Cu"` (default) | `"Al"`

**Retorna:** Intensidad admisible en A  
**Lanza:** Error si combinación no está en tabla

---

### `getCorrectionFactors(params)`

Calcula factores de corrección Ca × Cg × Ct.

**Parámetros:**
- `insulationType`: tipo de aislamiento
- `ambientTempC`: temperatura ambiente en °C
- `groupingCircuits`: número de circuitos agrupados
- `method`: método de instalación
- `soilResistivityKmW?`: resistividad térmica del suelo (solo método D)

**Retorna:** `{ Ca, Cg, Ct, combined }`

---

### `getCircuitTemplate(code)`

Devuelve la plantilla de un circuito ITC-BT-25 (C1–C12).

---

## Principios del motor

1. **Nunca produce NaN, Infinity, negativos o sección 0**
2. **Cada fórmula tiene test unitario**
3. **Cada cálculo retorna su trazabilidad completa** (`steps[]`)
4. **Funciones puras**: mismo input → mismo output, sin side effects
5. **Versión normativa fija**: `NORM_VERSION = "REBT_RD842_2002"`

## Tests

```bash
# Ejecutar todos los tests con cobertura
yarn workspace @daso/electrical-engine test

# Modo watch durante desarrollo
yarn workspace @daso/electrical-engine test:watch
```

Umbral mínimo de cobertura: **90% líneas/funciones, 85% ramas**.

## Estructura

```
packages/electrical-engine/src/
├── types/
│   └── index.ts           # Tipos base del sistema
├── tables/
│   ├── itc-bt-19.ts       # Tabla intensidades admisibles
│   ├── correction-factors.ts  # Factores Ca, Cg, Ct
│   └── itc-bt-25.ts       # Circuitos tipo vivienda
├── calculations/
│   ├── nominal-current.ts # Intensidad nominal
│   └── nominal-current.test.ts
└── index.ts               # Punto de entrada público
```
