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
