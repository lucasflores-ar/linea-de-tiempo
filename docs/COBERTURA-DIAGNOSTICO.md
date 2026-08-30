# Diagnóstico — Cobertura del banco de preguntas sobre la línea de tiempo

Fecha del análisis: pide los números exactos del pipeline. Objetivo: entender por qué
un banco de 12.499 preguntas con mucha metadata alimenta solo 159 sucesos.

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