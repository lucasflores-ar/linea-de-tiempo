# -*- coding: utf-8 -*-
"""Preguntas CRONOLOGÍA para sucesos del CUADRO DE FECHAS HISTÓRICAS.

Genera una pregunta por hecho (etiqueta_jw == clave del TSV).
Idempotente. Ejecutar tras merge_fechas_historicas.py:
  python scripts/add_fechas_historicas_preguntas.py
  python scripts/enrich.py
  python scripts/add_fechas_historicas_preguntas.py --patch-only
"""
import csv
import io
import os
import random
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

INP = db('preguntas_unificadas.csv')
OUT_ENR = db('preguntas_unificadas_enriquecidas.csv')
HECH = db('hechos_biblicos.csv')
TSV = repo('curacion', 'fechas_historicas.tsv')

BASE_COLS = [
    'id', 'pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
    'respuesta_correcta', 'categoria', 'dificultad', 'capitulo', 'personaje', 'referencia_biblica',
]
ENR_COLS = BASE_COLS + [
    'hecho_id', 'hecho_nombre', 'fecha_suceso', 'fecha_anio', 'era_suceso',
    'lugar_suceso', 'lat', 'lon', 'tipo_suceso', 'fuente_dato',
]

CAP = 'CRONOLOGÍA'
RNG = random.Random(42)


def norm_q(s):
    s = unicodedata.normalize('NFD', (s or '').lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^\w\s]', '', s)
    return re.sub(r'\s+', ' ', s).strip()


def load_rows(path, cols):
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f)), cols


def save_rows(path, rows, fieldnames):
    with open(path, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore', lineterminator='\n')
        w.writeheader()
        w.writerows(rows)


def read_tsv():
    with open(TSV, encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f, delimiter='\t'))


def fmt_opcion(fecha_texto):
    return (fecha_texto or '').replace('E. C.', 'e. c.').replace('E. c.', 'e. c.')


def pick_distractors(correct_text, correct_year, all_years, n=3):
    pool = []
    for y, ft in all_years:
        opt = fmt_opcion(ft)
        if opt and opt != correct_text and opt not in [p[1] for p in pool]:
            pool.append((abs(y - correct_year), opt))
    pool.sort()
    if len(pool) >= n:
        return [p[1] for p in pool[:n]]
    extras = ['1513 a. e. c.', '1943 a. e. c.', '4026 a. e. c.', '33 e. c.', '607 a. e. c.', '537 a. e. c.']
    for e in extras:
        if e != correct_text and e not in [p[1] for p in pool] and len(pool) < n:
            pool.append((9999, e))
    return [p[1] for p in pool[:n]]


def apply_hecho(row, hecho):
    row['hecho_id'] = hecho['id']
    row['hecho_nombre'] = hecho['nombre']
    row['fecha_suceso'] = hecho['fecha_texto']
    row['fecha_anio'] = hecho['fecha_anio']
    row['era_suceso'] = hecho['era']
    row['lugar_suceso'] = hecho['lugar_antiguo']
    row['lat'] = hecho['lat']
    row['lon'] = hecho['lon']
    row['tipo_suceso'] = hecho['tipo_suceso']
    row['fuente_dato'] = 'HECHO'


def build_questions(hechos_by_clave, tsv_rows, all_years):
    out = []
    for ev in tsv_rows:
        clave = ev['clave']
        hecho = hechos_by_clave.get(clave)
        if not hecho:
            continue
        nombre = hecho['nombre']
        correct = fmt_opcion(hecho['fecha_texto'])
        if not correct:
            continue
        pregunta = f'¿En qué año ocurrió «{nombre}»?'
        dist = pick_distractors(correct, int(hecho['fecha_anio']), all_years)
        while len(dist) < 3:
            dist.append(f'{abs(int(hecho["fecha_anio"]) + 100 * (len(dist)+1))} a. e. c.')
        opts = dist[:3]
        RNG.shuffle(opts)
        personaje = ''
        if hecho.get('personajes'):
            personaje = hecho['personajes'].split(',')[0].strip()
        out.append({
            'clave': clave,
            'pregunta': pregunta,
            'opcion_a': opts[0],
            'opcion_b': opts[1],
            'opcion_c': opts[2],
            'opcion_d': correct,
            'respuesta_correcta': correct,
            'categoria': 'CRONOLOGÍA',
            'dificultad': 'MEDIA',
            'capitulo': CAP,
            'personaje': personaje,
            'referencia_biblica': hecho.get('referencia') or ev.get('referencia', ''),
            'hecho_id': hecho['id'],
        })
    return out


def patch_enriched(questions):
    if not os.path.exists(OUT_ENR):
        print('[info] no existe', OUT_ENR)
        return 0
    with open(HECH, encoding='utf-8-sig', newline='') as f:
        hechos = {h['id']: h for h in csv.DictReader(f)}
    enr_rows, _ = load_rows(OUT_ENR, ENR_COLS)
    by_norm = {norm_q(r['pregunta']): r for r in enr_rows}
    patched = 0
    for q in questions:
        row = by_norm.get(norm_q(q['pregunta']))
        if not row:
            continue
        hecho = hechos.get(str(q['hecho_id']))
        if hecho:
            apply_hecho(row, hecho)
            patched += 1
    if patched:
        save_rows(OUT_ENR, enr_rows, ENR_COLS)
    return patched


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    if not os.path.exists(TSV):
        print('[error] falta', TSV)
        return 0

    tsv_rows = read_tsv()
    with open(HECH, encoding='utf-8-sig', newline='') as f:
        hechos_list = list(csv.DictReader(f))
    by_clave = {h['etiqueta_jw']: h for h in hechos_list if h.get('etiqueta_jw')}

    all_years = []
    for h in hechos_list:
        if h.get('fecha_anio'):
            try:
                all_years.append((int(h['fecha_anio']), h['fecha_texto']))
            except ValueError:
                pass

    questions = build_questions(by_clave, tsv_rows, all_years)
    rows, _ = load_rows(INP, BASE_COLS)
    existing = {norm_q(r['pregunta']) for r in rows}
    next_id = max(int(r['id']) for r in rows) + 1
    added = 0

    for q in questions:
        nk = norm_q(q['pregunta'])
        if nk in existing:
            continue
        row = {c: '' for c in BASE_COLS}
        row['id'] = str(next_id)
        for k in ('pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
                  'respuesta_correcta', 'categoria', 'dificultad', 'capitulo',
                  'personaje', 'referencia_biblica'):
            row[k] = q[k]
        rows.append(row)
        existing.add(nk)
        print(f'  + {next_id} {q["pregunta"][:55]} -> hecho {q["hecho_id"]}')
        next_id += 1
        added += 1

    if added:
        save_rows(INP, rows, BASE_COLS)
        print(f'agregadas: {added} -> {INP}')
    else:
        print('sin preguntas nuevas en', INP)
    return added


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--patch-only':
        tsv_rows = read_tsv()
        with open(HECH, encoding='utf-8-sig', newline='') as f:
            hechos_list = list(csv.DictReader(f))
        by_clave = {h['etiqueta_jw']: h for h in hechos_list if h.get('etiqueta_jw')}
        all_years = []
        for h in hechos_list:
            if h.get('fecha_anio'):
                try:
                    all_years.append((int(h['fecha_anio']), h['fecha_texto']))
                except ValueError:
                    pass
        qs = build_questions(by_clave, tsv_rows, all_years)
        n = patch_enriched(qs)
        print(f'hecho_id parcheados en enriquecidas: {n}')
    else:
        main()
        print('[info] tras enrich.py ejecuta: python scripts/add_fechas_historicas_preguntas.py --patch-only')
