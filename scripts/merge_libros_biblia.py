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
import sys

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

# filas duplicadas/erróneas de ejecuciones previas
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


def apply_book(row, book):
    prefijo = book.get('prefijo') or ''
    anio = int(book['anio'])
    ref = book.get('referencia') or ''
    _, ci, cf = parse_referencia(ref)

    row['nombre'] = book['nombre']
    row['descripcion'] = build_descripcion(book)
    row['fecha_texto'] = fmt_fecha(prefijo, anio)
    row['fecha_anio'] = str(anio)
    row['era'] = book['era']
    row['tipo_suceso'] = book.get('tipo_suceso') or 'redacción'
    row['personajes'] = book['escritor']
    lugar = book.get('lugar') or ''
    if book.get('lugar_incerto') and lugar and '(?)' not in lugar:
        lugar = f'{lugar} (?)'
    row['lugar_antiguo'] = lugar
    if ref:
        row['referencia'] = ref
    row['libro'] = book['libro']
    if ci:
        row['capitulo_inicio'] = ci
        row['capitulo_fin'] = cf or ci

    anio_fin = book.get('anio_fin')
    if anio_fin is not None:
        row['fecha_fin'] = str(anio_fin)
        pref_fin = book.get('prefijo_fin') or ''
        row['fecha_fin_texto'] = fmt_fecha(pref_fin, int(anio_fin))
    else:
        row['fecha_fin'] = ''
        row['fecha_fin_texto'] = ''

    codigo, linea = ERA_JW.get(book['era'], ('', ''))
    row['jw_codigo'] = codigo or row.get('jw_codigo', '')
    row['jw_linea'] = linea or row.get('jw_linea', '')
    row['etiqueta_jw'] = book['clave']
    row['fecha_estimada'] = '1' if prefijo in ('a', 'c', 'd') else ''


def snapshot_row(row):
    return {k: (row.get(k) or '') for k in TRACK_FIELDS}


def diff_rows(before, after):
    return [(k, before.get(k, ''), after.get(k, '')) for k in TRACK_FIELDS if before.get(k, '') != after.get(k, '')]


def find_primary(rows, book, by_id, claimed):
    clave = book['clave']
    etiqueta = (book.get('match_etiqueta') or '').strip()

    mid = (book.get('match_id') or '').strip()
    if mid:
        hid = int(mid)
        if hid in by_id and hid not in claimed:
            return by_id[hid], 'match_id'

    for r in rows:
        rid = int(r['id'])
        if rid in claimed:
            continue
        if r.get('etiqueta_jw') == clave:
            return r, 'etiqueta_jw'

    if etiqueta:
        for r in rows:
            rid = int(r['id'])
            if rid in claimed:
                continue
            if r.get('etiqueta_jw') == etiqueta:
                return r, 'match_etiqueta'

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
            if int(r['id']) != keep:
                remove.add(int(r['id']))
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

    rows = load_rows()
    rows = [r for r in rows if r.get('id') not in ORPHAN_IDS]
    fieldnames = list(rows[0].keys())
    for c in EXTRA_COLS:
        if c not in fieldnames:
            fieldnames.append(c)
            for r in rows:
                r.setdefault(c, '')

    by_id = {int(r['id']): r for r in rows}
    claimed = set()
    ya_teniamos = []
    agregados = []
    cambios = []

    for book in LIBROS:
        clave = book['clave']
        primary, how = find_primary(rows, book, by_id, claimed)
        if not primary:
            hid = next_id(rows)
            row = {c: '' for c in fieldnames}
            row['id'] = str(hid)
            apply_book(row, book)
            rows.append(row)
            by_id[hid] = row
            claimed.add(hid)
            agregados.append({'id': hid, 'book': book})
            print(f'  nuevo {hid} -> {clave}')
            continue

        rid = int(primary['id'])
        before = snapshot_row(primary)
        apply_book(primary, book)
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
    save_rows(rows, fieldnames)
    write_report(ya_teniamos, agregados, cambios, eliminados)
    print(f'OK — {len(rows)} sucesos (+{len(agregados)} nuevos, {len(cambios)} cambios, {len(ya_teniamos)} ok, -{len(eliminados)} dup)')
    print(f'Reporte -> {REPORT}')


if __name__ == '__main__':
    main()
