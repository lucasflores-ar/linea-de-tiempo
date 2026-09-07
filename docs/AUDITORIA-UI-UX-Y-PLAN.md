# Auditoría UI/UX y plan de implementación

Fecha: 7 de septiembre de 2026. Base revisada: commit `5e3cfa4` y archivos presentes en el directorio de trabajo.

## 1. Recomendación principal

La solución al exceso de sucesos es una navegación de **resumen temporal → lista completa del intervalo → detalle del suceso**. La línea gráfica permite orientarse y comparar; la lista permite leer y acceder a todos los elementos. En móvil, recomiendo que esa lista sea la vista inicial, acompañada de un resumen temporal pequeño y un acceso explícito a «Comparar en línea».

No hace falta cambiar de framework ni rehacer la base de datos para conseguirlo. Conviene reutilizar la cronología actual, sus grupos curados y sus paneles de detalle, separando gradualmente selección de datos, distribución visual y navegación.

**Orden recomendado:** corregir fiabilidad y acceso por teclado; construir la lista completa y su navegación de retorno; incorporarla a móvil; después extender la agrupación visual por densidad. Así cada entrega mejora el producto aunque la siguiente todavía no exista.

## 2. Alcance y comprobaciones

Se revisaron `index.html`, `linea-paralela.html`, `linea-paralela.js`, `fichas.html`, datos generados, documentación de legibilidad, generador y pipeline, y pruebas existentes. La entrada real es `index.html`, que redirige a `linea-paralela.html`; la visualización activa es HTML/CSS/JavaScript propio. El archivo de vis-timeline en `vendor/` no es el motor de esta pantalla.

Se ejecutó Chromium local mediante Playwright ya disponible en `node_modules`, con perfiles nuevos, interfaz editorial, distribución compacta y Auto. Se omitió el tour guardando `lt-onboarding-v1=1`. Se probaron ocho combinaciones: pantallas de 1440 × 900 y 390 × 844, y selecciones `jes`, `sem`, `nt-car`, `jud,isr,pro`. No hubo errores JavaScript de página en esos ocho escenarios. También se comprobó la apertura táctil de un grupo y se simuló un fallo de descarga del detalle.

Pruebas existentes ejecutadas:

- `node scripts/tests/test_par.js`: PASS.
- `node scripts/tests/test_vis.js`: PASS; omite la vista antigua porque ahora es una redirección.
- `node scripts/tests/test_fichas.js`: PASS.

Son pruebas con DOM simulado: su éxito no demuestra ausencia de colisiones, buena ergonomía táctil ni accesibilidad completa.

No se regeneraron datos, publicaron cambios ni modificaron archivos de la aplicación. Se respetaron los archivos previamente modificados/no seguidos. No se auditó la exactitud histórica o doctrinal del contenido. Las pruebas móviles son emulación Chromium, no validación en dispositivos iOS/Android reales; no se midieron Core Web Vitals de producción ni se realizó un estudio con usuarios o una certificación WCAG.

### Datos actuales y concentración

- 433 sucesos, 99 registros de personajes de la cronología y 12.675 preguntas en el detalle. El visor independiente contiene 233 fichas.
- Recuento global por `fa`, sin filtros y sin subdividir por día: 33 E. C. tiene 45 sucesos; 32 tiene 42; 31 tiene 22; 30 tiene 14. Estos cuatro años concentran 123 de 433 sucesos, aproximadamente el 28,4 %.
- En el grupo específico «32 E.C.» del ministerio hay **41 sucesos**; no confundir ese subconjunto con los 42 registros globales del año.
- Carga inicial de datos: 204.464 bytes. Detalle: 3.550.327 bytes. JavaScript principal: 169.881 bytes. Fichas: 216.182 bytes. Son tamaños de archivo sin compresión, no transferencia medida.

### Dimensiones observadas

En escritorio, el área visible del gráfico medía 1440 × 693 px:

- Ministerio: gráfico 1436 × 697 px, 4 pistas.
- Última semana: 1436 × 798 px, 14 pistas.
- Cartas: 1436 × 1140 px, 13 pistas.
- Judá + Israel + profetas: 1436 × 1714 px, 21 pistas.

En móvil, el área visible medía 390 × 682 px:

- Ministerio: gráfico 780 × 686 px, 5 pistas.
- Última semana: 960 × 852 px, 15 pistas; requiere recorrer un ancho equivalente a 2,46 pantallas.
- Cartas: 780 × 1524 px, 18 pistas.
- Judá + Israel + profetas: 720 × 2660 px, 35 pistas; casi cuatro alturas del área visible.

No se observó desbordamiento horizontal del documento completo: el desplazamiento está dentro del gráfico. El problema es la exploración bidimensional, los títulos parcialmente fuera de la ventana y la dificultad para saber qué queda por revisar.

Capturas de evidencia, con rutas relativas a este informe:

- [Última semana, móvil](auditoria-uiux/sem-390.png).
- [Ministerio, escritorio](auditoria-uiux/jes-1440.png).
- [Última semana, escritorio](auditoria-uiux/sem-1440.png).
- [Ministerio, móvil](auditoria-uiux/jes-390.png).
- [Grupo de 32 E. C., móvil](auditoria-uiux/grupo-32-mobile.png).

## 3. Lo que conviene conservar

- Identidad editorial, paleta relativamente contenida y distinción visual entre periodos y sucesos.
- Datos curados, referencias, fechas estimadas y agrupaciones temáticas existentes.
- Carga diferida del detalle, búsqueda con normalización, minimapa, selección por carriles y enlaces a sucesos.
- Distribución según ocupación visual: `layoutBlockTracks()` considera el ancho de las etiquetas, no solamente la fecha.
- Acceso Enter/Espacio en muchas barras; el drawer principal ya mueve el foco, contiene Tab y lo devuelve al cerrar. Mejorar lo incompleto sin sustituir estas protecciones por una implementación inferior.
- La agrupación anual de `buildMinisterioBlocks()` ya existe: extender y mejorar esa base evita implementar un segundo sistema incompatible.

## 4. Hallazgos priorizados

P1 = resolver en las primeras entregas por afectar el acceso al contenido o su fiabilidad. P2 = mejora importante posterior. P3 = optimización condicionada a medición. No se encontró evidencia para declarar un incidente crítico de seguridad.

### H1 · P1 · La densidad se transforma en altura, no en una exploración más clara

**Evidencia:** `layoutBlockTracks()` crea pistas adicionales ante colisiones; `layoutLooseEventLanes()` agrega niveles verticales y su altura requerida puede superar el espacio disponible. Los mínimos de `minChartWidth()` son 720–960 px, incluso en una pantalla de 390 px. Auto no significa ajustar todo al ancho real.

**Impacto:** más desplazamiento en dos direcciones; se pierde la relación entre contenido y eje. El truncado y el recorte protegen el layout, pero no permiten leer todos los títulos simultáneamente.

**Propuesta:** limitar la complejidad de la vista general mediante agregados visuales con contador y acceso a lista completa. Mantener la comparación detallada y su desplazamiento como opción explícita. No resolverlo reduciendo más la tipografía ni desplazando fechas para que quepan.

### H2 · P1 · Los grupos reúnen contenido, pero el siguiente nivel sigue sobrecargado

**Evidencia:** «32 E.C.» abre 41 filas en `openEventGroupDrawerFill()`, mezcladas con metadatos, contexto y preguntas del grupo. Al entrar a un suceso se reemplaza ese contenido y no hay una pila explícita para regresar al grupo con su posición de lectura.

**Propuesta:** el panel del grupo debe ser un explorador: título, cantidad, búsqueda local y lista cronológica. Priorizar las filas de sucesos; desplazar preguntas colectivas a una sección opcional. Al abrir uno, ofrecer «Volver a los 41 sucesos» y conservar scroll, filtros y foco. No truncar títulos en la lista.

### H3 · P1 · Dos toques para abrir contenido en móvil

**Evidencia:** `activateWithTouchTip()` usa el primer toque para tooltip y el segundo para detalle. Reproducido en el grupo de 32 E. C.: el primer toque no abrió el drawer y el segundo sí.

**Propuesta:** un toque abre el grupo o detalle; hover puede seguir mostrando una ayuda en escritorio. El gesto de arrastre debe cancelar la activación al superar un umbral de movimiento. El usuario debe poder elegir un evento de la lista sin precisión sobre puntos diminutos.

### H4 · P1 · Los sucesos de un grupo no son controles de teclado

**Evidencia:** `openEventGroupDrawerFill()` genera `div.rel-edge` y añade solamente `onclick`, sin `tabindex` ni manejo de teclado. Que la barra inicial sea accesible no hace accesibles las 41 opciones interiores.

**Propuesta:** usar enlaces si tienen URL de destino o botones para cambiar el contenido; títulos y fechas como nombre accesible. Revisar también relaciones del drawer, panel de filtros, búsqueda y drawer de fichas. En filtros, `setSheet()` mueve el foco, pero el cierre depende de clases CSS: verificar y corregir que los controles cerrados no sean enfocables. No afirmar que toda la aplicación carece de gestión de foco: el drawer principal sí tiene una implementación parcial útil.

### H5 · P1 · Un error de red se presenta como ausencia de contenido

**Evidencia:** en `ensureDetailLoaded()`, el `catch` marca `detailLoaded=true` y mantiene la promesa resuelta. Simulando fallo de `linea-tiempo-detalle.json`, se mostró «Sin descripción.»; abrir otro detalle mantuvo el número de solicitudes en uno. `ensureFichasLoaded()` también conserva una promesa resuelta tras error.

**Propuesta:** estados `idle/loading/ready/error`, mensaje visible y «Reintentar». Conservar el título y fecha del paquete inicial. Marcar ready solo después de validar y cargar; reiniciar la promesa fallida y distinguir datos vacíos de datos no descargados. Evitar que una respuesta tardía reemplace el suceso que el usuario acaba de seleccionar.

### H6 · P2 · Contadores y escala dan mensajes incorrectos o ambiguos

**Evidencia:** el ministerio muestra «6 personajes» cuando son seis filas/grupos; la última semana muestra «35 personajes». El contador usa `selectedRows`, que también incluye `isEvent`. Los marcadores pueden representar varias apariciones del mismo suceso.

`updateZoomUi()` calcula `span2 / chartW`, es decir **años por píxel**, y lo presenta como `px/año`. El valor también se propaga a condiciones de etiquetas: no basta con cambiar la leyenda sin revisar los consumidores.

**Propuesta:** separar sucesos únicos, personajes, grupos y elementos filtrados. Mostrar «41 sucesos en este año» o «23 resultados». Nombrar las magnitudes `pixelsPerYear = chartW/span` y `yearsPerPixel = span/chartW`; revisar umbrales y zoom. En el producto usar «Acercar», «Alejar», «Ver todo» y rango de fechas; dejar las unidades técnicas para diagnóstico.

### H7 · P2 · Compartir no reproduce toda la vista y puede anunciar un éxito falso

**Evidencia:** `syncHash()` guarda carriles y suceso, pero no ventana temporal, consulta, modo ni grupo. Los grupos usan `groupRowSeq`, una identidad dependiente de la construcción, y no tienen enlace compartible. El callback de copia ejecuta `done()` tanto en éxito como en error, e incluso sin Clipboard API.

**Propuesta:** URL versionada y estable para vista, rango, filtros y selección; identidad de grupo derivada de su fuente, por ejemplo `ministerio:32`. Preferir URL explícita sobre preferencias antiguas de localStorage. Usar historial para navegación discreta y reemplazar durante zoom continuo. Mostrar «Enlace copiado» solo tras éxito y ofrecer selección manual ante error.

### H8 · P2 · La presentación de tiempo requiere distinguir fecha, intervalo y orden

**Evidencia:** `chartYear()` usa fracciones derivadas de nisán/iyar; varios hechos solo tienen año. En la captura del ministerio el eje muestra «0», y el grupo de 33 se presenta como «33 e.c. – 33 e.c.» sin un contador útil en la barra.

**Propuesta:** conservar la proyección actual hasta documentar su semántica y validarla. El año cero puede servir en una representación interna documentada, pero no debe aparecer como fecha histórica al lector. Mostrar fecha original (`mcuando`/texto disponible) y precisión. No imponer orden histórico entre hechos cuya única precisión sea el mismo año: usar orden curado cuando exista y aclarar el desempate editorial. «33 E. C. · N sucesos» es mejor que un intervalo visualmente idéntico.

### H9 · P2 · Búsqueda y orientación dependen demasiado del estado de la gráfica

**Evidencia:** se filtran nombres en `enrichLaneData()` y nombres/referencias en `collectLooseEvents()`. La referencia se difiere al JSON de detalle, por lo que su disponibilidad puede cambiar después de abrir un drawer. En móvil la tira de filtros muestra inicialmente chips antiguos aunque se abra una URL de la última semana; el chip activo puede quedar fuera de pantalla. Los vacíos de `render()` recomiendan marcar filas aun cuando la causa puede ser una búsqueda sin coincidencias.

**Propuesta:** distinguir «Buscar en este intervalo» y «Buscar en toda la cronología», con resultados en lista que puedan abrir un suceso aunque su carril no esté activo. Definir un índice inicial pequeño y estable para los campos prometidos; no descargar todas las preguntas para buscar una referencia. Hacer visible periodo activo, conteo y filtros aplicados; llevar el chip seleccionado a la vista. Mensajes específicos con «Limpiar búsqueda»/«Quitar filtros».

### H10 · P2/P3 · Mantenimiento, carga y documentación

**Evidencia:** `render()` reconstruye grandes bloques con `innerHTML` y vuelve a registrar interacciones; búsquedas repetidas recorren datos para personajes y preguntas. No se midió un bloqueo, por lo que esto es riesgo de crecimiento, no un resultado de rendimiento demostrado.

El README todavía describe `index.html` como aplicación completa y menciona `linea-horizontal.html`, ausente, además de cantidades antiguas. `scripts/gen_timeline.py` ya produce el paquete dividido, mientras `split_timeline_bundle.mjs` vuelve a dividir lo que recibe: ejecutarlo sobre datos ya divididos sobrescribiría el detalle con preguntas vacías. Hallazgo por lectura; no se ejecutó ese script destructivo sobre los datos.

**Propuesta:** actualizar documentación, retirar/deprecar el divisor antiguo o hacerlo rechazar entradas `_detailDeferred`. Crear índices en memoria por ID y preguntas por suceso, separar funciones puras y usar delegación de eventos. Medir antes de incorporar virtualización o cambiar de tecnología. Con 433 sucesos, una lista paginada accesible probablemente sea suficiente.

## 5. Diseño funcional propuesto

### Escritorio

1. Encabezado compacto con búsqueda, periodo activo y selector «Explorar / Comparar».
2. Resumen temporal con densidad por intervalo y rango seleccionado. Reutilizar `drawMinimap()` cuando resulte viable; no añadir un segundo minimapa redundante.
3. En Explorar: cronología resumida y lista sincronizada del intervalo, una al lado de la otra cuando haya espacio.
4. Seleccionar un agregado actualiza la lista. Elegir un suceso abre el detalle conservando el contexto de retorno.
5. En Comparar: carriles actuales, inicialmente dos o tres elegidos conscientemente; todos siguen disponibles. No confundir esta selección de producto con un filtro obligatorio que oculte contenido.

### Móvil

1. Periodo actual siempre visible, búsqueda y botón de filtros con cantidad aplicada.
2. Resumen temporal de altura orientativa 80–120 px y «Anterior / Siguiente intervalo» como alternativa al arrastre. Estos tamaños son hipótesis de diseño a validar, no reglas de accesibilidad.
3. Lista vertical como vista inicial: fecha, título completo, tipo textual y acceso al detalle. Agrupar por año; por día cuando los datos realmente lo permiten. Ordenar por fuente/orden curado cuando exista.
4. Rótulo «Mostrando 1–20 de 41» y botón «Mostrar 20 más», manteniendo lo ya leído; también es aceptable renderizar los 41 de una vez si las mediciones y lectura son buenas. Evitar desplazamiento infinito y virtualización prematura.
5. Detalle con título, fecha, descripción y referencia primero; después personajes/contexto; preguntas en sección desplegable. Volver mantiene posición de lista.
6. «Comparar en línea» abre la gráfica actual con instrucciones breves y controles visibles de zoom. No exigir pellizcar para encontrar contenido.

### Agrupación visual: contrato para no perder sucesos

- Separar **grupo curado** (significado histórico/narrativo) de **agregado visual** (elementos próximos en pantalla). Un agregado debe decir «N sucesos próximos», no inventar una relación histórica.
- Aplicar filtros primero; después calcular coordenadas sobre el ancho real y agrupar dentro de cada carril compatible. No combinar vidas, reinados y sucesos puntuales en una entidad indiferenciada.
- Agrupar por ocupación visual de etiqueta y zona de toque, no solo por años iguales. El algoritmo debe tener ancho máximo de agregado o ventanas ancladas: agrupar por vecindad transitiva sin límite puede encadenar todo un carril.
- Umbrales iniciales a experimentar: separación interactiva objetivo de 44 px en táctil; máximo de 3 pistas de sucesos por carril en resumen. Si se supera, representar el excedente con un agregado accesible, nunca borrarlo. Los periodos largos mantienen sus barras en Comparar.
- Cada agregado conserva IDs únicos de todos sus miembros, rango original y etiqueta accesible. Las fechas reales no se desplazan para resolver colisiones.
- Al acercar, desagrupar donde haya espacio. Si muchos sucesos comparten fecha exacta, abrir la lista: ningún zoom separará sus fechas. Evitar oscilaciones mediante umbrales de entrada/salida distintos.
- Conteos de lista basados en `Set(eventId)`; una aparición del mismo evento sobre dos personajes no equivale a dos sucesos.
- Invariante: conjunto de sucesos elegibles = unión de miembros de agregados y sucesos individuales. La lista debe ofrecer ese mismo conjunto, incluidos sucesos que la gráfica representa como límites de vida, sin duplicados.
- No alterar `curacion/grupos.json` por cambios de ancho o zoom. No agrupar hechos sin fecha dentro de años ficticios; ofrecer «Sin fecha precisa» cuando existan.

### Accesibilidad y legibilidad

Usar controles nativos, estado expandido/seleccionado y regiones anunciables para conteos. En lista, apuntar a texto de 16 px en móvil y títulos de varias líneas; ajustar comparativamente en pruebas con usuarios. Estado y tipo deben poder entenderse sin color. Los paneles cerrados deben salir del orden de foco; al abrir un modal, aislar el fondo y restaurar el disparador al cerrar. Revisar contraste en temas claro/oscuro y todos los estilos existentes.

La meta de 44 px es una recomendación de comodidad táctil para este producto. WCAG 2.2 AA establece 24 × 24 CSS px o excepciones de separación/equivalencia; ampliar pseudoelementos no resuelve objetivos que se superponen. La lista debe funcionar a 320 CSS px y con texto aumentado al 200 %. La excepción de reflow para diagramas bidimensionales no justifica que filtros y detalle no se adapten. Fuentes: [tamaño de objetivos, W3C](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) y [reflow, W3C](https://www.w3.org/WAI/WCAG21/Understanding/reflow.html).

La separación resumen/lista/detalle aplica divulgación progresiva: conservar acceso a las funciones mientras se reduce lo presentado simultáneamente. Referencia: [Progressive Disclosure, Nielsen Norman Group](https://www.nngroup.com/articles/progressive-disclosure/).

## 6. Paso a paso para el agente implementador

### Paso 0 · Preparar una base reproducible

1. Leer este informe, las instrucciones locales que existan y `git status`; preservar los cambios del usuario. Crear rama `codex/mejora-exploracion-timeline` si el flujo autorizado lo permite.
2. Arrancar `python -m http.server 8000 --bind 127.0.0.1`. Abrir `http://127.0.0.1:8000/linea-paralela.html#filas=sem` y las otras selecciones registradas arriba.
3. Ejecutar las tres pruebas existentes; guardar su salida y capturas comparables. Mantener perfiles limpios y perfiles con preferencias guardadas.
4. No ejecutar el pipeline para un cambio de UI: usa una base externa y algunos pasos escriben en ella. No ejecutar `split_timeline_bundle.mjs` sobre los archivos actuales.

**Entregable:** base de pruebas documentada y casos reproducibles, sin cambios en la cronología histórica.

### Paso 1 · Corregir fiabilidad y controles inaccesibles

1. En `linea-paralela.js`, corregir carga/reintento en `ensureDetailLoaded()` y `ensureFichasLoaded()`; mostrar estados desde las funciones de apertura. Añadir token de selección para descartar actualizaciones de UI obsoletas.
2. Convertir filas de grupo/relación en controles nativos conservando estilos. Hacer que un toque abra contenido; mantener protección contra activación tras arrastre.
3. Corregir éxito/error de Clipboard y unidades de zoom; revisar todos los usos de `effectivePx` antes de ajustar fórmulas/umbrales.
4. Corregir conteos de personajes frente a grupos/sucesos y vacíos engañosos.
5. Añadir pruebas de error de red, reintento, navegación por teclado, toque y copia rechazada.

**Aceptación:** la lista de 41 sucesos se recorre con Tab y Enter; abrir un grupo requiere un toque; un fallo de detalle ofrece reintento real y no se presenta como contenido inexistente; la copia fallida no afirma éxito.

### Paso 2 · Definir estado y selección de datos compartidos

1. Extraer funciones puras a archivos pequeños, por ejemplo `timeline-state.js` y `timeline-selectors.js`, siguiendo JavaScript sin build. No introducir módulos ES sin adaptar las pruebas actuales; una API bajo un único namespace permite transición incremental.
2. Definir estado: vista (`explorar/comparar`), carriles, consulta, alcance de búsqueda, rango, grupo, evento seleccionado, orden y filtros. Separar preferencias visuales del estado compartible.
3. Implementar selector canónico de sucesos con límites de intervalo documentados; deduplicación por ID y criterio para fechas parciales/intervalos que se superponen. Reutilizar reglas de `eventInChipScope()` sin hacer que la exclusión visual por personaje quite resultados de la lista.
4. Crear IDs estables de grupos curados/derivados; mantener compatibilidad con `#filas=...&ev=...`. Incorporar serialización y lectura de URL y manejo de Atrás/Adelante.
5. Indexar sucesos por ID y preguntas por `hid` cuando termine la carga diferida. Mantener separado el estado de panel y el paquete de datos.

**Aceptación:** recargar o compartir conserva periodo/consulta/vista; abrir un enlace en un perfil nuevo reproduce la selección; un evento compartido sigue accesible aunque preferencias anteriores ocultaran su carril.

### Paso 3 · Crear el explorador de intervalo y retorno al grupo

1. Añadir estructura de lista en `linea-paralela.html`, estilos responsive y renderer separado, por ejemplo `timeline-list.js`.
2. Hacer que `openEventGroupDrawerFill()` entregue sus IDs al explorador; sustituir el exceso de metadatos repetidos por lista y búsqueda contextual.
3. Implementar orden, contador único y expansión de resultados. Mantener todos los IDs recuperables y títulos completos.
4. Implementar pila de navegación: lista/grupo → suceso → relacionado, con acción Volver. Guardar scroll, foco y filtros por nivel; cerrar devuelve al disparador original.
5. Separar «Ver en la línea» de «Abrir detalle», y buscar referencias de forma consistente antes y después de cargar el detalle.

**Aceptación:** desde 32 E. C. se accede a los 41 miembros y al regresar se conserva posición. Sucesos repetidos en varios carriles aparecen una sola vez en la lista del intervalo. Búsqueda sin coincidencias ofrece limpiar/restablecer.

### Paso 4 · Presentación móvil de exploración

1. Introducir selector Explorar/Comparar. En primera visita a ancho pequeño proponer Explorar; respetar una elección explícita posterior. Usar el breakpoint existente de 760 px como punto inicial, validando tamaños intermedios.
2. En Explorar, retirar mínimos de ancho del contenedor de lectura; la lista y sus filtros caben al 100 %. Mantener la gráfica bidimensional únicamente dentro de Comparar.
3. Reutilizar minimapa como resumen compacto con rango y alternativas de botones. Dar prioridad al periodo activo sobre la tira extensa de chips.
4. Simplificar drawer móvil y revisar viewport dinámico, safe areas, teclado virtual y altura de los filtros. Evitar scroll anidado entre lista principal y contenedores innecesarios.
5. Revisar que `inert`/`hidden`, foco y Escape funcionen al cambiar de ancho con paneles abiertos. No depender de tooltips para leer nombres.

**Aceptación:** a 320, 390 y 430 px la vista Explorar no requiere desplazamiento horizontal; se puede buscar, abrir y volver a un suceso sin usar pinch. Comparar conserva eje compartido y gestos actuales.

### Paso 5 · Agrupación visual por densidad

1. Implementar funciones puras, por ejemplo en `timeline-density.js`: proyectar, calcular ocupación visual, formar agregados y devolver miembros/rango/posición. No leer ni escribir DOM dentro del algoritmo.
2. Integrarlas entre selección y render, comenzando por sucesos puntuales de la última semana y sucesos sueltos. Extender después a marcadores sobre personajes; conservar las barras de duración.
3. Aplicar el contrato de cobertura de la sección 5. Conservar el algoritmo actual de pistas como fallback para Comparar, no como la única respuesta a densidad.
4. Conectar los agregados al explorador del paso 3. Medir etiquetas después de cargar fuentes y recalcular con cambios de ancho/escala de texto.
5. Revisar `exportPng()` y minimapa: la exportación debe declarar si muestra un resumen, contener los conteos y usar el mismo modelo de layout; no exportar silenciosamente otro conjunto de eventos.

**Aceptación:** todos los IDs elegibles están en un elemento individual o un agregado; ningún cambio de zoom pierde eventos. Cincuenta sucesos en una fecha exacta abren una lista completa. No hay zonas táctiles competidoras sobrepuestas en el resumen y las fechas originales se conservan.

### Paso 6 · Calidad temporal y consistencia entre pantallas

1. Centralizar formato de fecha y documentar fracciones internas, ausencia de año cero mostrado y precisión original. Auditar `fmtYear()`, `chartYear()`, `tickStep()` y las etiquetas de grupos; cubrir el cruce a. E. C./E. C.
2. Dar a fichas el mismo contrato de drawer, foco, retorno, estados vacíos y enlace a sucesos. No mezclar sus 233 fichas con los 99 registros temporales en los contadores.
3. Homogeneizar textos, controles, tamaños y contraste; mantener el estilo editorial. Dejar preguntas como contenido secundario desplegable.

**Aceptación:** no hay año cero presentado al lector; día/año estimado se identifica; misma interacción básica en cronología y fichas; 200 % de texto no oculta controles esenciales.

### Paso 7 · Rendimiento, documentación y entrega

1. Medir render, búsqueda y apertura con el conjunto actual y datos sintéticos 5×/10×; registrar entorno y resultados. Optimizar índices/delegación antes de virtualizar. Conservar paginación accesible si se implementa virtualización después.
2. Auditar fuentes externas y probar fallback/offline; el README promete independencia de CDNs mientras la página carga Google Fonts. Elegir fuentes locales o documentar correctamente esa dependencia.
3. Deprecar/proteger el divisor antiguo, actualizar README y `docs/LEGIBILIDAD-TIMELINE.md`, incluir instrucciones y fixtures de pruebas. No introducir requisitos npm sin documentar instalación y ejecución.
4. Ejecutar pruebas y revisión visual final; entregar commits pequeños por paso, captura antes/después y limitaciones conocidas. Publicar solo dentro de la autorización que reciba el agente implementador.

**Aceptación:** documentación refleja archivos y conteos reales; pipeline no destruye detalle al repetirse; no hay errores de consola nuevos y los flujos anteriores siguen disponibles.

## 7. Matriz mínima de validación

- **Densidad real:** `jes`/32 E. C., `sem`, `nt-car`, `jud,isr,pro`; contar IDs, no solo nodos o marcadores.
- **Densidad sintética:** 0, 1, 50 sucesos en la misma fecha; dos fechas muy próximas; títulos extensos; un periodo largo y varios puntos; eventos sin fecha o con fecha parcial; evento presente en dos carriles.
- **Tamaños:** 320, 390, 430, 768 y 1440 CSS px; orientación horizontal móvil; texto al 200 %; estilos claro/oscuro y editorial/waterfall si ambos siguen ofrecidos.
- **Interacción:** teclado completo, un toque, arrastre sin clic accidental, abrir/cerrar filtros, volver desde detalle y relacionado, búsqueda local/global, limpiar filtros, ningún resultado, cambiar tamaño con modal abierto.
- **Estado:** enlace nuevo sin localStorage; enlace con preferencias antiguas; Atrás/Adelante; grupo estable tras reordenar datos; filtro de rango y regreso desde Personajes.
- **Red:** carga lenta, detalle 404/500, JSON inválido, reintento exitoso, selección de otro evento antes de recibir respuesta, fichas fallidas, portapapeles rechazado.
- **Visual:** ausencia de colisiones entre controles, títulos completos en lista, rango activo visible, eje legible y sin año cero, conteos coherentes y captura/exportación consistente.

Añadir pruebas automatizadas con navegador para estos flujos y pruebas unitarias para proyección, selección, deduplicación, agrupación y URL. Evitar tests que solo reproduzcan el HTML generado: verificar acceso a todos los sucesos y recuperación de contexto. Complementar con Android Chrome y Safari iOS reales y una revisión con lector de pantalla antes de declarar accesibilidad completa.

## 8. Cómo evaluar si mejoró

Probar con 3–5 usuarios representativos estas tareas: encontrar un suceso dentro del año 32; recorrer varios hechos de la última semana; comparar dos reinados; abrir un detalle y volver exactamente al punto de lectura. Registrar tiempo, errores de toque, pérdida de contexto y si pudieron encontrar todos los resultados. No hay línea base de usuarios medida en esta auditoría; levantarla antes de afirmar una mejora porcentual.

El criterio principal de éxito es que ningún suceso requiera adivinar un gesto, ampliar repetidamente una fecha coincidente o recorrer un gráfico enorme para poder abrirlo. La vista general puede resumir; el acceso completo debe permanecer explícito y verificable.
