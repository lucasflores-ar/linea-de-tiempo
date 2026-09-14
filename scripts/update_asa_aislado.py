# -*- coding: utf-8 -*-
"""Aplica correcciones explícitas sobre IDs existentes, sin regenerar el proyecto.

La fuente de verdad de cada corrección está en curacion/ y la entrada se valida
contra el bundle versionado antes de tocar únicamente sus campos declarados.
No lee ni escribe la base externa: las altas nuevas siguen el flujo de
import_sucesos_aislados.py con un snapshot congelado.
"""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OVERRIDES = ROOT / 'curacion' / 'descripciones_sucesos.json'
CONQUEST = ROOT / 'curacion' / 'descripciones_sucesos_conquista.json'
DATA = ROOT / 'linea-tiempo-datos.js'
DETAIL = ROOT / 'linea-tiempo-detalle.json'


def parse_bundle(text):
    raw = text.replace('\ufeff', '')
    raw = raw[raw.index('window.LT_DATA = ') + len('window.LT_DATA = '):].strip()
    return json.loads(raw[:-1] if raw.endswith(';') else raw)


def main():
    overrides = {}
    for source in (OVERRIDES, CONQUEST):
        with source.open(encoding='utf-8') as f:
            overrides.update(json.load(f))

    with DATA.open(encoding='utf-8') as f:
        data = parse_bundle(f.read())
    with DETAIL.open(encoding='utf-8') as f:
        detail = json.load(f)

    asa = overrides['asa_sucede_abiyam']
    event = next(e for e in data['eventos'] if e['id'] == asa['id'])
    if event.get('jwl') != 'asa_sucede_abiyam' and event.get('jwlabel') != 'asa_sucede_abiyam':
        raise RuntimeError('el id 280 no corresponde al suceso de Asá')
    event['fa'] = -977
    person = next(p for p in data['personajes'] if p.get('n') == 'Asá')
    person['inicio'] = -977
    person['ie'] = False
    person['nota'] = 'rey 977-937'
    rp = next(p for p in data['reyes_profetas'] if p['codigo'] == 'A6')
    rey = next(r for r in rp['judah'] if r['clave'] == 'rey_asa')
    rey['inicio'] = -977
    det = next(e for e in detail['eventosDetail'] if e['id'] == asa['id'])
    det['d'] = asa['descripcion']

    conquest = overrides['conquista_tierra_prometida']
    conquest_event = next(e for e in data['eventos'] if e['id'] == conquest['id'])
    if conquest_event.get('jwlabel') != conquest['etiqueta_jw']:
        raise RuntimeError('el id 34 no corresponde al comienzo de la conquista')
    conquest_event['n'] = conquest['nombre']
    conquest_event['fa'] = -1473
    conquest_detail = next(e for e in detail['eventosDetail'] if e['id'] == conquest['id'])
    conquest_detail['d'] = conquest['descripcion']

    detail_text = json.dumps(detail, ensure_ascii=False, separators=(',', ':'))
    data['_v'] = hashlib.sha1((json.dumps(data, ensure_ascii=False, separators=(',', ':')) + detail_text).encode('utf-8')).hexdigest()[:8]
    with DATA.open('w', encoding='utf-8') as f:
        f.write('window.LT_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with DETAIL.open('w', encoding='utf-8') as f:
        f.write(detail_text + '\n')
    print('OK — correcciones aisladas aplicadas a IDs 280 y 34; sin regeneración completa')


if __name__ == '__main__':
    main()
