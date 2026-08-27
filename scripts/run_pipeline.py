# -*- coding: utf-8 -*-
"""Ejecuta el pipeline completo de datos (enriquecer -> timeline -> fichas)."""
import os
import subprocess
import sys

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPTS_DIR)

STEPS = [
    ('enrich.py', 'Enriquecer preguntas'),
    ('gen_timeline.py', 'Generar linea-tiempo-datos.js'),
    ('gen_fichas.py', 'Generar fichas (CSV + JS)'),
]


def main():
    py = sys.executable
    for name, label in STEPS:
        path = os.path.join(SCRIPTS_DIR, name) if name != 'gen_fichas.py' else os.path.join(REPO_ROOT, name)
        print('==>', label, '(', name, ')')
        subprocess.check_call([py, path], cwd=REPO_ROOT)
    print('Pipeline OK')


if __name__ == '__main__':
    main()
