# -*- coding: utf-8 -*-
"""Ejecuta el pipeline completo de datos (enriquecer -> timeline -> fichas)."""
import os
import subprocess
import sys

SCRIPTS_DIR = os.path.dirname(os.path.abspath(__file__))
REPO_ROOT = os.path.dirname(SCRIPTS_DIR)

STEPS = [
    ('gen_hechos_libros.py', 'Generar hechos para libros sin suceso'),
    ('gen_nt_escritura.py', 'Actualizar redacción NT desde nt_escritura.json'),
    ('merge_jw_slides.py', 'Fusionar líneas de tiempo JW (B2–B13)'),
    ('merge_antediluviano.py', 'Fusionar sucesos antediluvianos'),
    ('merge_post_diluviano.py', 'Fusionar sucesos post-diluvianos'),
    ('merge_reyes_profetas.py', 'Fusionar reyes y profetas (A6)'),
    ('gen_personajes.py', 'Generar personajes_biblicos.csv'),
    ('add_antediluviano_preguntas.py', 'Agregar preguntas antediluvianas'),
    ('add_post_diluviano_preguntas.py', 'Agregar preguntas post-diluvianas'),
    ('enrich.py', 'Enriquecer preguntas'),
    ('add_antediluviano_preguntas.py --patch-only', 'Parchear hecho_id preguntas antediluvianas'),
    ('add_post_diluviano_preguntas.py --patch-only', 'Parchear hecho_id preguntas post-diluvianas'),
    ('gen_timeline.py', 'Generar linea-tiempo-datos.js'),
    ('gen_fichas.py', 'Generar fichas (CSV + JS)'),
]


def main():
    py = sys.executable
    for name, label in STEPS:
        parts = name.split()
        script = parts[0]
        args = parts[1:]
        path = os.path.join(SCRIPTS_DIR, script) if script != 'gen_fichas.py' else os.path.join(REPO_ROOT, script)
        print('==>', label, '(', name, ')')
        subprocess.check_call([py, path, *args], cwd=REPO_ROOT)
    print('Pipeline OK')


if __name__ == '__main__':
    main()
