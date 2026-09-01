# -*- coding: utf-8 -*-
"""Fusiona metadata JW en hechos_biblicos.csv desde:
- curacion/jw_lineas_tiempo.json (láminas B2–B13)
- curacion/jw_ministerio_jesus.json (tablas del ministerio J1–J4)
- curacion/jw_ultima_semana.json (B12: días de nisán)
- curacion/jw_viajes_pablo.json (P1–P4)

Columnas: jw_codigo, jw_linea, fecha_fin, fecha_fin_texto, etiqueta_jw,
          ministerio_fase, ministerio_cuando

Idempotente. Uso: python scripts/merge_jw_slides.py
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

HECH = db('hechos_biblicos.csv')
JW_SLIDES = repo('curacion', 'jw_lineas_tiempo.json')
JW_MINIST = repo('curacion', 'jw_ministerio_jesus.json')
JW_SEMANA = repo('curacion', 'jw_ultima_semana.json')
JW_PABLO = repo('curacion', 'jw_viajes_pablo.json')

EXTRA_COLS = [
    'jw_codigo', 'jw_linea', 'fecha_fin', 'fecha_fin_texto', 'etiqueta_jw',
    'ministerio_fase', 'ministerio_cuando',
]
BASE_COLS = [
    'id', 'nombre', 'descripcion', 'fecha_texto', 'fecha_anio', 'era',
    'lugar_antiguo', 'lat', 'lon', 'tipo_suceso', 'personajes', 'referencia',
    'libro', 'capitulo_inicio', 'capitulo_fin',
]


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


def apply_event_row(row, ev, codigo, titulo, jw_linea=None, sub_fase=False, sub_cuando=None):
    row['jw_codigo'] = codigo
    row['jw_linea'] = jw_linea or titulo
    row['etiqueta_jw'] = ev.get('etiqueta_jw') or row.get('etiqueta_jw', '')
    if sub_fase:
        row['ministerio_fase'] = titulo
        if sub_cuando:
            row['ministerio_cuando'] = sub_cuando
        elif ev.get('ministerio_cuando'):
            row['ministerio_cuando'] = ev['ministerio_cuando']
    if ev.get('fecha_fin') is not None:
        row['fecha_fin'] = str(ev['fecha_fin'])
    if ev.get('fecha_fin_texto'):
        row['fecha_fin_texto'] = ev['fecha_fin_texto']


def process_block(rows, fieldnames, by_id, block, key='lineas', jw_linea=None, sub_fase=False):
    nuevos = parches = 0
    for linea in block.get(key, []):
        codigo = linea['codigo']
        titulo = linea['titulo']
        linea_jwl = jw_linea or linea.get('linea') or titulo
        sub_cuando = linea.get('viaje_cuando')
        for ev in linea.get('eventos', []):
            ev_copy = dict(ev)
            if linea.get('fecha_fin') is not None and 'fecha_fin' not in ev_copy:
                ev_copy['fecha_fin'] = linea['fecha_fin']
            if linea.get('fecha_fin_texto') and 'fecha_fin_texto' not in ev_copy:
                ev_copy['fecha_fin_texto'] = linea['fecha_fin_texto']
            if 'hecho_id' in ev_copy:
                hid = int(ev_copy['hecho_id'])
                if hid not in by_id:
                    print('[warn] hecho_id', hid, 'no encontrado —', ev_copy.get('etiqueta_jw'))
                    continue
                apply_event_row(
                    by_id[hid], ev_copy, codigo, titulo, linea_jwl, sub_fase,
                    sub_cuando or ev_copy.get('ministerio_cuando'),
                )
                parches += 1
                print('  patch', hid, '->', codigo, ev_copy.get('etiqueta_jw', '')[:50])
            elif 'clave' in ev_copy:
                nombre = ev_copy['nombre']
                fa = str(ev_copy.get('fecha_anio', ''))
                existente = next(
                    (r for r in rows if r['nombre'] == nombre and str(r.get('fecha_anio', '')) == fa),
                    None,
                )
                if existente:
                    row = existente
                    print('  reutiliza', row['id'], nombre)
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
                    print('  nuevo', hid, nombre, '(', codigo, ')')
                apply_event_row(
                    row, ev_copy, codigo, titulo, linea_jwl, sub_fase,
                    sub_cuando or ev_copy.get('ministerio_cuando'),
                )
    return nuevos, parches


def main():
    rows = load_rows()
    if not rows:
        print('[error] hechos_biblicos.csv vacio')
        sys.exit(1)

    fieldnames = list(rows[0].keys())
    for c in EXTRA_COLS:
        if c not in fieldnames:
            fieldnames.append(c)
            for r in rows:
                r.setdefault(c, '')

    by_id = {int(r['id']): r for r in rows}
    total_n = total_p = 0

    if os.path.exists(JW_SLIDES):
        with open(JW_SLIDES, encoding='utf-8') as f:
            n, p = process_block(rows, fieldnames, by_id, json.load(f), key='lineas')
            total_n += n
            total_p += p

    if os.path.exists(JW_MINIST):
        print('-- ministerio de Jesús --')
        with open(JW_MINIST, encoding='utf-8') as f:
            n, p = process_block(rows, fieldnames, by_id, json.load(f), key='fases', sub_fase=True)
            total_n += n
            total_p += p

    if os.path.exists(JW_SEMANA):
        print('-- última semana (B12) --')
        with open(JW_SEMANA, encoding='utf-8') as f:
            spec = json.load(f)
            n, p = process_block(
                rows, fieldnames, by_id, spec, key='dias',
                jw_linea=spec.get('linea'), sub_fase=True,
            )
            total_n += n
            total_p += p

    if os.path.exists(JW_PABLO):
        print('-- viajes de Pablo --')
        with open(JW_PABLO, encoding='utf-8') as f:
            n, p = process_block(rows, fieldnames, by_id, json.load(f), key='viajes', sub_fase=True)
            total_n += n
            total_p += p

    save_rows(rows, fieldnames)
    print('OK —', len(rows), 'sucesos (+', total_n, 'nuevos,', total_p, 'parches)')


if __name__ == '__main__':
    main()
