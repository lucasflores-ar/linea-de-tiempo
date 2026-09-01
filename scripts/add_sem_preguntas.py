# -*- coding: utf-8 -*-
"""Agrega preguntas sobre Noé, Sem y la genealogía (lámina S1 / Génesis 5–11).
Idempotente: no duplica si la pregunta ya existe (texto normalizado).
Uso: python scripts/add_sem_preguntas.py && python scripts/enrich.py && python scripts/gen_timeline.py
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

CAPITULO = 'GENEALOGÍA DE NOÉ Y SEM'

QUESTIONS = [
    {
        'pregunta': '¿Qué edad tenía Noé cuando comenzó a engendrar a sus hijos?',
        'opcion_a': '500 años', 'opcion_b': '502 años', 'opcion_c': '600 años', 'opcion_d': '100 años',
        'respuesta_correcta': '500 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Noé', 'referencia_biblica': 'Génesis 5:32', 'hecho_id': '294',
    },
    {
        'pregunta': '¿Qué edad tenía Noé al momento de nacer su hijo Sem?',
        'opcion_a': '502 años', 'opcion_b': '500 años', 'opcion_c': '600 años', 'opcion_d': '550 años',
        'respuesta_correcta': '502 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Noé', 'referencia_biblica': 'Génesis 11:10', 'hecho_id': '295',
    },
    {
        'pregunta': '¿Cuántos años tenía Noé cuando sobrevino el Diluvio universal?',
        'opcion_a': '600 años', 'opcion_b': '500 años', 'opcion_c': '502 años', 'opcion_d': '650 años',
        'respuesta_correcta': '600 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Noé', 'referencia_biblica': 'Génesis 7:6', 'hecho_id': '5',
    },
    {
        'pregunta': '¿Cuál era el estado civil y la condición de Sem al llegar el Diluvio universal?',
        'opcion_a': 'Estaba casado y tenía menos de 100 años',
        'opcion_b': 'Era soltero y tenía 100 años cumplidos',
        'opcion_c': 'Tenía 120 años y ya contaba con varios hijos',
        'opcion_d': 'Estaba recién prometido y no tenía hermanos',
        'respuesta_correcta': 'Estaba casado y tenía menos de 100 años',
        'categoria': 'SUCESO', 'dificultad': 'MEDIA',
        'personaje': 'Sem', 'referencia_biblica': 'Génesis 7:7', 'hecho_id': '5',
    },
    {
        'pregunta': '¿Qué edad tenía Sem cuando engendró a su primer hijo, Arpaksad?',
        'opcion_a': '100 años', 'opcion_b': '500 años', 'opcion_c': '600 años', 'opcion_d': '502 años',
        'respuesta_correcta': '100 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Sem', 'referencia_biblica': 'Génesis 11:10', 'hecho_id': '296',
    },
    {
        'pregunta': '¿Cuántos años vivió Sem después del nacimiento de su hijo Arpaksad?',
        'opcion_a': '500 años', 'opcion_b': '600 años', 'opcion_c': '100 años', 'opcion_d': '150 años',
        'respuesta_correcta': '500 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Sem', 'referencia_biblica': 'Génesis 11:11', 'hecho_id': '296',
    },
    {
        'pregunta': '¿Cuál fue la edad total que alcanzó Sem al momento de su muerte?',
        'opcion_a': '600 años', 'opcion_b': '500 años', 'opcion_c': '502 años', 'opcion_d': '650 años',
        'respuesta_correcta': '600 años', 'categoria': 'EDAD', 'dificultad': 'FACIL',
        'personaje': 'Sem', 'referencia_biblica': 'Génesis 11:11', 'hecho_id': '298',
    },
    {
        'pregunta': '¿Qué edad tenía aproximadamente Abrahán cuando se produjo la muerte de Sem?',
        'opcion_a': 'Unos 150 años', 'opcion_b': 'Unos 100 años', 'opcion_c': 'Unos 600 años', 'opcion_d': 'Unos 75 años',
        'respuesta_correcta': 'Unos 150 años', 'categoria': 'EDAD', 'dificultad': 'MEDIA',
        'personaje': 'Abrahán', 'referencia_biblica': 'Génesis 11:11', 'hecho_id': '298',
    },
    {
        'pregunta': '¿Quién fue lógicamente el primer hijo que le nació a Noé a los 500 años?',
        'opcion_a': 'Jafet', 'opcion_b': 'Sem', 'opcion_c': 'Cam', 'opcion_d': 'Arpaksad',
        'respuesta_correcta': 'Jafet', 'categoria': 'NOMBRE', 'dificultad': 'MEDIA',
        'personaje': 'Noé', 'referencia_biblica': 'Génesis 10:21', 'hecho_id': '294',
    },
    {
        'pregunta': '¿Quién es identificado en el registro de Génesis 9:24 como el "hijo menor" de Noé?',
        'opcion_a': 'Cam', 'opcion_b': 'Sem', 'opcion_c': 'Jafet', 'opcion_d': 'Arpaksad',
        'respuesta_correcta': 'Cam', 'categoria': 'NOMBRE', 'dificultad': 'FACIL',
        'personaje': 'Noé', 'referencia_biblica': 'Génesis 9:24', 'hecho_id': '5',
    },
    {
        'pregunta': 'Aunque era el primogénito de Sem, ¿en qué posición aparece mencionado Arpaksad en los registros genealógicos?',
        'opcion_a': 'En el tercer lugar', 'opcion_b': 'En el primer lugar', 'opcion_c': 'En el segundo lugar', 'opcion_d': 'En el último lugar',
        'respuesta_correcta': 'En el tercer lugar', 'categoria': 'NUMERO', 'dificultad': 'MEDIA',
        'personaje': 'Arpaksad', 'referencia_biblica': 'Lucas 3:36', 'hecho_id': '296',
    },
    {
        'pregunta': '¿De cuál de los tres hijos de Noé descendía directamente el patriarca Abrahán?',
        'opcion_a': 'Sem', 'opcion_b': 'Cam', 'opcion_c': 'Jafet', 'opcion_d': 'Melquisedec',
        'respuesta_correcta': 'Sem', 'categoria': 'PARENTESCO', 'dificultad': 'FACIL',
        'personaje': 'Abrahán', 'referencia_biblica': 'Génesis 11:10-26', 'hecho_id': '296',
    },
    {
        'pregunta': '¿Cuántos años transcurrieron entre la muerte de Sara y la muerte de Sem?',
        'opcion_a': '13 años', 'opcion_b': '10 años', 'opcion_c': '2 años', 'opcion_d': '150 años',
        'respuesta_correcta': '13 años', 'categoria': 'NUMERO', 'dificultad': 'MEDIA',
        'personaje': 'Sem', 'referencia_biblica': 'Génesis 23:1', 'hecho_id': '298',
    },
    {
        'pregunta': '¿Cuántos años después del matrimonio de Isaac y Rebeca se produjo el fallecimiento de Sem?',
        'opcion_a': '10 años', 'opcion_b': '13 años', 'opcion_c': '2 años', 'opcion_d': '150 años',
        'respuesta_correcta': '10 años', 'categoria': 'NUMERO', 'dificultad': 'MEDIA',
        'personaje': 'Sem', 'referencia_biblica': 'Génesis 24:1-67', 'hecho_id': '298',
    },
    {
        'pregunta': '¿A qué personaje bíblico, cuyo nombre significa "Rey de Justicia", se ha llegado a asociar hipotéticamente con Sem debido a la coincidencia cronológica?',
        'opcion_a': 'Melquisedec', 'opcion_b': 'Abrahán', 'opcion_c': 'Arpaksad', 'opcion_d': 'Isaac',
        'respuesta_correcta': 'Melquisedec', 'categoria': 'NOMBRE', 'dificultad': 'DIFICIL',
        'personaje': 'Sem', 'referencia_biblica': 'Génesis 14:18', 'hecho_id': '298',
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


def main():
    rows, _ = load_rows(INP, BASE_COLS)
    existing = {norm_q(r['pregunta']) for r in rows}
    next_id = max(int(r['id']) for r in rows) + 1
    added = 0
    id_map = {}

    for q in QUESTIONS:
        key = norm_q(q['pregunta'])
        if key in existing:
            for r in rows:
                if norm_q(r['pregunta']) == key:
                    id_map[key] = r['id']
            print('  ya existe:', q['pregunta'][:60])
            continue
        row = {c: '' for c in BASE_COLS}
        row['id'] = str(next_id)
        row['capitulo'] = CAPITULO
        for k in q:
            if k != 'hecho_id' and k in row:
                row[k] = q[k]
        rows.append(row)
        id_map[key] = str(next_id)
        existing.add(key)
        print('  +', next_id, q['pregunta'][:55])
        next_id += 1
        added += 1

    if added:
        save_rows(INP, rows, BASE_COLS)
        print('agregadas:', added, '->', INP)
    else:
        print('sin preguntas nuevas en', INP)

    # Parche enriquecido (tras enrich.py o si ya existe)
    if not os.path.exists(OUT_ENR):
        print('[info] ejecuta enrich.py para generar', OUT_ENR)
        return

    with open(HECH, encoding='utf-8-sig', newline='') as f:
        hechos = {h['id']: h for h in csv.DictReader(f)}

    enr_rows, _ = load_rows(OUT_ENR, ENR_COLS)
    enr_by_norm = {norm_q(r['pregunta']): r for r in enr_rows}
    patched = 0
    for q in QUESTIONS:
        key = norm_q(q['pregunta'])
        row = enr_by_norm.get(key)
        if not row:
            continue
        hid = q['hecho_id']
        if hid in hechos:
            apply_hecho(row, hechos[hid])
            patched += 1

    if patched:
        save_rows(OUT_ENR, enr_rows, ENR_COLS)
        print('hecho_id parcheados en enriquecidas:', patched)


if __name__ == '__main__':
    main()
