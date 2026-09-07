# Segunda auditoría: renderizado, interacción y aprovechamiento del espacio

Base: `ad4141e`, archivos actuales del proyecto. Fecha: 7 de septiembre de 2026.

**Nota de concurrencia:** durante la auditoría aparecieron cambios ajenos en datos generados, el merge de libros, documentación y el listado de tests. El cambio observado en `linea-paralela.html` fue la versión del recurso de datos (`3338ede3` → `1de44684`), no las reglas de layout aquí examinadas. No se tocaron esos cambios. Las métricas son fotografías de las ejecuciones guardadas; repetir los scripts después de terminar la edición concurrente para fijar una nueva línea base de datos. El resultado de 15 pruebas corresponde a la batería existente al iniciar esta revisión.

## Estado al cerrar (7 de septiembre de 2026)

R1–R9 están implementados y verificados. Lo que sigue es el resultado de repetir
la batería completa con el código final, más lo que quedó fuera de alcance.

**Contra la línea base.** Se reconstruyó ejecutando `run-browser.cjs` con los
archivos de `29eb28a`, el commit anterior a la Entrega A, para que la
comparación sea del mismo escenario y no de dos fotos distintas:

| Señal (36 escenarios) | Antes | Ahora |
|---|---|---|
| Intersecciones de texto | 50 | 20 |
| Barras bajo el eje pegajoso | 49 | 18 |
| Barras bajo un marcador | 77 | 34 |
| Solapes en 25 variantes de tipografía | varios a escala 1,4 y 2 | 0 |
| Sucesos repetidos arriba y abajo | 31 | 0 |

**Las 20 intersecciones que quedan no son defectos.** Todas son texto que pasa
por debajo del eje, que es `position:sticky` y **opaco**: lo tapa, no se mezcla
con él. Lo que importaba era que nada quedara oculto de forma permanente, y al
final del scroll hay 0 elementos tapados en los tres tamaños probados. Lo mismo
con las 34 barras «bajo un marcador»: se comprobó que en los cinco anchos
**ningún marcador de una fila cae sobre la barra de otra** (`ajeno=0`), así que
son marcadores sobre su propia barra, que es donde deben estar.

**Una regresión encontrada y corregida en esta misma validación.** Al fundir los
marcadores superpuestos (R2), el control pasó a 28 px y, con el halo táctil de
puntero grueso, ocupaba 64 px. Sobre la barra de Josías (32 px) no quedaba
**ningún** punto donde el clic le llegara: enfocable por teclado, inalcanzable
con el dedo. La línea base tenía 0 casos; con R2 pasaron a 2. Corregido
impidiendo que el halo crezca hacia arriba, que es donde va el nombre. Queda
como invariante permanente en `run-alcance.cjs`.

**Lo que no se resolvió.** En la primera visita, con la fuente todavía sin
cachear, el gráfico se redibuja una vez a los ~100 ms y el alto cambia 105 px.
No es la inestabilidad de R5 —el contenedor mide igual en los dos renders— sino
el reflujo propio de cargar la tipografía sin bloquear, que es una decisión de
rendimiento tomada en el Paso 7. Con la fuente en caché el primer render ya da
el valor final y no hay salto. Antes de R5 no había salto porque la aplicación
se quedaba con el layout calculado con métricas de la fuente de reserva.

**Fuera de alcance.** El punto 4 de la Entrega D —Safari iOS y Android
físicos— no se ejecutó: este entorno solo tiene Chromium. Las variantes se
verificaron en el tema inicial, no en oscuro.

**Cobertura de regresión.** `node scripts/run_tests.js` pasa 19 pruebas, e
incluye ahora `test_alturas.js` (R1, R5), `test_marcadores.js` (R2, R4),
`test_despliegue.js` (R3, R7, R9), `test_tooltips.js` (R6) y `test_en_linea.js`
(R8). En el navegador, `run-r1` … `run-r8` y `run-alcance` pasan limpios; cada
uno se comprobó contra el código anterior para confirmar que falla sin el
arreglo. Las invariantes están descritas en
[Legibilidad de la línea de tiempo](LEGIBILIDAD-TIMELINE.md), §9 a §15.

---

## Dictamen

**La implementación mejoró el producto, pero todavía no cumple por completo lo solicitado.** Los recorridos habituales de paneles funcionan en los tamaños probados. Persisten errores de geometría que hacen que textos se superpongan, tooltips se recorten y un clic alcance un suceso distinto al que ocupa esa posición.

El nuevo despliegue por espacio libre es útil y funciona para algunos sucesos sueltos, pero **no es un sistema global de aprovechamiento del espacio**. Solo considera el rectángulo debajo de las pistas, no expande todos los agregados, duplica algunos sucesos y toma una decisión global de todo o nada. Recomiendo corregir estos puntos antes de considerar terminada la implementación.

Esta auditoría no modifica la aplicación. Los archivos añadidos son este reporte y sus pruebas/evidencias.

## 1. Qué se probó y qué funciona

- Las **15 pruebas existentes** pasan: `node scripts/run_tests.js`.
- **36 escenarios de geometría:** cuatro selecciones (`jue`, `sem`, `jes`, `jud,isr,pro`) en anchos 320, 390, 520, 521, 760, 761, 1024, 1440 y 1920 CSS px. Alto 844 hasta 1024 px de ancho; 1080 en los dos tamaños mayores. Vista Comparar, estilo editorial, configuración inicial. En dispositivos táctiles la aplicación aplica escala de texto 1,2 si no hay preferencia anterior.
- **18 recorridos de interacción:** esos nueve anchos, en Explorar y Comparar, alto 844. Abrir grupo/año o suceso, abrir el detalle desde la lista, volver al grupo donde corresponde, cerrar, abrir filtros y cerrarlos con Escape. Todos esos recorridos finalizaron correctamente. Los drawers medidos no desbordaron horizontalmente.
- **24 variantes de texto:** 390 y 1440 px, editorial/waterfall, compacto/expandido, escalas explícitas 1, 1,4 y 2. Se detectaron colisiones con las escalas mayores.
- Una rotación emulada 390 × 844 → 844 × 390 con detalle abierto: el cierre funcionó.
- Pruebas dirigidas de marcadores superpuestos, tooltip con foco, recálculo del layout, duplicación de IDs y estrés de agregados.

Se usó Chromium mediante Playwright local. Para omitir el tour se configuró su clave **actual**, `lt-onboarding-v2=done`, antes de navegar. No se desactivaron overlays reales de la aplicación para hacer pasar clics. Las pruebas de geometría exponen funciones privadas únicamente en la respuesta JavaScript de la pestaña de prueba; los archivos fuente no se editan.

**Límites:** no equivale a probar cada suceso en cada combinación posible. No se certificaron Safari iOS, Firefox, Android físico ni lectores de pantalla. Las variantes visuales se verificaron en el tema inicial; queda pendiente repetirlas en oscuro. Las intersecciones automáticas de rectángulos son señales de diagnóstico: los hallazgos siguientes se apoyan además en código, capturas o una interacción reproducida. Un fallo de hit-testing en el centro de una barra no implica por sí solo que toda la barra sea inaccesible.

## 2. Correcciones necesarias

### R1 · P1 · La altura de fila no alcanza para el texto y el marcador

**Reproducción:** pantalla táctil 390 × 844, `#vista=comparar&filas=jes`, perfil nuevo con tour omitido. Se superponen «5 sucesos» con «30 E.C.», «14 sucesos» con «31 E.C.» y «22 sucesos» con «32 E.C.». La intersección vertical medida fue de aproximadamente **7,73 px**. También ocurre en otros anchos de la matriz; con escala 1,4 o 2 se reproduce incluso en escritorio.

**Evidencia:** [Ministerio en móvil](auditoria-validacion/jes-390.png), [texto al 140 %](auditoria-validacion/font-editorial-140.png), [variantes](auditoria-validacion/variants.json).

**Causa:** `layoutMetrics()` (`linea-paralela.js:198`) mantiene 54 px; `trackRowHeight()` (`:1786`) devuelve esa altura fija en compacto. `renderPointEventBar()` (`:4064`) coloca nombre, pin de grupo de 24 px, fechas y separaciones. Con texto aumentado, el contenido excede la fila; `overflow:visible` deja invadir la siguiente y el final de `.lane-block` recorta el último texto.

**Qué implementar:**

1. Calcular `requiredHeight` por representación: alto real del nombre + pin/barra + fecha/contador + gaps + padding + margen de foco/hover.
2. La altura de una pista será el máximo de sus elementos. Aplicar esas alturas a filas, fondos, eje, conexiones, exportación, `rowMap` y cálculo de espacio restante.
3. Compartir fuente, escala y tamaños entre medición y CSS. No resolverlo solo aumentando de 54 a otro número fijo: escala 2 y títulos de dos líneas volverán a romperlo.
4. Validar fuentes cargadas y fallback. Recalcular ante cambios de fuente o escala.

**Aceptación:** nombre, contador y fecha de filas distintas no se intersectan en ninguna escala ofrecida; el primer y último elemento del carril permanecen legibles; hover/foco tampoco los recorta.

### R2 · P1 · Marcadores coincidentes abren otro suceso

**Reproducción confirmada:** 1920 × 1080, `#vista=comparar&filas=jud,isr,pro`. El centro de `.evt-marker[data-ev="75"]` de la primera aparición, «Ezequías y Senaquerib», recibe el clic en el marcador 354, «Senaquerib invade a Judá». Coordenadas medidas del clic: aproximadamente **1034,44 / 257,78**. El drawer efectivamente abrió el segundo título.

**Evidencia:** [resultado del clic](auditoria-validacion/wrong-marker.png), `markerClick` en [pruebas dirigidas](auditoria-validacion/targeted.json).

**Causa:** `renderRowEventMarkers()` (`linea-paralela.js:566`) proyecta cada suceso directamente sobre la barra. La agrupación y distribución de sucesos sueltos no protege estos marcadores. La delegación de clic funciona, pero el navegador alcanza el nodo que quedó encima. Aumentar su zona táctil puede empeorar la competencia entre objetivos.

**Qué implementar:** aplicar el mismo resolvedor de ocupación a marcadores sobre personajes. Si caben en subfilas, distribuirlos sin cambiar su fecha X; si no, crear un control agregado que abra todos sus miembros. Mantener la barra de la persona con una zona propia accesible. Definir explícitamente si la repetición de un suceso sobre dos personajes es una relación intencional; no contar esa repetición como dos sucesos.

**Aceptación:** cada suceso mostrado individualmente tiene una zona exclusiva de activación; si comparte posición, el único control en ella se identifica como agregado. Comprobar clic y tap reales con `elementFromPoint`, no `dispatchEvent` ni clic forzado. Validar identidad del título/ID abierto, no solo existencia de `.on` en el panel.

### R3 · P1 · Los agregados no se expanden de forma global aunque haya espacio

**Reproducción:** 1920 × 1080, `#vista=comparar&filas=sem`. `lastLayout.freeBelow` informa **809 px**. La zona inferior se declara «expandido», pero arriba siguen **seis agregados** con 2, 3, 9, 2, 13 y 2 sucesos. La captura muestra ambos comportamientos al mismo tiempo.

**Evidencia:** [Última semana en pantalla grande](auditoria-validacion/sem-1920.png), `duplicates` en [targeted.json](auditoria-validacion/targeted.json).

**Causa:** `densifyPointPeople()` (`linea-paralela.js:1337`) agrupa la última semana por proximidad horizontal sin recibir presupuesto de altura. Los grupos no visuales se colocan en `fixed`. Solo `layoutLooseEventLanes()` (`:2562`) intenta expandir usando `availH`.

**Qué implementar:** construir un plan único de representación para la vista: barras de duración, sucesos individuales y agregados. Primero intentar ubicar miembros individuales en el área temporal compatible; crear agregados únicamente para componentes que no caben. Diferenciar el encabezado de un grupo curado de un agregado por falta de espacio: el encabezado puede mantenerse como orientación mientras sus hijos se despliegan, sin duplicar marcadores.

**Aceptación:** aumentar alto o ancho puede expandir también los agregados del carril superior. No basta con que `looseMode` diga «expandido»; comprobar todos los agregados visibles y la ocupación que impide abrir cada uno.

### R4 · P1 · La vista dibuja sucesos repetidos en grupos y zona inferior

**Reproducción:** el caso anterior contiene **31 IDs** presentes tanto dentro de los seis agregados superiores como entre los sucesos sueltos. Por ejemplo, 126 y 250 están en el agregado de dos y vuelven a aparecer abajo. En el ministerio también conviven grupos anuales con una zona inferior amplia de sucesos.

**Causa:** `collectLooseEvents()` (`linea-paralela.js:2490`) excluye sucesos vinculados a personajes activos, pero no resta los ya representados por filas de evento o miembros de grupos. El conjunto `activePeople` usado por el render no es un registro global de cobertura visual.

**Qué implementar:** obtener `representedEventIds` del plan de filas, incluyendo `pe.ev.id` y todos los miembros de `groupEvents`. Restarlos al construir la zona residual. Mejor aún, asignar cada suceso a una representación antes de renderizar, en vez de deducir qué quedó después de construir HTML.

**Aceptación:** en una misma capa de exploración, cada ID aparece individualmente o dentro de un agregado, nunca en ambos. Si el modo Comparar muestra intencionalmente un suceso sobre varias personas, documentar esa excepción y conservar conteos únicos. La solución no debe limitarse a esconder la copia individual: primero implementar R3 para que exista expansión real.

### R5 · P1 · El presupuesto de espacio puede quedar obsoleto y el eje tapa elementos

**Reproducción:** 1440 × 1080, `#vista=comparar&filas=jue`. Después de la carga se midió: área visible 824 px, `freeBelow=781` y gráfico de 877 px. Ejecutar un render adicional, sin cambiar datos ni ventana, produjo `freeBelow=676` y gráfico de 772 px. La diferencia es **105 px**. En el estado inicial hay candidatos cuyo centro cae bajo el eje sticky, como «Asamblea de Siquem» en esa configuración.

**Evidencia:** `relayout` en [targeted.json](auditoria-validacion/targeted.json); candidatos del hit-testing en [browser-metrics.json](auditoria-validacion/browser-metrics.json).

**Causa:** se mide `chartScroll.clientHeight` y se calcula `freeBelow` (`linea-paralela.js:4445`) antes de actualizar el contador (`:4641`). El texto del contador puede hacer envolver el encabezado, cambiando la altura disponible. También influyen fuentes y otros cambios internos. Se escucha `window.resize` (`:5320`), pero no el cambio efectivo del contenedor. `.axis-area` es sticky y tiene `z-index:30` (`linea-paralela.html:671`).

**Qué implementar:**

1. Estabilizar controles/contador antes de medir el área de dibujo, o darles una geometría que no dependa del resultado del render.
2. Observar el contenedor con `ResizeObserver`; reagrupar solo cuando sus dimensiones efectivas cambien. Incorporar `document.fonts.ready`/carga posterior y escala al proceso de invalidación.
3. Medir el espacio útil descontando eje y otras superficies superpuestas. Asegurar reserva inferior y `scroll-padding` para que foco y desplazamiento puedan revelar el elemento completo.
4. Evitar bucles contador → altura → contador: separar la presentación del estado, agrupar cambios por frame y comparar dimensiones antes de recalcular.

**Aceptación:** dos layouts consecutivos sin entradas nuevas dan el mismo resultado. Los centros de controles que se presentan como visibles no están interceptados por el eje. Los cambios internos de altura se resuelven sin exigir redimensionar manualmente la ventana.

### R6 · P2 · Los tooltips todavía son recortados por el carril

**Reproducción:** 1440 × 900, Jueces. Dar foco a los marcadores de Débora, Gedeón o Sansón. El tooltip se coloca debajo para evitar el borde superior del gráfico, pero su parte inferior excede el carril y se recorta. Se verificó también después de esperar a que terminara la transición.

**Evidencia:** [tooltip con foco](auditoria-validacion/tooltip-focus.png) y sección `tooltips` de [targeted.json](auditoria-validacion/targeted.json).

**Causa:** `placeCssTip()`/`cssTipPlacement()` (`linea-paralela.js:3071–3086`) usan los límites de `chartScroll`, pero el tooltip está dentro de `.lane-block{overflow:hidden}` (`linea-paralela.html:423`). El `z-index` no permite escapar de ese recorte. Además, el tooltip CSS usa una línea con ellipsis; no siempre permite recuperar el título completo que ya se truncó en la gráfica.

**Qué implementar:** preferentemente unificar los tooltips en una capa flotante fuera de los contenedores recortados. Medir y posicionar respecto del viewport útil, permitir varias líneas, limitar ancho y alto, actualizar al hacer scroll/zoom y ocultar al abrir un panel. Conservar una relación accesible con el disparador. Si se mantienen tooltips interiores, calcular la intersección de todos los ancestros que recortan, no solo el viewport.

`moveTip()` también debe acotar coordenadas por ambos extremos: invertir de derecha a izquierda no garantiza `left >= 0` con un tooltip grande. Validar bordes y texto extenso.

**Aceptación:** todo el título se puede leer; no hay recorte contra carril, borde de pantalla ni eje. Hover y foco ofrecen el mismo contenido; tap sigue abriendo directamente el detalle.

### R7 · P2 · Los textos siguen usando límites fijos aunque haya espacio horizontal

**Evidencia:** la zona suelta mantiene títulos de **10 px**, una línea y `max-width:108px` (`linea-paralela.html:537`). En la captura de 1920 px quedan títulos recortados y grandes huecos laterales. La decisión de desplegar mide separación de centros con `LOOSE_EVT_GAP_PX=92`, no el rectángulo pintado después de ajustar el caption contra el borde.

**Consecuencia:** «desplegado» no equivale a «legible». Además, dos cajas de 108 px con centros separados 92 px pueden solaparse 16 px si comparten nivel; los corrimientos de borde modifican aún más la geometría. Este último cálculo describe un caso posible del algoritmo, no una colisión real adicional medida en la matriz.

**Qué implementar:** reservar rectángulos de etiqueta medidos, con un ancho asignado según el hueco hasta vecinos/obstáculos. Permitir dos líneas y aumentar el ancho cuando haya lugar; usar una fuente legible coherente con el control de escala. Recalcular alto por R1. Cuando el texto se desplace respecto del punto, mantener una conexión corta y clara con su fecha. No agrandar indiscriminadamente todas las etiquetas ni mover fechas históricas.

**Aceptación:** el ancho disponible se aprovecha antes de truncar. Las pruebas comparan el área pintada de etiquetas y objetivos, después de todos los corrimientos CSS, no solo distancias entre fechas.

### R8 · P2 · «En línea» desde un grupo deja el gráfico cubierto

**Reproducción:** abrir el grupo 32 E. C. y pulsar «En línea» en una fila. La acción termina con `drawer.on=true` y `chart-wrap[inert]=true`. El usuario sigue viendo el panel que cubre el resultado de la acción.

**Causa:** el callback del explorador del drawer llama a `showEventOnChart()` (`linea-paralela.js:3301`) sin cerrar/cambiar la presentación del panel. Su búsqueda posterior de `[data-ev]` tampoco contempla que el evento siga dentro de un agregado.

**Qué implementar:** conservar estado de retorno, cerrar o acoplar el panel de forma que el gráfico sea visible, activar Comparar, enfocar el rango, esperar al layout definitivo y revelar la representación del ID. Si está agrupado, expandir localmente si cabe o seleccionar el agregado y anunciarlo. Restaurar el foco en ese control y ofrecer regreso a la lista.

**Aceptación:** «En línea» termina mostrando y enfocando una representación identificable del suceso, tanto desde Explorar como desde un grupo abierto en drawer.

### R9 · P2 · El fallback de densidad puede superponer agregados

**Prueba de estrés, no defecto observado con 351 sucesos reales:** 351 eventos sintéticos en la misma fecha, sin altura disponible. Se produjeron ocho agregados, pero los niveles fueron `0,1,-1,2,-2,3,-3,0`: dos controles en la misma posición. Se conservaron los 351 IDs, por lo que una prueba de cobertura sola pasa aunque la interacción sea ambigua.

**Causa:** `layoutLooseEventLanes()` asigna nivel 0 cuando no encuentra lugar; `maxMembers=50` puede generar más grupos que slots. `enforceTrackBudget()` (`timeline-density.js:146`) no garantiza un límite geométrico de pistas: trabaja con cantidades/umbrales aproximados.

**Qué implementar:** nunca aceptar una colocación que ya se sabe que colisiona. Fusionar el componente congestionado en un único agregado con lista paginada, o reservar otra fila si el presupuesto lo permite. El tamaño de página de la lista no debe limitar artificialmente la cantidad de miembros del agregado visual. Devolver un estado explícito «no cabe» si no existe una colocación válida.

**Aceptación:** además de cobertura, cero intersecciones de controles que compitan por el mismo gesto. Probar 1, 50, 51, 350 y 351 eventos coincidentes, y varias concentraciones separadas.

## 3. Evaluación concreta del método de espacio libre

### Lo correcto

`layoutLooseExpanded()` prueba filas adicionales antes de agrupar; `fanLevels()` devuelve si la colocación pudo resolverse; las fechas X se conservan. El caso de Jueces puede mostrar sus nueve sucesos sueltos de forma individual. Este trabajo se puede reutilizar.

### Lo que falta para satisfacer el requisito

1. **Cobertura del método:** expandir marcadores sobre personas, grupos de puntos y grupos temporales desplegables; no solo sucesos sueltos.
2. **Espacio real:** medir después de estabilizar encabezado/fuentes y considerar obstáculos bidimensionales, no solo altura global debajo de todo.
3. **Decisión por zona:** `layoutLooseExpanded()` devuelve `null` si falla un punto. La explicación en el comentario de que mezclar agrupados e individuales confunde no coincide con el requisito actual: deben abrirse los componentes que sí caben. Es válido mostrar una zona densa agrupada junto a otra desagrupada, siempre que el contador lo explique.
4. **Distribución asimétrica:** `looseMaxAbsForBudget()` reserva pares de niveles arriba/abajo; puede descartar una fila útil impar. Calcular slots reales disponibles, no pares obligatorios.
5. **Lectura:** aprovechar huecos para títulos más completos, no solo para dibujar más puntos con texto diminuto.
6. **Estabilidad:** evitar que cada variación de un píxel reorganice todo. Mantener identidad de miembros, posiciones preferidas y umbrales de expansión/colapso diferenciados.

### Diseño recomendado del resolvedor

No hace falta un optimizador global complejo ni una migración de tecnología. Implementar un algoritmo determinista por componentes de conflicto:

1. Construir entidades elegibles con ID, fecha/rango, pertenencia narrativa y representación preferida. Deduplicar antes del layout.
2. Medir ancho/alto real de etiquetas, pin y área interactiva para estilo, fuente y escala actuales.
3. Reservar encabezado, eje, bandas con texto y barras de duración. Representar el espacio ocupado como intervalos X por cada subfila Y.
4. Formar componentes de elementos que compiten por el mismo espacio horizontal. Probar primero cada miembro individual, por fecha y un desempate estable.
5. Usar la primera posición libre válida y cercana a su ancla. Permitir subfilas arriba/abajo y huecos compatibles dentro de la misma sección, con separación semántica clara; un hueco dentro de otro carril no es automáticamente intercambiable.
6. Si un componente no cabe, agregar solo ese componente o la porción que no se puede resolver. Intentar expandir otros agregados independientes con el espacio restante. Priorizar la expansión que revela más títulos por espacio consumido, con desempate estable.
7. Asignar el ancho de cada etiqueta a partir del hueco realmente libre; probar dos líneas antes de truncarla. Aumentar altura y repetir el cálculo local si eso cambia su ocupación.
8. Mantener el conjunto de miembros al ampliar/reducir y evitar saltos mediante histéresis. Nunca desplazar fechas X para simular espacio.
9. Devolver un `layoutPlan` único, consumido por DOM, conexiones, contador, minimapa y exportación. Incluir límites de caja, IDs representados y motivo de agregación.

**Invariantes del plan:** cobertura completa; no extras; no representación doble en la misma capa; controles sin colisión; textos dentro de su espacio; ningún agregado expandible permanece cerrado si existe una colocación válida en su región. Esta última comprobación puede ser local y determinista: intentar insertar sus miembros con el mismo resolvedor y verificar que no existe una solución antes de conservarlo cerrado.

## 4. Orden de implementación para el siguiente agente

### Entrega A · Geometría fiable

1. Ejecutar pruebas existentes y las evidencias de esta auditoría; preservar cambios ajenos.
2. Implementar R1: alturas calculadas por contenido y escala.
3. Implementar R5: medición estable del contenedor, observación de cambios y reserva del eje.
4. Unificar cajas medidas/dibujadas; registrar tamaño de fuente efectivo en las pruebas.

**Debe pasar:** caso ministerio móvil a escala inicial 1,2; escalas 1,4 y 2 en ambos estilos; layout idempotente en Jueces a 1440 × 1080; ninguna zona visible oculta bajo el eje.

### Entrega B · Cobertura y uso del espacio

1. Crear asignación única de IDs y eliminar duplicación R4.
2. Extraer el resolvedor común descrito arriba a `timeline-density.js` o un módulo puro de layout.
3. Aplicar presupuesto a `densifyPointPeople`, a marcadores de personaje y a sucesos sueltos. Sustituir la decisión global todo/nada por decisiones locales.
4. Eliminar fallback que coloca sobre un slot ocupado; separar límite de agregado de paginación de lista.
5. Adaptar anchos/line-wrap R7 y usar alturas nuevas. Conservar encabezados de grupos curados como contexto, sin duplicar hijos.

**Debe pasar:** última semana a 1920 × 1080 sin 31 duplicaciones; aumentar altura revela miembros en las regiones donde caben; componente denso no impide expandir otro; estrés de 351 sin superposición; cobertura inalterada al redimensionar.

### Entrega C · Acciones y tooltips

1. Resolver R2 desde el plan de layout, sin trucos de z-index ni clic forzado.
2. Unificar tooltip exterior, posicionamiento completo y lectura multilínea R6.
3. Implementar «En línea» visible y con foco R8; mantener regreso al grupo y su scroll.
4. Verificar que drag/pinch no se conviertan en clics, que el foco se restaure y que ningún overlay anterior quede activo.

**Debe pasar:** ID 75 no abre silenciosamente ID 354; tooltip de Sansón entero; abrir/listar/volver/cerrar funciona antes y después de cambiar breakpoint; «En línea» revela el objetivo.

### Entrega D · Validación final y documentación

1. Convertir los casos confirmados en pruebas de regresión automatizadas; conservar las pruebas unitarias existentes.
2. Probar estilos, temas y escalas de texto; cubrir los límites 520/521 y 760/761 y la transición táctil relevante.
3. Probar pantalla baja en horizontal, zoom y scroll en ambos ejes, fuentes lentas/fallback y resize con drawer abierto.
4. Ejecutar en Safari iOS y Android reales. Guardar capturas antes/después del mismo estado.
5. Actualizar documentación de legibilidad con las invariantes del plan, no solo con reglas de truncado.

## 5. Cómo reproducir la auditoría

Desde la raíz del proyecto, iniciar en una terminal:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

En otra terminal:

```powershell
node scripts/run_tests.js
node docs/auditoria-validacion/run-browser.cjs
node docs/auditoria-validacion/run-interactions.cjs
node docs/auditoria-validacion/run-targeted.cjs
node docs/auditoria-validacion/run-variants.cjs
```

Y los verificadores por corrección, que fallan con código de salida distinto de
cero en vez de solo registrar observaciones:

```powershell
node docs/auditoria-validacion/run-r1.cjs        # alturas por contenido
node docs/auditoria-validacion/run-r2.cjs        # zonas de clic exclusivas
node docs/auditoria-validacion/run-r3.cjs        # expansión por zona, sin colisiones
node docs/auditoria-validacion/run-r4.cjs        # sin sucesos repetidos
node docs/auditoria-validacion/run-r5.cjs        # layout idempotente
node docs/auditoria-validacion/run-r6.cjs        # tips sin recortar
node docs/auditoria-validacion/run-r7.cjs        # títulos por hueco real
node docs/auditoria-validacion/run-r8.cjs        # «En línea» revela y enfoca
node docs/auditoria-validacion/run-alcance.cjs   # todo personaje se puede pulsar
```

`run-targeted.cjs` se adaptó al DOM actual conservando su intención: el suceso
75 ya no tiene un marcador propio —se pisaba con el 354, que es lo que R2
arregló—, así que la comprobación busca el control que lo *contiene* y verifica
que desde ahí se llegue al 75. El tip dejó de colgar del marcador y se mide
sobre el `#tooltip` flotante.

Los scripts usan el Playwright ya presente en este entorno y escriben evidencia bajo `docs/auditoria-validacion/`. No regeneran los datos ni publican cambios. Los que exponen funciones privadas dependen de los nombres actuales; adaptar el pequeño adaptador de auditoría si se refactorizan, manteniendo la intención de las comprobaciones.

Archivos principales:

- [Métricas de geometría](auditoria-validacion/browser-metrics.json).
- [Recorridos de interacción](auditoria-validacion/interactions.json).
- [Pruebas dirigidas](auditoria-validacion/targeted.json).
- [Variantes de tipografía y distribución](auditoria-validacion/variants.json).

Los scripts de auditoría registran observaciones: no sustituyen todavía una suite de aceptación que falle automáticamente por cada invariante. El agente debe convertir R1–R9 en aserciones, especialmente identidad del suceso abierto, cajas realmente visibles y ausencia de duplicación. Conservar IDs en un array o contar nodos no demuestra que todos se puedan leer y pulsar.
