# Legibilidad de la línea de tiempo paralela

Documento técnico de las decisiones de UI/UX de la cronología: cómo se
mantienen legibles nombres, fechas y etiquetas al extender (zoom-in) o
contraer (zoom-out) la línea, cómo se reparte el espacio vertical, y cómo se
resuelven el objetivo del clic, los tooltips y la navegación hasta un suceso.

Las secciones §1–§8 tratan el eje horizontal y el ancho del texto; §9–§15, el
resto. El §16 es el registro corrido de qué se atacó y por qué.

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
  sin bloquear y al llegar cambian las medidas, `invalidarMedidas()` vacía las
  dos cachés con `document.fonts.ready` y con el evento `loadingdone`, **y
  además pide un re-render**: vaciar la caché sin volver a dibujar dejaba en
  pantalla un layout calculado con las métricas de la fuente de reserva.

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

Estas ocho capas son todas **horizontales** y todas actúan sobre el ancho del
texto. El eje vertical tiene las suyas, y son de otra naturaleza: en vez de
recortar, reparten espacio o lo piden. La altura de fila se calcula desde el
contenido (§11), el contenedor se mide cuando ya es estable (§12), la banda de
sucesos sueltos negocia filas contra el alto libre (§10) y los marcadores que
pelean por el mismo gesto se funden en un solo control (§13).

---

## 8. Densidad visual y Explorar (Pasos 3–5)

Cuando muchos sucesos coinciden en X (p. ej. 32 E.C. o la última semana),
`timeline-density.js` forma **agregados** en Comparar: un marcador resume N
sucesos y abre el explorador de lista con cobertura de IDs verificable.
Las barras de duración de personajes no se agregan.

La proximidad en X es condición necesaria pero **no suficiente**: desde el
presupuesto vertical (§10), los sucesos sueltos se agrupan solo si además no
quedan filas libres donde separarlos.

La vista **Explorar** (`data-vista="explorar"`) muestra la lista a ancho
completo; Comparar conserva el eje 2D. Ambos usan el mismo selector
(`LTSelectors.selectEvents`) y el mismo formateo de fechas (`LTDates`),
sin año cero al lector.

---

## 9. Tips de marcadores: una capa flotante que nada recorta

Los sucesos dentro de una fila mostraban su nombre en un tip CSS
(`.evt-marker__tip`) que colgaba del propio marcador. Al ser hijo del marcador
vivía dentro de `.lane-block`, que tiene `overflow:hidden` (§2.5), y ese
recorte es innegociable: existe para que las barras fuera de rango no dejen
texto residual. El tip perdía siempre.

Se intentó primero medir y voltear el tip en el momento del hover
(`cssTipPlacement` + `--tip-shift`). Resolvía el borde superior, pero no el
recorte lateral en pantallas angostas ni el caso de la fila más baja, y dejaba
dos sistemas de tooltip conviviendo: uno para táctil y otro para mouse.

**Ahora hay uno solo.** Todos los marcadores usan el `#tooltip` flotante, que
es `position:fixed` y por lo tanto no lo recorta ningún ancestro:

- `showMarkerTip(m)` lo llena y lo ancla al marcador, sin seguir al mouse: así
  el mismo código sirve para hover, foco de teclado y tap.
- `anchoredTipBox(anchor, tip, view, gap)` es pura — recibe los rectángulos y
  devuelve la posición final. Prefiere arriba, voltea abajo si no entra, y
  recorta contra los dos bordes laterales.
- `tipViewBox()` descuenta el eje pegajoso del alto usable, porque el eje se
  dibuja encima y un tip debajo de él no se lee.
- `repositionTip()` corre en scroll y resize: un tip anclado a un marcador que
  se fue de pantalla se esconde en vez de quedar flotando huérfano.

El contenido ya no va en una línea con `…`: el tip admite varias líneas y
corta palabras largas, con tope de alto para que no tape el gráfico.

Verificado midiendo el rectángulo del tip contra el área visible y contra el
eje en escritorio, tablet y teléfono, también con texto al 200 %: 0 recortados
y 0 tips por debajo del eje. Cubierto por `scripts/tests/test_tooltips.js` y
`docs/auditoria-validacion/run-r6.cjs`.

---

## 10. Agrupar solo cuando no queda alto: presupuesto vertical

Hasta acá todas las capas cuidaban el eje **horizontal**. Esta es la primera
que razona sobre el **vertical**, y cambia cuándo aparece un agregado.

### El síntoma

Con un solo chip de época activo — «Jueces», por ejemplo — los personajes
ocupan **una** fila y abajo quedan cientos de píxeles vacíos. Aun así los
sucesos sueltos se mostraban como «7 sucesos próximos» y «2 sucesos
próximos»: dos globos que hay que abrir para saber qué contienen, con media
pantalla libre al lado. El agregado se justificaba por proximidad en X sin
mirar si había filas donde separarlos en Y.

### La regla

> Agrupar cuesta un clic por título. Solo vale la pena cuando no hay lugar.

`layoutLooseEventLanes` ahora intenta **primero** el despliegue y recién agrega
si no entra:

1. `render()` ya calculaba `freeBelow` = alto visible − alto de los personajes
   − eje. Antes solo servía para estirar la banda; ahora es el presupuesto.
2. `looseMaxAbsForBudget(availH)` traduce ese presupuesto a **cuántos niveles**
   entran a cada lado del riel (`LOOSE_EVT_SLOT_H` = 38 px por fila).
3. `LTDensity.fanLevels(xs, {gapPx, maxAbs})` reparte los sucesos en 0, 1, −1,
   2, −2… y devuelve `ok:false` si a alguno no le quedó nivel libre.
4. Si `ok` y el alto pedido entra en el presupuesto → `mode: 'expandido'`, un
   suceso por fila con su nombre a la vista. Si no → `mode: 'agrupado'`, el
   camino de densidad de siempre.

`maxAbs` puede dar 0 y aun así desplegarse: si los sucesos están separados en
el eje entran todos en el riel y no hacen falta filas extra. Quien decide es
`fan.ok`, no el presupuesto.

### De todo-o-nada a decidir por zona

La primera versión era todo o nada: si a un solo punto no le quedaba nivel
libre, se devolvía `null` y se agrupaba la banda entera. El argumento era la
coherencia visual — no mezclar nombres con números en la misma banda.

En uso resultó peor de lo que evitaba: un puñado de sucesos apretados en un
extremo hacía que se agruparan también los que tenían 300 px libres alrededor.
El lector perdía nombres que no competían con nadie.

Ahora los puntos se parten en **componentes de conflicto** —tramos que
compiten por el mismo espacio horizontal, calculados por `looseComponents()`—
y cada tramo se resuelve por su cuenta: se despliega si sus miembros entran, y
se agrupa solo ese tramo si no. El modo resultante puede ser `expandido`,
`agrupado` o `mixto`.

Lo que hacía dudosa la mezcla era no poder distinguir un caso del otro, y eso
ya está resuelto: el agregado lleva su insignia con el número de miembros, así
que se lee como «acá hay N cosas juntas» y no como un suceso más. El contador
de la barra superior lo dice explícito: «N desplegados, M agrupados por falta
de espacio».

### El reparto en filas no acepta colisiones

`fanLevels` forzaba al nivel 0 cualquier punto que no encontrara lugar. O sea
que cuando avisaba `ok:false` **ya había dejado dos marcadores encimados**, y
si alguien usaba el resultado igual, se veían superpuestos.

Ahora un punto sin nivel libre queda con `level: null` y su índice va a
`sinLugar`; `ok` es simplemente `sinLugar.length === 0`. Quien llama decide qué
hacer con los que sobran, pero nadie recibe una colocación que colisiona.

El orden de niveles también cambió. Antes era estrictamente simétrico (0, ±1,
±2…), así que un presupuesto de 5 filas se usaba como 4: la quinta no tenía
par. `levelOrder()` reparte sobre los slots reales, y con número impar usa
todos.

### Por qué no hace falta histéresis

El resto de los cambios de modo del proyecto la usan (`minGapPx`/`exitGapPx`).
Acá no, porque no hay realimentación: `freeBelow` sale del alto de los
personajes, y el alto del despliegue se topea contra `availH`, así que
desplegar nunca agranda el contenido ni mueve el umbral. El modo es función
pura de (sucesos, `chartW`, alto visible). Igual hay `LOOSE_EVT_EXPAND_MARGIN`
= 8 px para no decidir que entra justo pegado al borde.

Verificado: en el alto del umbral y a ±1 px, ocho re-renders seguidos dan
siempre el mismo modo — no oscila.

### Títulos: el ancho sale del hueco real, no de un tope fijo

Al desplegarse aparecieron nombres que antes vivían dentro de un agregado, y
con ellos dos problemas de ancho.

El primero fue el recorte contra los bordes: el título va centrado en su
marcador, así que uno pegado al borde izquierdo quedaba cortado a la mitad
(«…amblea de Siquem»). El corrimiento hacia adentro lo arregló.

El segundo fue el tope fijo. Cada título tenía `max-width:108px`, una línea y
10 px de fuente pase lo que pase. En 1920 px quedaban títulos con `…` y 600 px
de hueco al lado; el control de tamaño de texto no los tocaba (seguían en
10 px al 200 %); y dos cajas de 108 px con centros a 92 px se pisaban 16 px si
compartían nivel.

El reparto ahora es por hueco disponible:

- `looseCaptionTramos()` le da a cada título el tramo que llega hasta el punto
  medio con su vecino **del mismo nivel**, menos una holgura, acotado por los
  bordes. Por construcción dos tramos del mismo nivel no se solapan.
- `looseCaptionBox()` decide dentro de ese tramo. Si el texto entra en una
  línea, la caja se ajusta al texto — una caja más ancha que su contenido
  inventaría solapes al medir el área pintada. Si no entra, usa el tramo
  completo y una segunda línea, y solo si el nivel tiene alto para ella a la
  escala vigente.
- El título se manda entero: recortar es tarea del CSS, y solo si no entra ni
  con dos líneas.

`ajustarTitulosSueltos()` resuelve después del render los choques contra los
obstáculos de la zona, que son texto ya renderizado y solo medible entonces.
El criterio es quién es contenido y quién es decoración:

- La leyenda «Sucesos» está clavada en el borde izquierdo, así que cualquier
  título de esa esquina la pisa. Cede la leyenda.
- Contra un nombre de época o la tira de potencias se encoge el título, pero
  **solo si el texto sigue entrando entero**: recortarlo para esquivar una
  etiqueta es peor que solaparse («Muere Josué» quedaba en «Mu…»).
- Si aun así pisa, ceder más lo despegaría de su marcador. Se le da fondo
  propio y prioridad de capa, y se leen los dos textos.

En «Jueces» a 1440 px el título más largo pasó de 108 px recortado a 416 px
completo, y al 200 % la fuente pasa de 10 px a 20 px.

### Comportamiento en cada tamaño

No hay breakpoints: la regla sale de medir `chartScroll.clientHeight`, así que
funciona igual en las tres. Medido con «Jueces» (1 personaje, 9 sucesos
sueltos) y «Siglo primero» (16 personajes, 14 pistas):

| Viewport | Jueces | Siglo primero |
|---|---|---|
| 1440×900 (escritorio) | desplegado, 9 filas, 0 agregados | agrupado, 2 agregados |
| 834×1112 (tablet) | desplegado, 9 filas, 0 agregados | agrupado, 2 agregados |
| 390×844 (teléfono) | desplegado, 9 filas, 0 agregados | agrupado, 2 agregados |

Esa medición es anterior al reparto por componentes: con él, un caso que antes
caía entero en «agrupado» puede quedar `mixto`, con los tramos holgados
desplegados y solo los apretados en un agregado.

En los tres: 0 títulos fuera del gráfico y 0 superposiciones entre títulos.
El teléfono despliega porque la banda es alta aunque angosta; lo que dispara
el agrupado no es el ancho de pantalla sino que los personajes se coman el
alto. Cubierto por `scripts/tests/test_despliegue.js`.

---

## 11. La altura de fila la decide el contenido

`trackRowHeight()` devolvía `L.rowH` — 54 px — para toda fila con gente,
mirando solo **cuántos** personajes había, nunca **qué** tenían adentro. Pero
lo que va apilado en una fila varía:

- el nombre, en 11 px base;
- el medio: una línea de 2 px para una barra, un pin de 15 px para un suceso
  puntual, o un pin de 24 px si es un grupo curado;
- las fechas, en 9,5 px base;
- y todo eso multiplicado por `--tl-font-scale`, que llega a 2.

Al 100 % con un grupo curado la pila ya pedía 57 px y entraba en 54: el nombre
de una fila se metía en la de arriba. Al 200 % pedía cerca de 90 px. Los 54 px
no eran un cálculo, eran una apuesta a que nadie usara el control de tamaño de
texto.

Ahora la función recibe los `pe` de la fila y suma lo que cada uno necesita:
padding vertical, alto de nombre y fechas a la escala vigente, el medio según
el tipo (`peMiddleHeight`), los espacios entre ellos y el margen del anillo de
foco. Devuelve `Math.max(L.rowH, necesario)`, así que a escala 1 y sin grupos
todo queda exactamente como estaba y no hay regresión visual.

**El riesgo es la deriva:** estas constantes son un espejo a mano de valores
que viven en el CSS. Si el CSS cambia y el JS no, vuelven los solapes sin que
nada falle. Por eso `scripts/tests/test_alturas.js` compara las dos fuentes y
falla si se separan.

---

## 12. Medir el contenedor cuando ya es estable

El presupuesto vertical de §10 sale de `chartScroll.clientHeight`. Ese número
salía distinto en el primer render que en el segundo: 105 px de diferencia. La
barra de filtros termina de acomodarse **después** de la primera medición, así
que el primer dibujo repartía filas con un alto que ya no existía.

No alcanza con medir más tarde: cualquier momento fijo es una apuesta sobre
cuándo terminó de asentarse el layout. Un `ResizeObserver` sobre `chartScroll`
lo resuelve por observación — vuelve a dibujar cuando el contenedor **de
verdad** cambió de tamaño.

Un observer que reacciona a un render que él mismo provocó es un bucle
infinito, así que hay tres frenos: se compara contra la medida anterior y se
ignoran cambios menores a 1 px, se ignoran las medidas en cero (contenedor
oculto), y se corta después de unos pocos re-layouts encadenados.

El eje pegajoso trajo su propio problema: al llevar el foco a un control de la
zona baja, el navegador lo dejaba justo debajo del eje, que se dibuja encima.
`scroll-padding-bottom` en `.chart-scroll` reserva esa franja, así que
cualquier `scrollIntoView` deja el elemento por encima del eje.

---

## 13. Cada suceso con su propia zona de clic

Los marcadores de una fila se proyectaban sobre la barra sin mirar si el lugar
ya estaba ocupado. Miden 15 px y van centrados en su fecha, así que dos
sucesos de años cercanos quedaban uno encima del otro y el clic se lo llevaba
el que el navegador dejara arriba: en Reyes a 1920 px, apuntar a «Ezequías y
Senaquerib» abría «Senaquerib invade a Judá». No es un problema estético — es
abrir el suceso equivocado.

Correr las fechas no es opción: la posición **es** el dato. La salida es que
los que comparten lugar dejen de ser controles separados. `groupRowMarkers()`
encadena en un grupo los que están a menos de un ancho de marcador más 3 px, y
si el grupo tiene más de uno se dibuja un solo control agregado con la
insignia del número de miembros, que abre la lista.

Se compara contra el **último miembro** del grupo, no contra su centro: así una
hilera de sucesos escalonados se encadena en un agregado único, en vez de
dejar pares que se siguen pisando.

En puntero grueso la zona táctil es mucho mayor que el dibujo — un `::before`
con `inset:-18px` la lleva a 51 px — así que la agrupación usa ese número y en
pantalla táctil agrupa mucho antes. Es lo correcto: lo que compite no es lo
que se ve, es lo que recibe el gesto.

`markerNameInset` (§2.3) tuvo que aprender lo mismo. Recorría los sucesos en
crudo y los medía como si todos fueran de 15 px; ahora recorre la misma
agrupación que se dibuja, porque un agregado va en otra x y es más ancho.

### El halo no puede quedarse con la fila entera

Fundir marcadores tuvo un costo que no se vio hasta medirlo: el control pasó de
15 px a 28 px y quedó centrado en la barra. Sumado al halo táctil, ocupa 64 px.
Sobre la barra de Josías, de 32 px, eso tapaba también el nombre — que es el
control del personaje. Josías seguía siendo `role="button"` y recibía foco de
teclado, pero **no había un solo punto donde el clic le llegara**. Es el mismo
error que R2 venía a arreglar, cambiado de víctima.

La invariante que faltaba: *el agrandado invisible de un marcador no puede
dejar sin zona propia al control que está debajo.* Cuando la barra es más
angosta que el halo completo, el halo deja de crecer hacia arriba, que es
justo donde va el nombre; a lo ancho y hacia abajo se conserva entero, así que
el marcador no pierde ergonomía táctil.

`docs/auditoria-validacion/run-alcance.cjs` la comprueba: recorre cada barra
dibujada y falla si alguna no recibe el clic en ningún punto. Como el eje es
pegajoso, solo cuenta si sigue inalcanzable después de traerla a la vista.

---

## 14. Un suceso se dibuja una sola vez

`collectLooseEvents` elegía por descarte —«este suceso no es de ningún
personaje visible»— y ese descarte no restaba lo que ya estaba dibujado más
arriba. En la última semana a 1920 px eso repetía 31 sucesos: los mismos
dentro de un agregado y otra vez sueltos abajo.

Cuesta doble. El lector ve el mismo hecho dos veces sin saber si son dos, y la
banda de abajo gasta en repetidos el presupuesto de filas que §10 necesita
para desplegar los que no están en ningún lado.

`collectRepresentedEventIds()` recorre las filas ya armadas y junta los ids que
tienen representación propia: miembros de un agregado o de un grupo curado, y
filas de suceso. `collectLooseEvents` los descarta. Un suceso que está en la
barra de un personaje **no** cuenta como representado — ahí es un punto en una
barra ajena, no una entrada con su nombre —, así que sigue apareciendo abajo.

---

## 15. «En línea» tiene que terminar mostrando el suceso

Desde la lista de un agregado o desde Explorar, «En línea» debía llevar al
lector hasta ese suceso en el gráfico. Hacía lo contrario: el panel quedaba
abierto encima, y el gráfico debajo con `inert`. El destino quedaba tapado por
lo mismo desde donde se salió.

Ahora la acción se completa entera:

1. Se guarda de dónde vino y se cierra el panel, anulando el disparador para
   que el foco no vuelva a un botón que ya no está visible.
2. Si la vista era Explorar, se pasa a Comparar: sin el eje 2D no hay dónde
   mostrar nada.
3. Se espera a que el layout se aquiete. `cuandoLayoutQuieto()` mira un
   contador de renders y sigue cuando deja de moverse; buscar el control antes
   significa buscarlo en un DOM que se va a reemplazar.
4. Se lo enfoca y se lo resalta un momento. Si el suceso quedó dentro de un
   agregado, se enfoca el agregado — `controlDeSuceso()` compara los ids por
   token exacto, para que el 7 no encuentre al 75.
5. Se anuncia por `aria-live` y aparece un botón flotante para volver a la
   lista, porque cerrar el panel sin dejar camino de vuelta obliga a rehacer
   la búsqueda.

El botón se ubica por encima del eje con la misma reserva de §12, y desaparece
en cuanto se abre cualquier otro panel.

---

## 16. Historial de decisiones

Este es el registro corrido de lo que se atacó en UI/UX y por qué. Toda
decisión visual nueva suma una fila acá, y si necesita explicación larga, una
sección propia arriba.

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
| 2026-09-07 | Presupuesto vertical: desplegar antes de agrupar | Con una sola fila de personajes sobraba media pantalla y los sucesos igual se mostraban como «7 sucesos próximos» |
| 2026-09-07 | `looseCaptionShift` + `--cap-shift` | Al desplegarse, los títulos pegados a los bordes quedaban cortados a la mitad |
| 2026-09-07 | `trackRowHeight` suma el contenido real (§11) | Los 54 px fijos no alcanzaban para un grupo curado, y menos con el texto al 200 % |
| 2026-09-07 | `ResizeObserver` sobre `chartScroll` (§12) | El alto libre salía 105 px distinto en el primer render que en el segundo |
| 2026-09-07 | `scroll-padding-bottom` en `.chart-scroll` (§12) | El eje pegajoso tapaba el control recién enfocado |
| 2026-09-07 | `collectRepresentedEventIds` (§14) | 31 sucesos se dibujaban dos veces y gastaban el presupuesto de filas |
| 2026-09-07 | Decidir por componente en vez de todo o nada (§10) | Un grupo apretado hacía agrupar también a los que tenían 300 px libres |
| 2026-09-07 | `fanLevels` reporta `sinLugar` y usa slots impares (§10) | Forzaba al nivel 0 lo que no entraba, o sea que colocaba encimado |
| 2026-09-07 | `groupRowMarkers` (§13) | Marcadores superpuestos hacían que el clic abriera el suceso equivocado |
| 2026-09-07 | Tips de marcador al `#tooltip` flotante (§9) | `overflow:hidden` de `.lane-block` los recortaba y no había padding que lo salvara |
| 2026-09-07 | «En línea» cierra el panel y enfoca el destino (§15) | Dejaba el gráfico tapado e `inert`, justo debajo de lo que había que mirar |
| 2026-09-07 | Ancho de título por hueco real (§10) | 108 px fijos recortaban con 600 px libres al lado, y no escalaban con el texto |
| 2026-09-07 | El halo táctil no crece sobre barras angostas (§13) | El agregado dejaba a Josías sin ningún punto clicable: enfocable por teclado, inalcanzable con el dedo |
