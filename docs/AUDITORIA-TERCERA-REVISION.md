# Tercera revisión: correcciones y pendientes

Fecha: 7 de septiembre de 2026. Revisión iniciada sobre `a060b19`.

Durante el trabajo entró el commit `6d91dd6`, relativo a periodos de libros y datos. Las pruebas son fotografías de sus ejecuciones; las comprobaciones dirigidas de fuente bloqueada y expansión de la última semana se repitieron al final. No modifiqué archivos de la aplicación. Evidencias nuevas en `docs/auditoria-tercera/`; se preservaron las anteriores.

## Dictamen

**La mayoría de las correcciones está bien, pero no daría por cerrada la tarea.** Persisten dos pendientes importantes y una superposición adicional:

1. Los agregados de las filas superiores todavía no se despliegan aunque exista una colocación viable.
2. El salto inicial de 105 px también se produce sin cargar ninguna fuente web. No es correcto atribuirlo únicamente al cambio de tipografía.
3. La franja de imperios no reserva altura real y «Roma» se pisa con el título de un suceso.

Las colisiones entre nombre/fecha de grupos anuales que motivaron R1 ya no se reprodujeron en las variantes probadas. Los tooltips flotantes, la apertura desde marcadores agrupados, el regreso de «En línea» y los recorridos habituales de paneles superaron las pruebas ejecutadas.

## 1. Validación realizada

- **19 pruebas unitarias:** todas pasan con `node scripts/run_tests.js`.
- **36 escenarios geométricos:** Jueces, Última semana, Ministerio y Judá/Israel/profetas; anchos 320, 390, 520, 521, 760, 761, 1024, 1440 y 1920 px.
- **18 recorridos de interacción:** Explorar y Comparar en esos nueve anchos. Apertura de grupo/suceso, selección desde la lista, regreso al grupo, cierre y filtros. Ninguno falló.
- **24 variantes de tipografía:** 390/1440 px, editorial/waterfall, compacto/expandido, escalas 1/1,4/2. No se detectaron intersecciones entre los captions de nombres y fechas comprobados. Una rotación emulada con drawer abierto también pasó.
- Se repitieron las regresiones del implementador para R2, R4, R5, R6, R8 y alcance de personajes: todas terminaron con código 0. Esto incluye R5 **después de esperar a la estabilización**, no su primer render.
- Se añadieron pruebas independientes de carga de fuentes, render con fuente retenida y expansión tentativa de agregados superiores.

La matriz geométrica marca algunos rectángulos de personajes que cruzan el eje sticky al recorrer un lienzo más alto que la ventana. No los considero nuevas colisiones permanentes: las pruebas de alcance y de revelar controles mediante scroll pasan. La lista de candidatos geométricos por sí sola no demuestra que un control sea inaccesible.

Entorno: Chromium/Playwright local, tour omitido con `lt-onboarding-v2=done`. No son pruebas en Safari iOS/Android físicos ni certificación de todos los sucesos en todas las combinaciones posibles. El tema oscuro no tuvo una nueva matriz completa en esta revisión.

## 2. P1 — Sigue faltando expansión en las filas superiores

### Caso reproducido

Abrir `linea-paralela.html#vista=comparar&filas=sem` a **1920 × 1080**, dejar terminar la carga y observar la fila superior. Mantiene seis agregados de 2, 3, 9, 2, 13 y 2 sucesos. El layout dispone de **744 px** para la región inferior.

Se hizo una prueba más fuerte que mirar el espacio en blanco: sustituir cada agregado, de forma independiente y solo en memoria, por sus miembros y ejecutar el distribuidor actual de pistas. Para el grupo con IDs **257 y 429**, la altura de su bloque pasa de 63 a 117 px: necesita **54 px adicionales**. Al descontarlos del presupuesto, los sucesos residuales inferiores **siguen entrando desplegados**. Lo mismo sucede con el grupo de IDs 132 y 437.

Otros candidatos individuales necesitan 108 o 432 px y también dejan los sucesos inferiores desplegados. Estos ensayos son independientes; no significa que todos los costes se puedan sumar ni que todos los grupos quepan simultáneamente.

Evidencias: [captura estable](auditoria-tercera/sem-stable-1920.png), `expandable` en [probes.json](auditoria-tercera/probes.json).

### Causa y carencia de la prueba actual

`densifyPointPeople()` sigue agrupando la última semana según X sin recibir presupuesto vertical. Los grupos curados se mantienen en `fixed`. La mejora por componentes se implementó en `layoutLooseExpanded()`, es decir, en los sucesos sueltos.

`run-r3.cjs` registra `agregadosDeFila`, pero sus aserciones de expansión examinan `zonaAgregados` y `zonaSueltos`. Por eso puede pasar mientras los seis agregados superiores continúan cerrados. Además, un umbral como «más de 200 px libres» no demuestra por sí mismo que un componente cabe: hay que intentar la colocación con sus dimensiones reales.

### Implementación requerida

1. Mantener la deduplicación que ya funciona. No volver a mostrar los miembros abajo como sustituto de abrir el grupo de arriba.
2. Pasar al resolvedor los miembros de agregados superiores y su región semántica. Distinguir grupo curado de agregado visual: un encabezado narrativo puede conservarse mientras se muestran sus hijos.
3. Calcular el coste real de reemplazar un agregado por sus miembros, incluyendo ancho de captions, alto de pistas y espacio que necesita la zona residual.
4. Si la sustitución cabe sin colisión, incorporarla al plan y recalcular el presupuesto restante. Repetir de forma determinista para otros candidatos.
5. Aplicar una política estable de selección —por ejemplo, cantidad de títulos revelados por altura adicional, con desempate por fecha/ID— e histéresis para evitar saltos al variar un píxel.
6. Detenerse cuando ningún agregado compatible admita una sustitución válida. No agrupar solo porque sus miembros comparten fecha: se pueden separar en Y sin falsear X.

**Aceptación:** el grupo 257/429 se despliega en el escenario anterior sin duplicados ni ocultar la zona residual. Una prueba debe fallar si cualquier agregado de fila conserva una sustitución válida. Examinar todos los grupos, no solo la zona suelta.

## 3. P1 — El salto inicial no es exclusivamente un reflujo de fuentes

### Qué confirman las mediciones

En la carga normal a 1440 × 1080, Jueces, el gráfico cambia **877 → 772 px**. En esa ejecución ocurrió aproximadamente entre 148 y 335 ms; el contenedor permaneció en 824 px. Retrasando 800 ms el CSS de Google Fonts, el cambio se pospuso hasta alrededor de 1,15 s. Eso explica por qué parece causado por la fuente: su finalización dispara un render.

Pero la correlación no identifica la causa del error inicial.

### Prueba controlada sin tipografía web

Se mantuvo pendiente la petición de Google Fonts y se ejecutó un segundo render **antes de liberarla**:

- Antes: cero fuentes web registradas, contenedor 824 px, gráfico 877 px, `freeBelow=781`.
- Después: cero fuentes web registradas, contenedor 824 px, gráfico 772 px, `freeBelow=676`.
- El ancho del caption observado se mantuvo en 200 px.

No entró una nueva fuente entre ambos estados. Por tanto, los **105 px** también se corrigen sin cambiar métricas tipográficas. La notificación de fuentes está actuando como disparador accidental de un recálculo que ya era necesario.

La recarga en el mismo contexto también registró 877 → 772 px, aunque mucho antes, alrededor de 60 ms. No sostendría la afirmación general «con caché no hay salto» con estos resultados. No se deduce una caché perfecta de todos los recursos a partir de esa recarga.

Evidencias: [traza de fuentes](auditoria-tercera/fonts.json) y `noFontManualRender` en [probes.json](auditoria-tercera/probes.json).

### Causa en la inicialización

El primer `safeRender()` se ejecuta **antes** de instalar `observarContenedor()`. El render mide el área, construye la vista y actualiza el contador/controles. Cuando se inicializa el observador, `contenedorCambio()` toma como primera referencia el tamaño que ya quedó acomodado. No lo compara con el tamaño que utilizó el primer layout.

Un contenedor igual en las dos fotografías posteriores no descarta R5: el primer cálculo puede haber usado una medida anterior a ambas. La regresión actual espera `document.fonts.ready` y 450 ms; para entonces el recálculo ya tapó el fallo.

### Implementación requerida

1. Preparar controles y contador antes de la primera medición geométrica, o reservarles un espacio estable.
2. Registrar en `lastLayout` las dimensiones efectivamente consumidas por el cálculo, por ejemplo `measuredViewportWidth/Height`.
3. Compararlas con el contenedor real después de aplicar el resultado. Si cambiaron, recalcular de forma acotada antes de presentar la geometría como definitiva. La primera observación no debe aceptar como válido un plan construido con otra medida.
4. Instalar la observación a tiempo o programar explícitamente una primera convergencia independiente de `document.fonts`. Evitar encadenar renders ilimitados; comparar dimensiones y agrupar invalidaciones por frame.
5. Conservar la invalidación de métricas cuando sí cambia una fuente. Eliminarla para esconder el salto dejaría anchos erróneos, tal como advirtió el implementador.
6. Añadir una prueba con el CSS tipográfico retenido o fallido: el primer estado presentado debe converger por sí mismo. Otra debe comprobar idempotencia **sin esperar la llegada de la fuente**.

**Aceptación:** ningún segundo render con el mismo viewport y la misma fuente modifica el alto 105 px; el comportamiento correcto no depende de que Google Fonts responda. Después medir por separado el desplazamiento residual atribuible a un cambio real de fuente.

### Sobre la decisión de rendimiento

Cargar fuentes sin bloquear puede ser razonable, y recalcular sus medidas es correcto. Lo que no corresponde es aceptar estos 105 px como coste inevitable de esa decisión, porque la prueba aislada reproduce el cambio sin tipografía nueva.

Una vez corregida la inicialización, si queda movimiento por cambio real de fuente, decidir entre fuente estable para el gráfico, métricas de reserva más próximas o una presentación inicial que reserve geometría. Mantener el rango/foco del usuario al recalcular. No hace falta bloquear toda la página ni renunciar a la carga diferida para corregir el defecto demostrado.

## 4. P2 — «Roma» se superpone al título de un suceso

### Caso reproducido

Última semana, 1920 × 1080. La etiqueta de la potencia «Roma» cae encima de «Arreglos para la Pascua».

Rectángulos medidos:

- «Roma»: X 932,91–983,09; Y 130,78–143,42.
- Título: X 918,84–1072,84; Y 132,06–145,86.
- `.pot-strip`: **alto 0 px**; su banda hija absoluta mide 28 px.

La intersección es visible en la [captura de la última semana](auditoria-tercera/sem-stable-1920.png). Geometría de la franja en [band-overlap.json](auditoria-tercera/band-overlap.json).

### Causa y corrección

El código reserva `L.potStrip` en `topOffset`/`yOff`, pero el elemento `.pot-strip` emitido solo tiene ancho; no posee una altura propia que reserve esos 28 px en el flujo DOM. Las bandas y su etiqueta se dibujan sobre la primera fila.

1. Dar a `.pot-strip` altura explícita coherente con `L.potStrip` y un bloque de posicionamiento propio; si participa en flex, impedir que se contraiga.
2. Alinear el desplazamiento real de las filas con `rowMap`, conexiones, total de altura y exportación. Evitar añadir dos veces la misma reserva.
3. Verificar la combinación con `phaseH` de waterfall y el toggle de imperios.
4. Extender las pruebas de texto a `.band-label`, etiquetas de imperios y otros rótulos auxiliares. Las matrices de nombres/fechas solas no detectan esta colisión.

**Aceptación:** franja con alto real cuando está activa; título del primer suceso fuera de su rectángulo; al desactivarla se recupera exactamente ese espacio.

## 5. Plan de cierre

1. Corregir inicialización y altura real de la franja de imperios. Son la base para que el presupuesto de espacio sea fiable.
2. Incorporar la expansión de agregados superiores usando ese presupuesto y probar 257/429.
3. Agregar las tres regresiones independientes anteriores, incluidas fuentes retenidas y etiquetas auxiliares.
4. Repetir la matriz de clics, escala de texto, acceso a personajes y «En línea». Mantener las correcciones que ya pasan.
5. Medir nuevamente carga fría y recarga; separar cambios de contenedor de cambios de métricas de fuente.
6. Completar Safari iOS y Android físicos antes de declarar cobertura de dispositivos. Su ausencia no invalida las pruebas Chromium, pero tampoco permite afirmar que esos entornos funcionan perfectamente.

No recomiendo reabrir indiscriminadamente R1–R9: hay avances verificables. El foco pendiente es **convergencia inicial, expansión global y reserva de las etiquetas de contexto**.

## 6. Reproducción y archivos

Con el servidor local activo:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Ejecutar en otra terminal:

```powershell
node scripts/run_tests.js
node docs/auditoria-tercera/run-probes.cjs
node docs/auditoria-tercera/run-fonts.cjs
node docs/auditoria-tercera/run-browser.cjs
node docs/auditoria-tercera/run-interactions.cjs
node docs/auditoria-tercera/run-variants.cjs
```

Los scripts usan Playwright local. `run-probes.cjs` expone funciones solo en la respuesta JavaScript de su pestaña de prueba y evalúa sustituciones en memoria; no cambia la aplicación. Sus mediciones de expansión son ensayos independientes. `run-fonts.cjs` usa una navegación normal y una recarga en el mismo contexto sin interceptar recursos; el retraso artificial del CSS se prueba en un contexto separado.

Resultados complementarios: [interacciones](auditoria-tercera/interactions.json), [variantes](auditoria-tercera/variants.json), [matriz geométrica](auditoria-tercera/browser-metrics.json), [regresiones repetidas](auditoria-tercera/regressions.json).
