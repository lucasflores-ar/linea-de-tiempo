# -*- coding: utf-8 -*-
"""Fusiona sucesos del CUADRO DE FECHAS HISTÓRICAS en hechos_biblicos.csv.

Lee curacion/fechas_historicas.tsv. Idempotente.
Uso: python scripts/merge_fechas_historicas.py
"""
import csv
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

HECH = db('hechos_biblicos.csv')
TSV = repo('curacion', 'fechas_historicas.tsv')

EXTRA_COLS = [
    'jw_codigo', 'jw_linea', 'fecha_fin', 'fecha_fin_texto', 'etiqueta_jw',
    'ministerio_fase', 'ministerio_cuando', 'fecha_estimada',
]
BASE_COLS = [
    'id', 'nombre', 'descripcion', 'fecha_texto', 'fecha_anio', 'era',
    'lugar_antiguo', 'lat', 'lon', 'tipo_suceso', 'personajes', 'referencia',
    'libro', 'capitulo_inicio', 'capitulo_fin',
]

ERA_MAP = {
    'PREHISTORIA/GÉNESIS': 'PREHISTORIA / GÉNESIS',
    'DILUVIO': 'DILUVIO',
    'POSTDILUVIANO': 'POSTDILUVIANO',
    'PATRIARCAS': 'PATRIARCAS',
    'PATRIARCAS/EGIPTO': 'PATRIARCAS / EGIPTO',
    'EGIPTO': 'EGIPTO',
    'EGIPTO/EXODO': 'EGIPTO / EXODO',
    'EXODO': 'EXODO',
    'EXODO/LEY': 'EXODO / LEY',
    'DESIERTO': 'DESIERTO',
    'JUECES': 'JUECES',
    'MONARQUÍA': 'MONARQUÍA',
    'REINO DIVIDIDO': 'REINO DIVIDIDO',
    'EXILIO': 'EXILIO',
    'POSTEXILIO': 'RESTAURACIÓN',
    'INTERTESTAMENTAL': 'INTERTESTAMENTAL',
    'E.C.': 'E.C.',
}

ERA_JW = {
    'PREHISTORIA / GÉNESIS': ('ANT', 'Período antediluviano'),
    'DILUVIO': ('POST', 'Período post-diluviano'),
    'POSTDILUVIANO': ('POST', 'Período post-diluviano'),
    'PATRIARCAS': ('POST', 'Período post-diluviano'),
    'PATRIARCAS / EGIPTO': ('POST', 'Período post-diluviano'),
    'EGIPTO': ('B3', 'Exodo y desierto'),
    'EGIPTO / EXODO': ('B3', 'Exodo y desierto'),
    'EXODO': ('B3', 'Exodo y desierto'),
    'EXODO / LEY': ('B3', 'Exodo y desierto'),
    'EXODO / DESIERTO': ('B3', 'Exodo y desierto'),
    'DESIERTO': ('B3', 'Exodo y desierto'),
    'LEY': ('B3', 'Exodo y desierto'),
    'CONQUISTA': ('B4', 'La conquista de la Tierra Prometida'),
    'JUECES': ('B4', 'La conquista de la Tierra Prometida'),
    'MONARQUÍA': ('B6', 'La ocupación de la Tierra Prometida'),
    'REINO DIVIDIDO': ('A6', 'Los profetas y los reyes de Judá e Israel (Parte 1)'),
    'EXILIO': ('A6b', 'Los profetas y los reyes de Judá e Israel (Parte 2)'),
    'RESTAURACIÓN': ('B9', 'Restauración de Jerusalén'),
    'POSTEXILIO': ('B9', 'Restauración de Jerusalén'),
    'INTERTESTAMENTAL': ('B10', 'Israel en tiempos de Jesús'),
    'E.C.': ('B10', 'Israel en tiempos de Jesús'),
}

BOOK_ABBR = [
    (r'1\s*Tes\.?', '1 TESALONICENSES'),
    (r'2\s*Tes\.?', '2 TESALONICENSES'),
    (r'1\s*Tim\.?', '1 TIMOTEO'),
    (r'2\s*Tim\.?', '2 TIMOTEO'),
    (r'1\s*Ped\.?', '1 PEDRO'),
    (r'2\s*Ped\.?', '2 PEDRO'),
    (r'1\s*Cor\.?', '1 CORINTIOS'),
    (r'2\s*Cor\.?', '2 CORINTIOS'),
    (r'1\s*Rey\.?', '1 REYES'),
    (r'2\s*Rey\.?', '2 REYES'),
    (r'1\s*Sam\.?', '1 SAMUEL'),
    (r'2\s*Sam\.?', '2 SAMUEL'),
    (r'1\s*Cró\.?', '1 CRÓNICAS'),
    (r'2\s*Cró\.?', '2 CRÓNICAS'),
    (r'Cant\.\s*de\s*Cant\.?', 'CANTAR DE LOS CANTARES'),
    (r'Hech\.?', 'HECHOS'),
    (r'Éxo\.?', 'ÉXODO'),
    (r'Gén\.?', 'GÉNESIS'),
    (r'Gé\.?', 'GÉNESIS'),
    (r'Jos\.?', 'JOSUÉ'),
    (r'Jue\.?', 'JUECES'),
    (r'Deu\.?', 'DEUTERONOMIO'),
    (r'Núm\.?', 'NÚMEROS'),
    (r'Lev\.?', 'LEVÍTICO'),
    (r'Esd\.?', 'ESDRAS'),
    (r'Neh\.?', 'NEHEMÍAS'),
    (r'Est\.?', 'ESTER'),
    (r'Job\.?', 'JOB'),
    (r'Rut\.?', 'RUT'),
    (r'Isa\.?', 'ISAÍAS'),
    (r'Jer\.?', 'JEREMÍAS'),
    (r'Eze\.?', 'EZEQUIEL'),
    (r'Dan\.?', 'DANIEL'),
    (r'Ose\.?', 'OSEAS'),
    (r'Joel\.?', 'JOEL'),
    (r'Amós\.?', 'AMÓS'),
    (r'Abd\.?', 'ABDÍAS'),
    (r'Jon\.?', 'JONÁS'),
    (r'Miq\.?', 'MIQUEAS'),
    (r'Nah\.?', 'NAHÚM'),
    (r'Hab\.?', 'HABACUC'),
    (r'Sof\.?', 'SOFONÍAS'),
    (r'Hag\.?', 'HAGEO'),
    (r'Ageo\.?', 'HAGEO'),
    (r'Zac\.?', 'ZACARÍAS'),
    (r'Mal\.?', 'MALAQUÍAS'),
    (r'Pro\.?', 'PROVERBIOS'),
    (r'Ecl\.?', 'ECLESIASTÉS'),
    (r'Sant\.?', 'SANTIAGO'),
    (r'Jud\.?', 'JUDAS'),
    (r'Rom\.?', 'ROMANOS'),
    (r'Gál\.?', 'GÁLATAS'),
    (r'Efe\.?', 'EFESIOS'),
    (r'Fili\.?', 'FILIPENSES'),
    (r'Col\.?', 'COLOSENSES'),
    (r'File\.?', 'FILEMÓN'),
    (r'Heb\.?', 'HEBREOS'),
    (r'Luc\.?', 'LUCAS'),
    (r'Mat\.?', 'MATEO'),
    (r'Mt\.?', 'MATEO'),
    (r'Lu\.?', 'LUCAS'),
    (r'Juan\.?', 'JUAN'),
    (r'Rev\.?', 'APOCALIPSIS'),
    (r'1Pe\.?', '1 PEDRO'),
    (r'2Pe\.?', '2 PEDRO'),
    (r'2Sa\.?', '2 SAMUEL'),
    (r'1Re\.?', '1 REYES'),
    (r'2Re\.?', '2 REYES'),
    (r'2Cr\.?', '2 CRÓNICAS'),
    (r'2Co\.?', '2 CORINTIOS'),
    (r'Éx\.?', 'ÉXODO'),
    (r'Hch\.?', 'HECHOS'),
    (r'Can\.?', 'CANTAR DE LOS CANTARES'),
    (r'Nú\.?', 'NÚMEROS'),
    (r'Hech\.?', 'HECHOS'),
]

SINGLE_CHAP = {'FILEMÓN', '2 JUAN', '3 JUAN', 'JUDAS', 'ABDÍAS'}


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


def fmt_fecha(prefijo, anio):
    if anio < 0:
        base = f'{abs(anio)} a. E. C.'
    else:
        base = f'{anio} e. c.'
    if prefijo == 'a':
        return f'a. {base}'
    if prefijo == 'c':
        return f'c. {base}'
    if prefijo == 'd':
        return f'd. {base}'
    return base


def parse_referencia(ref):
    if not ref or ref.startswith('Introd'):
        return '', '', ''
    libro = ''
    caps = []
    for pat, name in BOOK_ABBR:
        m = re.search(rf'(?:^|[;\s]){pat}\s*(\d{{1,3}})(?:[:\-,]\s*(\d{{1,3}}))?', ref, re.I)
        if m:
            libro = name
            c1 = int(m.group(1))
            c2 = int(m.group(2)) if m.group(2) else c1
            if name in SINGLE_CHAP:
                c1 = c2 = 1
            caps.extend([c1, c2])
    if not caps and ref:
        m = re.search(r'(\d{1,3}):(\d{1,3})', ref)
        if m:
            caps = [int(m.group(1)), int(m.group(1))]
    if not libro:
        for pat, name in BOOK_ABBR:
            if re.search(rf'(?:^|[;\s]){pat}(?:\s|$|,|;)', ref, re.I):
                libro = name
                break
    if caps:
        return libro, str(min(caps)), str(max(caps))
    return libro, '1' if libro else '', '1' if libro else ''


def norm_era(raw):
    return ERA_MAP.get(raw.strip(), raw.strip())


def read_tsv():
    if not os.path.exists(TSV):
        from build_fechas_historicas_tsv import main as build
        build()
    with open(TSV, encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f, delimiter='\t'))


def find_row(rows, by_id, clave, match_id):
    if match_id:
        hid = int(match_id)
        if hid in by_id:
            return by_id[hid], 'match_id'
    for r in rows:
        if r.get('etiqueta_jw') == clave:
            return r, 'etiqueta_jw'
    for r in rows:
        if r.get('etiqueta_jw') and r['etiqueta_jw'].replace(' ', '_').lower() == clave:
            return r, 'etiqueta_jw_fuzzy'
    return None, None


def apply_row(row, ev, fieldnames):
    prefijo = (ev.get('prefijo') or '').strip()
    anio = int(ev['anio'])
    era = norm_era(ev['era'])
    ref = (ev.get('referencia') or '').strip()
    libro, ci, cf = parse_referencia(ref)

    row['nombre'] = ev['nombre']
    row['descripcion'] = row.get('descripcion') or ev['nombre']
    row['fecha_texto'] = fmt_fecha(prefijo, anio)
    row['fecha_anio'] = str(anio)
    row['era'] = era
    row['tipo_suceso'] = ev.get('tipo') or row.get('tipo_suceso') or 'suceso'
    if ev.get('personajes'):
        row['personajes'] = ev['personajes']
    if ref:
        row['referencia'] = ref.replace('Gé.', 'Génesis ').replace('Éx ', 'Éxodo ').replace('1Re', '1 Reyes ').replace('2Re', '2 Reyes ').replace('2Sa', '2 Samuel ').replace('2Cr', '2 Crónicas ').replace('Hch', 'Hechos ').replace('Lu ', 'Lucas ').replace('Mt ', 'Mateo ').replace('Can ', 'Cantar de los Cantares ').replace('Nú ', 'Números ').replace('Jer ', 'Jeremías ').replace('Eze ', 'Ezequiel ').replace('Heb ', 'Hebreos ').replace('1Pe', '1 Pedro ').replace('2Pe', '2 Pedro ').replace('2Co', '2 Corintios ')
    if libro:
        row['libro'] = libro
        row['capitulo_inicio'] = ci
        row['capitulo_fin'] = cf

    codigo, linea = ERA_JW.get(era, ('', ''))
    if codigo:
        row['jw_codigo'] = codigo
        row['jw_linea'] = linea
    row['etiqueta_jw'] = ev['clave']
    row['fecha_estimada'] = '1' if prefijo in ('a', 'c', 'd') else ''


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    if not os.path.exists(TSV):
        print('[info] generando TSV...')
        import build_fechas_historicas_tsv
        build_fechas_historicas_tsv.main()

    events = read_tsv()
    rows = load_rows()
    fieldnames = list(rows[0].keys())
    for c in EXTRA_COLS:
        if c not in fieldnames:
            fieldnames.append(c)
            for r in rows:
                r.setdefault(c, '')

    by_id = {int(r['id']): r for r in rows}
    nuevos = parches = 0

    for ev in events:
        clave = ev['clave']
        match_id = (ev.get('match_id') or '').strip()
        existente, how = find_row(rows, by_id, clave, match_id)

        if existente:
            row = existente
            apply_row(row, ev, fieldnames)
            parches += 1
            print(f'  patch {row["id"]} ({how}) -> {clave[:45]}')
        else:
            hid = next_id(rows)
            row = {c: '' for c in fieldnames}
            row['id'] = str(hid)
            apply_row(row, ev, fieldnames)
            rows.append(row)
            by_id[hid] = row
            nuevos += 1
            print(f'  nuevo {hid} -> {ev["nombre"][:45]}')

    save_rows(rows, fieldnames)
    print(f'OK — {len(rows)} sucesos (+{nuevos} nuevos, {parches} parches)')


if __name__ == '__main__':
    main()
