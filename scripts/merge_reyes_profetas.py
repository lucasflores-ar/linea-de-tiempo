# -*- coding: utf-8 -*-
"""Fusiona datos de láminas A6 (reyes/profetas) en hechos_biblicos.csv."""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

HECH = db('hechos_biblicos.csv')
SPEC = repo('curacion', 'jw_reyes_profetas.json')
EXTRA = ['jw_codigo', 'jw_linea', 'fecha_fin', 'fecha_fin_texto', 'etiqueta_jw', 'fecha_estimada']
ISRAEL_KEYS = {
    'jeroboan', 'nadab', 'basa', 'ela', 'zimri', 'omri', 'acab', 'jehu',
    'jehoacaz', 'jeoas_israel', 'zacarias', 'salum', 'menahem', 'pecah',
    'osea_israel', 'ocozias_israel', 'jehoram_israel',
}


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


def fmt_rango(ini, fin):
    if ini == fin:
        return f'{abs(ini)} a. E. C.'
    return f'{abs(ini)}-{abs(fin)} a. E. C.'


def is_israel(clave):
    return any(k in clave for k in ISRAEL_KEYS)


def rey_row(rey, codigo, titulo, fieldnames, rows, by_id):
    clave = rey.get('clave', '')
    nombre = f"Reinado de {rey['nombre']}"
    ini, fin = rey['inicio'], rey['fin']
    existente = next(
        (r for r in rows if r.get('etiqueta_jw') == clave or r['nombre'] == nombre
         or (nombre.replace('Rehoboam', 'Roboam') == r['nombre'])),
        None,
    )
    if existente:
        row = existente
        print('  reutiliza', row['id'], nombre)
    else:
        hid = next_id(rows)
        row = {c: '' for c in fieldnames}
        row['id'] = str(hid)
        dur = rey.get('duracion_texto') or f"{rey.get('anos', '')} años"
        row['nombre'] = nombre
        row['descripcion'] = f"Reinado de {rey['nombre']} ({dur})."
        row['fecha_texto'] = fmt_rango(ini, fin)
        row['fecha_anio'] = str(ini)
        row['fecha_fin'] = str(fin)
        row['fecha_fin_texto'] = f'{abs(fin)} a. E. C.'
        row['era'] = 'REINO DIVIDIDO'
        if is_israel(clave):
            row['lugar_antiguo'] = 'Samaria'
            row['lat'] = '32.28'
            row['lon'] = '35.19'
        else:
            row['lugar_antiguo'] = 'Jerusalén'
            row['lat'] = '31.78'
            row['lon'] = '35.21'
        row['tipo_suceso'] = 'reinado'
        row['personajes'] = rey['nombre']
        row['referencia'] = rey.get('referencia', '')
        row['libro'] = '2 REYES'
        row['capitulo_inicio'] = '1'
        row['capitulo_fin'] = '1'
        rows.append(row)
        by_id[hid] = row
        print('  nuevo', hid, nombre)
    row['jw_codigo'] = codigo
    row['jw_linea'] = titulo
    row['etiqueta_jw'] = clave or rey['nombre']
    if rey.get('circa') and not row['fecha_texto'].startswith('c.'):
        row['fecha_texto'] = 'c. ' + row['fecha_texto']
    return row


def patch_profeta(by_id, prof, codigo, titulo):
    for hid in prof.get('hecho_ids', []):
        if hid not in by_id:
            print('[warn] hecho profeta', hid, 'no encontrado')
            continue
        row = by_id[hid]
        ini, fin = prof['inicio'], prof['fin']
        txt = fmt_rango(ini, fin) if ini != fin else f'{abs(ini)} a. E. C.'
        if not prof.get('fechas_exactas'):
            txt = 'c. ' + txt
        row['fecha_texto'] = txt
        row['fecha_anio'] = str(ini)
        row['fecha_fin'] = str(fin) if fin != ini else ''
        row['fecha_fin_texto'] = f'{abs(fin)} a. E. C.' if fin != ini else ''
        row['jw_codigo'] = codigo
        row['jw_linea'] = titulo
        row['etiqueta_jw'] = prof['nombre']
        row['fecha_estimada'] = '0' if prof.get('fechas_exactas') else '1'
        print('  patch profeta', hid, prof['nombre'], row['fecha_texto'])


def main():
    rows = load_rows()
    fieldnames = list(rows[0].keys())
    for c in EXTRA:
        if c not in fieldnames:
            fieldnames.append(c)
            for r in rows:
                r.setdefault(c, '')

    with open(SPEC, encoding='utf-8') as f:
        spec = json.load(f)

    by_id = {int(r['id']): r for r in rows}
    nuevos = 0

    for parte in spec.get('partes', []):
        codigo, titulo = parte['codigo'], parte['titulo']
        print('--', codigo, '--')
        for rey in parte.get('judah', []) + parte.get('israel', []):
            n_before = len(rows)
            rey_row(rey, codigo, titulo, fieldnames, rows, by_id)
            if len(rows) > n_before:
                nuevos += 1
        for prof in parte.get('profetas', []):
            patch_profeta(by_id, prof, codigo, titulo)
        for ev in parte.get('eventos_finales', []):
            hid = int(ev['hecho_id'])
            if hid in by_id:
                by_id[hid]['jw_codigo'] = codigo
                by_id[hid]['jw_linea'] = titulo
                by_id[hid]['etiqueta_jw'] = ev.get('etiqueta_jw', '')
                print('  patch evento', hid)

    save_rows(rows, fieldnames)
    print('OK —', len(rows), 'sucesos (+', nuevos, 'reinados nuevos)')


if __name__ == '__main__':
    main()
