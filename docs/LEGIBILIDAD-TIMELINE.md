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

### 2.1 `nextLeft` — limitación de ancho por proximidad

Cada barra de personaje en layout compacto mide el **borde izquierdo real**
de la siguiente barra **del mismo track** (misma fila horizontal). Con eso se
calcula el `max-width` del caption, impidiendo que el texto se extienda más
allá del espacio disponible antes de esa barra.

```
Archivo: linea-paralela.js → renderTrackCanvas()

if(layoutOpts.compactLayout && i + 1 < people.length){
  nextLeft = visualBarBoundsCached(people[i + 1], yMin, yMax, chartW).left;
}
```

El tope lo calcula `captionMaxPx()`, que recibe **dónde empieza el texto de
verdad** — o sea, ya con el corrimiento de §2.3 sumado — y no el borde de la
barra:

```
function captionMaxPx(captionLeft, nextLeft){
  if(nextLeft == null) return CAPTION_MAX_PX;   // 200px por defecto
  const libre = Math.floor(nextLeft - captionLeft - 8);
  return libre >= CAPTION_MAX_PX ? CAPTION_MAX_PX : Math.max(40, libre);
}
```

Lo aplican por igual `renderCompactNarrowBar()` (barras de periodo) y
`renderPointEventBar()` (cajas de punto). El texto resultante se trunca con
`text-overflow: ellipsis` via CSS.

**Por qué el borde real y no el año de inicio:** ver §2.9. Medir contra
`yearToX(siguiente.inicio)` fue justamente la causa de que este método
fallara durante mucho tiempo.

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

Como contrapeso, `visualBarBounds()` declara para estos personajes el ancho
del nombre completo, así el empaquetado en tracks (§2.9) sabe que ocupan más
que su barra y no mete a nadie al lado.

### 2.9 `visualBarBounds` — una sola fuente para la extensión ocupada

Los métodos de §2.1 y el empaquetado en tracks (`layoutBlockTracks` vía
`periodVisualClash`) solo funcionan si coinciden con lo que se dibuja. La
extensión real de una barra la calcula `visualBarBounds()`, y tiene que
respetar dos cosas que no son obvias:

1. **Las barras cortas no empiezan en su año de inicio.** Un periodo de
   ≤ `SHORT_PERIOD_MAX_YEARS` (12) cuya barra quede más angosta que
   `NARROW_BAR_PX` (56) se dibuja con `renderPointEventBar()`, que **centra
   una caja de ≥ 72 px sobre el periodo**: `left = cx - boxW / 2`. Es decir
   que arranca hasta ~100 px **antes** de su año.
2. **El caption puede sobresalir de su propia barra.** El corrimiento de
   §2.3 (`--caption-shift`, hasta 200 px) empuja el texto a la derecha, más
   allá del ancho de la barra.

Por eso `visualBarBounds()` usa `shouldRenderAsPoint()` —el mismo predicado
que `renderPersonBar()`— y suma el corrimiento al ancho declarado:

```
const caja = shouldRenderAsPoint(pe, spanW)
  ? pointEventBoxLayout(pe, x, spanW, chartW)
  : { left: x, width: spanW };
const inset = markerNameInset(pe, caja.left, yMin, yMax, chartW);
return { left: caja.left, width: Math.max(caja.width, inset + capW) };
```

**El bug que esto arregla:** antes `visualBarBounds()` solo centraba la caja
para sucesos puntuales (`pe.isEvent`), no para reinados cortos, y `gapToNext`
medía contra `yearToX(siguiente.inicio)`. Las dos cosas creían tener media
caja más de espacio (34–49 px de más, medidos), así que el empaquetado ponía
en la misma fila barras que se pisaban y el `max-width` del caption nunca
llegaba a truncar. Se veía sobre todo con reinados cortos de Judá e Israel
(Rehoboam/Jehoram, Asá/Atalía, Ezequías/Jehoacaz, Jonás/Oseas).

Medido con los carriles Un solo reino + Reyes de Judá + Reyes de Israel +
Profetas, en 18 combinaciones de zoom (0,8–8 px/año) × tamaño de texto
(100 %, 140 %, 200 %) y 2 196 textos: **162 superposiciones antes, 0
después**, sin costo vertical neto (a zoom bajo suma 1–2 filas; a zoom alto
usa 1–2 menos, porque ahora detecta que las cajas centradas no chocan).

### 2.10 Cachés de medición

`visualBarBounds()` mide texto y recorre los sucesos del personaje, y
`periodVisualClash()` la consulta O(n²) veces al empaquetar. Dos cachés
mantienen el costo del render igual que antes del arreglo:

- `visualBarBoundsCached()` guarda el resultado por personaje (identidad del
  objeto, sin armar claves de texto) y se vacía cuando cambia el layout
  (`yMin`, `yMax`, `chartW`, marcadores, escala de texto, estilo).
- `textWidth()` memoriza por (fuente, texto). Como las fuentes web se cargan
  sin bloquear y al llegar cambian las medidas, la caché se vacía con
  `document.fonts.ready` y con el evento `loadingdone`.

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
| `nextLeft` / `captionMaxPx` | Activo | No aplica |
| `--caption-shift` | Desde `markerNameInset` | No aplica |

---

## 6. Resumen de capas de protección

```
┌──────────────────────────────────────────────────┐
│ 0. visualBarBounds: extensión real de cada barra │
│ 1. captionMaxPx: limita ancho por vecino en track│
│ 2. CAPTION_MAX_PX: tope global 200px             │
│ 3. markerNameInset ≤ 200px: evita shift gigante  │
│ 4. overflow:hidden en .lane-block: clipea fuera  │
│ 5. text-overflow:ellipsis: trunca con "…"        │
│ 6. bandLabelShown: etiqueta de banda solo 1 vez  │
│ 7. adjustCaptionOverflow: DESACTIVADA            │
└──────────────────────────────────────────────────┘
```

Cada capa actúa como red de seguridad para las anteriores. La capa 0 es la
base: si miente sobre dónde empieza o termina una barra, las capas 1 y el
empaquetado en tracks quedan calibrados con números equivocados y dejan
pasar superposiciones (§2.9). El caso más extremo (zoom a 2–3 años de rango)
se maneja por la combinación de `markerNameInset` limitado +
`overflow:hidden` en `.lane-block`.

---

## 8. Densidad visual y Explorar (Pasos 3–5)

Cuando muchos sucesos coinciden en X (p. ej. 32 E.C. o la última semana),
`timeline-density.js` forma **agregados** en Comparar: un marcador resume N
sucesos y abre el explorador de lista con cobertura de IDs verificable.
Las barras de duración de personajes no se agregan.

La vista **Explorar** (`data-vista="explorar"`) muestra la lista a ancho
completo; Comparar conserva el eje 2D. Ambos usan el mismo selector
(`LTSelectors.selectEvents`) y el mismo formateo de fechas (`LTDates`),
sin año cero al lector.

---

## 9. Tips de marcadores que no se recortan

En modo compacto los sucesos dentro de una fila usan un tip CSS
(`.evt-marker__tip`) en vez del tooltip flotante: cuelga **arriba** del
marcador y **centrado** en él. Como `.chart-scroll` tiene `overflow`, ese tip
quedaba cortado en dos situaciones:

- **Por arriba**, en la fila que esté al tope del área visible (la primera al
  cargar, o cualquier otra después de hacer scroll vertical).
- **Por los costados**, en marcadores pegados al borde izquierdo o derecho del
  área visible; se notaba mucho en pantallas angostas.

No se resuelve con `padding` fijo: el borde superior lo puede tocar cualquier
fila según el scroll, y el recorte lateral depende del ancho disponible. En su
lugar se mide en el momento del hover/foco:

- `cssTipPlacement(mk, tip, view, gap)` es pura — recibe los rectángulos del
  marcador, del tip y del área visible, y devuelve `{below, shift}`.
- `placeCssTip(m)` la aplica: agrega `.evt-marker--tip-below` (el tip pasa
  debajo del marcador) y setea `--tip-shift`, que el CSS suma dentro del
  `translateX(-50%)` para correr el tip lo mínimo necesario.

Si no hay espacio arriba **ni** abajo, el tip se queda arriba: voltearlo no
mejoraría nada. Se dispara desde la delegación de `mouseover` y también de
`focusin`, así que vale igual navegando con teclado; `mouseout`/`focusout`
resetean el estado. En pantallas táctiles no interviene: ahí el tap usa el
tooltip flotante `#tooltip`, que es `position:fixed` y ya se reubica solo.

Verificado midiendo cada marcador visible en 9 posiciones de scroll por
viewport (escritorio, tablet y teléfono, también con texto al 200 %): 0
recortados. Cubierto por `scripts/tests/test_tooltips.js`.

---

## 10. Historial de decisiones

| Fecha | Cambio | Razón |
|---|---|---|
| 2026-09-03 | Desactivar `adjustCaptionOverflow` | Causaba texto "clavado" en bordes |
| 2026-09-03 | Agregar `gapToNext` | Texto de personajes cercanos se superponía |
| 2026-09-03 | Limitar `markerNameInset` a 200px | Insets gigantes en zoom extremo |
| 2026-09-03 | `overflow:hidden` en `.lane-block` | Texto residual de barras off-screen |
| 2026-09-03 | `bandLabelShown` Set | Etiquetas de banda repetidas en cada bloque |
| 2026-09-07 | Agregados por densidad + Explorar | Acceso completo sin adivinar gestos |
| 2026-09-07 | `LTDates` sin año 0 en eje | Consistencia cronológica histórica |
| 2026-09-07 | `cssTipPlacement` + `--tip-shift` | Tips de la fila superior y de los bordes quedaban cortados por `overflow` |
| 2026-09-07 | `visualBarBounds` centra las barras cortas y suma el corrimiento | El empaquetado y `gapToNext` creían tener media caja más de espacio, y los nombres se pisaban |
| 2026-09-07 | `gapToNext` → `nextLeft` + `captionMaxPx` | Medir contra el año de inicio del vecino daba topes 34–49 px demasiado grandes |
| 2026-09-07 | Memorias en `visualBarBounds` y `textWidth` | Mantener el costo del render tras usar la geometría real en el bucle O(n²) |
| 2026-09-03 | Eliminar banda `exi` | Duplicaba la banda de época `ep-bab` |
