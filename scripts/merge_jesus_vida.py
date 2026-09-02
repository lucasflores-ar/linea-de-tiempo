# -*- coding: utf-8 -*-
"""Fusiona sucesos detallados de la vida de Jesús desde curacion/jesus_vida_eventos.tsv.

- fecha_anio: solo el año (negativo = a.E.C., positivo = E.C.)
- ministerio_cuando: estación, fiesta o día de nisán (no va en fecha_anio)
- hecho_id: parchea fila existente; vacío = nueva fila por clave idempotente

También regenera curacion/jw_ministerio_jesus.json y curacion/jw_ultima_semana.json.

Uso: python scripts/merge_jesus_vida.py
"""
import csv
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

HECH = db('hechos_biblicos.csv')
TSV = repo('curacion', 'jesus_vida_eventos.tsv')
JW_MIN = repo('curacion', 'jw_ministerio_jesus.json')
JW_SEM = repo('curacion', 'jw_ultima_semana.json')
GRUPOS = repo('curacion', 'grupos.json')

EXTRA_COLS = [
    'jw_codigo', 'jw_linea', 'fecha_fin', 'fecha_fin_texto', 'etiqueta_jw',
    'ministerio_fase', 'ministerio_cuando', 'fecha_estimada',
]
BASE_COLS = [
    'id', 'nombre', 'descripcion', 'fecha_texto', 'fecha_anio', 'era',
    'lugar_antiguo', 'lat', 'lon', 'tipo_suceso', 'personajes', 'referencia',
    'libro', 'capitulo_inicio', 'capitulo_fin',
]

FASES_MIN = {'J0', 'J1', 'J2', 'J3', 'J4'}
LINEA_MIN = 'Sucesos principales de la vida terrestre de Jesús'
LINEA_SEM = 'La última semana de Jesús en la tierra'


def fmt_fecha(prefijo, anio):
    if anio < 0:
        base = f'{abs(anio)} a. E. C.'
    else:
        base = f'{anio} e. c.'
    p = (prefijo or '').strip().lower()
    if p == 'c':
        return f'c. {base}'
    if p == 'd':
        return f'd. {base}'
    if p == 'a':
        return f'a. {base}'
    return base


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


def read_tsv():
    if not os.path.exists(TSV):
        print('[error] falta', TSV)
        sys.exit(1)
    with open(TSV, encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f, delimiter='\t'))


def row_to_event(r):
    anio = int(r['fecha_anio'])
    ev = {
        'clave': r['clave'].strip(),
        'nombre': r['nombre'].strip(),
        'descripcion': (r.get('descripcion') or '').strip(),
        'fecha_texto': fmt_fecha(r.get('fecha_prefijo'), anio),
        'fecha_anio': anio,
        'era': 'E.C.',
        'lugar_antiguo': (r.get('lugar_antiguo') or '').strip(),
        'lat': (r.get('lat') or '').strip(),
        'lon': (r.get('lon') or '').strip(),
        'tipo_suceso': (r.get('tipo_suceso') or 'suceso').strip(),
        'personajes': (r.get('personajes') or 'Jesús').strip(),
        'referencia': (r.get('referencia') or '').strip(),
        'libro': (r.get('libro') or '').strip(),
        'capitulo_inicio': (r.get('capitulo_inicio') or '').strip(),
        'capitulo_fin': (r.get('capitulo_fin') or '').strip(),
        'etiqueta_jw': r['clave'].strip(),
        'ministerio_cuando': (r.get('ministerio_cuando') or '').strip(),
    }
    hid = (r.get('hecho_id') or '').strip()
    if hid:
        ev['hecho_id'] = int(hid)
    return ev


def apply_meta(row, ev, fase_codigo, fase_titulo, jw_linea, sub_cuando=None):
    row['jw_codigo'] = fase_codigo
    row['jw_linea'] = jw_linea
    row['ministerio_fase'] = fase_titulo
    row['etiqueta_jw'] = ev.get('etiqueta_jw') or row.get('etiqueta_jw', '')
    cuando = sub_cuando or ev.get('ministerio_cuando') or ''
    if cuando:
        row['ministerio_cuando'] = cuando


def merge_csv(rows, fieldnames, tsv_rows):
    by_id = {int(r['id']): r for r in rows}
    by_clave = {}
    for tr in tsv_rows:
        ck = tr['clave'].strip()
        for r in rows:
            if (r.get('etiqueta_jw') or '').strip() == ck:
                by_clave[ck] = r
                break

    nuevos = parches = 0
    min_ids, sem_ids, vida_ids = set(), set(), set()

    for tr in tsv_rows:
        ev = row_to_event(tr)
        fase = tr['fase_codigo'].strip()
        titulo = tr['fase_titulo'].strip()
        jw_linea = LINEA_SEM if fase == 'B12' else LINEA_MIN
        row = None

        if 'hecho_id' in ev:
            hid = ev['hecho_id']
            if hid not in by_id:
                print('[warn] hecho_id', hid, 'no encontrado —', ev['nombre'][:50])
                continue
            row = by_id[hid]
            for k in BASE_COLS:
                if k == 'id':
                    continue
                if k in ev and ev[k] not in ('', None):
                    row[k] = str(ev[k])
            apply_meta(row, ev, fase, titulo, jw_linea)
            parches += 1
            print('  patch', hid, '->', fase, ev['nombre'][:45])
        else:
            clave = ev['clave']
            existente = by_clave.get(clave)
            if not existente:
                existente = next((r for r in rows if r.get('nombre') == ev['nombre']
                                  and str(r.get('fecha_anio', '')) == str(ev['fecha_anio'])), None)
            if existente:
                row = existente
                print('  reutiliza', row['id'], clave)
            else:
                hid = next_id(rows)
                row = {c: '' for c in fieldnames}
                row['id'] = str(hid)
                for k in BASE_COLS:
                    if k == 'id':
                        continue
                    if k in ev:
                        row[k] = str(ev[k]) if ev[k] is not None else ''
                rows.append(row)
                by_id[hid] = row
                by_clave[clave] = row
                nuevos += 1
                print('  nuevo', hid, clave)

            for k in BASE_COLS:
                if k == 'id':
                    continue
                if k in ev and ev[k] not in ('', None):
                    row[k] = str(ev[k])
            apply_meta(row, ev, fase, titulo, jw_linea)

        if row:
            rid = int(row['id'])
            vida_ids.add(rid)
            if fase == 'B12':
                sem_ids.add(rid)
            elif fase in FASES_MIN:
                min_ids.add(rid)

    return nuevos, parches, min_ids, sem_ids, vida_ids


def build_json_blocks(tsv_rows):
    fases = {}
    dias = {}
    for tr in tsv_rows:
        fase = tr['fase_codigo'].strip()
        titulo = tr['fase_titulo'].strip()
        ev = row_to_event(tr)
        json_ev = {k: v for k, v in ev.items() if k != 'clave' and v not in ('', None)}
        if 'hecho_id' in ev:
            json_ev = {'hecho_id': ev['hecho_id'], 'etiqueta_jw': ev['etiqueta_jw']}
            if ev.get('ministerio_cuando'):
                json_ev['ministerio_cuando'] = ev['ministerio_cuando']
        else:
            json_ev['clave'] = ev['clave']
            for k in ('nombre', 'descripcion', 'fecha_texto', 'fecha_anio', 'era',
                      'lugar_antiguo', 'lat', 'lon', 'tipo_suceso', 'personajes',
                      'referencia', 'libro', 'capitulo_inicio', 'capitulo_fin'):
                if k in ev and ev[k]:
                    json_ev[k] = ev[k]

        if fase == 'B12':
            dia_titulo = tr.get('dia_titulo', '').strip() or titulo
            key = (fase, dia_titulo)
            if key not in dias:
                dias[key] = {
                    'codigo': 'B12',
                    'titulo': dia_titulo,
                    'seccion': 'S3',
                    'eventos': [],
                }
            dias[key]['eventos'].append(json_ev)
        elif fase in FASES_MIN:
            if fase not in fases:
                fases[fase] = {
                    'codigo': fase,
                    'titulo': titulo,
                    'seccion': 'S3',
                    'eventos': [],
                }
            fases[fase]['eventos'].append(json_ev)

    ministerio = {
        'version': 2,
        'nota': 'Sucesos de la vida de Jesús (J0–J4). Generado desde jesus_vida_eventos.tsv.',
        'fases': [fases[k] for k in sorted(fases.keys())],
    }
    semana = {
        'version': 2,
        'nota': 'Lámina B12: última semana (8–16 nisán + ascensión). Generado desde TSV.',
        'linea': LINEA_SEM,
        'dias': [dias[k] for k in sorted(dias.keys(), key=lambda x: x[1])],
    }
    return ministerio, semana


def cleanup_stray_ministerio(rows):
    """Quita metadata de ministerio en filas que no son sucesos J0–J4 / B12."""
    fases = FASES_MIN | {'B12'}
    for r in rows:
        cod = (r.get('jw_codigo') or '').strip()
        if cod and cod not in fases:
            for c in ('ministerio_fase', 'ministerio_cuando', 'jw_linea'):
                r[c] = ''


def update_grupos(min_ids, sem_ids, vida_ids):
    if not os.path.exists(GRUPOS):
        return
    with open(GRUPOS, encoding='utf-8') as f:
        data = json.load(f)

    for gid, ids in (
        ('ministerio-jesus', min_ids),
        ('ultima-semana-jesus', sem_ids),
    ):
        grp = next((g for g in data['grupos'] if g['id'] == gid), None)
        if grp:
            grp['evento_ids'] = sorted(ids)

    grp_vida = next((g for g in data['grupos'] if g['id'] == 'vida-jesus'), None)
    if not grp_vida:
        data['grupos'].append({
            'id': 'vida-jesus',
            'nombre': 'Vida terrestre de Jesús',
            'descripcion': 'Del anuncio del nacimiento de Juan al ascenso: sucesos detallados J0–J4 y B12.',
            'evento_ids': sorted(vida_ids),
        })
    else:
        grp_vida['evento_ids'] = sorted(vida_ids)

    with open(GRUPOS, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('grupos.json actualizado:', len(min_ids), 'ministerio,', len(sem_ids), 'semana,', len(vida_ids), 'vida')


def main():
    tsv_rows = read_tsv()
    rows = load_rows()
    if not rows:
        print('[error] hechos_biblicos.csv vacío')
        sys.exit(1)

    fieldnames = list(rows[0].keys())
    for c in EXTRA_COLS:
        if c not in fieldnames:
            fieldnames.append(c)
            for r in rows:
                r.setdefault(c, '')

    print('-- merge CSV desde TSV --')
    n, p, min_ids, sem_ids, vida_ids = merge_csv(rows, fieldnames, tsv_rows)
    cleanup_stray_ministerio(rows)
    save_rows(rows, fieldnames)
    print('OK CSV —', len(rows), 'sucesos (+', n, 'nuevos,', p, 'parches)')

    ministerio, semana = build_json_blocks(tsv_rows)
    with open(JW_MIN, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(ministerio, f, ensure_ascii=False, indent=2)
        f.write('\n')
    with open(JW_SEM, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(semana, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('OK JSON —', len(ministerio['fases']), 'fases,', len(semana['dias']), 'días B12')

    update_grupos(min_ids, sem_ids, vida_ids)


if __name__ == '__main__':
    main()
