# -*- coding: utf-8 -*-
"""Actualiza hechos de redacción del NT desde curacion/nt_escritura.json.

- Upsert por hecho_id_existente o por (libro + tipo redacción).
- descripcion del hecho = los dos primeros ítems de datos_interesantes (sin sub-viñetas).
- Rellena fecha_fin, lugar de escritura y fecha_estimada.

Uso (en run_pipeline.py, después de gen_hechos_libros.py):
    python scripts/gen_nt_escritura.py
"""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, REPO_ROOT

HECH = db('hechos_biblicos.csv')
JSON_PATH = os.path.join(REPO_ROOT, 'curacion', 'nt_escritura.json')
DESCRIPCION_BULLETS = 2


def descripcion_timeline(entry):
    items = entry.get('datos_interesantes') or []
    parts = [str(x).strip() for x in items if str(x).strip()]
    return '\n\n'.join(parts[:DESCRIPCION_BULLETS])


def fecha_estimada_flag(entry):
    if entry.get('ini_est') or entry.get('fin_est') or entry.get('lugar_incerto'):
        return '1'
    ft = (entry.get('fecha_texto') or '').lower()
    ftf = (entry.get('fecha_fin_texto') or '').lower()
    if 'c.' in ft or 'aprox' in ft or 'c.' in ftf or 'aprox' in ftf:
        return '1'
    return ''


def find_hecho_index(hechos, entry):
    hid = entry.get('hecho_id_existente')
    if hid is not None:
        hid = str(hid)
        for i, h in enumerate(hechos):
            if str(h.get('id')) == hid:
                return i
    libro = (entry.get('libro') or '').strip().upper()
    tipo = (entry.get('tipo_suceso') or 'redacción').strip().lower()
    for i, h in enumerate(hechos):
        if (h.get('libro') or '').strip().upper() != libro:
            continue
        ht = (h.get('tipo_suceso') or '').strip().lower()
        if ht.startswith('redacción') or ht.startswith('redaccion'):
            if not tipo or ht.startswith(tipo.split('/')[0]):
                return i
    return None


def apply_entry(hechos, entry):
    idx = find_hecho_index(hechos, entry)
    if idx is None:
        # crear hecho de redacción nuevo (evangelios, Hechos, Apocalipsis)
        return create_entry(hechos, entry)

    h = hechos[idx]
    lugar = entry.get('lugar_escritura') or h.get('lugar_antiguo') or ''
    if entry.get('lugar_incerto') and lugar and '?' not in lugar:
        lugar = lugar + ' (?)'

    h['nombre'] = entry.get('nombre') or h.get('nombre')
    h['descripcion'] = descripcion_timeline(entry)
    h['fecha_texto'] = entry.get('fecha_texto') or h.get('fecha_texto')
    h['fecha_anio'] = str(entry.get('inicio', h.get('fecha_anio') or ''))
    h['fecha_fin'] = str(entry['fin']) if entry.get('fin') is not None else (h.get('fecha_fin') or '')
    h['fecha_fin_texto'] = entry.get('fecha_fin_texto') or h.get('fecha_fin_texto') or ''
    h['fecha_estimada'] = fecha_estimada_flag(entry)
    h['lugar_antiguo'] = lugar
    h['tipo_suceso'] = entry.get('tipo_suceso') or h.get('tipo_suceso')
    h['personajes'] = entry.get('personajes') or entry.get('escritor') or h.get('personajes')
    if entry.get('referencia'):
        h['referencia'] = entry['referencia']
    if entry.get('libro'):
        h['libro'] = entry['libro']
    if entry.get('lat') is not None:
        h['lat'] = str(entry['lat'])
    if entry.get('lon') is not None:
        h['lon'] = str(entry['lon'])
    h['era'] = 'E.C.'
    return True


def create_entry(hechos, entry):
    """Crea un hecho de redacción NUEVO (no upsert) para libros sin hecho previo."""
    def _int(x):
        try:
            return int(x)
        except (TypeError, ValueError):
            return 1
    max_id = max((_int(h.get('id') or 0) for h in hechos), default=0)

    lugar = entry.get('lugar_escritura') or ''
    if entry.get('lugar_incerto') and lugar and '?' not in lugar:
        lugar = lugar + ' (?)'

    nuevo = {
        'id': str(max_id + 1),
        'nombre': entry.get('nombre') or entry.get('libro'),
        'descripcion': descripcion_timeline(entry),
        'fecha_texto': entry.get('fecha_texto') or '',
        'fecha_anio': str(entry.get('inicio') or ''),
        'era': 'E.C.',
        'lugar_antiguo': lugar,
        'lat': str(entry.get('lat') or ''),
        'lon': str(entry.get('lon') or ''),
        'tipo_suceso': entry.get('tipo_suceso') or 'redacción',
        'personajes': entry.get('personajes') or entry.get('escritor') or '',
        'referencia': entry.get('referencia') or '',
        'libro': entry.get('libro') or '',
        'capitulo_inicio': '1',
        'capitulo_fin': '1',
        'fecha_fin': str(entry['fin']) if entry.get('fin') is not None else '',
        'fecha_fin_texto': entry.get('fecha_fin_texto') or '',
        'fecha_estimada': fecha_estimada_flag(entry),
    }
    hechos.append(nuevo)
    print('  creado:', entry.get('libro'), '->', nuevo['nombre'], 'id', nuevo['id'])
    return True


def main():
    if not os.path.isfile(JSON_PATH):
        print('No existe', JSON_PATH)
        return

    with open(JSON_PATH, encoding='utf-8') as f:
        data = json.load(f)

    libros = data.get('libros') or []
    if not libros:
        print('nt_escritura.json sin libros')
        return

    hechos = list(csv.DictReader(open(HECH, encoding='utf-8-sig')))
    fieldnames = list(hechos[0].keys()) if hechos else []
    for col in ('fecha_fin', 'fecha_fin_texto', 'fecha_estimada'):
        if col not in fieldnames:
            fieldnames.append(col)

    updated = 0
    for entry in libros:
        if apply_entry(hechos, entry):
            updated += 1
            print('  actualizado:', entry.get('libro'), '->', entry.get('nombre'))

    if not updated:
        print('Nada que actualizar.')
        return

    with open(HECH, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        w.writeheader()
        for h in hechos:
            w.writerow(h)

    print('hechos actualizados:', updated)


if __name__ == '__main__':
    main()
