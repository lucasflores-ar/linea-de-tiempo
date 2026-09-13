# -*- coding: utf-8 -*-
"""Importa solo altas nuevas del catálogo curado, sin sincronizar registros existentes.

Uso: python scripts/import_sucesos_aislados.py --check
     python scripts/import_sucesos_aislados.py --apply --db-dir <snapshot>
"""
import argparse
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from merge_fechas_historicas import apply_row, norm_era, parse_referencia, fmt_fecha, normalize_ref
from paths import repo

TSV = repo('curacion', 'fechas_historicas.tsv')
FIELDS = None


def read_rows(path):
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def load_events():
    with open(TSV, encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f, delimiter='\t'))


def new_events(rows, events, min_year=None, max_year=None):
    labels = {(r.get('etiqueta_jw') or '').strip() for r in rows}
    ids = {str(r.get('id', '')).strip() for r in rows}
    names = {(r.get('nombre') or '').strip() for r in rows}
    out = []
    for ev in events:
        year = int(ev['anio'])
        if min_year is not None and year < min_year:
            continue
        if max_year is not None and year > max_year:
            continue
        key = ev['clave'].strip()
        if not key or ' ' in key:
            raise ValueError(f'clave inválida: {key!r}')
        if key in labels:
            continue
        if ev.get('match_id', '').strip():
            if ev['match_id'].strip() in ids:
                continue
            raise ValueError(f'alta aislada con match_id; requiere revisión explícita: {key}')
        if ev['nombre'].strip() in names:
            raise ValueError(f'nombre duplicado; no se agregará automáticamente: {ev["nombre"]}')
        out.append(ev)
    return out


def write_rows(path, rows, fields):
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--verify', action='store_true')
    ap.add_argument('--db-dir', default=None)
    ap.add_argument('--min-year', type=int, default=None)
    ap.add_argument('--max-year', type=int, default=None)
    args = ap.parse_args()
    if sum((args.check, args.apply, args.verify)) != 1:
        ap.error('elige exactamente uno de --check, --apply o --verify')

    if args.db_dir:
        db_path = os.path.join(args.db_dir, 'hechos_biblicos.csv')
    else:
        from paths import db
        db_path = db('hechos_biblicos.csv')
    rows = read_rows(db_path)
    events = new_events(rows, load_events(), args.min_year, args.max_year)
    if args.check:
        print(f'OK — {len(events)} altas nuevas, 0 registros existentes modificados')
        for ev in events:
            print(f"  nuevo -> {ev['clave']} | {fmt_fecha(ev['prefijo'], int(ev['anio']))}")
        return
    if args.verify:
        print(f'OK — catálogo válido; {len(events)} altas aún no aplicadas')
        return

    fields = list(rows[0].keys())
    next_id = max(int(r['id']) for r in rows) + 1
    added = []
    for ev in events:
        row = {field: '' for field in fields}
        row['id'] = str(next_id)
        apply_row(row, ev, preserve_libro_meta=False)
        rows.append(row)
        added.append((next_id, ev['clave']))
        next_id += 1
    write_rows(db_path, rows, fields)
    print(f'OK — agregados {len(added)} sucesos; no se modificó ningún id existente')
    for rid, key in added:
        print(f'  id {rid} <- {key}')


if __name__ == '__main__':
    main()
