# -*- coding: utf-8 -*-
"""Genera curacion/fechas_historicas.tsv desde fechas_historicas_data.py."""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import repo
from fechas_historicas_data import EVENTOS

OUT = repo('curacion', 'fechas_historicas.tsv')
COLS = ['clave', 'prefijo', 'anio', 'nombre', 'referencia', 'era', 'tipo', 'personajes', 'match_id']


def main():
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f, delimiter='\t', lineterminator='\n')
        w.writerow(COLS)
        for ev in EVENTOS:
            clave, prefijo, anio, nombre, ref, era, tipo, pers, mid = ev
            w.writerow([clave, prefijo, anio, nombre, ref, era, tipo, pers, mid])
    print('OK —', len(EVENTOS), 'filas ->', OUT)


if __name__ == '__main__':
    main()
