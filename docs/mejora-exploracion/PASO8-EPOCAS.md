# Corrección de temas de época mal asignados

## Síntoma

En el carril **Profetas** aparecían sucesos que no son proféticos. Los dos
primeros son los que motivaron la revisión; el resto salió de la auditoría:

| id | Año | Suceso | Dónde corresponde |
|---|---|---|---|
| 209 | 29 E.C. | Primeros discípulos de Jesús | Ministerio de Jesús |
| 140 | 36 E.C. | Fin de las 70 semanas; Pedro visita a Cornelio | Siglo primero |
| 51 | 1063 a.E.C. | Amistad de David y Jonatán | Un solo reino |
| 53 | 1077 a.E.C. | Muerte de Saúl | Un solo reino |
| 372 | 332 a.E.C. | Grecia, quinta potencia mundial, gobierna a Judea | tira de potencias |

## Causa

`temas_de()` en `scripts/gen_timeline.py` derivaba el tema de época de dos
señales que no dicen *cuándo* ocurrió el suceso:

1. **El libro de la referencia bíblica.** Es el libro que *narra o profetiza* el
   suceso, no el de su época. Daniel profetiza sobre el año 36 E.C., así que el
   suceso de Cornelio heredaba `EXILIO` y `PROFETAS`, y el de Grecia heredaba lo
   mismo. En sentido inverso, Hechos cita a Enoc, Abrahán y Samuel, así que esos
   sucesos del AT heredaban `HECHOS`. Un caso más raro: la regla que manda los
   libros poéticos a `REYES` si la era es MONARQUÍA y a `GENESIS` si no, le puso
   `GENESIS` al suceso 357 (Babilonia como tercera potencia) porque su
   referencia está en Proverbios.

2. **Coincidencia por subcadena en los personajes.** La regla que marca como
   profeta a quien menciona a `NATÁN` se activaba con dos nombres que la
   contienen: **Nata**nael (uno de los primeros discípulos de Jesús) y
   Jo**natán** (de ahí «Amistad de David y Jonatán» y «Muerte de Saúl»).

Además, ningún suceso recibía tema por el solo hecho de ser de era E.C.: las
reglas del NT dependían del libro. Un suceso del siglo I sin libro reconocible
caía en `OTROS` y quedaba **invisible en todos los carriles** (así estaban
«Mateo escribe el Evangelio» y «Marcos escribe el Evangelio»).

Un tercer factor lo hacía visible: `LANE_YEAR_SCOPE.pro` llegaba hasta el año
**70 E.C.**, así que cualquier suceso con tema `PROFETAS` del siglo I entraba en
el carril. Los sucesos proféticos legítimos no pasan del año −332.

## Arreglo

**1. Generador (`scripts/gen_timeline.py`) — la causa raíz.**
El tema de época se deriva de la era del suceso:

- `li_at` (libro que aporta temas del AT) queda vacío si la era es E.C.
- `li_nt` (libro que aporta temas del NT) queda vacío si la era es del AT.
- En los `tipo: contexto` (marcadores de potencias mundiales, que se dibujan en
  su propia tira) el libro no aporta ningún tema, ni del AT ni del NT: Daniel,
  Apocalipsis y Hechos los mencionan sin marcar su época.
- `menciona_persona()` compara por palabra completa, así `Natanael` y `Jonatán`
  ya no activan `Natán`.
- Sin ningún tema, un suceso de era E.C. cae en `SIGLO-PRIMERO` en vez de
  `OTROS`, salvo los de contexto.

La era del CSV es la autoridad, no el signo del año: los sucesos de la natividad
están fechados en 3–1 a. E. C. pero su era es `E.C.` y pertenecen al siglo I.

**2. Datos (`scripts/fix_event_themes.js`).**
La base ya generada se corrigió con un parche quirúrgico e idempotente, porque
regenerar `linea-tiempo-datos.js` requiere los CSV de la base externa. Reescribe
solo el array `t` de 14 sucesos, conservando el formato del archivo, y verifica
que el resultado parsee y mantenga el orden y la cantidad de sucesos.

```
node scripts/fix_event_themes.js --check   # no escribe; sale 1 si falta aplicar
node scripts/fix_event_themes.js
```

| Sucesos | Cambio | Efecto |
|---|---|---|
| 140, 209 | temas del AT → `SIGLO-PRIMERO` | salen de Profetas, entran en Siglo primero / Ministerio |
| 51, 53 | se quita `PROFETAS` | salen de Profetas, quedan en Un solo reino |
| 372, 357 | temas heredados del libro → `OTROS` / `REYES` | marcadores de potencias fuera de Profetas y Génesis |
| 377, 379 | `OTROS` → `NT-ESCRITURA`, `NT-EVANGELIOS` | dejan de ser invisibles; entran en Evangelios |
| 4, 7, 47, 383 | se quita `HECHOS` | sucesos del AT sin tema del NT |
| 159, 375 | se quita `HECHOS` → `OTROS` | contexto de potencias mundiales |

**3. Carril (`linea-paralela.js`).**
`LANE_YEAR_SCOPE.pro.max` pasa de `70` a `-300`: defensa en profundidad para que
un tema mal asignado no vuelva a dibujarse ahí. No se pierde nada, porque el
suceso con tema `PROFETAS` más tardío es del año −332.

## Validación

`scripts/tests/test_epocas.js` (en `run_tests.js`) es la barrera de regresión.
Lee `LANE_THEME_SCOPE` y `LANE_YEAR_SCOPE` del propio `linea-paralela.js` para
que el test no se desincronice del código, y verifica que:

- ningún suceso de era E.C. cae en un carril del AT ni lleva temas del AT;
- ningún suceso del AT lleva temas del siglo I;
- ningún suceso de era E.C. queda fuera de todos los carriles;
- los sucesos de la natividad siguen en el siglo I;
- el generador conserva los tres guardas de la causa raíz;
- `fix_event_themes.js --check` no reporta pendientes.

`scripts/audit_event_themes.js` es el informe legible de las mismas reglas y la
fuente que usa el test.

La verificación más fuerte es `scripts/verify_temas_generador.py`: extrae de
`gen_timeline.py` solo las funciones de temas (sin disparar el pipeline, que
reescribiría los datos del repo), las corre sobre el CSV de origen y compara
suceso por suceso con `linea-tiempo-datos.js`. Si da **OK**, el generador y el
CSV ya producen los datos parcheados, así que una regeneración no reintroduce
los errores y `fix_event_themes.js` quedó redundante. El test la ejecuta y la
omite si no hay Python o no se alcanza la base externa.

```
python scripts/verify_temas_generador.py
```

Esta verificación fue la que encontró los sucesos 51, 53, 357 y 372: el parche
inicial cubría solo los cruces entre eras, y estos son errores dentro del mismo
lado de la cronología.

Verificación en navegador: con `#filas=pro` el carril Profetas solo muestra
sucesos a. E. C.; con `#filas=sig,jes` aparecen los sucesos 140, 209 y 377.

---

# Duplicados y descripciones cruzadas en los sucesos de redacción

Auditoría de seguimiento con `scripts/audit_escritura_duplicados.js`, que agrupa
los sucesos por el libro cuya redacción describe el título (y descarta el libro
de una cita o el nombre del escritor).

## Perfil del Evangelio de Mateo en el suceso equivocado — corregido

El suceso **194** se titula «Lucas escribe el Evangelio llamado 'Lucas'» pero su
descripción era la de **Mateo** («escrito principalmente para los judíos, como
muestran su genealogía desde Abrahán… es el primero y uno de los sinópticos; el
42 % de su relato no aparece en los otros tres»), con `lugar: Palestina`. El
perfil real de Lucas está en el suceso **196** (Cesarea, más de 300 términos
médicos, el más largo de los cuatro). El suceso **377**, que sí es el de Mateo,
no tenía descripción propia.

`scripts/fix_mateo_perfil.js` mueve la descripción y el lugar de 194 a 377, y
deja 194 repitiendo su título, como el resto de su serie. Es un parche
quirúrgico e idempotente sobre `linea-tiempo-detalle.json` que verifica que
ningún otro suceso ni las preguntas cambien.

```
node scripts/fix_mateo_perfil.js --check
node scripts/fix_mateo_perfil.js
```

El `lugar` de 194 quedó vacío en vez de «Cesarea» para no inventar contenido: el
dato ya está en el suceso 196.

### Corregido también en el origen

`scripts/fix_csv_evangelios.py` aplica el mismo arreglo en
`hechos_biblicos.csv` de la base externa, para que una regeneración no lo
deshaga. Seis celdas:

- fila **377**: hereda `descripcion` y `lugar_antiguo` («Palestina») de la 194, y
  se le completa `libro = MATEO`.
- fila **194**: `descripcion` pasa a repetir su título y `lugar_antiguo` queda
  vacío.
- fila **379**: se le completa `libro = MARCOS`.

Las columnas `libro` vacías de 377 y 379 eran justamente lo que las dejaba sin
categoría de escritura y las volvía invisibles en todos los carriles; al
completarlas, el generador produce `NT-ESCRITURA` + `NT-EVANGELIOS` por sí solo.

El script reescribe el CSV completo con el módulo `csv` de Python, pero solo
después de comprobar que ese ida y vuelta reproduce el original **byte a byte**
(`scripts/check_csv_roundtrip.py` lo verifica por separado: CRLF con
`QUOTE_MINIMAL` y BOM UTF-8). Hace copia de seguridad con marca de tiempo junto
al archivo y aborta si detecta cualquier cambio fuera de las celdas previstas.

```
python scripts/check_csv_roundtrip.py
python scripts/fix_csv_evangelios.py --check
python scripts/fix_csv_evangelios.py
```

## Duplicados de Evangelios — sin fusionar, por decisión

Hay dos series paralelas que describen la redacción de los Evangelios:

- **Serie A** — «Evangelio según X», sin `jw_codigo`, con perfil editorial
  propio (audiencia, porcentaje de contenido exclusivo, lugar de escritura):
  Marcos **195** (c. 60 E.C., Roma, 42 preguntas), Lucas **196** (c. 56 E.C.,
  Cesarea, 5 preguntas), Juan **197** (c. 98 E.C., Éfeso, 0 preguntas).
- **Serie B** — «X escribe el Evangelio llamado 'X'», con `jw_codigo = B10` y
  `etiqueta_jw`: Mateo **377** (c. 41 E.C., 67 preguntas), Lucas **194**
  (c. 57 E.C., 3 preguntas), Marcos **379** (c. 62 E.C., 0 preguntas), Juan
  **380** (c. 98 E.C., 0 preguntas; incluye 1–3 Juan y el cierre de la Biblia).

Marcos, Lucas y Juan quedan duplicados; Mateo no, porque solo existe en la
serie B. Se decidió **no fusionar** por ahora: las preguntas están atadas a ids
concretos (114 en total entre los sucesos implicados) y `curacion/grupos.json`
referencia 194, 196 y 197 pero no los de la serie B, así que la curación ya está
repartida entre ambas. Cualquier fusión debe decidir a la vez qué id sobrevive,
adónde se mueven las preguntas y cómo se actualiza la curación.

## Falsos positivos descartados

- **208** «fin de los "unos 450 años" de Hechos 13:17-20» — el libro aparece en
  la cita, no es un suceso de redacción de Hechos.
- **198** «Lucas completa el libro de Hechos en Roma» — «Lucas» es el escritor,
  no el libro redactado.

## Los cuatro «X escribe el Evangelio» completados desde su gemela

Al revisar el CSV de origen después del arreglo del perfil de Mateo apareció un
resto del mismo cruce: la fila **194** tenía `fecha_anio` 57 y `fecha_fin` **41**,
que es el año de Mateo. El rango quedaba invertido y el suceso se dibujaba como
un punto de 4 px con la fecha al revés.

Además, tres de las cuatro filas de la serie B repetían su título como
`descripcion` y no tenían lugar ni referencia, mientras sus gemelas de la serie
A sí traían el perfil editorial. Por decisión del usuario se copiaron los datos
de la gemela y, en los años en conflicto, mandó la serie A:

| fila | antes | ahora | de |
|---|---|---|---|
| 194 Lucas | c. 57, fin 41, sin lugar | c. 56 – c. 58, Cesarea | 196 |
| 379 Marcos | c. 62, sin lugar ni referencia | c. 60 – c. 65, Roma, Marcos 1:1 | 195 |
| 380 Juan | c. 98, sin fin ni lugar | c. 98 – c. 98, Éfeso, o cerca (?) | 197 |

Lo aplica `scripts/fix_csv_evangelios_gemelas.py` (idempotente, con copia de
seguridad y verificación celda por celda, igual que `fix_csv_evangelios.py`).
La **377** (Mateo) no se tocó: no tiene gemela, así que su `referencia` y sus
capítulos siguen vacíos a falta de una cita de origen. Las dos series siguen en
pie; no se fusionó nada.

Con el CSV corregido ya no hacen falta los parches sobre los archivos
generados: `python scripts/gen_timeline.py` reproduce el resultado.

La 377 (Mateo) quedó sin `referencia` ni capítulos por decisión: no todas las
filas necesitan una, y era la única sin gemela de donde copiarla.

El riesgo de que el pipeline completo revirtiera esto se cerró blindando
`merge_libros_biblia.py` — ver «Blindaje del merge de libros» más abajo. La red
de contención adicional es `scripts/tests/test_escritura.js`, que falla si los
perfiles desaparecen de los datos generados.

## Rangos de fechas invertidos en cuatro libros proféticos

El test que detecta `fa_fin < fa` encontró cuatro casos preexistentes y de otra
naturaleza que el cruce de los Evangelios, todos libros proféticos a.E.C.:

| id | suceso | fa | fa_fin |
|---|---|---|---|
| 106 | Ezequiel completa el libro de Ezequiel | −591 | −600 |
| 171 | Abdías escribe el libro de Abdías | −607 | −610 |
| 172 | Amós completa el libro de Amós | −804 | −810 |
| 187 | Nahúm completa el libro de Nahúm | −632 | −640 |

De cada libro hay **dos fechas distintas**: cuándo se completó y el período que
abarca. Acá estaban cruzadas, así que la barra se dibujaba como un punto de 4 px
con las fechas dadas vuelta.

El criterio adoptado es que la barra represente el período que abarca y que la
compleción la cierre. Pero eso solo se puede aplicar donde el período existe: en
`libros_biblia_data.py` —la fuente de `merge_libros_biblia.py`— **únicamente
Ezequiel** tiene «Tiempo que abarca: 613–c. 591 a.E.C.». Amós, Abdías y Nahúm
tienen `anio_fin=None` y `tiempo_abarca=''`: de ellos solo se conoce el año de
compleción. El año anterior que traía el CSV (810, 610, 640) no viene de esa
tabla ni coincide con ninguna de las dos fechas conocidas, así que se descartó.

| id | ahora | por qué |
|---|---|---|
| 106 | 613 a c. 591 a.E.C. | su tabla da el período que abarca |
| 171 | c. 607 a.E.C. | puntual: sin período conocido |
| 172 | c. 804 a.E.C. | puntual: sin período conocido |
| 187 | a. 632 a.E.C. | puntual: sin período conocido |

Lo aplica `scripts/fix_csv_abarca_profetas.py`, que declara el estado final
completo en lugar de un intercambio, así converge desde cualquier punto y es
idempotente. Si aparecen los «tiempo que abarca» de esos tres libros, van
primero a `libros_biblia_data.py` y después al CSV.

### La causa de raíz, en el merge

`apply_book()` escribía `fecha_fin = anio_fin` crudo. Pero `anio_fin` está mal
nombrado: no es el fin de nada, es **el otro extremo del período que abarca**,
que en a.E.C. es el más antiguo. Escribirlo sin ordenar deja el fin antes del
inicio, y lo hacía en todo libro a.E.C. con período. Ahora los extremos se
ordenan:

```python
(ini, pref_ini), (fin, pref_fin) = sorted(
    [(int(anio_fin), prefijo_fin), (anio, prefijo)])
```

Para Ezequiel eso reproduce exactamente 613 a c. 591, así que el merge y el CSV
ya coinciden y el dry-run no propone cambios de fecha en los cuatro.

## Blindaje del merge de libros

`merge_libros_biblia.py` era destructivo: reescribe la base externa y podía
borrar filas. Se le agregó un modo `--check` que muestra qué haría sin
escribir, y varias protecciones. Las tres primeras, para no perder la curación
de los Evangelios:

1. **No borra las filas curadas.** El dry-run avisaba `ELIMINARIA la fila 194`:
   `dedupe_redaccion_rows()` iba a fusionar Lucas contra su gemela 196, que es
   justo lo que se había decidido no hacer. Ahora `CURADAS` la exceptúa.
2. **No pisa descripciones curadas.** `apply_book()` reconstruía la descripción
   como «Escritor: … Lugar de escritura: …», borrando los perfiles editoriales.
   `es_descripcion_generada()` deja pasar solo las que tienen esa forma.
3. **No revierte las fechas de los Evangelios.** Estas tablas traen el período
   que el libro abarca (Marcos 29–33 E.C.); para los Evangelios se eligió el
   período de redacción (c. 60 a c. 65), así que las filas de `CURADAS` quedan
   fuera de la escritura de fechas, lugar y referencia.

### Los 63 cambios pendientes, resueltos

Aquellos 63 cambios que el `--check` seguía reportando no eran una sola cosa.
Al abrirlos uno por uno se partieron en dos grupos con causas distintas.

**23 eran un bug de mapeo, no una decisión editorial.** Los `match_id` del
catálogo están corridos y `find_primary()` los usaba sin verificar nada, así que
el merge iba a pisar sucesos que no tenían relación con el libro:

| Fila | Decía | Habría quedado |
|---|---|---|
| 386 | Nace Jesús en Belén | Evangelio según Marcos completado |
| 399 | Sana a un paralítico | Éxodo completado |
| 353 | Isaías empieza a profetizar | Cantar de los Cantares completado |
| 395 | Llama a Simón, Andrés, Santiago y Juan | Esdras completado |

Se detectan porque además cambiaban la época y los personajes (`era
E.C.→EXODO / LEY`, `personajes Jesús→Moisés`). Tres eran más sutiles: apuntaban
a un suceso de redacción, pero **de otro libro** —Génesis a la fila de Job,
Levítico a la de Números, Zacarías a la de Nehemías—, así que mirar solo el
`tipo_suceso` no alcanzaba.

**Los otros 40 eran un modelo editorial alternativo.** La tabla modela cada
fila como «el libro quedó *completado*» y el CSV como «alguien *escribió* el
libro, y esto es lo que tardó». Todo lo demás se derivaba de esa diferencia, de
forma coherente: la referencia pasaba del primer versículo al último (`Amós 1:1`
→ `Amós 9:15`) porque es la prueba de que el libro terminó, el lugar pasaba de
*a quién apunta la profecía* a *dónde escribió el escritor*, y `fecha_fin` se
vaciaba en las cartas porque una carta no es un período. La misma tensión que ya
se había resuelto para Ezequiel y los Evangelios.

#### Las tres decisiones

1. **Manda el CSV.** Se conserva «Pablo escribe 1 Corintios desde Éfeso» y
   `Amós 1:1`. `nombre`, `referencia`, `era`, `tipo_suceso`, `personajes` y
   `libro` pasaron a rellenarse **solo si están vacíos**; las fechas, solo si la
   fila todavía no tiene `fecha_anio`. La referencia de las filas `CURADAS` no
   se toca ni para rellenar: la de Mateo (377) va vacía a propósito.
2. **`lugar_antiguo` es el lugar de escritura**, no el destinatario del
   contenido. Acá manda la tabla, y es lo que corrige **Nahúm de «Nínive» a
   «Judá»** —profetiza contra Nínive pero escribe en Judá— y **Amós de «Israel»
   a «Judá»**. Con una excepción: si el valor del CSV ya *contiene* al de la
   tabla es más específico y se queda, así «Tel-abib, Babilonia» no se degrada a
   «Babilonia» y no se pierde el «(?)» de «Éfeso, o cerca (?)».
3. **El script rechaza el destino en vez de escribirlo.** `destino_valido()`
   exige las dos condiciones —que sea un suceso de redacción *y* que hable del
   mismo libro— y las dos hacen falta, porque Génesis y Job son las dos de
   redacción. Los 8 libros que quedan sin destino válido se reportan y se dejan
   sin fusionar, para arreglar el `match_id` a mano.

#### Dos landmines que aparecieron en el camino

**`ORPHAN_IDS` borraba 20 sucesos reales en silencio.** La lista se filtraba de
`rows` antes de `save_rows()`, y el contador «a eliminar» del `--check` solo
mira `dedupe_redaccion_rows()`, así que no aparecía por ningún lado. Hoy las 20
filas existen y ninguna es basura: están las gemelas 195 y 197 que se decidió
conservar, las redacciones de Job, Números y 2 Samuel (341, 342, 349) —que
además son el destino correcto de esos libros— y 15 sucesos de la vida de Jesús
(401, 402 y 424-436: la cena conmemorativa, las diez vírgenes, Judas). Ahora
hay que pedirlo con `--borrar-huerfanos`.

**Inventar filas duplicaba lo que ya existía.** Levítico ya está en la fila 340
(«Moisés completa Éxodo y Levítico»), pero el catálogo lo apunta a la 342 y esa
cayó en `ORPHAN_IDS`, así que el merge creaba un «Levítico completado» aparte.
Crear filas ahora se pide con `--crear-faltantes`.

#### Una etiqueta duplicada se comía la fila curada

Al aplicar los cambios, `test_escritura.js` falló: la fila 194 había perdido el
perfil de Lucas. La causa no estaba en el CSV —su descripción seguía intacta—
sino en que el merge le escribió `etiqueta_jw='lucas_evangelio'` a la 196,
etiqueta que la 194 ya tenía. Con dos filas iguales, el deduplicador de
`gen_timeline.py` descartaba una, justo la curada.

Se corrigió por dos lados: `find_primary()` ahora busca **por etiqueta canónica
antes que por `match_id`**, porque una fila ya etiquetada es una decisión tomada
y los ids están corridos; y `apply_book()` no escribe una etiqueta que otra fila
ya tenga.

#### Estado final

`python scripts/merge_libros_biblia.py --check` reporta **0 cambios, 0 nuevos,
0 a eliminar**: el pipeline converge y correrlo es inocuo. Los 56 cambios que
se aplicaron tocaron 4 columnas y ninguna editorial —`etiqueta_jw` (55,
normalización de plomería), `jw_linea` (56) y `jw_codigo` (7) rellenando
vacíos, y `lugar_antiguo` (21: 15 vacíos más los 6 de la decisión 2)—. Se
verificó celda por celda contra un backup: 433 filas antes y después, ningún id
perdido ni agregado, ninguna celda vaciada.

`scripts/tests/test_merge_libros.js` fija todo esto con 20 aserciones, entre
ellas que el `--check` siga dando 0 y que no vuelva a proponer pisar «Nace
Jesús en Belén».

### Los 8 libros sin destino, resueltos

Quedaban 8 libros que el guard rechazaba. Al buscarles candidatos reales en el
CSV resultó que no eran 8 ids corridos, sino un **desajuste estructural**:
cuatro filas del CSV son compuestas —un suceso cubre varios libros— y el
catálogo tiene una entrada por libro, así que una fila no puede ser reclamada
por dos.

| Fila | Cubre |
|---|---|
| 340 | «Moisés completa Éxodo y Levítico» → Éxodo + Levítico |
| 364 | «Se completan los libros de 1 y 2 Reyes y Jeremías» → Reyes + Jeremías |
| 370 | «Esdras completa 1 y 2 Crónicas y Esdras; compilación final de los Salmos» → Crónicas + Esdras + Salmos |
| 380 | «Juan escribe el Evangelio llamado 'Juan' y sus cartas 1, 2 y 3 Juan» → Juan + 1/2/3 Juan |

Lo mismo pasa en las cartas: la 160 es «Pablo escribe 1 Corintios desde Éfeso,
y 2 Corintios…» con `libro=2 CORINTIOS`, y la 175 «Desde Roma Pablo escribe:
Efesios, Filipenses, Colosenses…» con `libro=COLOSENSES`. La columna `libro`
solo nombra uno, y por eso «1 CORINTIOS» y «EFESIOS» no figuran como valor en
ninguna fila. No es un problema: los sucesos quedan igual etiquetados.

**Se mapeó un libro por fila compuesta** —Levítico→340 (su referencia,
`Lev. 27:34`, es la de esa fila), Jeremías→364 (coincide con su columna `libro`)
y Juan→380 (mismo patrón que Mateo→377, Marcos→379 y Lucas→194)—. Eso llenó los
dos `lugar_antiguo` que faltaban: «Desierto» en la 340 y «Judá / Egipto» en la
364.

Los cuatro que no se quedan con la fila se declaran con un campo nuevo,
`comparte_fila`, en vez de dejarles un `match_id` falso. Importa porque el
mensaje de rechazo mentía: decía «no es un suceso de redacción (tipo=milagro)»
cuando la verdad es «Éxodo comparte la fila 340 con Levítico». Un libro con
`comparte_fila` no se fusiona ni se crea: ya está representado.

**Malaquías era el único libro profético sin suceso de redacción.** Los otros
once tienen exactamente uno; Malaquías solo tenía la 185, «Profecía de
Malaquías» (`tipo=profecía`), que el guard rechaza con razón. Se le creó el
suyo, la fila **439**, con los mismos temas que Ageo y Zacarías
(`AT-PROF-MENORES`, `PROFETAS`, `RESTAURACION`).

Nació con el nombre de la tabla («Malaquías completado») y una descripción
generada, así que `scripts/fix_csv_malaquias.py` lo alineó al estilo de sus
hermanos: «Malaquías completa el libro de Malaquías», con la descripción
tomada textual de la 185 para no inventar contenido. El `nombre` del catálogo
se cambió también, para que una creación futura ya salga bien.

Estado: `--check` reporta **0 en los cinco contadores**, incluidos «sin destino
válido» y «sin fila», que antes eran 8 y 1.

### Nahúm fuera del carril de Profetas por una tilde

Verificando lo anterior apareció que Nahúm (187) tenía solo el tema `REYES`,
mientras sus once hermanos tienen `AT-PROF-MENORES`, `PROFETAS` y su época. En
el CSV la fila es indistinguible de la de Sofonías: misma era, mismo
`tipo_suceso`, fecha análoga.

La causa era una tilde. La columna `libro` del CSV escribe **«NAHÚM»**, pero la
lista de profetas estaba escrita **«NAHUM»** en dos lugares —
`curacion/escritura_categorias.json` y la condición de `PROFETAS` en
`scripts/gen_timeline.py`—, así que el `in` no acertaba nunca. Corregidos los
dos, Nahúm quedó igual que sus hermanos y el suceso 356 («Nínive cae ante los
caldeos»), cuyo `libro` también es NAHÚM, ganó `PROFETAS`, que es coherente con
cómo se comporta la regla para el resto de los libros proféticos.

Los cuatro auditores de `audit_event_themes.js` siguen en 0 hallazgos.

## Sello de caché de los datos generados

`DETAIL_URL` estaba clavado en `linea-tiempo-detalle.json?v=1` desde siempre y
`linea-tiempo-datos.js?v=16` no se movía al regenerar, así que quien ya hubiera
cargado el sitio seguía viendo los datos viejos. Se comprobó en vivo: tras
corregir el CSV, el panel de Lucas seguía mostrando el perfil de Mateo.

Ahora `gen_timeline.py` calcula un sello sha1 corto del contenido de los dos
artefactos, lo emite dentro del bundle como `LT_DATA._v` y lo estampa en el
`?v=` de `linea-tiempo-datos.js` en el HTML. El cliente arma la URL del detalle
con ese valor:

```js
const DETAIL_URL = 'linea-tiempo-detalle.json?v='
  + ((window.LT_DATA && window.LT_DATA._v) || '1');
```

Hacerlo así y no como constante escrita en `linea-paralela.js` es lo que cierra
el problema: ese archivo tiene su propio `?v=`, y mientras el navegador corra su
copia cacheada seguirá pidiendo el detalle viejo por más que se regenere.

## «Booz» donde el resto del proyecto dice «Boaz»

`Booz` es la grafía de Reina-Valera; la Traducción del Nuevo Mundo, que es la
que sigue el proyecto, escribe `Boaz`. El banco de preguntas ya usaba `Boaz` en
42 celdas y la única fila que había quedado con la grafía vieja era la 44 de
`hechos_biblicos.csv`, en `nombre` y `personajes`. De ahí salían el título del
suceso, la ficha del personaje 135 (Boaz no está en `personajes_biblicos.csv`:
la ficha se crea a partir de esa columna) y los hitos y relaciones de la
ficha 17.

No era solo cosmético. El enriquecido enlaza preguntas a sucesos comparando
`norm(pregunta.personaje)` contra `norm(hecho.personajes)`, y `norm()` saca
tildes pero no cambia letras: `boaz` nunca coincidía con `booz`. Había 12
preguntas con `personaje='Boaz'` sin enlazar, y por eso la ficha mostraba
0 preguntas teniéndolas.

Corregido con `scripts/fix_csv_boaz.py` (idempotente, con `--check`, backup y
verificación celda por celda) más la clave `"Booz"` de `curacion/manual.json`,
que es la clave de join por nombre de ficha: si se renombra una sin la otra,
`apply_curacion()` avisa «sin ficha para» y la ficha pierde sus ocho campos
curados.

Ojo con el reemplazo global: la pregunta 10144 responde «Jakín y Boaz», las
columnas del templo. Ese `Boaz` ya estaba bien y no es esta persona, así que
tanto este script como `fix_fichas_boaz.py` tocan celdas puntuales y abortan si
la cadena aparece donde no se la espera.

### Por qué las fichas se parchearon en vez de regenerarse

`gen_fichas.py` ya produce «Boaz», pero correrlo completo arrastra cambios
ajenos: la base externa se movió desde la última regeneración y aparecen 6
fichas nuevas más varias fusiones y desambiguaciones («Abigaíl y Natán»,
«María (la madre de Jesús)»). Eso corre todos los `id` hasta 6 lugares, y
`fichas.html?id=N` es un punto de entrada compartible, así que un enlace viejo
abriría a otra persona. Se usó `scripts/fix_fichas_boaz.py`, que renombra con
los `id` intactos y corrige el `num_preguntas` de la ficha. **La regeneración
completa de fichas sigue pendiente como decisión aparte.**

### Sello de caché de las fichas

`fichas-personajes.js` no llevaba ningún `?v=`, así que esta corrección no
llegaba a quien ya había visitado el sitio: se verificó en vivo, el navegador
seguía sirviendo su copia con «Booz». `gen_fichas.py` ahora estampa un sello
sha1 del contenido en `fichas.html`, igual que `gen_timeline.py`.

## Validación

`scripts/tests/test_escritura.js` (en `run_tests.js`) verifica que el perfil de
Mateo esté solo en el suceso 377 con su lugar, que 194 no conserve el lugar de
Mateo, que el perfil propio de Lucas siga en 196, que el parche sea idempotente
y que la auditoría no encuentre descripciones cruzadas. Se le agregó que las
cuatro filas «X escribe el Evangelio» lleven el perfil de su propio evangelio y
no la repetición de su título, y que no aparezcan rangos invertidos nuevos.
