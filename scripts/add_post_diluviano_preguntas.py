# -*- coding: utf-8 -*-
"""Preguntas de quiz para sucesos post-diluvianos nuevos.

Idempotente. Ejecutar tras merge_post_diluviano.py; parche tras enrich.py:
  python scripts/add_post_diluviano_preguntas.py --patch-only
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

CAP = 'PERÍODO POST-DILUVIANO'

QUESTIONS = [
    {
        'hecho_key': 'salida_arca_pacto',
        'pregunta': '¿Qué señal puso Jehová como recordatorio del pacto de no destruir la tierra con un diluvio?',
        'opcion_a': 'El arcoíris', 'opcion_b': 'La zarza ardiente', 'opcion_c': 'La nube de fuego',
        'opcion_d': 'La estrella matutina',
        'respuesta_correcta': 'El arcoíris', 'categoria': 'SUCESO', 'dificultad': 'FACIL',
        'personaje': 'Noé', 'referencia_biblica': 'Génesis 9:13-16',
    },
    {
        'hecho_key': 'salida_arca_pacto',
        'pregunta': '¿Sobre qué hijo de Cam pronunció Noé una maldición tras salir del arca?',
        'opcion_a': 'Canaán', 'opcion_b': 'Mizraim', 'opcion_c': 'Cush', 'opcion_d': 'Jafet',
        'respuesta_correcta': 'Canaán', 'categoria': 'NOMBRE', 'dificultad': 'MEDIA',
        'personaje': 'Noé', 'referencia_biblica': 'Génesis 9:25',
    },
    {
        'hecho_id': '6',
        'pregunta': '¿Quién fue el caudillo asociado a la construcción de la torre de Babel?',
        'opcion_a': 'Nemrod', 'opcion_b': 'Abrahán', 'opcion_c': 'Taré', 'opcion_d': 'Peleg',
        'respuesta_correcta': 'Nemrod', 'categoria': 'NOMBRE', 'dificultad': 'FACIL',
        'personaje': 'Nemrod', 'referencia_biblica': 'Génesis 10:8-10',
    },
    {
        'hecho_key': 'nacimiento_isaac',
        'pregunta': '¿Qué edad tenía Abrahán cuando nació su hijo Isaac?',
        'opcion_a': '100 años', 'opcion_b': '75 años', 'opcion_c': '130 años', 'opcion_d': '90 años',
        'respuesta_correcta': '100 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Isaac', 'referencia_biblica': 'Génesis 21:5',
    },
    {
        'hecho_key': 'nacimiento_isaac',
        'pregunta': '¿Qué edad tenía Sara cuando nació Isaac?',
        'opcion_a': '90 años', 'opcion_b': '127 años', 'opcion_c': '100 años', 'opcion_d': '75 años',
        'respuesta_correcta': '90 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Sara', 'referencia_biblica': 'Génesis 17:17',
    },
    {
        'hecho_id': '11',
        'pregunta': '¿En qué monte probó Jehová a Abrahán pidiéndole que ofreciera a Isaac?',
        'opcion_a': 'Monte Moria', 'opcion_b': 'Monte Sinaí', 'opcion_c': 'Monte Nebo',
        'opcion_d': 'Monte Carmelo',
        'respuesta_correcta': 'Monte Moria', 'categoria': 'LUGAR', 'dificultad': 'FACIL',
        'personaje': 'Abrahán', 'referencia_biblica': 'Génesis 22:2',
    },
    {
        'hecho_key': 'nacimiento_jacob_esau',
        'pregunta': '¿Qué edad tenía Isaac cuando nacieron Jacob y Esaú?',
        'opcion_a': '60 años', 'opcion_b': '100 años', 'opcion_c': '40 años', 'opcion_d': '75 años',
        'respuesta_correcta': '60 años', 'categoria': 'EDAD', 'dificultad': 'MEDIA',
        'personaje': 'Isaac', 'referencia_biblica': 'Génesis 25:26',
    },
    {
        'hecho_key': 'nacimiento_jacob_esau',
        'pregunta': '¿Por qué intercambió Esaú su primogenitura a Jacob?',
        'opcion_a': 'Por un plato de guisado rojo', 'opcion_b': 'Por doce monedas de plata',
        'opcion_c': 'Por un campo en Beer-seba', 'opcion_d': 'Por la bendición de Isaac',
        'respuesta_correcta': 'Por un plato de guisado rojo', 'categoria': 'SUCESO', 'dificultad': 'FACIL',
        'personaje': 'Esaú', 'referencia_biblica': 'Génesis 25:31-34',
    },
    {
        'hecho_key': 'travesia_desierto',
        'pregunta': '¿Cuántos años vagaría Israel en el desierto tras la rebelión de Cades-barnea?',
        'opcion_a': '40 años', 'opcion_b': '10 años', 'opcion_c': '70 años', 'opcion_d': '430 años',
        'respuesta_correcta': '40 años', 'categoria': 'NUMERO', 'dificultad': 'FACIL',
        'personaje': 'Moisés', 'referencia_biblica': 'Números 14:33-34',
    },
    {
        'hecho_key': 'travesia_desierto',
        'pregunta': '¿Qué dos espías recomendaron entrar en Canaán con fe en el poder de Jehová?',
        'opcion_a': 'Josué y Caleb', 'opcion_b': 'Moisés y Aarón', 'opcion_c': 'Eleazar e Itamar',
        'opcion_d': 'Otoniel y Ehud',
        'respuesta_correcta': 'Josué y Caleb', 'categoria': 'NOMBRE', 'dificultad': 'FACIL',
        'personaje': 'Josué', 'referencia_biblica': 'Números 14:6-9',
    },
    {
        'hecho_key': 'muerte_josue_jueces',
        'pregunta': '¿Cuántos años vivió Josué al morir en Timnat-serah?',
        'opcion_a': '110 años', 'opcion_b': '120 años', 'opcion_c': '100 años', 'opcion_d': '147 años',
        'respuesta_correcta': '110 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Josué', 'referencia_biblica': 'Josué 24:29',
    },
    {
        'hecho_key': 'muerte_josue_jueces',
        'pregunta': '¿Quién fue el primer juez que liberó a Israel tras la muerte de Josué?',
        'opcion_a': 'Otoniel', 'opcion_b': 'Gedeón', 'opcion_c': 'Sansón', 'opcion_d': 'Jefté',
        'respuesta_correcta': 'Otoniel', 'categoria': 'NOMBRE', 'dificultad': 'MEDIA',
        'personaje': 'Otoniel', 'referencia_biblica': 'Jueces 3:9-11',
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


def resolve_hecho(q, by_id, by_key):
    if q.get('hecho_id'):
        return by_id.get(str(q['hecho_id']))
    if q.get('hecho_key'):
        return by_key.get(q['hecho_key'])
    return None


def patch_enriched():
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
        row = enr_by_norm.get(norm_q(q['pregunta']))
        hecho = resolve_hecho(q, by_id, by_key)
        if row and hecho:
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
        hecho = resolve_hecho(q, by_id, by_key)
        if not hecho:
            print('[warn] hecho no encontrado para:', q['pregunta'][:50])
            continue
        row = {c: '' for c in BASE_COLS}
        row['id'] = str(next_id)
        row['capitulo'] = CAP
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
        print('[info] tras enrich.py: python scripts/add_post_diluviano_preguntas.py --patch-only')
