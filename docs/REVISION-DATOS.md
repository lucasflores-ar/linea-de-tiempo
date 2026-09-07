# Revisión de datos — cambios de la sesión del 7/9/2026

Todo lo que se le cambió a los datos, para chequear a mano si
algún valor quedó mal. Generado por `scripts/gen_revision_datos.py`
diffeando las fuentes reales: el CSV contra el backup previo a la
sesión (`hechos_biblicos.csv.bak-20260907-132735`) y el bundle contra
el commit `ff039fe`.

Marcá con `[x]` lo que confirmes y anotá al lado lo que esté mal.

## Resumen

| | | dónde |
|---|---|---|
| Sucesos en el CSV | 433 antes -> 434 ahora | |
| Filas nuevas | 439 | §1 |
| Filas borradas | **ninguna** | |
| Filas donde se **sobrescribió** un dato | 13 | §2 |
| Filas donde solo se **completó** un vacío | 17 | §3 |
| Sucesos con temas/época cambiados | ver §4 | §4 |
| Celdas de plomería interna | 124 (no hace falta revisarlas) | §6 |

Si tenés poco tiempo, con **§1 y §2** alcanza: son los 14 lugares
donde un dato nuevo reemplazó o inventó algo.

## 1. Sucesos nuevos

Filas que antes no existían. Son las que más conviene mirar,
porque su contenido no venía de ninguna fuente previa.

### [ ] id 439 — Malaquías completa el libro de Malaquías

| campo | valor |
|---|---|
| `tipo_suceso` | redacción |
| `fecha_texto` | d. 443 a. E. C. |
| `fecha_anio` | -443 |
| `fecha_fin` | (vacío) |
| `era` | RESTAURACIÓN |
| `lugar_antiguo` | Jerusalén |
| `personajes` | Malaquías |
| `referencia` | Mal. 4:6 |
| `libro` | MALAQUÍAS |
| `descripcion` | Última profecía del AT sobre el mensajero que prepara el camino. |

**Por qué se creó:** era el único libro profético sin
suceso de redacción. Los otros once tienen exactamente uno;
Malaquías solo tenía la fila 185, «Profecía de Malaquías»,
que es de tipo `profecía`, no de redacción.

**Qué verificar:** el año (c. 443 a.E.C. o «después de 443»),
el lugar (Jerusalén) y la referencia (Mal. 4:6). La
descripción se copió textual de la fila 185, así que si esa
estaba bien, esta también.

## 2. Valores que se sobrescribieron — revisar primero

Estas 13 filas tenían un dato y ahora tienen otro. Son las de más
riesgo: si el valor nuevo está mal, se perdió uno que estaba bien.

### [ ] id 44 — Rut y Boaz

«Booz» -> «Boaz», que es la forma que usa el resto del proyecto. De paso la ficha del personaje pasó a mostrar sus 12 preguntas, que antes no encontraba por el nombre distinto.

| campo | antes | ahora |
|---|---|---|
| `nombre` | Rut y Booz | **Rut y Boaz** |
| `personajes` | Rut, Noemí, Booz | **Rut, Noemí, Boaz** |

### [ ] id 90 — Mardoqueo completa el libro de Ester

Vino de la decisión sobre `lugar_antiguo`. Verificar que Susa esté en Elam.

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | Susa | **Susa, Elam** |

### [ ] id 106 — Ezequiel completa el libro de Ezequiel

Ezequiel: el rango estaba invertido. Se usó el período que el libro **abarca** para dibujar la barra (613 – c. 591 a.E.C.), con el fin marcando el final del período, como decidiste.

| campo | antes | ahora |
|---|---|---|
| `fecha_texto` | c. 591 a. E. C. | **613 a. E. C.** |
| `fecha_anio` | -591 | **-613** |
| `fecha_fin` | -600 | **-591** |
| `fecha_fin_texto` | 600 a. E. C. | **c. 591 a. E. C.** |

### [ ] id 171 — Abdías escribe el libro de Abdías

Abdías: rango invertido. Queda como suceso puntual en su año de redacción.

| campo | antes | ahora |
|---|---|---|
| `fecha_fin` | -610 | **(vacío)** |
| `fecha_fin_texto` | 610 a. E. C. | **(vacío)** |

### [ ] id 172 — Amós completa el libro de Amós

Amós: rango invertido, queda puntual. Además `lugar_antiguo` pasó de «Israel» a «Judá»: profetiza contra Israel pero **escribe** en Judá, y la columna es el lugar de escritura.

| campo | antes | ahora |
|---|---|---|
| `fecha_fin` | -810 | **(vacío)** |
| `fecha_fin_texto` | 810 a. E. C. | **(vacío)** |
| `lugar_antiguo` | Israel | **Judá** |

### [ ] id 180 — Pablo escribe la carta a los hebreos desde Roma

Vino de la decisión sobre `lugar_antiguo`, y acá corrige una contradicción: el propio nombre del suceso dice «desde Roma» pero la columna decía «Jerusalén».

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | Jerusalén | **Roma** |

### [ ] id 184 — Jeremías escribe Lamentaciones

Vino de la decisión sobre `lugar_antiguo`. La tabla precisa «cerca de» Jerusalén.

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | Jerusalén | **Cerca de Jerusalén** |

### [ ] id 187 — Nahúm completa el libro de Nahúm

Nahúm: rango invertido, queda puntual. Y `lugar_antiguo` de «Nínive» a «Judá», por lo mismo: profetiza contra Nínive pero escribe en Judá.

| campo | antes | ahora |
|---|---|---|
| `fecha_fin` | -640 | **(vacío)** |
| `fecha_fin_texto` | 640 a. E. C. | **(vacío)** |
| `lugar_antiguo` | Nínive | **Judá** |

### [ ] id 188 — Oseas completa el libro de Oseas

Vino de la decisión sobre `lugar_antiguo`: Oseas profetiza a Israel y la tabla ubica la escritura en el distrito de Samaria. **Verificar el fraseo**, «Samaria (Distrito)» suena raro.

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | Israel | **Samaria (Distrito)** |

### [ ] id 194 — Lucas escribe el Evangelio llamado 'Lucas'

Tenía la descripción y el lugar del Evangelio de **Mateo**, no los de Lucas, y `fecha_fin=41` (el año de Mateo) dejaba el rango invertido. Se le movió el perfil a la fila 377 y se le trajo su propio perfil y su rango 56–58 de la fila gemela 196.

| campo | antes | ahora |
|---|---|---|
| `descripcion` | Escrito principalmente para los judíos, como muestran su genealogía desde Abrahán y sus numerosas referencias a las Escrituras Hebreas.

Es el primero y uno de los evangelios sinópticos; el 42 % de su relato no aparece en los otros tres. | **El 59 % de su evangelio no aparece en los demás relatos; es el más largo de los cuatro.

Emplea más de 300 términos médicos o con significado médico, reflejo de su formación como médico.** |
| `fecha_texto` | c. 57 e. c. | **c. 56 e.c.** |
| `fecha_anio` | 57 | **56** |
| `fecha_fin` | 41 | **58** |
| `fecha_fin_texto` | c. 41 e.c. | **c. 58 e.c.** |
| `lugar_antiguo` | Palestina | **Cesarea** |

### [ ] id 377 — Mateo escribe el Evangelio llamado 'Mateo'

Estaba vacía y le correspondía el perfil de Mateo que estaba en la 194. La `referencia` se dejó vacía a propósito, como pediste.

| campo | antes | ahora |
|---|---|---|
| `descripcion` | Mateo escribe el Evangelio llamado 'Mateo' | **Escrito principalmente para los judíos, como muestran su genealogía desde Abrahán y sus numerosas referencias a las Escrituras Hebreas.

Es el primero y uno de los evangelios sinópticos; el 42 % de su relato no aparece en los otros tres.** |

### [ ] id 379 — Marcos escribe el Evangelio llamado 'Marcos'

Se le copió el perfil de su gemela 195 y se alineó su rango de fechas al de esa serie.

| campo | antes | ahora |
|---|---|---|
| `descripcion` | Marcos escribe el Evangelio llamado 'Marcos' | **Escrito principalmente para lectores romanos, lo que se nota por las explicaciones de costumbres judías y el uso de términos latinos.

Es el más breve de los cuatro evangelios, rico en acción, y menciona al menos 19 milagros.** |
| `fecha_texto` | c. 62 e. c. | **c. 60 e.c.** |
| `fecha_anio` | 62 | **60** |

### [ ] id 380 — Juan escribe el Evangelio llamado 'Juan' y sus cartas 1, 2 y 3 Juan; se completa la escritura de la Biblia

Se le copió el perfil de su gemela 197 y se alineó su rango de fechas al de esa serie.

| campo | antes | ahora |
|---|---|---|
| `descripcion` | Juan escribe el Evangelio llamado 'Juan' y sus cartas 1, 2 y 3 Juan; se completa la escritura de la Biblia | **El 92 % de su contenido es información suplementaria no considerada en los otros tres evangelios.

Destaca su prólogo sobre «la Palabra», que estaba en el principio con Dios.** |

## 3. Celdas que estaban vacías y se completaron

Otras 17 filas, todas rellenando un hueco. Riesgo bajo: no se
perdió nada, pero el dato nuevo puede ser incorrecto igual.

Casi todas son el **lugar de escritura** de un suceso de
redacción, que salió del catálogo de los 66 libros. Es el lugar
donde el escritor lo escribió, no el lugar del que habla el
contenido —esa fue la decisión que tomaste—.

### [ ] id 339 — Moisés compila Génesis en el desierto; empieza a escribirse la Biblia

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Desierto** |

### [ ] id 340 — Moisés completa Éxodo y Levítico

«Moisés completa Éxodo y Levítico»: se le completó el lugar de escritura, que estaba vacío.

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Desierto** |

### [ ] id 341 — Moisés completa el libro de Job

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Desierto** |

### [ ] id 342 — Moisés completa Números en las llanuras de Moab

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Desierto / Llanuras de Moab** |

### [ ] id 344 — Se completa el libro de Josué

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Canaán** |

### [ ] id 346 — Samuel completa el libro de Jueces

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Israel** |

### [ ] id 347 — Samuel completa el libro de Rut

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Israel** |

### [ ] id 348 — Se completa el libro de 1 Samuel

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Israel** |

### [ ] id 349 — Gad y Natán completan 2 Samuel

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Israel** |

### [ ] id 350 — Salomón completa El Cantar de los Cantares

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Jerusalén** |

### [ ] id 351 — Salomón completa el libro de Eclesiastés

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Jerusalén** |

### [ ] id 355 — Se completa la compilación de Proverbios

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Jerusalén** |

### [ ] id 364 — Se completan los libros de 1 y 2 Reyes y Jeremías

«Se completan los libros de 1 y 2 Reyes y Jeremías»: se le completó el lugar de escritura, que estaba vacío.

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Judá / Egipto** |

### [ ] id 367 — Zacarías completa el libro de Zacarías

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Jerusalén** |

### [ ] id 368 — Ageo completa el libro de Ageo

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Jerusalén** |

### [ ] id 369 — Nehemías completa el libro de Nehemías

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Jerusalén** |

### [ ] id 370 — Esdras completa los libros de 1 y 2 Crónicas y Esdras; compilación final de los Salmos

| campo | antes | ahora |
|---|---|---|
| `lugar_antiguo` | (vacío) | **Jerusalén (?)** |

### Filas que además tienen un relleno, ya listadas arriba

Algunas de la sección 2 también rellenaron celdas vacías. Para no
duplicar, acá van solo esos rellenos.

| id | campo | ahora |
|---|---|---|
| 377 | `libro` | MATEO |
| 377 | `lugar_antiguo` | Palestina |
| 379 | `capitulo_fin` | 1 |
| 379 | `capitulo_inicio` | 1 |
| 379 | `fecha_fin` | 65 |
| 379 | `fecha_fin_texto` | c. 65 e.c. |
| 379 | `libro` | MARCOS |
| 379 | `lugar_antiguo` | Roma |
| 379 | `referencia` | Marcos 1:1 |
| 380 | `fecha_fin` | 98 |
| 380 | `fecha_fin_texto` | c. 98 e.c. |
| 380 | `lugar_antiguo` | Éfeso, o cerca (?) |

## 4. Épocas y carriles (temas)

Los temas deciden en qué carril y en qué época aparece cada
suceso. No están en el CSV: los deriva el generador. Estos 16
cambiaron.

Lo que hay que verificar en cada uno es si el suceso
**pertenece** a esas épocas.

| | id | suceso | antes | ahora |
|---|---|---|---|---|
| [ ] | 4 | Enoc transferido; termina su período de prof | GENESIS, HECHOS | **GENESIS** |
| [ ] | 7 | Abrahán cruza el Éufrates hacia Canaán; se v | GENESIS, HECHOS | **GENESIS** |
| [ ] | 47 | Samuel unge rey de Israel a Saúl | HECHOS, PROFETAS, REYES | **PROFETAS, REYES** |
| [ ] | 51 | Amistad de David y Jonatán | PROFETAS, REYES | **REYES** |
| [ ] | 53 | Muerte de Saúl | PROFETAS, REYES | **REYES** |
| [ ] | 140 | Fin de las 70 semanas de años; Pedro visita  | EXILIO, PROFETAS | **SIGLO-PRIMERO** |
| [ ] | 159 | POTENCIA MUNDIAL: Roma | HECHOS | **OTROS** |
| [ ] | 187 | Nahúm completa el libro de Nahúm | REYES | **AT-PROF-MENORES, PROFETAS, REYES** |
| [ ] | 209 | Primeros discípulos de Jesús | PROFETAS, SIGLO-PRIMERO | **SIGLO-PRIMERO** |
| [ ] | 356 | Nínive cae ante los caldeos y los medos | REYES | **PROFETAS, REYES** |
| [ ] | 357 | Babilonia ahora encaminada a ser la tercera  | GENESIS, REYES | **REYES** |
| [ ] | 372 | Grecia, quinta potencia mundial, gobierna a  | EXILIO, PROFETAS | **OTROS** |
| [ ] | 375 | Roma, sexta potencia mundial, gobierna a Jer | HECHOS | **OTROS** |
| [ ] | 377 | Mateo escribe el Evangelio llamado 'Mateo' | OTROS | **NT-ESCRITURA, NT-EVANGELIOS** |
| [ ] | 379 | Marcos escribe el Evangelio llamado 'Marcos' | OTROS | **NT-ESCRITURA, NT-EVANGELIOS** |
| [ ] | 383 | Termina el período de 430 años desde la vali | EXODO, HECHOS | **EXODO** |

El motivo de casi todos: antes el tema salía del **libro que**
**narra** el suceso, así que sucesos del siglo I contados en un
libro del AT caían en carriles del AT. Eso es lo que te hacía
ver sucesos del Ministerio de Jesús entre los Profetas. Ahora
sale de la **era** del suceso.

Los sucesos **187 (Nahúm)** y **356 (Nínive cae)** son aparte:
no recibían `PROFETAS` porque la lista de profetas tenía
«NAHUM» sin tilde y el CSV escribe «NAHÚM».

Sucesos en la línea de tiempo: **433 -> 434**. Nuevos: 439.
Perdidos: **ninguno**.

## 5. Otros archivos de datos

| | archivo | cambio | qué verificar |
|---|---|---|---|
| [ ] | `curacion/manual.json` | la clave `"Booz"` pasó a `"Boaz"` | que la curación (profesión, versículo clave, cualidades) siga siendo la del mismo personaje |
| [ ] | `curacion/escritura_categorias.json` | en profetas menores, `"NAHUM"` -> `"NAHÚM"` | que Nahúm corresponda a los profetas menores |
| [ ] | `fichas_personajes.csv` y `fichas-personajes.js` | ficha 135: nombre `Booz` -> `Boaz`, y preguntas `0` -> `12` | que las 12 preguntas sean efectivamente de Boaz |

## 6. Plomería interna (no hace falta revisarla)

124 celdas de `etiqueta_jw`, `jw_linea` y `jw_codigo`. Son claves y
etiquetas que usa el pipeline para reencontrar cada fila; no hay
nada que factchequear. Se listan solo para que el informe sea
completo.

<details>
<summary>Ver las 124 celdas</summary>

| id | campo | antes | ahora |
|---|---|---|---|
| 31 | `etiqueta_jw` | (vacío) | deuteronomio |
| 31 | `jw_linea` | (vacío) | Exodo y desierto |
| 90 | `etiqueta_jw` | (vacío) | ester |
| 90 | `jw_linea` | (vacío) | Restauración de Jerusalén |
| 103 | `etiqueta_jw` | Daniel | daniel |
| 103 | `jw_linea` | (vacío) | Restauración de Jerusalén |
| 104 | `etiqueta_jw` | Isaías | isaias |
| 104 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 106 | `etiqueta_jw` | Ezequiel | ezequiel |
| 106 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 107 | `etiqueta_jw` | Jonás | jonas |
| 107 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 160 | `etiqueta_jw` | (vacío) | 1_corintios |
| 160 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 161 | `etiqueta_jw` | (vacío) | 1_juan |
| 161 | `jw_codigo` | (vacío) | B10 |
| 161 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 162 | `etiqueta_jw` | (vacío) | 1_pedro |
| 162 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 163 | `etiqueta_jw` | (vacío) | 1_tesalonicenses |
| 163 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 164 | `etiqueta_jw` | (vacío) | 1_timoteo |
| 164 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 165 | `etiqueta_jw` | (vacío) | 2_corintios |
| 165 | `jw_codigo` | (vacío) | B10 |
| 165 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 166 | `etiqueta_jw` | (vacío) | 2_juan |
| 166 | `jw_codigo` | (vacío) | B10 |
| 166 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 167 | `etiqueta_jw` | (vacío) | 2_pedro |
| 167 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 168 | `etiqueta_jw` | (vacío) | 2_tesalonicenses |
| 168 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 169 | `etiqueta_jw` | (vacío) | 2_timoteo |
| 169 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 170 | `etiqueta_jw` | (vacío) | 3_juan |
| 170 | `jw_codigo` | (vacío) | B10 |
| 170 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 171 | `etiqueta_jw` | Abdías | abdias |
| 171 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 172 | `etiqueta_jw` | Amós | amos |
| 172 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 174 | `etiqueta_jw` | (vacío) | colosenses |
| 174 | `jw_codigo` | (vacío) | B10 |
| 174 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 175 | `etiqueta_jw` | (vacío) | efesios |
| 175 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 176 | `etiqueta_jw` | (vacío) | filemon |
| 176 | `jw_codigo` | (vacío) | B10 |
| 176 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 177 | `etiqueta_jw` | (vacío) | filipenses |
| 177 | `jw_codigo` | (vacío) | B10 |
| 177 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 178 | `etiqueta_jw` | (vacío) | galatas |
| 178 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 179 | `etiqueta_jw` | Habacuc | habacuc |
| 179 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 180 | `etiqueta_jw` | (vacío) | hebreos |
| 180 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 182 | `etiqueta_jw` | Joel | joel |
| 182 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 183 | `etiqueta_jw` | (vacío) | judas |
| 183 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 184 | `etiqueta_jw` | Jeremías | lamentaciones |
| 184 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 186 | `etiqueta_jw` | Miqueas | miqueas |
| 186 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 187 | `etiqueta_jw` | Nahúm | nahum |
| 187 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 188 | `etiqueta_jw` | Oseas | oseas |
| 188 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 189 | `etiqueta_jw` | (vacío) | romanos |
| 189 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 190 | `etiqueta_jw` | (vacío) | santiago |
| 190 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 191 | `etiqueta_jw` | Sofonías | sofonias |
| 191 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 192 | `etiqueta_jw` | (vacío) | tito |
| 192 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 194 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 198 | `etiqueta_jw` | (vacío) | hechos |
| 198 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 199 | `etiqueta_jw` | (vacío) | apocalipsis |
| 199 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 339 | `etiqueta_jw` | moises_compila_genesis | genesis |
| 339 | `jw_linea` | (vacío) | Exodo y desierto |
| 340 | `etiqueta_jw` | moises_completa_exodo_levitico | levitico |
| 340 | `jw_linea` | (vacío) | Exodo y desierto |
| 341 | `etiqueta_jw` | moises_completa_job | job |
| 341 | `jw_linea` | (vacío) | Exodo y desierto |
| 342 | `etiqueta_jw` | moises_completa_numeros | numeros |
| 342 | `jw_linea` | (vacío) | Exodo y desierto |
| 344 | `etiqueta_jw` | libro_josue_completado | josue |
| 344 | `jw_linea` | (vacío) | La conquista de la Tierra Prometida |
| 346 | `etiqueta_jw` | samuel_completa_jueces | jueces |
| 346 | `jw_linea` | (vacío) | La conquista de la Tierra Prometida |
| 347 | `etiqueta_jw` | samuel_completa_rut | rut |
| 347 | `jw_linea` | (vacío) | La conquista de la Tierra Prometida |
| 348 | `etiqueta_jw` | libro_1_samuel_completado | 1_samuel |
| 348 | `jw_linea` | (vacío) | La ocupación de la Tierra Prometida |
| 349 | `etiqueta_jw` | gad_natan_2_samuel | 2_samuel |
| 349 | `jw_linea` | (vacío) | La ocupación de la Tierra Prometida |
| 350 | `etiqueta_jw` | salomon_cantar_cantares | cantar |
| 350 | `jw_linea` | (vacío) | La ocupación de la Tierra Prometida |
| 351 | `etiqueta_jw` | salomon_eclesiastes | eclesiastes |
| 351 | `jw_linea` | (vacío) | La ocupación de la Tierra Prometida |
| 355 | `etiqueta_jw` | proverbios_compilacion | proverbios |
| 355 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 364 | `etiqueta_jw` | libros_reyes_jeremias_completados | jeremias |
| 364 | `jw_linea` | (vacío) | Los profetas y los reyes de Judá e Isr |
| 367 | `etiqueta_jw` | zacarias_completa_libro | zacarias |
| 367 | `jw_linea` | (vacío) | Restauración de Jerusalén |
| 368 | `etiqueta_jw` | esdras_cronicas_salmos | ageo |
| 368 | `jw_linea` | (vacío) | Restauración de Jerusalén |
| 369 | `etiqueta_jw` | nehemias_completa_libro | nehemias |
| 369 | `jw_linea` | (vacío) | Restauración de Jerusalén |
| 370 | `etiqueta_jw` | malaquias_completa_libro | cronicas |
| 370 | `jw_linea` | (vacío) | Restauración de Jerusalén |
| 377 | `etiqueta_jw` | mateo_escribe_evangelio | mateo |
| 377 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 379 | `etiqueta_jw` | marcos_evangelio | marcos |
| 379 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |
| 380 | `etiqueta_jw` | juan_evangelio_cartas_biblia_completa | juan_evangelio |
| 380 | `jw_linea` | (vacío) | Israel en tiempos de Jesús |

</details>

## 7. Cosas que encontré y NO toqué

Datos que parecen incorrectos pero que no cambié, porque habría
tenido que inventarles contenido. Decidilos vos.

### [ ] id 368 — Ageo completa el libro de Ageo

Su `descripcion` es el **nombre de otra fila**: dice «Esdras completa los libros de 1 y 2 Crónicas y Esdras; compilación final de los Salmos», que es el nombre de la fila 370. Parece una celda mal copiada. Ageo debería tener su propia descripción.

Dice hoy: `Esdras completa los libros de 1 y 2 Crónicas y Esdras; compilación final de los Salmos`

### [ ] id 367 — Zacarías completa el libro de Zacarías

Su `descripcion` repite su propio título, «Zacarías completa el libro de Zacarías», así que no aporta nada. Sus hermanos tienen una descripción temática, por ejemplo Amós: «Profecía de Amós contra la injusticia social.»

Dice hoy: `Zacarías completa el libro de Zacarías`

### [ ] Dos libros que el catálogo nombra y el CSV no tiene como `libro`

«1 CORINTIOS» y «EFESIOS» no aparecen como valor de la columna
`libro` en ninguna fila, porque sus sucesos son compuestos y la
columna solo nombra uno: la fila 160 es «Pablo escribe 1 Corintios
desde Éfeso, y 2 Corintios…» con `libro=2 CORINTIOS`, y la 175 es
«Desde Roma Pablo escribe: Efesios, Filipenses, Colosenses…» con
`libro=COLOSENSES`. Los sucesos quedan bien etiquetados igual, así
que no es un error, pero conviene saberlo.

