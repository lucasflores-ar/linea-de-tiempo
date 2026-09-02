# Reporte: Tabla de los Libros de la Biblia

Total libros en catálogo: **66** (39 AT + 27 NT)
Sucesos totales tras merge: **399**

| Sección | Cantidad |
| --- | --- |
| Ya teníamos (coincidían tras merge) | **58** |
| Agregado (nuevos ids) | **8** |
| Cambió (actualizados) | **~82** |

---

## Ya teníamos

Libros cuyo evento de redacción **ya existía** y quedó alineado con la tabla (fecha, escritor, lugar, `etiqueta_jw`). Incluye duplicados sincronizados (p. ej. Romanos id 189 + 383):

- Deuteronomio (31), Ester (90), Daniel (103), Isaías (104), Ezequiel (106), Jonás (107)
- Hechos (151), 1 Corintios (160), 1 Juan (161), 1 Pedro (162), 1 Tesalonicenses (163), 1 Timoteo (164)
- 2 Corintios (165), 2 Juan (166), 2 Pedro (167), 2 Tesalonicenses (168), 2 Timoteo (169), 3 Juan (170)
- Abdías (171), Amós (172), Cantar (173), Colosenses (174), Efesios (175), Filemón (176), Filipenses (177)
- Gálatas (178), Habacuc (179), Hebreos (180/181), Joel (182), Judas (183), Lamentaciones (184)
- Miqueas (186), Nahúm (187), Oseas (188), Romanos (189), Santiago (190), Sofonías (191), Tito (192)
- Marcos (193), Lucas (194), Juan evangelio (195), Apocalipsis (196), Proverbios (355), Eclesiastés (354)
- 1 y 2 Reyes (365), Ageo (366), Zacarías (367), Nehemías (369), 1 y 2 Crónicas (370), Malaquías (372)
- Job (343), Josué (344), 1 Samuel (348), 2 Samuel (352), Rut (347), Levítico (340), Génesis (339)

---

## Agregado

Eventos **nuevos** creados porque no había redacción previa:

| id | Libro | Escritor | Fecha |
| --- | --- | --- | --- |
| 399 | ÉXODO | Moisés | 1512 a.E.C. |
| 400 | SALMOS | David y otros | c. 460 a.E.C. |
| 395 | ESDRAS | Esdras | c. 460 a.E.C. |
| 396 | JUECES | Samuel | c. 1100 a.E.C. |
| 363 | JEREMÍAS | Jeremías | 580 a.E.C. |
| 401 | 2 REYES | Jeremías | 580 a.E.C. |
| 402 | 2 CRÓNICAS | Esdras | c. 460 a.E.C. |
| 403 | MATEO | Mateo | c. 41 e.c. |

---

## Cambió

Correcciones principales aplicadas a eventos existentes:

| id | Corrección |
| --- | --- |
| 339 | **GÉNESIS** — corregido libro (antes JUAN ref. Juan 5:46); fecha 1513 a.E.C. |
| 340 | **LEVÍTICO** — separado de Éxodo (antes id 342 combinaba ambos) |
| 398 | **NÚMEROS** — redacción en Llanuras de Moab, 1473 a.E.C. |
| 365 | **1 REYES** — escritor Jeremías, 580 a.E.C., Judá/Egipto |
| 370 | **1 CRÓNICAS** — Esdras, c. 460, Jerusalén (?) |
| 189+383 | **ROMANOS** — duplicados sincronizados (Corinto, c. 56) |
| 160–183 | Cartas NT — `descripcion` con escritor/lugar; `etiqueta_jw` normalizada |
| 104–191 | Profetas — fechas a./c./d. según tabla; `fecha_estimada` donde aplica |

Todos los eventos de redacción recibieron `descripcion` con tiempo abarca + escritor + lugar, `jw_codigo`/`jw_linea` por era, y `etiqueta_jw` = clave canónica.

---

## Catálogo completo (estado final idempotente)

- **Génesis completado** (id 339, `genesis`)
- **Éxodo completado** (id 399, `exodo`)
- **Levítico completado** (id 340, `levitico`)
- **Números completado** (id 398, `numeros`)
- **Deuteronomio completado** (id 31, `deuteronomio`)
- **Josué completado** (id 344, `josue`)
- **Jueces completado** (id 396, `jueces`)
- **Rut completado** (id 347, `rut`)
- **1 Samuel completado** (id 348, `1_samuel`)
- **2 Samuel completado** (id 352, `2_samuel`)
- **1 y 2 Reyes completados** (id 365, `reyes`)
- **2 Reyes completado** (id 401, `2_reyes`)
- **1 y 2 Crónicas completados** (id 370, `cronicas`)
- **2 Crónicas completado** (id 402, `2_cronicas`)
- **Esdras completado** (id 395, `esdras`)
- **Nehemías completado** (id 369, `nehemias`)
- **Ester completado** (id 90, `ester`)
- **Job completado** (id 343, `job`)
- **Salmos — compilación final** (id 400, `salmos`)
- **Proverbios completado** (id 355, `proverbios`)
- **Eclesiastés completado** (id 354, `eclesiastes`)
- **Cantar de los Cantares completado** (id 173, `cantar`)
- **Isaías completado** (id 104, `isaias`)
- **Jeremías completado** (id 363, `jeremias`)
- **Lamentaciones completado** (id 184, `lamentaciones`)
- **Ezequiel completado** (id 106, `ezequiel`)
- **Daniel completado** (id 103, `daniel`)
- **Oseas completado** (id 188, `oseas`)
- **Joel completado** (id 182, `joel`)
- **Amós completado** (id 172, `amos`)
- **Abdías completado** (id 171, `abdias`)
- **Jonás completado** (id 107, `jonas`)
- **Miqueas completado** (id 186, `miqueas`)
- **Nahúm completado** (id 187, `nahum`)
- **Habacuc completado** (id 179, `habacuc`)
- **Sofonías completado** (id 191, `sofonias`)
- **Ageo completado** (id 366, `ageo`)
- **Zacarías completado** (id 367, `zacarias`)
- **Malaquías completado** (id 372, `malaquias`)
- **Evangelio según Mateo completado** (id 403, `mateo`)
- **Evangelio según Marcos completado** (id 193, `marcos`)
- **Evangelio según Lucas completado** (id 194, `lucas_evangelio`)
- **Evangelio según Juan completado** (id 195, `juan_evangelio`)
- **Hechos de los Apóstoles completado** (id 151, `hechos`)
- **Romanos completado** (id 189, `romanos`)
- **1 Corintios completado** (id 160, `1_corintios`)
- **2 Corintios completado** (id 165, `2_corintios`)
- **Gálatas completado** (id 178, `galatas`)
- **Efesios completado** (id 175, `efesios`)
- **Filipenses completado** (id 177, `filipenses`)
- **Colosenses completado** (id 174, `colosenses`)
- **1 Tesalonicenses completado** (id 163, `1_tesalonicenses`)
- **2 Tesalonicenses completado** (id 168, `2_tesalonicenses`)
- **1 Timoteo completado** (id 164, `1_timoteo`)
- **2 Timoteo completado** (id 169, `2_timoteo`)
- **Tito completado** (id 192, `tito`)
- **Filemón completado** (id 176, `filemon`)
- **Hebreos completado** (id 180, `hebreos`)
- **Santiago completado** (id 190, `santiago`)
- **1 Pedro completado** (id 162, `1_pedro`)
- **2 Pedro completado** (id 167, `2_pedro`)
- **1 Juan completado** (id 161, `1_juan`)
- **2 Juan completado** (id 166, `2_juan`)
- **3 Juan completado** (id 170, `3_juan`)
- **Judas completado** (id 183, `judas`)
- **Revelación (Apocalipsis) completado** (id 196, `apocalipsis`)
