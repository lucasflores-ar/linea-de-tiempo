# -*- coding: utf-8 -*-
"""Fusiona sucesos post-diluvianos en hechos_biblicos.csv desde curacion/jw_post_diluviano.json.

Parchea sucesos existentes y crea nuevos por clave. Idempotente.
Uso: python scripts/merge_post_diluviano.py
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

HECH = db('hechos_biblicos.csv')
SPEC = repo('curacion', 'jw_post_diluviano.json')

EXTRA_COLS = [
    'jw_codigo', 'jw_linea', 'fecha_fin', 'fecha_fin_texto', 'etiqueta_jw',
    'ministerio_fase', 'ministerio_cuando',
]
BASE_COLS = [
    'id', 'nombre', 'descripcion', 'fecha_texto', 'fecha_anio', 'era',
    'lugar_antiguo', 'lat', 'lon', 'tipo_suceso', 'personajes', 'referencia',
    'libro', 'capitulo_inicio', 'capitulo_fin',
]
PATCHABLE = set(BASE_COLS) - {'id'}


def load_rows():
    with open(HECH, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def save_rows(rows, fieldnames):
    with open(HECH, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)


def next_id(rows):
    return max(int(r['id']) for r in rows) + 1


def apply_jw(row, ev, codigo, titulo):
    row['jw_codigo'] = codigo
    row['jw_linea'] = titulo
    if 'clave' in ev:
        row['etiqueta_jw'] = ev['clave']
    elif ev.get('etiqueta_jw'):
        row['etiqueta_jw'] = ev['etiqueta_jw']
    if ev.get('fecha_fin') is not None:
        row['fecha_fin'] = str(ev['fecha_fin'])
    if ev.get('fecha_fin_texto'):
        row['fecha_fin_texto'] = ev['fecha_fin_texto']


def apply_fields(row, ev):
    for k in PATCHABLE:
        if k in ev and ev[k] is not None:
            row[k] = str(ev[k])


def main():
    if not os.path.exists(SPEC):
        print('[skip] no existe', SPEC)
        return

    rows = load_rows()
    fieldnames = list(rows[0].keys())
    for c in EXTRA_COLS:
        if c not in fieldnames:
            fieldnames.append(c)
            for r in rows:
                r.setdefault(c, '')

    by_id = {int(r['id']): r for r in rows}
    nuevos = parches = 0

    with open(SPEC, encoding='utf-8') as f:
        block = json.load(f)

    for linea in block.get('lineas', []):
        codigo = linea['codigo']
        titulo = linea['titulo']
        for ev in linea.get('eventos', []):
            ev_copy = dict(ev)
            if 'hecho_id' in ev_copy:
                hid = int(ev_copy['hecho_id'])
                if hid not in by_id:
                    print('[warn] hecho_id', hid, 'no encontrado')
                    continue
                row = by_id[hid]
                apply_fields(row, ev_copy)
                apply_jw(row, ev_copy, codigo, titulo)
                parches += 1
                print('  patch', hid, '->', ev_copy.get('etiqueta_jw', '')[:50])
            elif 'clave' in ev_copy:
                clave = ev_copy['clave']
                existente = next(
                    (r for r in rows if r.get('etiqueta_jw') == clave),
                    None,
                )
                if existente:
                    row = existente
                    print('  reutiliza', row['id'], row['nombre'])
                else:
                    hid = next_id(rows)
                    row = {c: '' for c in fieldnames}
                    row['id'] = str(hid)
                    for k in BASE_COLS:
                        if k == 'id':
                            continue
                        if k in ev_copy:
                            row[k] = str(ev_copy[k]) if ev_copy[k] is not None else ''
                    rows.append(row)
                    by_id[hid] = row
                    nuevos += 1
                    print('  nuevo', hid, ev_copy['nombre'], '(', codigo, ')')
                apply_fields(row, ev_copy)
                apply_jw(row, ev_copy, codigo, titulo)
                row['etiqueta_jw'] = clave

    save_rows(rows, fieldnames)
    print('OK —', len(rows), 'sucesos (+', nuevos, 'nuevos,', parches, 'parches)')


if __name__ == '__main__':
    main()
