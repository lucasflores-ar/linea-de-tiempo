# -*- coding: utf-8 -*-
"""Mapa libro → categoría de escritura (AT/NT) desde curacion/escritura_categorias.json."""
import json
import os

from paths import REPO_ROOT

_JSON = os.path.join(REPO_ROOT, 'curacion', 'escritura_categorias.json')

with open(_JSON, encoding='utf-8') as f:
    _DATA = json.load(f)

CATEGORIAS = _DATA['categorias']
CATEGORIAS_NT = [c for c in CATEGORIAS if c.get('timeline')]
CATEGORIAS_AT = [c for c in CATEGORIAS if c['testamento'] == 'AT']

LIBRO_A_CATEGORIA = {}
for cat in CATEGORIAS:
    for libro in cat.get('libros') or []:
        LIBRO_A_CATEGORIA[libro.strip().upper()] = cat['id']

LIBROS_NT = {libro for cat in CATEGORIAS_NT for libro in cat.get('libros') or []}


def categoria_escritura_de_libro(libro):
    """Id de categoría (p. ej. NT-CARTAS) o None."""
    if not libro:
        return None
    return LIBRO_A_CATEGORIA.get(str(libro).strip().upper())
