# Revisión: períodos de los libros bíblicos y datos aportados

Documento para revisar a mano. Recoge **todo** lo que se cambió en los datos a
partir de la regla acordada sobre el período que abarca cada libro y de los
datos aportados para Abdías, Amós, Nahúm, Mateo, Lucas, Ageo y Zacarías.

Si algún dato está mal, corregilo acá y se ajusta el script; no hay ningún valor
escrito a mano en el CSV que no esté declarado en
`scripts/fix_csv_periodos_libros.py`.

---

## 1. La regla y cómo quedó implementada

De cada libro hay dos datos distintos: **cuándo se completó** y el **período que
abarca**. La regla acordada:

> El período es la barra, y cuándo se completó es un punto dentro de la barra.
> Cuando la fecha de completado no está dentro del período que abarca, se dibuja
> como un suceso aparte.

Traducido a las columnas del CSV:

| columna | significado |
| --- | --- |
| `fecha_anio` / `fecha_texto` | cuándo se completó — es la fecha del suceso |
| `fecha_fin` / `fecha_fin_texto` | el otro extremo del período que abarca |

Por eso en estas filas `fecha_fin` es **anterior** a `fecha_anio`. No es un rango
invertido: es «se completó en X y abarca desde Y». Es la orientación que el
render ya esperaba —`evToRow()` llama `completion` a `fecha_anio` y dibuja ahí el
pin dentro de la barra— y la que ya usaba `libros_biblia_data.py`.

Un dato importante para leer lo que sigue: **en los 15 libros de esta tanda la
fecha de completado coincide siempre con el final del período**. La tabla de los
libros de la Biblia mide «lo que abarca» justamente hasta el momento en que el
libro se terminó. Así que el punto de completado cae en el borde derecho de la
barra, no en un año interior.

---

## 2. Libros que pasan a tener período (15 filas)

Antes eran un punto en el año de completado. Ahora la barra abarca el período y
termina en ese mismo año. Las fechas salen de
`docs/LIBROS-ESCRITURA-REFERENCIA.md`.

| id | suceso | antes | ahora | período según la tabla |
| --- | --- | --- | --- | --- |
| 90 | Mardoqueo completa el libro de Ester | punto c. 475 a.E.C. | 493 – c. 475 a.E.C. | 493–c. 475 a.E.C. |
| 103 | Daniel completa el libro de Daniel | punto c. 536 a.E.C. | 618 – c. 536 a.E.C. | 618–c. 536 a.E.C. |
| 104 | Isaías completa el libro de Isaías | punto d. 732 a.E.C. | c. 778 – d. 732 a.E.C. | c. 778–d. 732 a.E.C. |
| 106 | Ezequiel completa el libro de Ezequiel | 613 – c. 591 (invertido) | 613 – c. 591 a.E.C. | 613–c. 591 a.E.C. |
| 186 | Miqueas completa el libro de Miqueas | punto a. 717 a.E.C. | c. 777 – a. 717 a.E.C. | c. 777–717 a.E.C. |
| 188 | Oseas completa el libro de Oseas | punto d. 745 a.E.C. | a. 804 – d. 745 a.E.C. | a. 804–d. 745 a.E.C. |
| 198 | Lucas completa el libro de Hechos en Roma | punto c. 61 e.c. | 33 – c. 61 e.c. | 33–c. 61 E.C. |
| 340 | Moisés completa Éxodo y Levítico | punto 1512 a.E.C. | 1657 – 1512 a.E.C. | Éxodo: 1657–1512 a.E.C. |
| 342 | Moisés completa Números en las llanuras de Moab | punto 1473 a.E.C. | 1512 – 1473 a.E.C. | 1512–1473 a.E.C. |
| 344 | Se completa el libro de Josué | punto c. 1450 a.E.C. | 1473 – c. 1450 a.E.C. | 1473–c. 1450 a.E.C. |
| 348 | Se completa el libro de 1 Samuel | punto c. 1078 a.E.C. | c. 1180 – c. 1078 a.E.C. | c. 1180–1078 a.E.C. |
| 349 | Gad y Natán completan 2 Samuel | punto c. 1040 a.E.C. | 1077 – c. 1040 a.E.C. | 1077–c. 1040 a.E.C. |
| 364 | Se completan los libros de 1 y 2 Reyes y Jeremías | punto 580 a.E.C. | c. 1040 – 580 a.E.C. | 1 y 2 Reyes: c. 1040–580 a.E.C. |
| 367 | Zacarías completa el libro de Zacarías | punto 518 a.E.C. | 520 – 518 a.E.C. | 520–518 a.E.C. |
| 369 | Nehemías completa el libro de Nehemías | punto d. 443 a.E.C. | 456 – d. 443 a.E.C. | 456–d. 443 a.E.C. |

**Ezequiel (106) merece una nota.** Ya tenía las dos fechas, pero guardadas al
revés: `fecha_anio` era 613 (el principio del período) y `fecha_fin` era c. 591
(la compleción). Con esa orientación la ficha imprimía «c. 591 a. E. C. – 613
a. E. C.» y el pin marcaba el principio del período en vez del final. Quedó dado
vuelta para que coincida con el resto y con el catálogo.

### Dos filas que hablan de más de un libro

Estas dos filas cubren varios libros a la vez y hubo que elegir el período de
uno. **Confirmar si te parece bien.**

- **340, «Moisés completa Éxodo y Levítico»** → se usó el período de **Éxodo**
  (1657–1512). Levítico abarca «1 mes (1512 a.E.C.)», que cae dentro.
- **364, «Se completan los libros de 1 y 2 Reyes y Jeremías»** → se usó el
  período de **1 y 2 Reyes** (c. 1040–580), que es el más largo. Jeremías abarca
  647–580 y también termina en 580.

---

## 3. Datos aportados

| id | suceso | campo | antes | ahora |
| --- | --- | --- | --- | --- |
| 171 | Abdías escribe el libro de Abdías | `lugar_antiguo` | `Edom` | *(vacío)* |
| 377 | Mateo escribe el Evangelio llamado 'Mateo' | `lugar_antiguo` | `Palestina` | `Israel` |
| 377 | idem | `descripcion` | resumen de 237 caracteres | texto completo |
| 194 | Lucas escribe el Evangelio llamado 'Lucas' | `descripcion` | resumen de 186 caracteres | texto completo |
| 196 | Evangelio según Lucas | `descripcion` | idem 194 | idem 194 |
| 367 | Zacarías completa el libro de Zacarías | `descripcion` | repetía el título | texto completo |
| 368 | Ageo completa el libro de Ageo | `descripcion` | **la de Esdras** | texto completo |

Cuatro cosas a confirmar:

1. **Abdías sin lugar.** La tabla no indica dónde se escribió y
   `libros_biblia_data.py` lo tiene vacío. «Edom» es el destinatario de la
   profecía, no dónde escribió Abdías, y quedamos en que ese campo es el lugar de
   escritura. Si tenés el dato, entra ahí.
2. **Ageo tenía la descripción de Esdras**: decía «Esdras completa los libros de
   1 y 2 Crónicas y Esdras; compilación final de los Salmos». Reemplazada.
3. **Zacarías no tenía descripción**, solo la repetición de su propio título.
4. **Lucas: 59 % o 60 %.** La descripción que estaba decía «el 59 %»; el dato
   aportado dice «alrededor del 60 %». Se usó el 60 %.

Sobre el largo de los textos: se cargaron completos, como pediste. Quedan bastante
más largos que el resto (las descripciones de sucesos de redacción tenían 64
caracteres de mediana y 237 la más larga). Se quitaron los números de párrafo del
artículo original («2 Es razonable concluir…», «3 ¿Por qué comisionó…») porque son
marcas de la maquetación de origen, no contenido; el texto en sí está entero.

En Mateo y en Lucas el texto aportado se fusionó con el perfil que ya estaba, para
no perder dos datos curados que el texto nuevo no menciona: el 42 % exclusivo de
Mateo y los «más de 300 términos médicos» de Lucas.

### Datos que ya estaban bien

No hizo falta tocarlos, pero los verifiqué contra lo que pasaste:

- **Amós (172)**: Judá, c. 804 a.E.C. ✓
- **Nahúm (187)**: Judá, a. 632 a.E.C. ✓
- **Abdías (171)**: c. 607 a.E.C. ✓
- **Ageo (368)**: Jerusalén, 520 a.E.C. ✓ — abarca 112 días de ese año, así que
  sigue siendo un punto, no una barra.
- **Lucas (194/196)**: Cesarea, c. 56-58 e.c. ✓

---

## 4. Cambios de código que acompañan

1. **Orden de las fechas en la ficha.** `timeline-dates.js` ahora ordena los dos
   extremos del más antiguo al más reciente en vez de imprimirlos en el orden de
   los campos. Sin esto, los 15 libros de arriba mostrarían «c. 536 a. E. C. –
   618 a. E. C.». La función nueva es `eventDateEnds()`, y
   `linea-paralela.js` usa la suya equivalente para el tooltip.
2. **Límites de las líneas JW.** `gen_timeline.py` calculaba `fa_min` con los
   `fa` y `fa_max` con los `fa_fin`. Con esta orientación eso daba líneas con el
   máximo por debajo del mínimo; ahora toma el mínimo y el máximo sobre los dos
   extremos de cada suceso.
3. **Catálogo.** `libros_biblia_data.py` pasó Mateo de `Palestina` a `Israel`.
   `merge_libros_biblia.py --check` sigue reportando 0 cambios, así que el
   pipeline no revierte nada de esto.

---

## 5. Lo que falta y por qué no lo hice solo

### 5.1. Ocho libros donde el completado cae fuera del período

En estos, la fecha de completado es posterior al final del período, así que según
la regla va como **suceso aparte**. No los creé porque cada uno necesita un
nombre, y no quiero inventar títulos: hoy la fila existente se llama «X completa
el libro de X», y si esa fila pasa a ser el período, el nombre deja de
describirla.

| libro | fila actual | período que abarca | se completó |
| --- | --- | --- | --- |
| Génesis | 339 | «En el principio» hasta 1657 a.E.C. | 1513 a.E.C. |
| Jueces | 346 | c. 1450–c. 1120 a.E.C. | c. 1100 a.E.C. |
| 1 y 2 Crónicas | 370 | 1077–537 a.E.C. | c. 460 a.E.C. |
| Esdras | 370 (comparte fila) | 537–c. 467 a.E.C. | c. 460 a.E.C. |
| Mateo | 377 | 2 a.E.C.–33 E.C. | c. 41 E.C. |
| Marcos | 379 | 29–33 E.C. | c. 60-65 E.C. |
| Lucas | 194 | 3 a.E.C.–33 E.C. | c. 56-58 E.C. |
| Juan | 380 | 29–33 E.C. | c. 98 E.C. |

Génesis es un caso aparte: su período no tiene principio numérico («En el
principio»), así que no hay barra que dibujar y se queda como punto.

Para los cuatro Evangelios ya definiste que el intervalo de completado
(Lucas 56→58, Marcos 60→65) va como **barra corta separada** de la barra del
período. Eso significa dos entidades por Evangelio, y hace falta decidir cómo se
llama cada una.

### 5.2. Dónde se ve la barra de período y dónde no

Esto es una limitación del render que conviene que sepas antes de evaluar el
resultado. Un suceso solo se dibuja como **barra** cuando ocupa una fila propia, y
eso pasa únicamente en los carriles temáticos de sucesos: Evangelios, Hechos (NT)
y Cartas. En el resto de las situaciones el suceso se dibuja como **punto**:

- Si el escritor tiene barra de personaje visible, el suceso es un marcador sobre
  esa barra, colocado en el año de completado.
- Si no, cae en la «zona de sucesos sueltos», que dibuja puntos con título.

O sea que de los 15 libros de la sección 2, el único cuya barra de período se ve
hoy en la gráfica es Hechos (198), porque vive en el carril «Hechos (NT)». Para
los otros 14 el período sí aparece, pero en la **ficha y el tooltip**, como
«618 a. E. C. – c. 536 a. E. C.».

Si querés que el período se dibuje como barra también en el resto, hace falta un
cambio de render aparte: que la zona de sucesos sueltos sepa dibujar barras, o que
los libros del AT tengan su propio carril temático como los del NT.

---

## 6. Cómo reproducir y revertir

```
python scripts/fix_csv_periodos_libros.py --check   # muestra lo que haría, no escribe
python scripts/fix_csv_periodos_libros.py           # aplica, con copia de seguridad
python scripts/gen_timeline.py                      # regenera los datos del sitio
node scripts/run_tests.js                           # 19 tests
```

El script deja una copia con marca de tiempo junto al CSV
(`hechos_biblicos.csv.bak-AAAAMMDD-HHMMSS`) y verifica celda por celda que no
haya cambiado nada fuera de lo declarado. Es idempotente: correrlo dos veces
imprime «Sin cambios».

Las comprobaciones automáticas de todo esto están en
`scripts/tests/test_escritura.js`.
