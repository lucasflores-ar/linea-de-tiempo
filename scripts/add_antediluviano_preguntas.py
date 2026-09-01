# -*- coding: utf-8 -*-
"""Preguntas de quiz para sucesos antediluvianos nuevos y reyes Salum/Hosea.

Idempotente (texto normalizado). Ejecutar tras merge_antediluviano.py:
  python scripts/merge_antediluviano.py
  python scripts/add_antediluviano_preguntas.py
  python scripts/enrich.py
"""
import csv
import io
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

INP = db('preguntas_unificadas.csv')
OUT_ENR = db('preguntas_unificadas_enriquecidas.csv')
HECH = db('hechos_biblicos.csv')

BASE_COLS = [
    'id', 'pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
    'respuesta_correcta', 'categoria', 'dificultad', 'capitulo', 'personaje', 'referencia_biblica',
]
ENR_COLS = BASE_COLS + [
    'hecho_id', 'hecho_nombre', 'fecha_suceso', 'fecha_anio', 'era_suceso',
    'lugar_suceso', 'lat', 'lon', 'tipo_suceso', 'fuente_dato',
]

CAP_ANT = 'PERÍODO ANTEDILUVIANO'
CAP_REY = 'REYES DE ISRAEL (A6)'

# hecho_key = etiqueta_jw en hechos_biblicos.csv
QUESTIONS = [
    {
        'hecho_key': 'nacimiento_set',
        'pregunta': '¿A qué edad tuvo Adán a su hijo Set, según el registro de Génesis 5?',
        'opcion_a': '130 años', 'opcion_b': '105 años', 'opcion_c': '930 años', 'opcion_d': '500 años',
        'respuesta_correcta': '130 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Set', 'referencia_biblica': 'Génesis 5:3',
    },
    {
        'hecho_key': 'nacimiento_set',
        'pregunta': '¿Por qué motivo nació Set, según Génesis 4:25?',
        'opcion_a': 'Para reemplazar a Abel', 'opcion_b': 'Para gobernar a Caín',
        'opcion_c': 'Para construir el arca', 'opcion_d': 'Para invocar el nombre de Jehová',
        'respuesta_correcta': 'Para reemplazar a Abel', 'categoria': 'SUCESO', 'dificultad': 'MEDIA',
        'personaje': 'Set', 'referencia_biblica': 'Génesis 4:25',
    },
    {
        'hecho_key': 'invocacion_jehova_enos',
        'pregunta': '¿En los días de qué hijo de Set se comenzó a invocar el nombre de Jehová?',
        'opcion_a': 'Enós', 'opcion_b': 'Caín', 'opcion_c': 'Abel', 'opcion_d': 'Matusalén',
        'respuesta_correcta': 'Enós', 'categoria': 'NOMBRE', 'dificultad': 'FACIL',
        'personaje': 'Enós', 'referencia_biblica': 'Génesis 4:26',
    },
    {
        'hecho_key': 'linea_lamec_cainita',
        'pregunta': '¿Qué innovación introdujo abiertamente Lamec de la línea de Caín?',
        'opcion_a': 'La poligamia', 'opcion_b': 'La circuncisión', 'opcion_c': 'El arca de madera',
        'opcion_d': 'El sacrificio animal',
        'respuesta_correcta': 'La poligamia', 'categoria': 'SUCESO', 'dificultad': 'MEDIA',
        'personaje': 'Lamec', 'referencia_biblica': 'Génesis 4:19',
    },
    {
        'hecho_key': 'linea_lamec_cainita',
        'pregunta': '¿Quién de la línea de Caín es identificado como forjador de toda herramienta de cobre y de hierro?',
        'opcion_a': 'Tubal-caín', 'opcion_b': 'Jubal', 'opcion_c': 'Jabal', 'opcion_d': 'Enoc',
        'respuesta_correcta': 'Tubal-caín', 'categoria': 'NOMBRE', 'dificultad': 'MEDIA',
        'personaje': 'Tubal-caín', 'referencia_biblica': 'Génesis 4:22',
    },
    {
        'hecho_key': 'muerte_adan',
        'pregunta': '¿Cuántos años vivió Adán según el registro de Génesis 5?',
        'opcion_a': '930 años', 'opcion_b': '969 años', 'opcion_c': '777 años', 'opcion_d': '912 años',
        'respuesta_correcta': '930 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Adán', 'referencia_biblica': 'Génesis 5:5',
    },
    {
        'hecho_key': 'invasion_nefilim',
        'pregunta': '¿Cómo se llamaban los hijos de la unión antinatural entre ángeles rebeldes e hijas de los hombres?',
        'opcion_a': 'Nefilim', 'opcion_b': 'Refaim', 'opcion_c': 'Anakim', 'opcion_d': 'Emim',
        'respuesta_correcta': 'Nefilim', 'categoria': 'NOMBRE', 'dificultad': 'FACIL',
        'personaje': 'Nefilim', 'referencia_biblica': 'Génesis 6:4',
    },
    {
        'hecho_key': 'invasion_nefilim',
        'pregunta': '¿Qué hicieron los ángeles rebeldes antes de engendrar a los Nefilim?',
        'opcion_a': 'Abandonaron su morada celestial y tomaron cuerpos humanos',
        'opcion_b': 'Construyeron la torre de Babel',
        'opcion_c': 'Adoraron a Baal en el monte Carmelo',
        'opcion_d': 'Guiaron a Israel por el desierto',
        'respuesta_correcta': 'Abandonaron su morada celestial y tomaron cuerpos humanos',
        'categoria': 'SUCESO', 'dificultad': 'MEDIA',
        'personaje': 'Nefilim', 'referencia_biblica': 'Génesis 6:1-2',
    },
    {
        'hecho_key': 'decreto_120_anos',
        'pregunta': '¿Cuántos años de plazo fijó Jehová antes del Diluvio, según Génesis 6:3?',
        'opcion_a': '120 años', 'opcion_b': '40 años', 'opcion_c': '100 años', 'opcion_d': '969 años',
        'respuesta_correcta': '120 años', 'categoria': 'NUMERO', 'dificultad': 'FACIL',
        'personaje': 'Noé', 'referencia_biblica': 'Génesis 6:3',
    },
    {
        'hecho_key': 'arca_noe_predicacion',
        'pregunta': '¿De qué madera ordenó Jehová a Noé construir el arca?',
        'opcion_a': 'Madera de gofer', 'opcion_b': 'Madera de cedro', 'opcion_c': 'Madera de acacia',
        'opcion_d': 'Madera de olivo',
        'respuesta_correcta': 'Madera de gofer', 'categoria': 'DETALLE', 'dificultad': 'MEDIA',
        'personaje': 'Noé', 'referencia_biblica': 'Génesis 6:14',
    },
    {
        'hecho_key': 'arca_noe_predicacion',
        'pregunta': '¿Qué papel desempeñó Noé mientras construía el arca, según 2 Pedro 2:5?',
        'opcion_a': 'Predicador de justicia', 'opcion_b': 'Rey de Babel', 'opcion_c': 'Sacerdote en Hebrón',
        'opcion_d': 'Juez en Israel',
        'respuesta_correcta': 'Predicador de justicia', 'categoria': 'SUCESO', 'dificultad': 'FACIL',
        'personaje': 'Noé', 'referencia_biblica': '2 Pedro 2:5',
    },
    {
        'hecho_key': 'muerte_matusalem',
        'pregunta': '¿Cuántos años vivió Matusalén, el hombre más longevo del registro bíblico?',
        'opcion_a': '969 años', 'opcion_b': '930 años', 'opcion_c': '777 años', 'opcion_d': '950 años',
        'respuesta_correcta': '969 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Matusalén', 'referencia_biblica': 'Génesis 5:27',
    },
    {
        'hecho_key': 'muerte_matusalem',
        'pregunta': '¿En qué año bíblico murió Matusalén, según la cronología estándar?',
        'opcion_a': '2370 a. E. C. (el mismo año del Diluvio)',
        'opcion_b': '2490 a. E. C.',
        'opcion_c': '2020 a. E. C.',
        'opcion_d': '3096 a. E. C.',
        'respuesta_correcta': '2370 a. E. C. (el mismo año del Diluvio)',
        'categoria': 'FECHA', 'dificultad': 'MEDIA',
        'personaje': 'Matusalén', 'referencia_biblica': 'Génesis 5:27; 7:11',
    },
    # Salum y Hosea (metadata de reyes sin preguntas dedicadas)
    {
        'hecho_id': '288',
        'pregunta': '¿Cuánto tiempo reinó Salum en Samaria?',
        'opcion_a': '1 mes', 'opcion_b': '6 meses', 'opcion_c': '2 años', 'opcion_d': '10 años',
        'respuesta_correcta': '1 mes', 'categoria': 'DURACIÓN', 'dificultad': 'MEDIA',
        'personaje': 'Salum', 'referencia_biblica': '2 Reyes 15:13',
    },
    {
        'hecho_id': '288',
        'pregunta': '¿A qué rey mató Salum en una conspiración para usurpar el trono de Israel?',
        'opcion_a': 'Zacarías', 'opcion_b': 'Menahem', 'opcion_c': 'Pecah', 'opcion_d': 'Omri',
        'respuesta_correcta': 'Zacarías', 'categoria': 'SUCESO', 'dificultad': 'MEDIA',
        'personaje': 'Salum', 'referencia_biblica': '2 Reyes 15:10',
    },
    {
        'hecho_id': '292',
        'pregunta': '¿Cuántos años reinó Hosea, el último rey del reino del norte?',
        'opcion_a': '9 años', 'opcion_b': '12 años', 'opcion_c': '20 años', 'opcion_d': '1 mes',
        'respuesta_correcta': '9 años', 'categoria': 'DURACIÓN', 'dificultad': 'FACIL',
        'personaje': 'Hosea', 'referencia_biblica': '2 Reyes 17:1',
    },
    {
        'hecho_id': '292',
        'pregunta': '¿Quién fue el último rey de Israel antes de la caída de Samaria?',
        'opcion_a': 'Hosea', 'opcion_b': 'Pecah', 'opcion_c': 'Menahem', 'opcion_d': 'Jeroboán II',
        'respuesta_correcta': 'Hosea', 'categoria': 'NOMBRE', 'dificultad': 'FACIL',
        'personaje': 'Hosea', 'referencia_biblica': '2 Reyes 17:1-6',
    },
]


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


def hecho_index(hechos):
    by_key = {}
    for h in hechos:
        if h.get('etiqueta_jw'):
            by_key[h['etiqueta_jw']] = h
    return by_key


def patch_enriched():
    """Fija hecho_id en preguntas_unificadas_enriquecidas.csv (ejecutar tras enrich.py)."""
    if not os.path.exists(OUT_ENR):
        print('[info] no existe', OUT_ENR)
        return 0

    with open(HECH, encoding='utf-8-sig', newline='') as f:
        hechos_list = list(csv.DictReader(f))
    by_id = {h['id']: h for h in hechos_list}
    by_key = hecho_index(hechos_list)

    enr_rows, _ = load_rows(OUT_ENR, ENR_COLS)
    enr_by_norm = {norm_q(r['pregunta']): r for r in enr_rows}
    patched = 0
    for q in QUESTIONS:
        nk = norm_q(q['pregunta'])
        row = enr_by_norm.get(nk)
        if not row:
            continue
        hecho = by_id.get(str(q.get('hecho_id'))) or by_key.get(q.get('hecho_key'))
        if hecho:
            apply_hecho(row, hecho)
            patched += 1
    if patched:
        save_rows(OUT_ENR, enr_rows, ENR_COLS)
        print('hecho_id parcheados en enriquecidas:', patched)
    return patched


def main():
    with open(HECH, encoding='utf-8-sig', newline='') as f:
        hechos_list = list(csv.DictReader(f))
    by_id = {h['id']: h for h in hechos_list}
    by_key = hecho_index(hechos_list)

    rows, _ = load_rows(INP, BASE_COLS)
    existing = {norm_q(r['pregunta']) for r in rows}
    next_id = max(int(r['id']) for r in rows) + 1
    added = 0

    for q in QUESTIONS:
        key = norm_q(q['pregunta'])
        if key in existing:
            print('  ya existe:', q['pregunta'][:60])
            continue

        hecho = None
        if q.get('hecho_id'):
            hecho = by_id.get(str(q['hecho_id']))
        elif q.get('hecho_key'):
            hecho = by_key.get(q['hecho_key'])

        if not hecho:
            print('[warn] hecho no encontrado para:', q['pregunta'][:50])
            continue

        row = {c: '' for c in BASE_COLS}
        row['id'] = str(next_id)
        row['capitulo'] = CAP_REY if q.get('hecho_id') in ('288', '292') else CAP_ANT
        for k in q:
            if k not in ('hecho_key', 'hecho_id') and k in row:
                row[k] = q[k]
        rows.append(row)
        existing.add(key)
        print('  +', next_id, q['pregunta'][:55], '-> hecho', hecho['id'])
        next_id += 1
        added += 1

    if added:
        save_rows(INP, rows, BASE_COLS)
        print('agregadas:', added, '->', INP)
    else:
        print('sin preguntas nuevas en', INP)


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--patch-only':
        patch_enriched()
    else:
        main()
        print('[info] tras enrich.py ejecuta: python scripts/add_antediluviano_preguntas.py --patch-only')
