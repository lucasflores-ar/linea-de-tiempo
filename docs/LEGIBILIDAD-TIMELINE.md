# Legibilidad de la línea de tiempo paralela

Documento técnico que describe los métodos implementados para mantener la
legibilidad de nombres, fechas y etiquetas cuando la línea de tiempo se
extiende (zoom-in) o se contrae (zoom-out).

---

## 1. Problema general

La línea de tiempo muestra simultáneamente personajes, sucesos, marcadores,
bandas de época y potencias mundiales. Al hacer zoom, el espacio horizontal
por año cambia drásticamente: desde < 1 px/año (vista completa de 6 000 años)
hasta > 500 px/año (zoom extremo sobre 2–3 años). En todos los niveles de
zoom, los textos deben permanecer legibles y **no superponerse** entre sí.

---

## 2. Métodos para evitar superposición de texto

### 2.1 `gapToNext` — limitación de ancho por proximidad

Cada barra de personaje en layout compacto calcula la distancia en píxeles
al siguiente personaje **del mismo track** (misma fila horizontal). Este
valor se usa como `max-width` del caption, impidiendo que el texto se
extienda más allá del espacio disponible antes de la siguiente barra.

```
Archivo: linea-paralela.js → renderTrackCanvas()

if(layoutOpts.compactLayout && i + 1 < people.length){
  const nextX = yearToX(people[i + 1].inicio, yMin, yMax, chartW);
  gapToNext = nextX - x;
}
```

El valor se aplica en `renderCompactNarrowBar()`:

```
let maxCapPx = CAPTION_MAX_PX;  // 200px por defecto
if(layoutOpts?.gapToNext != null && layoutOpts.gapToNext < CAPTION_MAX_PX + 10){
  maxCapPx = Math.max(40, Math.floor(layoutOpts.gapToNext - 8));
}
```

El texto resultante se trunca con `text-overflow: ellipsis` via CSS.

### 2.2 `CAPTION_MAX_PX` — tope global de ancho de caption

Todas las captions (nombres + fechas) tienen un ancho máximo absoluto de
**200 px** (`CAPTION_MAX_PX`), definido en `linea-paralela.js:117`. Este
tope se aplica tanto en el estilo inline (`max-width`) como en la variable
CSS `--caption-max`.

### 2.3 `markerNameInset` — desplazamiento por marcadores de evento

Cuando un personaje tiene marcadores de evento (círculos) cerca del inicio
de su barra, el nombre se desplaza a la derecha (`--caption-shift`) para no
ocultarse detrás del marcador. La función `markerNameInset()` calcula este
desplazamiento.

**Protección contra zoom extremo:** el inset se limita a `CAPTION_MAX_PX`
(200 px). Marcadores que estén a más de 200 px del inicio de la barra se
ignoran. Sin este tope, en zoom extremo un marcador lejano generaba un
inset de miles de píxeles, empujando el texto del personaje fuera de su
zona y superponiéndolo con barras vecinas.

```
const maxInset = CAPTION_MAX_PX;
if(rel > maxInset) continue;   // ignorar marcadores lejanos
return Math.min(inset, maxInset);
```

### 2.4 `adjustCaptionOverflow` — función desactivada

Esta función intentaba "fijar" los nombres al borde izquierdo del viewport
cuando la barra se desplazaba parcialmente fuera de pantalla. Causaba que
captions se "clavaran" en el borde y se apilaran sobre barras visibles al
hacer zoom extremo.

**Decisión:** desactivada completamente. Los captions ahora se desplazan
naturalmente con su barra al hacer scroll/zoom.

### 2.5 `overflow:hidden` en `.lane-block`

Cada bloque de carril (`.lane-block`) tiene `overflow:hidden` para recortar
barras y texto que exceda los límites del ancho del chart. Esto evita que
barras posicionadas con `left` negativo (fuera del rango visible) muestren
texto residual dentro del viewport.

### 2.6 `text-overflow: ellipsis` — truncado CSS

Tanto `.bar-caption__name` como `.bar-caption__dates` usan:

```css
white-space: nowrap;
overflow: hidden;
text-overflow: ellipsis;
```

Cuando el ancho disponible (ya sea por `gapToNext`, `CAPTION_MAX_PX`, o el
contenedor) es insuficiente, el texto se trunca con `…` en vez de
desbordarse.

### 2.7 Truncado inteligente de nombres largos

La función `captionNameHtml()` y `captionStackWidth()` trabajan juntas para:

- Medir el ancho del texto con `textWidth()` (canvas 2D context).
- Si el nombre excede `CAPTION_MAX_PX`, truncarlo progresivamente:
  primero intentar una versión corta, luego cortar por espacios.
- Agregar atributo `title` con el nombre completo para tooltip al hover.
- Marcar con clase `bar-caption__name--trunc` y `cursor:help`.

### 2.8 `isShortPeriodPe` — personajes de periodo corto

Personajes con un rango de vida muy corto (< 5 años) reciben la clase
`bar-short-period` que elimina el tope de `max-width` en su caption,
permitiendo que el nombre completo sea visible ya que la barra es tan
estrecha que necesita compensar con más espacio para texto.

---

## 3. Bandas de época y etiquetas

### 3.1 Etiquetas de banda — una sola vez

Las bandas de época (Un solo reino, Reino dividido, Destierro en Babilonia,
etc.) se renderizan en cada `lane-block`. Para evitar que sus etiquetas se
repitan y apilen, un `Set` (`bandLabelShown`) registra qué bandas ya
mostraron su etiqueta. Solo la primera aparición incluye texto:

```
const bandLabelShown = new Set();
// en el loop:
const showLabel = !bandLabelShown.has(b.id);
if(showLabel) bandLabelShown.add(b.id);
```

### 3.2 `bandLabelHtml` — adaptación al ancho

La función adapta la etiqueta según el ancho disponible de la banda en
píxeles:

| Ancho banda | Comportamiento |
|---|---|
| < 44 px | Sin etiqueta |
| < 72 px | Texto abreviado (quitar prefijos) |
| < 56 px | Solo primera palabra |
| ≥ 80 px | Etiqueta completa |

Cada etiqueta se escalona verticalmente con `slot % 4` para evitar
colisión cuando varias bandas comparten el mismo rango horizontal.

### 3.3 Banda "Exilio babilónico" eliminada

La banda `exi` (Exilio babilónico, -607 a -537) fue absorbida por la
banda de época `ep-bab` (Destierro en Babilonia, mismo rango). Se eliminó
para evitar doble etiqueta superpuesta.

---

## 4. Zoom y escalado

### 4.1 `yearToX` — proyección lineal

Todas las posiciones se calculan con:

```
x = ((año - yMin) / (yMax - yMin)) * chartW
```

Con protección contra `span <= 0` (división por cero) retornando el centro.

### 4.2 `clamp()` en tipografía

Los títulos de sección y captions usan `calc(Npx * var(--tl-font-scale))`
donde `--tl-font-scale` se ajusta según el nivel de zoom, permitiendo que
la tipografía escale suavemente.

### 4.3 `tickStep` — intervalos del eje X

El eje horizontal elige automáticamente intervalos de tick que mantengan
separación legible (10, 20, 50, 100, 200, 500, 1000 años) según el rango
visible.

---

## 5. Layout compacto vs. expandido

| Aspecto | Compacto (por defecto) | Expandido |
|---|---|---|
| Posición del nombre | Encima de la barra | A la izquierda |
| Marcadores | Inline con la barra | Separados |
| `adjustCaptionOverflow` | Desactivada | Desactivada |
| `gapToNext` | Activo | No aplica |
| `--caption-shift` | Desde `markerNameInset` | No aplica |

---

## 6. Resumen de capas de protección

```
┌─────────────────────────────────────────────────┐
│ 1. gapToNext: limita ancho por vecino en track  │
│ 2. CAPTION_MAX_PX: tope global 200px            │
│ 3. markerNameInset ≤ 200px: evita shift gigante │
│ 4. overflow:hidden en .lane-block: clipea fuera  │
│ 5. text-overflow:ellipsis: trunca con "…"       │
│ 6. bandLabelShown: etiqueta de banda solo 1 vez │
│ 7. adjustCaptionOverflow: DESACTIVADA           │
└─────────────────────────────────────────────────┘
```

Cada capa actúa como red de seguridad para las anteriores. El caso más
extremo (zoom a 2–3 años de rango) se maneja por la combinación de
`markerNameInset` limitado + `overflow:hidden` en `.lane-block`.

---

## 7. Historial de decisiones

| Fecha | Cambio | Razón |
|---|---|---|
| 2026-09-03 | Desactivar `adjustCaptionOverflow` | Causaba texto "clavado" en bordes |
| 2026-09-03 | Agregar `gapToNext` | Texto de personajes cercanos se superponía |
| 2026-09-03 | Limitar `markerNameInset` a 200px | Insets gigantes en zoom extremo |
| 2026-09-03 | `overflow:hidden` en `.lane-block` | Texto residual de barras off-screen |
| 2026-09-03 | `bandLabelShown` Set | Etiquetas de banda repetidas en cada bloque |
| 2026-09-03 | Eliminar banda `exi` | Duplicaba la banda de época `ep-bab` |
