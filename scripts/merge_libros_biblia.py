# -*- coding: utf-8 -*-
"""Fusiona la Tabla de los Libros de la Biblia en hechos_biblicos.csv.

Compara curacion/libros_biblia.json con eventos de redacción existentes.
Matching conservador: match_id → match_etiqueta → etiqueta_jw=clave.
Duplicados explícitos vía DUPLICATE_IDS. Idempotente.

Uso: python scripts/merge_libros_biblia.py
"""
import io
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo
from merge_fechas_historicas import (
    ERA_JW, EXTRA_COLS, fmt_fecha, parse_referencia, save_rows, load_rows, next_id,
)
from libros_biblia_data import LIBROS

HECH = db('hechos_biblicos.csv')
JSON_PATH = repo('curacion', 'libros_biblia.json')
REPORT = repo('docs', 'reporte-libros-biblia.md')

TRACK_FIELDS = [
    'nombre', 'descripcion', 'fecha_texto', 'fecha_anio', 'fecha_fin', 'fecha_fin_texto',
    'era', 'lugar_antiguo', 'tipo_suceso', 'personajes', 'referencia', 'libro',
    'etiqueta_jw', 'fecha_estimada', 'jw_codigo', 'jw_linea',
]

# Filas cuyas fechas, lugar y referencia se curaron desde curacion/nt_escritura.json
# (ver docs/mejora-exploracion/PASO8-EPOCAS.md). Para los Evangelios se eligió el
# período de redacción —Marcos c. 60 a c. 65— y no el período que el libro abarca
# —29 a 33 E.C.—, que es lo que traen estas tablas, así que acá no se les toca.
CURADAS = {'194', '377', '379', '380'}

# Filas que una ejecución vieja marcó como duplicadas/erróneas. La lista no
# envejeció bien: hoy las 20 existen y ninguna es basura. Están las gemelas 195
# y 197 («Evangelio según Marcos» y «según Juan»), que se decidió conservar;
# las redacciones de Job, Números y 2 Samuel (341, 342, 349), que además son el
# destino correcto de esos libros; y 15 sucesos de la vida de Jesús (401, 402 y
# 424-436: la cena conmemorativa, las diez vírgenes, Judas). Se filtraban de
# `rows` antes de `save_rows`, así que una corrida sin `--check` las borraba del
# CSV sin decir nada: el contador «a eliminar» solo mira dedupe_redaccion_rows.
# Ahora hay que pedirlo con --borrar-huerfanos.
ORPHAN_IDS = {'341', '349', '197', '342', '401', '402', '195'} | {str(i) for i in range(424, 437)}

LIBRO_CLAVES = {b['clave'] for b in LIBROS}
LIBRO_BY_CLAVE = {b['clave']: b for b in LIBROS}


def export_json():
    os.makedirs(os.path.dirname(JSON_PATH), exist_ok=True)
    payload = {'version': 1, 'fuente': 'Tabla de los Libros de la Biblia', 'libros': LIBROS}
    with open(JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def build_descripcion(book):
    parts = []
    if book.get('tiempo_abarca'):
        parts.append(f"Tiempo que abarca: {book['tiempo_abarca']}")
    parts.append(f"Escritor: {book['escritor']}")
    lugar = book.get('lugar') or '—'
    if book.get('lugar_incerto'):
        lugar = f'{lugar} (?)'
    parts.append(f"Lugar de escritura: {lugar}")
    return '. '.join(parts) + '.'


def es_descripcion_generada(texto):
    """¿La descripción actual la escribió build_descripcion() o es curada?

    Sin esto el merge pisa los perfiles editoriales de los Evangelios (audiencia,
    porcentaje de contenido exclusivo) con un «Escritor: … Lugar de escritura: …».
    """
    t = (texto or '').strip()
    if not t:
        return True
    return 'Escritor:' in t and 'Lugar de escritura:' in t


def apply_book(row, book, duenio_etiqueta=None):
    prefijo = book.get('prefijo') or ''
    anio = int(book['anio'])
    ref = book.get('referencia') or ''
    _, ci, cf = parse_referencia(ref)
    curada = str(row.get('id', '')).strip() in CURADAS

    # Manda el CSV, no la tabla. La tabla modela cada fila como «X completado»,
    # con la referencia al último versículo del libro como prueba de que
    # terminó; el CSV la modela como «X escribe/completa el libro», con la
    # referencia al primero. Se eligió el modelo del CSV, así que estos campos
    # solo se rellenan cuando están vacíos: nunca se pisa un valor curado.
    # Sin esto el merge renombraba «Pablo escribe 1 Corintios desde Éfeso» a
    # «1 Corintios completado» y cambiaba `Amós 1:1` por `Amós 9:15`.
    for campo, valor in (('nombre', book['nombre']),
                         ('referencia', ref),
                         ('era', book['era']),
                         ('tipo_suceso', book.get('tipo_suceso') or 'redacción'),
                         ('personajes', book['escritor']),
                         ('libro', book['libro'])):
        # En las curadas la referencia se decidió a mano: la de Mateo (377) va
        # vacía a propósito, así que ni siquiera se rellena.
        if curada and campo == 'referencia':
            continue
        if valor and not (row.get(campo) or '').strip():
            row[campo] = valor

    if es_descripcion_generada(row.get('descripcion')):
        row['descripcion'] = build_descripcion(book)

    # `lugar_antiguo` es la excepción: acá sí manda la tabla, porque es el lugar
    # donde el escritor escribió y el CSV venía guardando a veces el destino del
    # contenido (Nahúm decía «Nínive», que es contra quién profetiza, no dónde
    # lo escribió; Amós decía «Israel» y escribió en Judá).
    if not curada:
        lugar = book.get('lugar') or ''
        if book.get('lugar_incerto') and lugar and '(?)' not in lugar:
            lugar = f'{lugar} (?)'
        actual = (row.get('lugar_antiguo') or '').strip()
        # Si lo que ya hay contiene al lugar de la tabla, es más específico y se
        # queda: «Tel-abib, Babilonia» no se degrada a «Babilonia», y no se
        # pierde el «(?)» de «Éfeso, o cerca (?)», que la tabla no trae porque
        # tiene lugar_incerto en False. Cuando no hay esa relación gana la
        # tabla, que es lo que corrige Nahúm («Nínive» -> «Judá») y Amós.
        if lugar and _norm(lugar) not in _norm(actual):
            row['lugar_antiguo'] = lugar

    if ci and not curada and not (row.get('capitulo_inicio') or '').strip():
        row['capitulo_inicio'] = ci
        row['capitulo_fin'] = cf or ci

    anio_fin = book.get('anio_fin')
    prefijo_fin = book.get('prefijo_fin') or ''
    # Las fechas del CSV ya se curaron (los cuatro proféticos con el período que
    # abarcan, los Evangelios con su período de redacción). La tabla trae otro
    # criterio y quería, por ejemplo, vaciar el `fecha_fin` de 1 Pedro. Solo se
    # escriben cuando la fila todavía no tiene año.
    ya_tiene_fecha = bool((row.get('fecha_anio') or '').strip())
    if curada or ya_tiene_fecha:
        pass
    elif anio_fin is None:
        row['fecha_anio'] = str(anio)
        row['fecha_texto'] = fmt_fecha(prefijo, anio)
        row['fecha_fin'] = ''
        row['fecha_fin_texto'] = ''
    else:
        # `anio` es cuándo se completó el libro y `anio_fin` el otro extremo del
        # período que abarca, que en a.E.C. es el más antiguo. Hay que ordenarlos:
        # escribirlos crudos dejaba el fin antes del inicio y la barra se dibujaba
        # como un punto de 4 px con las fechas dadas vuelta (ids 106, 171, 172, 187).
        (ini, pref_ini), (fin, pref_fin) = sorted(
            [(int(anio_fin), prefijo_fin), (anio, prefijo)])
        row['fecha_anio'] = str(ini)
        row['fecha_texto'] = fmt_fecha(pref_ini, ini)
        row['fecha_fin'] = str(fin)
        row['fecha_fin_texto'] = fmt_fecha(pref_fin, fin)

    codigo, linea = ERA_JW.get(book['era'], ('', ''))
    row['jw_codigo'] = codigo or row.get('jw_codigo', '')
    row['jw_linea'] = linea or row.get('jw_linea', '')
    # `etiqueta_jw` es plomería interna —es por donde el merge reencuentra la
    # fila la próxima vez—, así que se normaliza a la clave del catálogo. Pero
    # nunca si otra fila ya la tiene: dos filas con la misma etiqueta hacen que
    # el deduplicador de gen_timeline.py descarte una.
    duenio = (duenio_etiqueta or {}).get(book['clave'])
    if duenio is None or str(duenio) == str(row.get('id', '')).strip():
        row['etiqueta_jw'] = book['clave']
    row['fecha_estimada'] = '1' if prefijo in ('a', 'c', 'd') else ''


def snapshot_row(row):
    return {k: (row.get(k) or '') for k in TRACK_FIELDS}


def diff_rows(before, after):
    return [(k, before.get(k, ''), after.get(k, '')) for k in TRACK_FIELDS if before.get(k, '') != after.get(k, '')]


def _norm(s):
    s = unicodedata.normalize('NFKD', (s or '').lower())
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return re.sub(r'[^a-z0-9]+', ' ', s).strip()


def destino_valido(row, book):
    """¿La fila destino es de verdad el suceso de redacción de ESTE libro?

    Los `match_id` del catálogo están corridos y `find_primary` los usaba sin
    comprobar nada, así que el merge pisaba sucesos ajenos: «Nace Jesús en
    Belén» se convertía en «Evangelio según Marcos completado» (id 386), y
    «Sana a un paralítico» en «Éxodo completado» (id 399). Peor todavía, tres
    apuntaban a la redacción de otro libro (Génesis a la de Job).

    Dos condiciones, y las dos hacen falta: que sea un suceso de redacción y
    que hable del mismo libro. La primera sola no alcanza —Génesis y Job son
    las dos de redacción—, y la segunda sola tampoco.
    """
    if not _norm(row.get('tipo_suceso')).startswith('redacc'):
        return False, 'no es un suceso de redacción (tipo=%s)' % (
            (row.get('tipo_suceso') or '—'))

    libro_cat = _norm(book.get('libro'))
    nombre = _norm(row.get('nombre'))
    if libro_cat and _norm(row.get('libro')) == libro_cat:
        return True, None
    if libro_cat and libro_cat in nombre:
        return True, None
    clave_txt = _norm(book['clave'].replace('_', ' '))
    if clave_txt and clave_txt in nombre:
        return True, None
    return False, 'es redacción pero de otro libro (%s)' % (
        (row.get('nombre') or '—')[:52])


def find_primary(rows, book, by_id, claimed, rechazos=None):
    clave = book['clave']
    etiqueta = (book.get('match_etiqueta') or '').strip()

    # La etiqueta canónica va primero, antes que match_id. Una fila que ya la
    # lleva es una decisión tomada; los match_id, en cambio, están corridos.
    # Con el orden viejo el libro `lucas_evangelio` se iba a su match_id 196 y
    # le escribía la etiqueta que la 194 ya tenía: quedaban dos filas con
    # `lucas_evangelio` y el deduplicador de gen_timeline.py se comía una,
    # justo la curada.
    if clave:
        for r in rows:
            if int(r['id']) in claimed:
                continue
            if r.get('etiqueta_jw') != clave:
                continue
            ok, motivo = destino_valido(r, book)
            if ok:
                return r, 'etiqueta_jw'
            if rechazos is not None:
                rechazos.append((book['clave'], int(r['id']), motivo))

    mid = (book.get('match_id') or '').strip()
    if mid:
        hid = int(mid)
        if hid in by_id and hid not in claimed:
            row = by_id[hid]
            ok, motivo = destino_valido(row, book)
            if ok:
                return row, 'match_id'
            if rechazos is not None:
                rechazos.append((book['clave'], hid, motivo))

    # También pasa por el guard: una etiqueta mal puesta llega igual de lejos
    # que un id corrido.
    if etiqueta:
        for r in rows:
            if int(r['id']) in claimed:
                continue
            if r.get('etiqueta_jw') != etiqueta:
                continue
            ok, motivo = destino_valido(r, book)
            if ok:
                return r, 'match_etiqueta'
            if rechazos is not None:
                rechazos.append((book['clave'], int(r['id']), motivo))

    return None, None


def pick_canonical_id(group, clave):
    book = LIBRO_BY_CLAVE.get(clave)
    if book and book.get('match_id'):
        mid = int(book['match_id'])
        if any(int(r['id']) == mid for r in group):
            return mid
    for r in group:
        if (r.get('etiqueta_jw') or '').strip() == clave:
            return int(r['id'])
    return min(int(r['id']) for r in group)


def dedupe_redaccion_rows(rows):
    from collections import defaultdict
    by_clave = defaultdict(list)
    for r in rows:
        ej = (r.get('etiqueta_jw') or '').strip()
        if ej in LIBRO_CLAVES and (r.get('tipo_suceso') or '').startswith('redac'):
            by_clave[ej].append(r)
    remove = set()
    for clave, group in by_clave.items():
        if len(group) <= 1:
            continue
        keep = pick_canonical_id(group, clave)
        for r in group:
            rid = int(r['id'])
            if rid == keep:
                continue
            # Las filas curadas no se borran: se decidió conservar las dos series
            # de los Evangelios porque las preguntas están atadas a ids concretos
            # y curacion/grupos.json referencia unas y otras.
            if str(rid) in CURADAS:
                print(f'  keep  {rid} -> curada, no se deduplica contra {keep}')
                continue
            remove.add(rid)
    if remove:
        print(f'[info] eliminados {len(remove)} duplicados de redacción: {sorted(remove)}')
    return [r for r in rows if int(r['id']) not in remove], remove


def write_report(ya_teniamos, agregados, cambios, eliminados=None):
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    lines = [
        '# Reporte: Tabla de los Libros de la Biblia',
        '',
        f'Total libros en catálogo: **{len(LIBROS)}**',
        f'- Ya teníamos (sin cambios): **{len(ya_teniamos)}**',
        f'- Agregado (nuevos ids): **{len(agregados)}**',
        f'- Cambió (field diffs): **{len(cambios)}**',
    ]
    if eliminados:
        lines.append(f'- Eliminados (duplicados): **{len(eliminados)}**')
    lines += [
        '',
        '---',
        '',
        '## Ya teníamos',
        '',
    ]
    if ya_teniamos:
        for item in ya_teniamos:
            lines.append(f"- **{item['nombre']}** (id {item['id']}, `{item['clave']}`)")
    else:
        lines.append('_Ninguno._')

    lines += ['', '## Agregado', '']
    if agregados:
        for item in agregados:
            b = item['book']
            lines.append(
                f"- **id {item['id']}** — {b['nombre']} ({b['libro']}), "
                f"{fmt_fecha(b.get('prefijo', ''), b['anio'])}, escritor: {b['escritor']}"
            )
    else:
        lines.append('_Ninguno._')

    lines += ['', '## Cambió', '']
    if cambios:
        for item in cambios:
            lines.append(f"### id {item['id']} — {item['nombre']} (`{item['clave']}`)")
            lines.append(f"_Match: {item['how']}_")
            lines.append('')
            for k, b, a in item['diffs']:
                bb = (b or '—').replace('|', '\\|')
                aa = (a or '—').replace('|', '\\|')
                lines.append(f"- **{k}**: `{bb}` → `{aa}`")
            lines.append('')
    else:
        lines.append('_Ninguno._')

    if eliminados:
        lines += ['', '## Eliminados (duplicados)', '']
        for rid in sorted(eliminados):
            lines.append(f'- id **{rid}**')

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    export_json()
    print(f'[info] catálogo -> {JSON_PATH} ({len(LIBROS)} libros)')

    borrar_huerfanos = '--borrar-huerfanos' in sys.argv
    crear_faltantes = '--crear-faltantes' in sys.argv

    rows = load_rows()
    huerfanos_vivos = sorted(
        (r['id'] for r in rows if r.get('id') in ORPHAN_IDS), key=int)
    if borrar_huerfanos:
        rows = [r for r in rows if r.get('id') not in ORPHAN_IDS]
    fieldnames = list(rows[0].keys())
    for c in EXTRA_COLS:
        if c not in fieldnames:
            fieldnames.append(c)
            for r in rows:
                r.setdefault(c, '')

    by_id = {int(r['id']): r for r in rows}
    # Quién es dueño de cada etiqueta hoy, para no duplicarla al normalizar.
    duenio_etiqueta = {}
    for r in rows:
        e = (r.get('etiqueta_jw') or '').strip()
        if e:
            duenio_etiqueta.setdefault(e, r['id'])
    claimed = set()
    ya_teniamos = []
    agregados = []
    cambios = []
    rechazados = []
    faltantes = []
    compartidas = []

    for book in LIBROS:
        clave = book['clave']
        # Cuatro filas del CSV son compuestas: un suceso cubre varios libros
        # («Moisés completa Éxodo y Levítico», «Esdras completa 1 y 2 Crónicas
        # y Esdras; compilación final de los Salmos»). Como una fila solo puede
        # ser reclamada por un libro, los demás se declaran acá. No hay que
        # fusionarlos ni crearlos: ya están representados.
        if (book.get('comparte_fila') or '').strip():
            compartidas.append((clave, book['comparte_fila']))
            print(f"  comparte {clave} -> fila {book['comparte_fila']}")
            continue
        rechazos = []
        primary, how = find_primary(rows, book, by_id, claimed, rechazos)
        if not primary and rechazos:
            # Había un candidato y el guard lo rechazó. Crear una fila nueva acá
            # sería peor que no hacer nada: quedaría un suceso de redacción
            # duplicado además del que ya existe mal apuntado. Se reporta y se
            # deja el libro sin tocar, para arreglar el `match_id` a mano.
            rechazados.append((clave, rechazos))
            for _, hid, motivo in rechazos:
                print(f'  RECHAZO {clave} -> id {hid}: {motivo}')
            continue
        if not primary:
            # Sin fila que fusionar, inventar una suele duplicar lo que ya
            # existe con otro nombre: Levítico ya está en la fila 340 («Moisés
            # completa Éxodo y Levítico»), pero el catálogo lo apunta a la 342 y
            # esa cayó en ORPHAN_IDS, así que el merge creaba un «Levítico
            # completado» aparte. Crear filas ahora se pide explícitamente.
            if not crear_faltantes:
                faltantes.append(clave)
                print(f'  FALTA   {clave}: sin suceso de redacción que fusionar')
                continue
            hid = next_id(rows)
            row = {c: '' for c in fieldnames}
            row['id'] = str(hid)
            apply_book(row, book, duenio_etiqueta)
            rows.append(row)
            by_id[hid] = row
            claimed.add(hid)
            agregados.append({'id': hid, 'book': book})
            print(f'  nuevo {hid} -> {clave}')
            continue

        rid = int(primary['id'])
        before = snapshot_row(primary)
        apply_book(primary, book, duenio_etiqueta)
        after = snapshot_row(primary)
        diffs = diff_rows(before, after)
        claimed.add(rid)
        if diffs:
            cambios.append({
                'id': rid, 'nombre': book['nombre'], 'clave': clave, 'how': how, 'diffs': diffs,
            })
            print(f'  patch {rid} ({how}) -> {clave}')
        else:
            ya_teniamos.append({'id': rid, 'nombre': book['nombre'], 'clave': clave})
            print(f'  ok    {rid} ({how}) -> {clave}')

    rows, eliminados = dedupe_redaccion_rows(rows)

    # --check no escribe: este script reescribe la base externa y además puede
    # borrar filas duplicadas, así que conviene poder ver qué haría antes.
    if '--check' in sys.argv:
        print(f'\n[check] no se escribe nada. {len(cambios)} cambio(s),'
              f' {len(agregados)} nuevo(s), {len(eliminados)} a eliminar,'
              f' {len(rechazados)} sin destino válido, {len(faltantes)} sin fila.')
        for c in cambios:
            print(f"  fila {c['id']} ({c['clave']}):")
            for col, antes, ahora in c['diffs']:
                print(f'      {col}: {antes!r} -> {ahora!r}')
        for rid in sorted(eliminados):
            print(f'  ELIMINARIA la fila {rid}')
        if rechazados:
            print('\n[check] match_id corridos en curacion/libros_biblia.json'
                  ' (el libro queda sin fusionar):')
            for clave, motivos in rechazados:
                for _, hid, motivo in motivos:
                    print(f'  {clave:<16} id {hid}: {motivo}')
        if compartidas:
            print(f'\n[check] {len(compartidas)} libro(s) que comparten fila con'
                  ' otro y ya están representados:')
            for clave, fila in compartidas:
                print(f'  {clave:<16} -> fila {fila}')
        if faltantes:
            print('\n[check] sin suceso de redacción que fusionar'
                  ' (con --crear-faltantes se crearían):')
            print('  ' + ', '.join(faltantes))
        if huerfanos_vivos:
            print(f'\n[check] ORPHAN_IDS: {len(huerfanos_vivos)} fila(s) que'
                  ' existen y hoy NO se borran (hace falta --borrar-huerfanos):')
            print('  ' + ', '.join(huerfanos_vivos))
        return 1 if (cambios or agregados or eliminados) else 0

    save_rows(rows, fieldnames)
    write_report(ya_teniamos, agregados, cambios, eliminados)
    print(f'OK — {len(rows)} sucesos (+{len(agregados)} nuevos, {len(cambios)} cambios, {len(ya_teniamos)} ok, -{len(eliminados)} dup)')
    print(f'Reporte -> {REPORT}')
    return 0


if __name__ == '__main__':
    sys.exit(main() or 0)
