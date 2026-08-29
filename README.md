# Línea de tiempo bíblica — Guía de desarrollo

App web interactiva (de un solo archivo) que visualiza la cronología bíblica según
las líneas de tiempo de **JW.org**, alimentada por una base de datos de preguntas
trivia y sucesos. Incluye mapa de sucesos, histograma, filtros por tema/era/tipo/
potencia mundial, búsqueda y reproducción animada.

Esta guía documenta el stack, los datos, el pipeline de generación y todo lo
necesario para que otro desarrollador retome el proyecto.

---

## 1. Stack tecnológico

| Capa | Tecnología | Detalle |
|---|---|---|
| Frontend | **HTML + CSS + JavaScript vanilla** (sin frameworks, sin build step) | `index.html` es la app completa: CSS en `<style>`, JS inline al final |
| Eje interactivo | **vis-timeline 7.7.2** (local, sin CDN) | `vendor/vis-timeline-graph2d.min.js` + `.min.css` |
| Datos | **JSON** (`linea-tiempo-datos.js`) expuesto como `window.LT_DATA` | Generado por script Python |
| Pipeline de datos | **Python 3** (stdlib + `openpyxl` para los xlsx de fichas) | `scripts/` + `gen_fichas.py`; rutas vía `scripts/paths.py` |
| Servidor de desarrollo | **Python `http.server`** | `python -m http.server 8000` |
| Validación | **Node.js** (solo `node --check` y mocks DOM) | Sin dependencias npm |

**Razones de la elección:** el proyecto vive en una máquina sin conexión a CDNs y
sin gestor de paquetes; por eso toda dependencia (vis-timeline) y todo dato están
descargados localmente. No hay `package.json`, no hay instalación, no hay build.

---

## 2. Estructura de archivos

```
linea-de-tiempo/
├── index.html               # APP COMPLETA (HTML+CSS+JS inline, ~950 líneas)
├── linea-horizontal.html    # Vista horizontal por épocas (3 modos, drawer, tema claro/oscuro)
├── fichas.html              # Visor de fichas de personajes (window.LT_FICHAS)
├── linea-tiempo-datos.js    # DATOS GENERADOS: window.LT_DATA (2.7 MB, 159 sucesos…)
├── fichas-personajes.js     # DATOS GENERADOS: window.LT_FICHAS (151 fichas)
├── fichas_personajes.csv    # Hoja de curación manual de las fichas (campos vacíos)
├── gen_fichas.py            # Generador de fichas (CSV + JS + fusión curación)
├── scripts/
│   ├── paths.py             # Rutas compartidas (DATABASE_DIR, REPO_ROOT)
│   ├── run_pipeline.py      # enrich → gen_timeline → gen_fichas
│   ├── periods.py             # Periodos bíblicos (importado por enrich.py)
│   ├── enrich.py              # Enriquece preguntas_unificadas.csv
│   ├── gen_timeline.py        # Genera linea-tiempo-datos.js
│   ├── gen_personajes.py      # Regenera personajes_biblicos.csv
│   └── tests/
│       ├── test_vis.js        # Mock DOM para index.html
│       ├── test_hor.js        # Mock DOM para linea-horizontal.html
│       └── test_fichas.js     # Mock DOM para fichas.html
├── curacion/
│   └── manual.json          # Campos narrativos curados a mano (se fusionan al regenerar)
├── docs/
│   └── CURACION-FICHAS.md   # Guía de curación manual
├── README.md                # este archivo
└── vendor/
    ├── vis-timeline-graph2d.min.js   # librería local (556 KB)
    └── vis-timeline-graph2d.min.css  # estilos de la librería (19 KB)
```

La base de datos vive en otra carpeta (fuera del repo web):

```
J:\AI\PROJECTOS\JW GAME\DATABASE_preguntas\
├── hechos_biblicos.csv                      # 159 sucesos
├── preguntas_unificadas.csv                 # 12,499 preguntas en bruto
├── preguntas_unificadas_enriquecidas.csv    # preguntas + columnas de suceso
├── personajes_biblicos.csv                  # 54 personajes (vidas para vis-timeline)
├── lugares_biblicos.csv                     # geografía (origen del mapa)
└── fichas/ OTRAS/ listas-en-progreso/      # material de origen (textos JW)
```

> **Rutas:** los scripts usan `scripts/paths.py`. Por defecto apuntan a
> `J:\AI\PROJECTOS\JW GAME\DATABASE_preguntas\`. Override con env
> `LT_DATABASE_DIR` si la base vive en otra carpeta.

```powershell
# Regenerar todos los datos
cd J:\AI\WEB-opencode\hospedaje\linea-de-tiempo
python scripts/run_pipeline.py

# Solo fichas (fusiona curacion/manual.json)
python gen_fichas.py
```

---

## 3. Fuentes de datos y cronología

La cronología sigue las **líneas de tiempo de JW.org** (publicación *Seamos valientes*,
3 secciones). Se descargaron y parsearon las 3 páginas de timeline:

| Archivo (en temp) | Sección | Contenido |
|---|---|---|
| `jw_tl1.html` | S1 | De los patriarcas a la época de los jueces |
| `jw_tl2.html` | S2 | De los reyes a la reconstrucción de Jerusalén |
| `jw_tl3.html` | S3 | Del Mesías a los cristianos del primer siglo |

Convenciones de fecha:
- Años **negativos = a. E. C.** (antes de nuestra era), positivos = E. C.
- El Diluvio se fija en el **-2370**, la creación de Adán en el **-4026**.
- Potencias mundiales (periodos de dominio): Egipto **1600 a. E. C.**, Asiria
  **después de 874**, Babilonia **625**, Medopersia **539**, Grecia **332**, Roma
  **63-30 a. E. C.**

La cronología se verificó contra la base: **10/11 fechas clave coinciden**
(Diluvio, pacto con Abrahán, Saúl, Pentecostés, Éxodo, división del reino,
caída de Samaria, caída de Jerusalén, retorno, templo, muros, etíope). Faltaba el
evento **destrucción de Jerusalén (70 E. C.)**, que se añadió (id 153) y quedó
vinculado a la pregunta 2346.

---

## 4. Esquema de los CSV

### `hechos_biblicos.csv` (159 filas)

| Columna | Descripción |
|---|---|
| `id` | int único |
| `nombre` | título del suceso (p. ej. `Construcción del templo`) |
| `descripcion` | texto corto |
| `fecha_texto` | etiqueta legible (p. ej. `1037 a.E.C.`) |
| `fecha_anio` | año numérico (negativo = a. E. C.) |
| `era` | era del vocabulario fijo (ver §6) |
| `lugar_antiguo`, `lat`, `lon` | geografía del suceso |
| `tipo_suceso` | `contexto` \| `juicio` \| `milagro` \| etc. (vocabulario de `tipoBucket`) |
| `personajes` | lista separada por comas o `/` |
| `referencia` | cita bíblica (p. ej. `1 Reyes 6:1`) |
| `libro`, `capitulo_inicio`, `capitulo_fin` | ubicación canónica |

Los 6 eventos `POTENCIA MUNDIAL: …` (ids 154–159) tienen `tipo_suceso=contexto`;
el id 159 (`Roma`) usa `libro=HECHOS` para caer en el tema HECHOS.

### `preguntas_unificadas.csv` (12,499 filas)

`id, pregunta, opcion_a, opcion_b, opcion_c, opcion_d, respuesta_correcta, categoria, dificultad, capitulo, personaje, referencia_biblica`

### `preguntas_unificadas_enriquecidas.csv`

Mismas columnas que el anterior **+** columnas de suceso que añade `enrich.py`:
`hecho_id, hecho_nombre, fecha_suceso, fecha_anio, era_suceso, lugar_suceso, lat, lon, tipo_suceso, fuente_dato`

`fuente_dato` indica cómo se resolvió el vínculo: **HECHO** (match exacto por
libro+capítulo), **PERIODO** (fallback por periodo del libro), **PERSONAJE**
(fallback por personaje acotado), **TEXTO** (keyword global) o vacío (sin dato).

### `personajes_biblicos.csv` (54 filas)

`id, nombre, inicio, fin, seccion, grupo, nota`

- `inicio`/`fin`: año de vida (negativo = a. E. C.).
- `seccion`: S1/S2/S3 (de dónde salió, publicaciones JW).
- `grupo`: fila en el vis-timeline (p. ej. `Antes del Diluvio`, `Un solo reino`).
- `nota`: dato adicional que aparece en el tooltip (p. ej. `rey 1077-1037`).

---

## 5. Pipeline de datos

```
preguntas_unificadas.csv ─┐
hechos_biblicos.csv ──────┤─ enrich.py ──► preguntas_unificadas_enriquecidas.csv
periods.py ───────────────┘     │
                               ┌─► gen_timeline.py ──► linea-tiempo-datos.js (window.LT_DATA)
hechos_biblicos.csv ───────────┤
personajes_biblicos.csv ───────┘
```

### `enrich.py`
Enriquece cada pregunta con su suceso geográfico/cronológico. Estrategia en cascada:
1. **Match exacto** por `(libro, capítulo)` de `referencia_biblica` → `hecho_id`.
   Si hay varios candidatos, puntúa por intersección de tokens (con bonus si el
   personaje de la pregunta aparece en el hecho).
2. **Fallback por periodo** (`periods.py`): mapa `(libro, rango de capítulos) →
   {fecha_texto, fecha_anio, era, lugar, lat, lon}` → `fuente_dato=PERIODO`.
3. **Fallback por personaje** acotado (solo si el personaje tiene ≤4 hechos).
4. **Keyword global** (`keyword_match`): tokens del texto de la pregunta contra
   nombre/descripción de los hechos → `fuente_dato=TEXTO`.

El script normaliza con `norm()` (quita acentos), maneja **mojibake** con
`fix_mojibake()` (los datos de origen tienen texto latin-1 mal re-decodificado a
UTF-8) y usa `ALIASES` para resolver abreviaturas de libros (p. ej. `GÉN.`, `1SA`).

### `gen_timeline.py`
Genera `linea-tiempo-datos.js`:
- Para cada hecho calcula sus **temas** (multietiqueta) con `temas_de(h)`.
- Agrupa preguntas por hecho (`nq` = nº de preguntas vinculadas).
- Emite `window.LT_DATA = {eventos:[…], preguntas:[…], personajes:[…]}`.

Salida actual: 159 eventos, 12,499 preguntas (7,324 con fecha), 54 personajes.

### `gen_personajes.py`
Genera `personajes_biblicos.csv` desde una tabla codificada a mano con las vidas
según cronología JW (no es derivable automáticamente: hay que editarlo a mano).

> Para **añadir un suceso nuevo**: editar `hechos_biblicos.csv` y re-ejecutar
> `enrich.py` + `gen_timeline.py`. Para un personaje nuevo: editar
> `personajes_biblicos.csv` y re-ejecutar `gen_timeline.py`.

### `gen_fichas.py` (en el repo)
Genera fichas de personajes cruzando `personajes_biblicos.csv` (vida),
`hechos_biblicos.csv` (hitos, lugares, relacionados por co-ocurrencia),
`preguntas_unificadas_enriquecidas.csv` (num_preguntas por columna `personaje`) y
los xlsx de `fichas/` (profesión desde la taxonomía de roles + 32 biografías).
Salidas: `fichas_personajes.csv` (hoja de curación) y `fichas-personajes.js`
(`window.LT_FICHAS`, 151 fichas).

- Los campos **narrativos se emiten vacíos** para curación manual: `genero`, `tribu`,
  `versiculo_clave`, `opinion_jehova` (+`opinion_ref`/`opinion_cita`), `cualidades`
  (+`cualidades_refs`), `defectos` (+`defectos_refs`), `leccion`, `profesion_2`.
- `norm()` normaliza nombres (quita acentos) y un `STOP` + regla de artículos
  descarta no-personas (naciones, grupos: "Israel", "los discípulos").
- `nacimiento`/`fallecimiento`/`edad` solo vienen de `personajes_biblicos.csv`;
  para los demás se dejan vacíos (la 1ª/última mención y la potencia se calculan de
  los sucesos, sin inventar edades).

---

## 6. Vocabularios controlados (importantes para consistencia)

Estos valores están codificados en `index.html` y en `gen_timeline.py`; al añadir
datos hay que usar exactamente estos términos o el filtro los ignorará.

**Eras** (`ERA_ORDER` / `eraKey`): `PREHISTORIA / GÉNESIS`, `DILUVIO`,
`POSTDILUVIANO`, `PATRIARCAS`, `EGIPTO`, `CONQUISTA`, `JUECES`, `MONARQUÍA`,
`REINO DIVIDIDO`, `EXILIO`, `RESTAURACIÓN`, `E.C.`

**Temas** (`THEMES`, en el JS y `temas_de`): `GENESIS`, `EXODO`, `CONQUISTA`,
`JUECES`, `REYES`, `PROFETAS`, `RESTAURACION`, `EXILIO`, `SIGLO-PRIMERO`, `HECHOS`

**Tipos de suceso** (`tipoBucket` → 12 buckets con icono): `batalla`, `milagro`,
`resurrección`, `profecía`, `enseñanza`, `juicio`, `bautismo`, `nacimiento`,
`muerte`, `liberación`, `reunión`, `otro`

**Potencias mundiales** (`POTENCIAS`, periodos de dominio):
`EGIPTO` (-1600 a -874), `ASIRIA` (-874 a -625), `BABILONIA` (-625 a -539),
`MEDOPERSIA` (-539 a -332), `GRECIA` (-332 a -63), `ROMA` (-63 a 100)

---

## 7. Arquitectura de `index.html`

App de una sola página. Orden de renderizado:

```
h1 + .sub          (título y métricas)
.stats             (4 tarjetas: preguntas totales, con dato, sucesos, multi-tema)
.toolbar
 ├─ #filters       Temas        (multiselección, se superponen)
 ├─ #eraFilters    Épocas/eras
 ├─ #typeFilters   Tipo de suceso
 ├─ #potFilters    Potencia mundial (nueva, filtra por periodo de dominio)
 └─ .controls      sliders zoom/centro + botón "Recorrer la historia" + contador
#epochs            botones de salto a épocas
#legend            leyenda de colores de eras
#vtl               vis-timeline (solo barras de vida de personajes, 360px)
#tlRange/.scroll   eje de sucesos (bandas de era + puntos distribuidos en 4 filas)
#hist              histograma
#map / #mapTip     mapa geográfico
#detail / #qlist   panel de detalle del suceso + preguntas vinculadas
#search / #sres    buscador
```

### Funciones clave del JS

| Función | Rol |
|---|---|
| `passes(ev)` / `applyFilter()` | filtrado combinado (tema+era+tipo+potencia) y re-render |
| `potenciaCubre(fa)` / `potenciaCubreRango(ini,fin)` | filtro de potencia por año o por solape de rango |
| `renderVis()` | construye/actualiza el vis-timeline (**54 barras `range` de personajes**; los sucesos viven en el eje custom para evitar duplicación) |
| `syncVisWindow()` / `visSyncSliders(p)` | sincronización bidireccional sliders ↔ ventana vis |
| `render()` / `buildBands()` / `buildAxis()` | eje de sucesos: bandas de era + puntos **distribuidos en 4 filas** (no se tapan entre sí) |
| `renderHist()` | histograma de sucesos por siglo |
| `drawMap()` / `proj()` / `resolveColor()` | mapa con proyección y color por era |
| `selectEvent(id)` | abre el panel de detalle + preguntas del suceso |
| `step()` / `drawStars()` | animación "Recorrer la historia" y fondo de estrellas |

### vis-timeline (datos clave)
- Muestra **solo las vidas de los personajes** (barras `range`); los sucesos se ven en el eje custom. Fila (grupo) de cada personaje: su columna `grupo` del CSV, mapeada a era/tema por `VIS_GRUPO_ERA` y `VIS_GRUPO_TEMA`.
- Conversión año↔Date: `YEAR_MS = 365.25*24*3600*1000`; `y2d()`/`d2y()`.
- `zoomMin = 60 años`, `zoomMax = 4600 años`; etiquetas con `visFmt` ("a. E. C."/"E. C.").
- Los sliders de la app y la ventana del vis se mantienen sincronizados vía el evento `rangechanged`.
- Clic en una barra de personaje → centra el eje de sucesos en su vida.
- Guarda de seguridad: si `vis-timeline-graph2d.min.js` no carga, muestra un aviso en lugar de romper la app.

### Eje de sucesos (clave para la visibilidad)
- Los puntos se dibujan en **4 filas horizontales** (`rowTop=[16,39,61,84]%`): los sucesos con fechas cercanas ya no se superponen (antes todos caían en `top:50%` y se tapaban — causa del "no veo ningún evento").
- Vista por defecto: **centro -700, zoom 1500 años** (era poblada). Botón `⟷ Toda la historia` en `#epochs` para volver al rango completo.

---

## 7bis. Páginas adicionales

### `linea-horizontal.html` — vista horizontal estilo "carriles por épocas"
Replica (con CSS propio, sin Tailwind/CDN) la presentación del diseño de muestra
`timeline_biblica_horizontal.html`. Reutiliza `linea-tiempo-datos.js`.

- **9 columnas de época** (Prehistoria/Génesis → Siglo primero) con colores de la
  paleta, rango de años y contador de sucesos.
- **3 modos de apilado**: Columnas (subcarriles), Acordeón (lista expandible),
  Cascada (tarjetas superpuestas, hover para desapilar).
- **Barra de épocas** = filtro con toggle: un clic filtra a esa época (botón `.on`,
  sincroniza el `select #f-era`), otro clic lo quita; con filtro activo hace scroll.
- **Drawer de detalle**: referencia, contexto, personajes, datos, temas, "Mundo
  contemporáneo" (potencia mundial calculada con `potenciaOf(fa)`) y preguntas
  vinculadas del suceso.
- Filtros: tema/época/tipo/potencia + buscador (`?q=...` desde fichas) + reset.
- **Tema claro/oscuro**: botón `#theme-btn`, variables CSS en `:root` y
  `html[data-theme="light"]`, persistencia en `localStorage('lt-theme')`. Los
  colores de época tienen variantes oscuras en modo claro para que los badges con
  texto blanco sigan legibles.

**Detalles de implementación del acordeón y los enlaces (bugs corregidos):**
- **Acordeón**: el `<button>` que hace de cabecera no heredaba fuente por defecto
  (los navegadores no la heredan en `<button>`): se fijó `font:inherit; line-height`.
  El contenedor `.acc-hdr .l` usa `flex:1; min-width:0` para que los títulos largos
  hagan `ellipsis` en vez de desbordar la tarjeta (causa del "se ve mal" en la
  columna del Siglo primero, la más densa con 49 sucesos). Cada ítem lleva acento
  de color de época (`border-left`), y `render()` conserva la posición de scroll de
  cada columna al alternar (no salta al principio con 49 ítems).
- **Enlace "Abrir detalle →" (`.event-trigger`)**: antes sin estilo, usaba el azul
  de enlace por defecto del navegador (ilegible sobre fondo oscuro). Ahora usa
  `var(--acc)`: azul claro `#6db8ff` en modo oscuro y azul profundo `#1a5fd0`
  (contraste AA sobre blanco) en modo claro.

### `fichas.html` — visor de fichas de personajes
Consume `window.LT_FICHAS` (151 personajes). Grilla responsive con tarjetas
(nombre, profesión, vida, era, nº preguntas/sucesos/lugares) y badge
"⚠ por completar". Filtros: búsqueda, época, sección (S1-S3), profesión, checkboxes
(con vida/sucesos/preguntas) y orden (cronológico/alfabético/más preguntas).
Drawer con datos, lugares, sucesos, relacionados y la sección **✍️ Curación manual
(pendiente)** mostrando "— por completar" en los campos vacíos. Mismo toggle de tema.

---

## 8. Cómo ejecutar

```powershell
# 1) Servir la app (desde la carpeta del proyecto)
cd J:\AI\WEB-opencode\hospedaje\linea-de-tiempo
python -m http.server 8000

# 2) Abrir en el navegador
#    http://localhost:8000
```

No requiere instalación ni npm. `linea-tiempo-datos.js` y `vendor/` ya existen.

---

## 9. Cómo validar cambios

```powershell
# a) Sintaxis del JS inline de index.html (extraer y comprobar con Node)
#    (leer con [System.IO.File]::ReadAllText en UTF-8; Get-Content corrompe acentos)
$c = [System.IO.File]::ReadAllText('index.html', [System.Text.Encoding]::UTF8)
$start = $c.LastIndexOf('<script>'); $end = $c.LastIndexOf('</script>')
$js = $c.Substring($start+8, $end-$start-8)
[System.IO.File]::WriteAllText("$env:TEMP\idx_check.js", $js, (New-Object System.Text.UTF8Encoding($false))
node --check "$env:TEMP\idx_check.js"

# b) Test funcional con mocks DOM (sin navegador)
node scripts/tests/test_vis.js
#   Verifica: RUN OK, 54 items range (solo personajes), 0 items box, 8 grupos, 0 rangos invertidos,
#   filtro de tema (Jueces → 0) y filtro de potencia (solo ASIRIA → 0 fuera de solape)

# c) Revisar que el servidor sirve el HTML actualizado
(Invoke-WebRequest -Uri http://localhost:8000/index.html -UseBasicParsing).Content.Contains('potFilters')
```

`test_vis.js` monta un mock de `document`/`canvas`/`vis.Timeline` y ejecuta el JS
inline real de `index.html` en un contexto `vm` de Node. **Es la única forma de
validar sin navegador.** Para las páginas nuevas hay mocks análogos en
`scripts/tests/`: `test_hor.js` (linea-horizontal: 9 columnas, selects, drawer,
potencia, nav-filter, modos, tema) y `test_fichas.js` (fichas: 151 tarjetas,
filtros, drawer, tema).

---

## 10. Notas, advertencias y pendientes

- **Encoding**: los CSV de origen tienen mojibake (latin-1 re-decodificado como
  UTF-8). `enrich.py` lo corrige con `fix_mojibake`/`norm`; no "corregir" los CSV a
  mano sin re-ejecutar el pipeline.
- **Mantenimiento de eras/temas**: los vocabularios están duplicados entre
  `gen_timeline.py` (temas) y `index.html` (eras, tipos, potencias). Si se añade una
  era/tema/tipo nuevo hay que tocarlos en ambos sitios.
- **Sin verificación visual automática**: no hay test de navegador real; `pencil_browser`
  no está conectado en esta máquina. Validar visualmente abriendo `http://localhost:8000`.
- **Potencia mundial**: el filtro por potencia usa periodos de dominio aproximados
  (ver §6). Los sucesos `POTENCIA MUNDIAL: …` son solo marcadores de contexto
  (`tipo_suceso=contexto`).
- **Pendiente/opcional**: añadir filtro de búsqueda por personaje en el vis,
  comparar visualmente con la estética de JW.org (bandas de era y etiquetas de
  potencia), y poblar la columna `cita` de los sucesos (referencias textuales
  para el drawer de la línea horizontal). **Curación de fichas: 151/151 completa**
  (ver `curacion/manual.json`).

---

## 11. Resumen de datos actuales (referencia)

| Métrica | Valor |
|---|---|
| Preguntas totales | 12,499 |
| Preguntas con dato | 7,324 (HECHO 4,008 · PERIODO 2,130 · PERSONAJE 613 · TEXTO 573) |
| Sucesos | 159 (48 REYES · 30 PROFETAS · 27 SIGLO-PRIMERO · 20 HECHOS · 18 GENESIS · 18 EXODO · 10 RESTAURACION · 9 EXILIO · 6 CONQUISTA · 6 JUECES) |
| Personajes (vidas) | 54 |
| Rango cronológico | -4026 (Adán) a 100 E. C. (Juan el apóstol) |

---

## 12. Historial de implementación

Registro de lo implementado en este proyecto (línea de tiempo bíblica JW).

### Fase 1 — App principal (`index.html`) y pipeline de datos
- Parseadas las 3 líneas de tiempo de JW.org (S1/S2/S3) → 159 sucesos con era, fecha,
  lugar (lat/lon), tipo, personajes y referencia.
- `enrich.py` vincula las 12,499 preguntas a los sucesos (estrategia en cascada:
  HECHO → PERIODO → PERSONAJE → TEXTO; 7,324 con dato).
- `gen_timeline.py` genera `linea-tiempo-datos.js` (`window.LT_DATA`) con temas
  multietiqueta y `nq` (preguntas por suceso).
- `gen_personajes.py` → `personajes_biblicos.csv` (54 personajes con vidas, sección
  S1-S3 y grupo para el vis-timeline).
- vis-timeline 7.7.2 descargado a `vendor/` (sin CDN).
- App `index.html`: eje de sucesos (bandas de era + puntos), histograma, mapa,
  detalle de suceso con preguntas vinculadas, buscador, animación "Recorrer la
  historia", sliders zoom/centro sincronizados con el vis.
- **Verificación JW**: 10/11 fechas clave coinciden; añadido el evento 70 E. C.
  (destrucción de Jerusalén) y los 6 eventos `POTENCIA MUNDIAL: …` (ids 154-159).

### Fase 2 — Correcciones de visibilidad y potencia mundial
- **Bug raíz "no se ve nada"**: `.track` sin ancho → los puntos quedaban a `left`
  hasta 12000 px fuera de vista y `scrollLeft` se clampaba a 0. Fix:
  `trackEl.style.width = T_W + 'px'`.
- Puntos de sucesos distribuidos en **4 filas horizontales** (`rowTop=[16,39,61,84]`)
  para que las fechas cercanas no se tapen; vista por defecto zoom 4400 / centro -1963
  ("Toda la historia"); botón `⟷ Toda la historia`.
- vis-timeline muestra **solo barras de vida de personajes** (54 `range`, 360 px,
  0 boxes); los sucesos viven en el eje custom.
- **Filtro de potencia mundial** (`#potFilters`, `POTENCIAS` con periodos):
  `potenciaCubre(fa)` / `potenciaCubreRango(ini,fin)` integrados en `passes()`/
  `renderVis()`.
- `README.md` (esta guía) creado.

### Fase 3 — Vista horizontal (`linea-horizontal.html`)
- Nueva página (decidida: página nueva en vez de sustituir `index.html`; CSS propio
  en vez de Tailwind/CDN) replicando `timeline_biblica_horizontal.html`.
- 9 columnas de época, 3 modos de apilado (Columnas/Acordeón/Cascada), barra de
  épocas con salto, flechas y rueda→scroll horizontal, buscador.
- Drawer con referencia, contexto, personajes, temas, datos, "Mundo contemporáneo"
  (potencia calculada con `potenciaOf(fa)`) y preguntas vinculadas del suceso.
- Barra de épocas convertida en **filtro con toggle** (se sincroniza con `#f-era`).
- **Tema claro/oscuro** (`#theme-btn`, variables en `:root` + `html[data-theme="light"]`,
  persistencia `localStorage('lt-theme')`, variantes oscuras de colores de época).
- **Enlace "Abrir detalle →"** con `var(--acc)` (azul claro `#6db8ff` en oscuro /
  `#1a5fd0` en claro) — antes usaba el azul de enlace por defecto (ilegible).
- **Acordeón robusto**: `font:inherit` en el botón, `.l{flex:1;min-width:0}` para
  ellipsis, acento `border-left` por época y conservación del scroll de la columna
  al alternar (arregla el "se ve mal" de la columna Siglo primero, 49 sucesos).

### Fase 4 — Fichas de personajes (`gen_fichas.py` + `fichas.html`)
- `gen_fichas.py` (en el repo) cruza `personajes_biblicos.csv` + `hechos_biblicos.csv`
  + `preguntas_unificadas_enriquecidas.csv` + los 2 xlsx de `fichas/` (taxonomía de
  roles y 32 biografías) → **151 fichas**.
- Salidas: `fichas_personajes.csv` (hoja de curación con los campos narrativos
  **vacíos**: cualidades, defectos, opinión de Jehová, versículo clave, lección,
  género, tribu, profesión 2) y `fichas-personajes.js` (`window.LT_FICHAS`).
- Filtros de calidad: STOPLIST + regla de artículos para descartar no-personas
  ("Israel", "los discípulos"); vida/edad solo de `personajes_biblicos.csv`;
  profesión automática desde la taxonomía de roles o keywords; relacionados por
  co-ocurrencia; potencias activas por solape de vida/sucesos.
- `fichas.html`: grilla responsive, filtros (búsqueda/época/sección/profesión/
  checkboxes/orden), drawer con datos, lugares, sucesos, relacionados y la sección
  "✍️ Curación manual (pendiente)"; mismo toggle de tema; enlace cruzado con la
  línea horizontal (`?q=...`).

### Fase 5 — Accesibilidad, estado en URL y tema en todas las páginas
- **`eraKey()` corregida en las 3 páginas**: faltaba el mapeo de `POSTDILUVIANO`
  (Torre de Babel, fa=-2269) y `GENEALOGÍA` (id 78), que fugaban a la era E. C. y
  coloreaban/agrupaban mal. Ahora `POSTDILUVIANO→PATRIARCAS` y
  `GENEALOGÍA→PREHISTORIA / GÉNESIS` (paridad con el fix ya aplicado en
  `linea-horizontal.html`). En `index.html` también se sincronizó `ERA_COLOR`.
- **Accesibilidad común**: `:focus-visible`, `prefers-reduced-motion` y
  `aria-*` (labels/expanded/controls) añadidos a las tres páginas.
  - Acordeón y tarjetas de ficha navegables por teclado (Enter/Espacio),
    `tabindex="0"` + `role="button"`.
  - `linea-horizontal.html`: contador de sucesos visibles (`aria-live`).
- **Estado en URL (back/forward y enlaces compartidos)**:
  - `linea-horizontal.html` y `fichas.html` leen al cargar (`q`, `era`, `tema`,
    `tipo`, `pot`, `modo`, `sec`, `prof`, `sort`, toggles) y escriben con
    `history.replaceState` al cambiar cualquier filtro.
- **Búsqueda con debounce** en `fichas.html` (180 ms).
- **`index.html` gana toggle de tema claro/oscuro** (`#theme-btn`, variables
  `[data-theme="light"]`, persistencia `localStorage('lt-theme')`, recarga para que
  vis-timeline tome los nuevos colores) — antes solo tenía tema oscuro.
- **Responsive**: controles/filtros envuelven en móvil.

### Fase 6 — Tema claro completo en `index.html` (mapa + superficies)
- **Variables semánticas de superficie** en `index.html` (`--surface`, `--surface2`,
  `--surface3`, `--axisbg`, `--on-acc`, `--glass-border`) que sustituyen los hex
  oscuros hardcodeados (`#0b1220`, `#1a2430`, `#151d29`, `rgba(10,14,22…)`, etc.)
  en filtros, tooltips, relbox, preguntas, buscador, `.axis`, bordes y vis-timeline.
  El tema claro ahora se ve correctamente en toda la interfaz (antes quedaban
  cajas/tooltips oscuras sobre fondo claro).
- **Mapa (`<canvas>`) theme-aware**: `drawMap()` elige paleta de tierra/arena/mar/
  ríos/regiones según `isLight()` (leído de `data-theme`), y `resolveColor()` usa
  una tabla `ERA_HEX {dark,light}` para que los marcadores y chips de era coincidan
  con los colores del eje en ambos temas (antes el canvas usaba solo colores oscuros).
- Estrellas de fondo atenuadas en modo claro (`[data-theme="light"] #stars`).
- **Paridad de metadatos**: `color-scheme: dark light` (scrollbars/controles nativos
  correctos por tema) y `<meta name="description">` en las 3 páginas.

### Validación
- `node --check` del JS inline de cada página (extraído con
  `[System.IO.File]::ReadAllText` UTF-8) + mocks DOM (`scripts/tests/test_vis.js`,
  `test_hor.js`, `test_fichas.js`).
- Verificaciones cubiertas: 9 columnas/botones, selects poblados, filtros (potencia
  ROMA→47/0 fuera, tema REYES→48, búsqueda David→16, era E.C.→47, nav toggle
  159↔159), drawer (Asiria, David 8/15 hitos), 3 modos (159 items), tema (dark↔light),
  fichas (151, Rey→25, con preguntas→123, búsqueda David→14).

## 13. Plan — Fase 7: líneas de tiempo anidadas (herramienta de estudio)

> Documentado para retomarlo con cualquier modelo de IA. Estado: Paso 1 (modelo de
> datos jerárquico) COMPLETADO; Pasos 2-4 pendientes.

### Objetivo

Dejar de ser un "probador de datos" y convertirse en **herramienta de estudio** que
permita ver visualmente cómo hechos sueltos se **superponen, se conjugan o permanecen
aislados** en el tiempo. Para ello se quiere poder abrir un hecho "contenedor" (p. ej.
las campañas de Pablo, la conquista de Canaán, los periodos de José o de los jueces) y
desplegar dentro una **línea de tiempo anidada** con sus sub-sucesos.

### Decisiones de diseño (consensuadas)

- **Máximo 2 niveles** (maestro → detalle). No anidar N niveles arbitrarios: con ~159
  sucesos sobra, y anidar profundo confunde más de lo que ayuda.
- **No autogenerar el agrupamiento por densidad** sin curaduría: el pipeline
  infra/sobre-agruparía y perdería el sentido narrativo/teológico. El agrupamiento es
  **curado manualmente** (un archivo editable por el usuario), como `curacion/` para
  fichas.
- **Dos mecanismos complementarios**, no excluyentes:
  1. **Eje dual de paralelo** (comparar 2 eras/periodos lado a lado con el *mismo*
     eje temporal) para el caso "se conjugan o no".
  2. **Suceso maestro expandible** (drill-down) que abre una sub-línea con breadcrumb.

### Pasos

1. **Modelo de datos jerárquico** (fundamento) — `hechos_biblicos.csv` gana columnas
   `parent_id` y `grupo`; se genera una sección `grupos` en `linea-tiempo-datos.js`
   (`window.LT_DATA.grupos`) con la relación padre→hijos y metadatos de cada grupo
   (nombre, rango de fechas, descripción). `gen_timeline.py` la emite; los eventos
   ganan `p` (padre) y `g` (grupo). **Sin esto nada de lo siguiente funciona.**
   ✅ *COMPLETADO. Implementación final: la jerarquía se cura en
   `curacion/grupos.json` (no se editan nuevas columnas del CSV original); cada grupo
   lista `evento_ids`; `gen_timeline.py` emite `window.LT_DATA.grupos` con
   `{id,n,d,eventos,fa_min,fa_max,n_ev,nq}` y cada evento gana `g` = id de grupo
   (null si raíz). 8 grupos curados iniciales, 52 de 159 hechos agrupados.*

2. **Suceso maestro expandible en `linea-horizontal.html`** — un hecho con hijos se
   renderiza como "maestro" (chip con contador de sub-sucesos); al hacer clic/Enter se
   reemplaza el contenido de la columna por su sub-línea (mismo render de cascada/
   acordeón sobre un rango acotado) y aparece un **breadcrumb** ("Reino dividido ›
   Judá") para volver al nivel superior. Estado en URL: `?g=<grupo>`.

3. **Eje dual de paralelo** — selector "Comparar" que coloca dos grupos/eras en filas
   paralelas compartiendo el eje X, para visualizar superposición/contraste. Caso
   clave: Israel vs Judá en el Reino dividido.

4. **(Opcional) Relaciones explícitas entre hechos** — tabla curada `relaciones` con
   aristas causa→efecto / contraste / paralelo dibujadas sobre el eje. Depende de
   decidir el vocabulario de tipos de relación.

### Fuente / criterios de agrupamiento (propuesta inicial)

- `periodo` = contenedores temporales grandes curados: "Conquista de Canaán",
  "Reino dividido (Israel vs Judá)", "Cautiverio babilónico", "Periodo de los jueces",
  "Ministerio de Jesús", "Campañas misioneras de Pablo".
- `parent_id` apunta al `id` de un hecho contenedor (que también existe como suceso)
  o a `null` si es un hecho "raíz".

### Archivos afectados (previsto / estado)

- ~~`hechos_biblicos.csv`~~ → NO se modificó (jerarquía quedó en `curacion/grupos.json`).
- `curacion/grupos.json` ✅ *nuevo* — curación manual de grupos.
- `scripts/gen_timeline.py` ✅ *modificado* — lee `grupos.json` y emite `grupos` + `g`.
- `scripts/run_pipeline.py` (sin cambios necesarios).
- `linea-horizontal.html` (pendiente, Paso 2-3).
- `linea-tiempo-datos.js` ✅ *regenerado*.
- Documentación: esta sección + `FUENTE_PREGUNTAS_UNIFICADA.md` (apartado de jerarquía).