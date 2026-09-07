# -*- coding: utf-8 -*-
"""Comprueba que gen_timeline.py, con el CSV de origen actual, produzca los
mismos temas que ya tiene linea-tiempo-datos.js.

Si coinciden, los parches del repo (fix_event_themes.js) son redundantes y una
regeneracion no reintroduce los errores de epoca. Solo lee.

Extrae de gen_timeline.py las funciones de temas y las ejecuta aisladas, para no
disparar el pipeline completo (que reescribe los datos del repo).

Uso: python scripts/verify_temas_generador.py
"""
import ast
import csv
import io
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo
from escritura_categorias import LIBROS_NT, categoria_escritura_de_libro

GEN = repo('scripts', 'gen_timeline.py')
CSV = db('hechos_biblicos.csv')
DATOS = repo('linea-tiempo-datos.js')
FUNCIONES = ('_norm_libro', 'libro_redaccion_canonica', 'es_era_ec', 'menciona_persona', 'temas_de')

fuente = open(GEN, encoding='utf-8').read()
arbol = ast.parse(fuente)
ns = {
    're': re,
    'LIBROS_NT': LIBROS_NT,
    'categoria_escritura_de_libro': categoria_escritura_de_libro,
}
encontradas = []
for nodo in arbol.body:
    if isinstance(nodo, ast.FunctionDef) and nodo.name in FUNCIONES:
        exec(compile(ast.Module(body=[nodo], type_ignores=[]), GEN, 'exec'), ns)
        encontradas.append(nodo.name)

faltan = [f for f in FUNCIONES if f not in encontradas]
if faltan:
    print('ABORTADO: no se hallaron en gen_timeline.py:', ', '.join(faltan))
    sys.exit(2)
temas_de = ns['temas_de']

filas = list(csv.DictReader(io.StringIO(open(CSV, encoding='utf-8-sig').read(), newline='')))
crudo = open(DATOS, encoding='utf-8').read()
datos = json.loads(crudo.split('=', 1)[1].strip().rstrip(';').strip())
actuales = {int(e['id']): list(e.get('t') or []) for e in datos['eventos']}

print('filas en el CSV:', len(filas), '| sucesos en los datos:', len(actuales))

difs = []
for fila in filas:
    try:
        fid = int(fila['id'])
    except (TypeError, ValueError):
        continue
    if fid not in actuales:
        continue
    generado = temas_de(fila)
    if generado != actuales[fid]:
        difs.append((fid, fila.get('nombre') or '', actuales[fid], generado))

if not difs:
    print('\nOK: el generador reproduce exactamente los temas de linea-tiempo-datos.js.')
    sys.exit(0)

print('\n' + str(len(difs)) + ' suceso(s) donde el generador NO coincide con los datos:')
for fid, nombre, en_datos, generado in difs:
    print('  id ' + str(fid) + ' | ' + nombre[:55])
    print('      en los datos: ' + json.dumps(en_datos, ensure_ascii=False))
    print('      generaria:    ' + json.dumps(generado, ensure_ascii=False))
sys.exit(1)
