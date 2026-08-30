# Diagnóstico — Cobertura del banco de preguntas sobre la línea de tiempo

Objetivo: entender por qué un banco de 12.499 preguntas con mucha metadata alimentaba
solo 159 sucesos, y documentar cómo se resolvió y cómo se aprovecha ahora de forma
múltiple (timeline, fichas, preguntas vinculadas, grupos y relaciones).

## Resumen del flujo actual

`enrich.py` toma `preguntas_unificadas.csv` y, para cada pregunta, intenta anclarla a un
hecho (`hechos_biblicos.csv`) o, en su defecto, a un periodo (`periods.py`), por la
siguiente cascada:

1. `parse_ref(referencia_biblica)` → (libro, capítulo) → hecho exacto (**HECHO**)
2. fallback por periodo de libro/capítulo → era/fecha/lugar (**PERIODO**)
3. fallback por personaje (solo si ≤4 candidatos) → hecho (**PERSONAJE**)
4. fallback por keyword contra el texto de los hechos (**TEXTO**)

## Resultado actual (cobertura)

| fuente_dato | nº preguntas | % |
|---|---|---|
| HECHO | 4.008 | 32,1 % |
| PERIODO | 2.130 | 17,0 % |
| PERSONAJE | 613 | 4,9 % |
| TEXTO | 573 | 4,6 % |
| **(sin dato)** | **5.175** | **41,3 %** |

Solo 5.194 preguntas (41,6 %) terminan con `hecho_id`; el resto no aporta un suceso a
la timeline. Las 5.175 preguntas huérfanas son el foco del problema.

## Causas raíz (por qué se pierde el 41 %)

### 1. `referencia_biblica` está rota o vacía (la señal más fuerte es inutilizable)
- **3.151** de las 5.175 huérfanas ni siquiera tienen `referencia_biblica`.
- Las que la tienen, a menudo no son versículos: `"Capítulo:"`, `"Lección:"`, `"Línea:"`,
  `"página"`, `"párr."`, `"recuadro"`, `"nota"`, `"p.69"`, `"11.txt"`, `"Éfeso,"` (coma),
  y mojibake mal corregido (`"Ã‰xodo"`, `"JesÃºs"`).
- Conclusión: `referencia_biblica` no es una cita bíblica limpia; es metadato de
  publicaciones JW mezclado.

### 2. El campo `capitulo` NO se usa para anclar
`capitulo` en realidad sí trae nombres de libro bíblico cuando la pregunta es de
doctrina/historia (p. ej. `"REVELACIÓN"`, `"JUAN"`, `"NEHEMÍAS"`, `"ESTER"`,
`"2 CRÓNICAS"`, `"GÉNESIS"`). De las 5.175 huérfanas:

- **1.986** tienen un libro bíblico detectado en `capitulo`.
- **182** lo tienen en `personaje`.
- **21** en `referencia`.
- **2.986** no tienen ninguna señal de libro (temas: calendario, monedas, medidas,
  lecciones de publicaciones).

`enrich.py` ignora `capitulo` por completo → se pierden ~2.100 anclajes triviales.

### 3. La normalización de nombres es insuficiente
`personaje` trae la misma persona con muchas grafías: `"Jesús"`, `"JESÚS"`, `"Jesus"`,
`"JESUS"`, `"JesÃºs"` (mojibake). Tras normalizar (`NFD`, quitar diacríticos, MAYÚS),
`JESUS` pasa de ~4 variantes a **1.872** preguntas coherentes. El `fix_mojibake` actual
solo resuelve UTF-8→latin-1 en algunos casos, y el `personaje_fallback` está limitado a
≤4 candidatos, perdiendo anclajes.

### 4. No se generan hechos nuevos desde el banco
Los 159 sucesos se importaron una vez de las 3 líneas de tiempo JW. El pipeline **nunca
extrae nuevos sucesos** de las preguntas. 769 personajes y 295 temas del campo
`capitulo` nunca se convierten en sucesos de la timeline.

## Solución propuesta (3 frentes, ya implementados)

1. **Fallback por `capitulo`** — detectar el libro bíblico presente en `capitulo` y
   anclarlo a era/fecha/lugar vía `periods.py` (fuente `PERIODO`). Recupera ~1.986
   preguntas.
2. **Fallback por `personaje` ampliado** — normalizar agresivamente (`NFD` + MAYÚS +
   limpiar mojibake) y subir el tope de candidatos de 4 a un criterio por similitud de
   nombre. Recupera ~200-500 preguntas.
3. **Generación de nuevos hechos** — agrupar preguntas huérfanas por (libro + capítulo)
   o por personaje normalizado cuando haya un clúster suficiente, y promoverlo a nuevo
   suceso en `hechos_biblicos.csv` (curado, no automático ciego).

## Métricas a revisar tras el cambio

- `(sin dato)` debería bajar de 5.175 (41 %) a ~2.900 (23 %) solo con los fallback 1-2.
- `PERIODO` debería subir de 2.130 (~2.000 más).
- Los nuevos hechos deberían elevar el total de sucesos por encima de 159.

## Resultado REAL tras implementar (cifras finales)

| métrica | antes | después | delta |
|---|---|---|---|
| preguntas con dato | 7.324 (58,6 %) | **9.537 (76,3 %)** | +2.213 |
| `(sin dato)` | 5.175 | **2.962** | -2.213 |
| `HECHO` | 4.008 | **4.717** | +709 |
| `PERIODO` | 2.130 | **3.915** | +1.785 |
| sucesos (`eventos`) | 159 | **193** | +34 |
| fichas de personajes | 151 | **164** | +13 |

- El fallback por `capitulo`/`personaje` (libro → periodo) recuperó ~2.100 preguntas.
- `scripts/gen_hechos_libros.py` generó **34 hechos nuevos** (cartas del NT, profetas
  menores y sapienciales que no estaban representados), lo que además permitió que
  **709 preguntas más** se anclaran a un suceso concreto (`HECHO`, antes caían en
  `PERIODO` o quedaban huérfanas).
- **Corrección de calidad**: la primera versión del generador metía nombres de lugar
  ("Corinto", "Creta", "Éfeso"…) en `personajes`, contaminando `gen_fichas.py` con
  fichas falsas. Se separó lugar vs. personaje (campo `lugar_antiguo` dedicado) y se
  hizo el script idempotente (regenera ids 160+ sin duplicar).

## Qué mejoramos y cómo (resumen de cambios en código)

| archivo | cambio |
|---|---|
| `scripts/enrich.py` | añade `book_in()` (detecta libro canónico en texto libre) y `period_for_book()`; nuevo fallback por `capitulo`/`personaje` tras el de referencia. |
| `scripts/gen_hechos_libros.py` | **nuevo**: genera un suceso por cada libro bíblico sin representación (ids 160+), con nombre/descripción/tipo curados en `LIBRO_META`. Idempotente. |
| `scripts/run_pipeline.py` | añade `gen_hechos_libros.py` como primer paso del pipeline. |
| `linea-tiempo-datos.js` | regenerado: `eventos` (193), `grupos`, `relaciones`. |

## Cómo hacer uso múltiple del banco (guía práctica)

El banco (`preguntas_unificadas.csv`, 12.499 filas) se transforma —vía el pipeline— en
**una sola fuente de verdad enriquecida** (`preguntas_unificadas_enriquecidas.csv`), de
la que se derivan **cuatro productos** consumibles por cada página:

### 1. Regenerar todo (comando único)

```
python scripts/run_pipeline.py
```

Esto ejecuta en orden: `gen_hechos_libros.py` → `enrich.py` → `gen_timeline.py` →
`gen_fichas.py`. Al final quedan actualizados los CSV y los JS del repo.

### 2. Los cuatro productos y dónde se consumen

| producto | archivo | lo consume | qué aporta |
|---|---|---|---|
| Línea de tiempo | `linea-tiempo-datos.js` (`window.LT_DATA`: `eventos`, `preguntas`, `personajes`, `grupos`, `relaciones`) | `index.html`, `linea-horizontal.html` | los sucesos y sub-sucesos; `g` = grupo anidado; `relaciones` = causa/paralelo/contraste |
| Fichas de personajes | `fichas-personajes.js` (`window.LT_FICHAS`) | `fichas.html` | biografía, profesión, hitos, preguntas por personaje |
| Hoja de curación | `fichas_personajes.csv` | tú (manual) | completar cualidades/defectos/opinión de Jehová/lección |
| Curación de jerarquía/relaciones | `curacion/grupos.json`, `curacion/relaciones.json` | `linea-horizontal.html` (vía datos) | grupos anidados y aristas entre hechos |

### 3. Cómo anclar tus propias preguntas nuevas

Al añadir preguntas a `preguntas_unificadas.csv`, `enrich.py` las ancla en cascada:

1. `referencia_biblica` → hecho exacto (**HECHO**, máxima precisión).
2. libro/capítulo de la referencia → periodo (**PERIODO**).
3. libro en `capitulo` o `personaje` → periodo (**PERIODO**).
4. personaje → hecho (**PERSONAJE**); si no, keyword → **TEXTO**.

**Consejo**: cuida el campo `capitulo` (pon el libro bíblico cuando aplique) y
`referencia_biblica` (cita real "Libro cap:vers"). Así maximizas la proporción de
preguntas que terminan enlazadas a un suceso concreto.

### 4. Por qué el banco ahora rinde múltiples veces

- **Una fila → un ancla** a un suceso; cada suceso agrega las preguntas vinculadas
  (`nq`) que se ven en la timeline, el drawer y las fichas.
- **Los grupos** (`curacion/grupos.json`) permiten navegar de "época" a "subtrama"
  (p. ej. Pablo misionero) sin perder el hilo cronológico.
- **Las relaciones** (`curacion/relaciones.json`) convierten el banco en conocimiento
  conectado (causa→efecto, paralelo, contraste), útil para estudiar cómo se conjugan o
  aíslan los hechos.

Con esto, el mismo banco pasa de alimentar 159 sucesos a sostener **193 sucesos agrupados
en 8 subtramas, 164 fichas y 19 relaciones**, con 76 % de las preguntas ya fechadas.