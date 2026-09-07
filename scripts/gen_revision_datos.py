# -*- coding: utf-8 -*-
"""Genera docs/REVISION-DATOS.md: todo lo que se le cambió a los datos, para
revisar a mano si algún dato quedó incorrecto.

El informe se arma diffeando fuentes reales, no de memoria:

  - el CSV de origen contra el backup previo a la sesión
  - los temas del bundle contra el commit anterior a los cambios de datos
  - las fichas de personajes contra ese mismo commit

Uso:
    python scripts/gen_revision_datos.py
"""
import csv
import io
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

# Estado previo a toda la sesión de datos.
CSV_BASE = db('hechos_biblicos.csv.bak-20260907-132735')
CSV_HOY = db('hechos_biblicos.csv')
COMMIT_BASE = 'ff039fe'  # Paso 7, justo antes del primer cambio de datos
SALIDA = repo('docs', 'REVISION-DATOS.md')

# Columnas que un humano puede verificar contra una fuente. El resto es
# plomería interna del pipeline y no tiene sentido factchequearla.
EDITORIAL = ['nombre', 'descripcion', 'referencia', 'fecha_texto', 'fecha_anio',
             'fecha_fin', 'fecha_fin_texto', 'lugar_antiguo', 'personajes',
             'era', 'libro', 'tipo_suceso', 'capitulo_inicio', 'capitulo_fin']
PLOMERIA = ['etiqueta_jw', 'jw_linea', 'jw_codigo']


def leer_csv(ruta):
    with open(ruta, encoding='utf-8-sig', newline='') as f:
        return {r['id']: r for r in csv.DictReader(io.StringIO(f.read(), newline=''))}


def bundle(ref=None):
    """Devuelve los eventos del bundle, del working tree o de un commit."""
    import json
    if ref:
        txt = subprocess.run(['git', 'show', '%s:linea-tiempo-datos.js' % ref],
                             capture_output=True, cwd=repo(), check=True).stdout
        txt = txt.decode('utf-8')
    else:
        txt = open(repo('linea-tiempo-datos.js'), encoding='utf-8').read()
    cuerpo = txt.split('window.LT_DATA = ', 1)[1].rsplit(';', 1)[0]
    data = json.loads(cuerpo)
    return {e['id']: e for e in (data.get('eventos') or [])}


def vacio(v):
    return '(vacío)' if not (v or '').strip() else v


def main():
    base, hoy = leer_csv(CSV_BASE), leer_csv(CSV_HOY)
    L = []

    L.append('# Revisión de datos — cambios de la sesión del 7/9/2026')
    L.append('')
    L.append('Todo lo que se le cambió a los datos, para chequear a mano si')
    L.append('algún valor quedó mal. Generado por `scripts/gen_revision_datos.py`')
    L.append('diffeando las fuentes reales: el CSV contra el backup previo a la')
    L.append('sesión (`hechos_biblicos.csv.bak-20260907-132735`) y el bundle contra')
    L.append('el commit `%s`.' % COMMIT_BASE)
    L.append('')
    L.append('Marcá con `[x]` lo que confirmes y anotá al lado lo que esté mal.')
    L.append('')

    # ------------------------------------------------------------------ resumen
    nuevas = [i for i in hoy if i not in base]
    borradas = [i for i in base if i not in hoy]
    cambios_ed, cambios_pl = [], []
    for rid, fila in hoy.items():
        vieja = base.get(rid)
        if not vieja:
            continue
        for col in EDITORIAL:
            a, b = (vieja.get(col) or ''), (fila.get(col) or '')
            if a != b:
                cambios_ed.append((rid, col, a, b))
        for col in PLOMERIA:
            a, b = (vieja.get(col) or ''), (fila.get(col) or '')
            if a != b:
                cambios_pl.append((rid, col, a, b))

    filas_ed = sorted({r for r, _, _, _ in cambios_ed}, key=int)
    n_pisados = len({r for r, _, a, _ in cambios_ed if (a or '').strip()})

    L.append('## Resumen')
    L.append('')
    L.append('| | | dónde |')
    L.append('|---|---|---|')
    L.append('| Sucesos en el CSV | %d antes -> %d ahora | |' % (len(base), len(hoy)))
    L.append('| Filas nuevas | %s | §1 |' % (', '.join(nuevas) or 'ninguna'))
    L.append('| Filas borradas | %s | |' % (', '.join(borradas) or '**ninguna**'))
    L.append('| Filas donde se **sobrescribió** un dato | %d | §2 |' % n_pisados)
    L.append('| Filas donde solo se **completó** un vacío | %d | §3 |'
             % (len(filas_ed) - n_pisados))
    L.append('| Sucesos con temas/época cambiados | ver §4 | §4 |')
    L.append('| Celdas de plomería interna | %d (no hace falta revisarlas) | §6 |'
             % len(cambios_pl))
    L.append('')
    L.append('Si tenés poco tiempo, con **§1 y §2** alcanza: son los %d lugares'
             % (len(nuevas) + n_pisados))
    L.append('donde un dato nuevo reemplazó o inventó algo.')
    L.append('')

    # ------------------------------------------------------------- filas nuevas
    if nuevas:
        L.append('## 1. Sucesos nuevos')
        L.append('')
        L.append('Filas que antes no existían. Son las que más conviene mirar,')
        L.append('porque su contenido no venía de ninguna fuente previa.')
        L.append('')
        for rid in nuevas:
            f = hoy[rid]
            L.append('### [ ] id %s — %s' % (rid, f.get('nombre')))
            L.append('')
            L.append('| campo | valor |')
            L.append('|---|---|')
            for col in ['tipo_suceso', 'fecha_texto', 'fecha_anio', 'fecha_fin',
                        'era', 'lugar_antiguo', 'personajes', 'referencia',
                        'libro', 'descripcion']:
                L.append('| `%s` | %s |' % (col, vacio(f.get(col))))
            L.append('')
            L.append('**Por qué se creó:** era el único libro profético sin')
            L.append('suceso de redacción. Los otros once tienen exactamente uno;')
            L.append('Malaquías solo tenía la fila 185, «Profecía de Malaquías»,')
            L.append('que es de tipo `profecía`, no de redacción.')
            L.append('')
            L.append('**Qué verificar:** el año (c. 443 a.E.C. o «después de'
                     ' 443»),')
            L.append('el lugar (Jerusalén) y la referencia (Mal. 4:6). La')
            L.append('descripción se copió textual de la fila 185, así que si esa')
            L.append('estaba bien, esta también.')
            L.append('')

    # Motivos conocidos, para no obligar a reconstruir el por qué de cada uno.
    MOTIVOS = {
        '194': 'Tenía la descripción y el lugar del Evangelio de **Mateo**, no '
               'los de Lucas, y `fecha_fin=41` (el año de Mateo) dejaba el rango '
               'invertido. Se le movió el perfil a la fila 377 y se le trajo su '
               'propio perfil y su rango 56–58 de la fila gemela 196.',
        '377': 'Estaba vacía y le correspondía el perfil de Mateo que estaba en '
               'la 194. La `referencia` se dejó vacía a propósito, como pediste.',
        '379': 'Se le copió el perfil de su gemela 195 y se alineó su rango de '
               'fechas al de esa serie.',
        '380': 'Se le copió el perfil de su gemela 197 y se alineó su rango de '
               'fechas al de esa serie.',
        '106': 'Ezequiel: el rango estaba invertido. Se usó el período que el '
               'libro **abarca** para dibujar la barra (613 – c. 591 a.E.C.), con '
               'el fin marcando el final del período, como decidiste.',
        '171': 'Abdías: rango invertido. Queda como suceso puntual en su año de '
               'redacción.',
        '172': 'Amós: rango invertido, queda puntual. Además `lugar_antiguo` pasó '
               'de «Israel» a «Judá»: profetiza contra Israel pero **escribe** en '
               'Judá, y la columna es el lugar de escritura.',
        '187': 'Nahúm: rango invertido, queda puntual. Y `lugar_antiguo` de '
               '«Nínive» a «Judá», por lo mismo: profetiza contra Nínive pero '
               'escribe en Judá.',
        '44': '«Booz» -> «Boaz», que es la forma que usa el resto del proyecto. '
              'De paso la ficha del personaje pasó a mostrar sus 12 preguntas, '
              'que antes no encontraba por el nombre distinto.',
        '340': '«Moisés completa Éxodo y Levítico»: se le completó el lugar de '
               'escritura, que estaba vacío.',
        '364': '«Se completan los libros de 1 y 2 Reyes y Jeremías»: se le '
               'completó el lugar de escritura, que estaba vacío.',
        '90': 'Vino de la decisión sobre `lugar_antiguo`. Verificar que Susa '
              'esté en Elam.',
        '180': 'Vino de la decisión sobre `lugar_antiguo`, y acá corrige una '
               'contradicción: el propio nombre del suceso dice «desde Roma» '
               'pero la columna decía «Jerusalén».',
        '184': 'Vino de la decisión sobre `lugar_antiguo`. La tabla precisa '
               '«cerca de» Jerusalén.',
        '188': 'Vino de la decisión sobre `lugar_antiguo`: Oseas profetiza a '
               'Israel y la tabla ubica la escritura en el distrito de Samaria. '
               '**Verificar el fraseo**, «Samaria (Distrito)» suena raro.',
    }

    # Sobrescribir una celda que ya tenía algo es mucho más riesgoso que
    # rellenar una vacía: si el dato nuevo está mal, se perdió uno bueno. Se
    # separan para que la revisión empiece por donde importa.
    def es_relleno(a):
        return not (a or '').strip()

    pisados = sorted({r for r, _, a, _ in cambios_ed if not es_relleno(a)}, key=int)
    rellenos = [r for r in filas_ed if r not in pisados]

    def bloque(rid, solo_pisados=False):
        f = hoy[rid]
        L.append('### [ ] id %s — %s' % (rid, f.get('nombre')))
        L.append('')
        if rid in MOTIVOS:
            L.append('%s' % MOTIVOS[rid])
            L.append('')
        L.append('| campo | antes | ahora |')
        L.append('|---|---|---|')
        for r, col, a, b in cambios_ed:
            if r != rid:
                continue
            if solo_pisados and es_relleno(a):
                continue
            L.append('| `%s` | %s | **%s** |' % (col, vacio(a), vacio(b)))
        L.append('')

    # -------------------------------------------------- 2. lo que se sobrescribio
    L.append('## 2. Valores que se sobrescribieron — revisar primero')
    L.append('')
    L.append('Estas %d filas tenían un dato y ahora tienen otro. Son las de más'
             % len(pisados))
    L.append('riesgo: si el valor nuevo está mal, se perdió uno que estaba bien.')
    L.append('')
    for rid in pisados:
        bloque(rid, solo_pisados=True)

    # --------------------------------------------------- 3. rellenos de vacios
    L.append('## 3. Celdas que estaban vacías y se completaron')
    L.append('')
    L.append('Otras %d filas, todas rellenando un hueco. Riesgo bajo: no se'
             % len(rellenos))
    L.append('perdió nada, pero el dato nuevo puede ser incorrecto igual.')
    L.append('')
    L.append('Casi todas son el **lugar de escritura** de un suceso de')
    L.append('redacción, que salió del catálogo de los 66 libros. Es el lugar')
    L.append('donde el escritor lo escribió, no el lugar del que habla el')
    L.append('contenido —esa fue la decisión que tomaste—.')
    L.append('')
    for rid in rellenos:
        bloque(rid)

    L.append('### Filas que además tienen un relleno, ya listadas arriba')
    L.append('')
    L.append('Algunas de la sección 2 también rellenaron celdas vacías. Para no')
    L.append('duplicar, acá van solo esos rellenos.')
    L.append('')
    L.append('| id | campo | ahora |')
    L.append('|---|---|---|')
    hay = False
    for r, col, a, b in sorted(cambios_ed, key=lambda x: (int(x[0]), x[1])):
        if r in pisados and es_relleno(a):
            L.append('| %s | `%s` | %s |' % (r, col, vacio(b)[:60]))
            hay = True
    if not hay:
        L.append('| — | — | ninguno |')
    L.append('')

    # ------------------------------------------------------------------ temas
    try:
        ev_base, ev_hoy = bundle(COMMIT_BASE), bundle()
    except Exception as e:
        ev_base = ev_hoy = None
        L.append('> [warn] no pude leer el bundle del commit base: %s' % e)
        L.append('')

    if ev_base and ev_hoy:
        difs = []
        for eid, e in ev_hoy.items():
            a = ev_base.get(eid)
            if a and (a.get('t') or []) != (e.get('t') or []):
                difs.append((eid, a.get('t') or [], e.get('t') or [],
                             e.get('n') or ''))
        difs.sort(key=lambda x: x[0])

        L.append('## 4. Épocas y carriles (temas)')
        L.append('')
        L.append('Los temas deciden en qué carril y en qué época aparece cada')
        L.append('suceso. No están en el CSV: los deriva el generador. Estos %d'
                 % len(difs))
        L.append('cambiaron.')
        L.append('')
        L.append('Lo que hay que verificar en cada uno es si el suceso')
        L.append('**pertenece** a esas épocas.')
        L.append('')
        L.append('| | id | suceso | antes | ahora |')
        L.append('|---|---|---|---|---|')
        for eid, a, b, n in difs:
            L.append('| [ ] | %s | %s | %s | **%s** |'
                     % (eid, n[:44], ', '.join(a) or '(ninguno)', ', '.join(b)))
        L.append('')
        L.append('El motivo de casi todos: antes el tema salía del **libro que**')
        L.append('**narra** el suceso, así que sucesos del siglo I contados en un')
        L.append('libro del AT caían en carriles del AT. Eso es lo que te hacía')
        L.append('ver sucesos del Ministerio de Jesús entre los Profetas. Ahora')
        L.append('sale de la **era** del suceso.')
        L.append('')
        L.append('Los sucesos **187 (Nahúm)** y **356 (Nínive cae)** son aparte:')
        L.append('no recibían `PROFETAS` porque la lista de profetas tenía')
        L.append('«NAHUM» sin tilde y el CSV escribe «NAHÚM».')
        L.append('')

        nuevos_ev = [i for i in ev_hoy if i not in ev_base]
        perdidos = [i for i in ev_base if i not in ev_hoy]
        L.append('Sucesos en la línea de tiempo: **%d -> %d**. Nuevos: %s.'
                 % (len(ev_base), len(ev_hoy), ', '.join(map(str, nuevos_ev)) or 'ninguno'))
        L.append('Perdidos: %s.' % (', '.join(map(str, perdidos)) or '**ninguno**'))
        L.append('')

    # ------------------------------------------------------------- otras fuentes
    L.append('## 5. Otros archivos de datos')
    L.append('')
    L.append('| | archivo | cambio | qué verificar |')
    L.append('|---|---|---|---|')
    L.append('| [ ] | `curacion/manual.json` | la clave `"Booz"` pasó a `"Boaz"` '
             '| que la curación (profesión, versículo clave, cualidades) siga '
             'siendo la del mismo personaje |')
    L.append('| [ ] | `curacion/escritura_categorias.json` | en profetas menores, '
             '`"NAHUM"` -> `"NAHÚM"` | que Nahúm corresponda a los profetas '
             'menores |')
    L.append('| [ ] | `fichas_personajes.csv` y `fichas-personajes.js` | ficha 135: '
             'nombre `Booz` -> `Boaz`, y preguntas `0` -> `12` | que las 12 '
             'preguntas sean efectivamente de Boaz |')
    L.append('')

    # ------------------------------------------------------------------ plomeria
    L.append('## 6. Plomería interna (no hace falta revisarla)')
    L.append('')
    L.append('%d celdas de `etiqueta_jw`, `jw_linea` y `jw_codigo`. Son claves y'
             % len(cambios_pl))
    L.append('etiquetas que usa el pipeline para reencontrar cada fila; no hay')
    L.append('nada que factchequear. Se listan solo para que el informe sea')
    L.append('completo.')
    L.append('')
    L.append('<details>')
    L.append('<summary>Ver las %d celdas</summary>' % len(cambios_pl))
    L.append('')
    L.append('| id | campo | antes | ahora |')
    L.append('|---|---|---|---|')
    for rid, col, a, b in sorted(cambios_pl, key=lambda x: (int(x[0]), x[1])):
        L.append('| %s | `%s` | %s | %s |' % (rid, col, vacio(a)[:38], vacio(b)[:38]))
    L.append('')
    L.append('</details>')
    L.append('')

    # ------------------------------------------- 7. hallazgos que no se tocaron
    L.append('## 7. Cosas que encontré y NO toqué')
    L.append('')
    L.append('Datos que parecen incorrectos pero que no cambié, porque habría')
    L.append('tenido que inventarles contenido. Decidilos vos.')
    L.append('')
    for rid, que in [
        ('368', 'Su `descripcion` es el **nombre de otra fila**: dice «Esdras '
                'completa los libros de 1 y 2 Crónicas y Esdras; compilación '
                'final de los Salmos», que es el nombre de la fila 370. Parece '
                'una celda mal copiada. Ageo debería tener su propia '
                'descripción.'),
        ('367', 'Su `descripcion` repite su propio título, «Zacarías completa el '
                'libro de Zacarías», así que no aporta nada. Sus hermanos tienen '
                'una descripción temática, por ejemplo Amós: «Profecía de Amós '
                'contra la injusticia social.»'),
    ]:
        f = hoy.get(rid) or {}
        L.append('### [ ] id %s — %s' % (rid, f.get('nombre')))
        L.append('')
        L.append('%s' % que)
        L.append('')
        L.append('Dice hoy: `%s`' % (f.get('descripcion') or '(vacío)'))
        L.append('')

    L.append('### [ ] Dos libros que el catálogo nombra y el CSV no tiene como '
             '`libro`')
    L.append('')
    L.append('«1 CORINTIOS» y «EFESIOS» no aparecen como valor de la columna')
    L.append('`libro` en ninguna fila, porque sus sucesos son compuestos y la')
    L.append('columna solo nombra uno: la fila 160 es «Pablo escribe 1 Corintios')
    L.append('desde Éfeso, y 2 Corintios…» con `libro=2 CORINTIOS`, y la 175 es')
    L.append('«Desde Roma Pablo escribe: Efesios, Filipenses, Colosenses…» con')
    L.append('`libro=COLOSENSES`. Los sucesos quedan bien etiquetados igual, así')
    L.append('que no es un error, pero conviene saberlo.')
    L.append('')

    texto = '\n'.join(L) + '\n'
    with open(SALIDA, 'w', encoding='utf-8', newline='\n') as f:
        f.write(texto)

    print('escrito -> %s' % os.path.relpath(SALIDA, repo()))
    print('  filas nuevas: %s' % (', '.join(nuevas) or 'ninguna'))
    print('  filas con contenido cambiado: %d (%d celdas)'
          % (len(filas_ed), len(cambios_ed)))
    print('  celdas de plomería: %d' % len(cambios_pl))
    return 0


if __name__ == '__main__':
    sys.exit(main())
