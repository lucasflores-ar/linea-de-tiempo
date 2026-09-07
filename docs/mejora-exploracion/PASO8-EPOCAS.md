# Corrección de temas de época mal asignados

## Síntoma

En el carril **Profetas** aparecían dos sucesos del siglo I:

| id | Año | Suceso | Dónde corresponde |
|---|---|---|---|
| 209 | 29 E.C. | Primeros discípulos de Jesús | Ministerio de Jesús |
| 140 | 36 E.C. | Fin de las 70 semanas de años; Pedro visita a Cornelio | Siglo primero |

## Causa

`temas_de()` en `scripts/gen_timeline.py` derivaba el tema de época de dos
señales que no dicen *cuándo* ocurrió el suceso:

1. **El libro de la referencia bíblica.** Es el libro que *narra o profetiza* el
   suceso, no el de su época. Daniel profetiza sobre el año 36 E.C., así que el
   suceso de Cornelio heredaba `EXILIO` y `PROFETAS`. En sentido inverso, Hechos
   cita a Enoc, Abrahán y Samuel, así que esos sucesos del AT heredaban `HECHOS`.

2. **Coincidencia por subcadena en los personajes.** La regla que marca como
   profeta a quien menciona a `NATÁN` se activaba con **Nata**nael, uno de los
   primeros discípulos de Jesús.

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
- `menciona_persona()` compara por palabra completa, así `Natanael` ya no activa
  `Natán`.
- Sin ningún tema, un suceso de era E.C. cae en `SIGLO-PRIMERO` en vez de
  `OTROS` (salvo los `tipo: contexto`, que son marcadores de potencias
  mundiales y se dibujan aparte).

La era del CSV es la autoridad, no el signo del año: los sucesos de la natividad
están fechados en 3–1 a. E. C. pero su era es `E.C.` y pertenecen al siglo I.

**2. Datos (`scripts/fix_event_themes.js`).**
La base ya generada se corrigió con un parche quirúrgico e idempotente, porque
regenerar `linea-tiempo-datos.js` requiere los CSV de la base externa. Reescribe
solo el array `t` de 10 sucesos, conservando el formato del archivo, y verifica
que el resultado parsee y mantenga el orden y la cantidad de sucesos.

```
node scripts/fix_event_themes.js --check   # no escribe; sale 1 si falta aplicar
node scripts/fix_event_themes.js
```

| Sucesos | Cambio | Efecto |
|---|---|---|
| 140, 209 | temas del AT → `SIGLO-PRIMERO` | salen de Profetas, entran en Siglo primero / Ministerio |
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

**Pendiente en el origen.** El error viene de `hechos_biblicos.csv` de la base
externa (fila 194: `descripcion` y `lugar_antiguo` son de Mateo; fila 377 los
tiene vacíos). Mientras no se corrija ahí, una regeneración deshace el parche.
En la misma fuente, las filas 377 y 379 tienen `libro` vacío, que es lo que las
dejaba sin categoría de escritura.

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
