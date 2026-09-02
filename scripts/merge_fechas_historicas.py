# -*- coding: utf-8 -*-
"""Fusiona sucesos del CUADRO DE FECHAS HISTÓRICAS en hechos_biblicos.csv.

Lee curacion/fechas_historicas.tsv. Idempotente.
Si el suceso apunta a un evento de redacción de libros (match_id / etiqueta_jw),
conserva descripcion y etiqueta_jw del merge de libros.

Uso: python scripts/merge_fechas_historicas.py
"""
import csv
import io
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo
from libros_biblia_data import LIBROS

HECH = db('hechos_biblicos.csv')
TSV = repo('curacion', 'fechas_historicas.tsv')
REPORT = repo('docs', 'reporte-fechas-historicas.md')

EXTRA_COLS = [
    'jw_codigo', 'jw_linea', 'fecha_fin', 'fecha_fin_texto', 'etiqueta_jw',
    'ministerio_fase', 'ministerio_cuando', 'fecha_estimada',
]
BASE_COLS = [
    'id', 'nombre', 'descripcion', 'fecha_texto', 'fecha_anio', 'era',
    'lugar_antiguo', 'lat', 'lon', 'tipo_suceso', 'personajes', 'referencia',
    'libro', 'capitulo_inicio', 'capitulo_fin',
]

TRACK_FIELDS = [
    'nombre', 'descripcion', 'fecha_texto', 'fecha_anio', 'era', 'tipo_suceso',
    'personajes', 'referencia', 'libro', 'capitulo_inicio', 'capitulo_fin',
    'etiqueta_jw', 'fecha_estimada', 'jw_codigo', 'jw_linea',
]

# Sucesos fusionados en otro id del cuadro (filas duplicadas previas)
ORPHAN_IDS = {'22', '288', '311', '337', '419', '421', '422', '423', '438', '439'}

LIBRO_CLAVES = {b['clave'] for b in LIBROS}
LIBRO_IDS = {str(b['match_id']) for b in LIBROS if b.get('match_id')}
# ids duplicados de redacción (gen_hechos / merges previos)
LIBRO_IDS.update({
    '388', '384', '383', '382', '381', '380', '389', '393', '390', '385',
    '386', '387', '391', '392', '394', '151', '173',
})

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


def normalize_ref(ref):
    if not ref:
        return ref
    return (
        ref.replace('Gé.', 'Génesis ')
        .replace('Éx ', 'Éxodo ')
        .replace('1Re', '1 Reyes ')
        .replace('2Re', '2 Reyes ')
        .replace('2Sa', '2 Samuel ')
        .replace('2Cr', '2 Crónicas ')
        .replace('Hch', 'Hechos ')
        .replace('Lu ', 'Lucas ')
        .replace('Mt ', 'Mateo ')
        .replace('Can ', 'Cantar de los Cantares ')
        .replace('Nú ', 'Números ')
        .replace('Jer ', 'Jeremías ')
        .replace('Eze ', 'Ezequiel ')
        .replace('Heb ', 'Hebreos ')
        .replace('1Pe', '1 Pedro ')
        .replace('2Pe', '2 Pedro ')
        .replace('2Co', '2 Corintios ')
    )


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


def is_libro_row(row):
    ej = (row.get('etiqueta_jw') or '').strip()
    if ej in LIBRO_CLAVES:
        return True
    return row.get('id') in LIBRO_IDS


def snapshot_row(row):
    return {k: (row.get(k) or '') for k in TRACK_FIELDS}


def diff_rows(before, after):
    return [(k, before.get(k, ''), after.get(k, '')) for k in TRACK_FIELDS if before.get(k, '') != after.get(k, '')]


def apply_row(row, ev, preserve_libro_meta=False):
    prefijo = (ev.get('prefijo') or '').strip()
    anio = int(ev['anio'])
    era = norm_era(ev['era'])
    ref = (ev.get('referencia') or '').strip()
    libro, ci, cf = parse_referencia(ref)

    row['nombre'] = ev['nombre']
    if not preserve_libro_meta:
        row['etiqueta_jw'] = ev['clave']
        existing = (row.get('descripcion') or '').strip()
        ev_nombre = ev['nombre']
        # Conservar narrativas enriquecidas; actualizar vacío, genérico o corrupto
        if not existing or len(existing) <= max(len(ev_nombre), 80):
            row['descripcion'] = ev_nombre
    row['fecha_texto'] = fmt_fecha(prefijo, anio)
    row['fecha_anio'] = str(anio)
    row['era'] = era
    row['tipo_suceso'] = ev.get('tipo') or row.get('tipo_suceso') or 'suceso'
    if ev.get('personajes'):
        row['personajes'] = ev['personajes']
    if ref:
        row['referencia'] = normalize_ref(ref)
    if libro:
        row['libro'] = libro
        row['capitulo_inicio'] = ci
        row['capitulo_fin'] = cf

    codigo, linea = ERA_JW.get(era, ('', ''))
    if codigo:
        row['jw_codigo'] = codigo
        row['jw_linea'] = linea
    row['fecha_estimada'] = '1' if prefijo in ('a', 'c', 'd') else ''


def write_report(total_cat, ya_teniamos, agregados, cambios, eliminados):
    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    lines = [
        '# Reporte: Cuadro de Fechas Históricas Sobresalientes',
        '',
        f'Total sucesos en catálogo: **{total_cat}**',
        f'- Ya teníamos (sin cambios): **{len(ya_teniamos)}**',
        f'- Agregado (nuevos ids): **{len(agregados)}**',
        f'- Cambió (field diffs): **{len(cambios)}**',
        f'- Eliminados (fusionados/duplicados): **{len(eliminados)}**',
        '',
        '---',
        '',
        '## Ya teníamos',
        '',
    ]
    if ya_teniamos:
        for item in ya_teniamos:
            lines.append(f"- **{item['nombre'][:70]}** (id {item['id']}, `{item['clave']}`)")
    else:
        lines.append('_Ninguno._')

    lines += ['', '## Agregado', '']
    if agregados:
        for item in agregados:
            ev = item['ev']
            lines.append(
                f"- **id {item['id']}** — {ev['nombre'][:70]} "
                f"({fmt_fecha(ev.get('prefijo', ''), int(ev['anio']))})"
            )
    else:
        lines.append('_Ninguno._')

    lines += ['', '## Cambió', '']
    if cambios:
        for item in cambios:
            note = ' (meta libro conservada)' if item.get('libro_meta') else ''
            lines.append(f"### id {item['id']} — {item['nombre'][:60]}{note}")
            lines.append(f"_Match: {item['how']}, clave `{item['clave']}`_")
            lines.append('')
            for k, b, a in item['diffs']:
                bb = (b or '—').replace('|', '\\|')
                aa = (a or '—').replace('|', '\\|')
                lines.append(f"- **{k}**: `{bb}` → `{aa}`")
            lines.append('')
    else:
        lines.append('_Ninguno._')

    if eliminados:
        lines += ['', '## Eliminados (fusionados en otro suceso)', '']
        for item in eliminados:
            lines.append(f"- id **{item['id']}** — `{item.get('etiqueta_jw', '')}` ({item.get('nombre', '')[:50]})")

    with open(REPORT, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines) + '\n')


def main():
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    if not os.path.exists(TSV):
        print('[info] generando TSV...')
        import build_fechas_historicas_tsv
        build_fechas_historicas_tsv.main()

    events = read_tsv()
    rows = load_rows()
    eliminados = [r for r in rows if r.get('id') in ORPHAN_IDS]
    rows = [r for r in rows if r.get('id') not in ORPHAN_IDS]
    if eliminados:
        print(f'[info] eliminados {len(eliminados)} huérfanos: {", ".join(ORPHAN_IDS)}')

    fieldnames = list(rows[0].keys())
    for c in EXTRA_COLS:
        if c not in fieldnames:
            fieldnames.append(c)
            for r in rows:
                r.setdefault(c, '')

    by_id = {int(r['id']): r for r in rows}
    ya_teniamos = []
    agregados = []
    cambios = []

    for ev in events:
        clave = ev['clave']
        match_id = (ev.get('match_id') or '').strip()
        existente, how = find_row(rows, by_id, clave, match_id)

        if existente:
            row = existente
            preserve = is_libro_row(row) or (match_id and match_id in LIBRO_IDS)
            before = snapshot_row(row)
            apply_row(row, ev, preserve_libro_meta=preserve)
            after = snapshot_row(row)
            diffs = diff_rows(before, after)
            rid = int(row['id'])
            if diffs:
                cambios.append({
                    'id': rid,
                    'nombre': ev['nombre'],
                    'clave': clave,
                    'how': how,
                    'diffs': diffs,
                    'libro_meta': preserve,
                })
                print(f'  patch {rid} ({how}) -> {clave[:45]}')
            else:
                ya_teniamos.append({'id': rid, 'nombre': ev['nombre'], 'clave': clave})
                print(f'  ok    {rid} ({how}) -> {clave[:45]}')
        else:
            hid = next_id(rows)
            row = {c: '' for c in fieldnames}
            row['id'] = str(hid)
            apply_row(row, ev, preserve_libro_meta=False)
            rows.append(row)
            by_id[hid] = row
            agregados.append({'id': hid, 'ev': ev})
            print(f'  nuevo {hid} -> {ev["nombre"][:45]}')

    save_rows(rows, fieldnames)
    write_report(len(events), ya_teniamos, agregados, cambios, eliminados)
    print(
        f'OK — {len(rows)} sucesos (+{len(agregados)} nuevos, {len(cambios)} cambios, '
        f'{len(ya_teniamos)} ok, -{len(eliminados)} huérfanos)'
    )
    print(f'Reporte -> {REPORT}')


if __name__ == '__main__':
    main()
