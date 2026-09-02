# Reporte: Tabla de los Libros de la Biblia

Total libros en catálogo: **64** (1–2 Reyes y 1–2 Crónicas como pares combinados)
Sucesos totales: **396**

En la corrida idempotente final: 64 ok, 0 nuevos, 0 cambios. Los **6 eventos listados abajo** se crearon en el merge inicial (`306552a`); luego se eliminaron 3 duplicados erróneos (342, 401, 402).

---

## Agregado (revisar en vivo)

| id | Libro | Escritor | Fecha | Lugar | Tiempo abarca |
| --- | --- | --- | --- | --- | --- |
| **399** | ÉXODO | Moisés | 1512 a.E.C. | Desierto | 1657–1512 a.E.C. |
| **395** | ESDRAS | Esdras | c. 460 a.E.C. | Jerusalén | 537–c. 467 a.E.C. |
| **400** | SALMOS | David y otros | c. 460 a.E.C. | — | (compilación final) |
| **363** | JEREMÍAS | Jeremías | 580 a.E.C. | Judá / Egipto | 647–580 a.E.C. |
| **396** | JUECES | Samuel | c. 1100 a.E.C. | Israel | c. 1450–c. 1120 a.E.C. |
| **403** | MATEO | Mateo | c. 41 e.c. | Palestina | 2 a.E.C.–33 E.C. |

**Eliminados** (duplicados del subagente, no en tu tabla): id 342 (Levítico repetido), 401 (2 Reyes extra), 402 (2 Crónicas extra).

---

## Ya teníamos

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
- **1 y 2 Crónicas completados** (id 370, `cronicas`)
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

## Cambió

Correcciones principales del merge inicial (ya aplicadas):

- **339** Génesis: `libro=GÉNESIS` (antes JUAN)
- **340** Levítico: separado de Éxodo
- **365** 1 y 2 Reyes: solo Reyes (Jeremías escritor)
- **370** 1 y 2 Crónicas: solo Crónicas (Esdras escritor)
- **161/166/170** epístolas de Juan restauradas (vs. evangelio)
- Duplicados NT sincronizados (Romanos 189+383, Hechos 151+198, etc.)
