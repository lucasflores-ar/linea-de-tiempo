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

## Validación

`scripts/tests/test_escritura.js` (en `run_tests.js`) verifica que el perfil de
Mateo esté solo en el suceso 377 con su lugar, que 194 no lo conserve, que el
perfil propio de Lucas siga en 196, que el parche sea idempotente y que la
auditoría no encuentre descripciones cruzadas.
