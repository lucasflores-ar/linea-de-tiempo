# -*- coding: utf-8 -*-
"""Añade ids nuevos de fechas_historicas a curacion/grupos.json."""
import csv
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

HECH = db('hechos_biblicos.csv')
GRUPOS = repo('curacion', 'grupos.json')
TSV = repo('curacion', 'fechas_historicas.tsv')

GROUP_RULES = [
    ('antediluviano', lambda e: e['era'].startswith('PREHISTORIA') or e['era'] == 'DILUVIO'),
    ('post-diluviano', lambda e: e['era'] in ('POSTDILUVIANO', 'PATRIARCAS', 'PATRIARCAS / EGIPTO', 'EGIPTO', 'EGIPTO / EXODO', 'EXODO', 'EXODO / LEY', 'DESIERTO', 'JUECES') or e['clave'] in ('torre_babel', 'pacto_abrhan_cruzada_eufrates', 'muerte_jose', 'pascua_salida_egipto', 'israel_entra_canaan')),
    ('genealogia-sem', lambda e: e['clave'] in ('nacimiento_sem', 'nacimiento_arpaksad', 'muerte_sem', 'muerte_sara', 'matrimonio_isaac_rebeca')),
    ('jose-egipto', lambda e: 'jose' in e['clave'] or e['clave'] in ('jacob_familia_egipto', 'muerte_jacob')),
    ('conquista-canaan', lambda e: e['clave'] in ('israel_entra_canaan', 'conquista_general_canaan', 'muerte_josue', 'libro_josue_completado')),
    ('reino-david-salomon', lambda e: e['clave'] in ('david_trono_juda', 'david_trono_israel', 'arca_pacto_reino_david', 'salomon_sucede_david', 'construccion_templo_salomon', 'templo_completado', 'salomon_cantar_cantares', 'salomon_eclesiastes')),
    ('reyes-profetas-a6', lambda e: e['era'] == 'REINO DIVIDIDO' or e['era'] == 'EXILIO'),
    ('cautiverio-babilonico', lambda e: e['clave'] in ('primeros_cautivos_babilonia', 'sitio_jerusalen_tercera_vez', 'templo_arrasado_607', 'judios_abandonan_juda', 'jeremias_lamentaciones', 'ezequiel_empieza_profetizar', 'ezequiel_completa_libro')),
    ('restauracion-jerusalen', lambda e: e['era'] in ('RESTAURACIÓN', 'POSTEXILIO') or e['clave'] in ('decreto_ciro_retorno', 'segundo_templo_completado', 'nehemias_muros_jerusalen', 'esdras_regresa_jerusalen')),
    ('ministerio-jesus', lambda e: e['clave'] in ('juan_jesus_inician_ministerio', 'jesus_sacrificio_14_nisan', 'resurreccion_jesus_16_nisan')),
    ('ultima-semana-jesus', lambda e: e['clave'] in ('jesus_sacrificio_14_nisan', 'jesus_fijado_madero', 'resurreccion_jesus_16_nisan')),
    ('difusion-cristianismo', lambda e: e['clave'] in ('pentecostes_33', 'cornelio_36')),
    ('pablo-misionero', lambda e: e['clave'].startswith('pablo_') and 'gira' in e['clave'] or e['clave'] in ('pablo_primera_gira', 'pablo_segunda_gira', 'pablo_tercera_gira', 'lucas_hechos_roma')),
]


def main():
    with open(TSV, encoding='utf-8', newline='') as f:
        tsv = {r['clave']: r for r in csv.DictReader(f, delimiter='\t')}
    with open(HECH, encoding='utf-8-sig', newline='') as f:
        hechos = {r['etiqueta_jw']: r for r in csv.DictReader(f) if r.get('etiqueta_jw')}

    with open(GRUPOS, encoding='utf-8') as f:
        data = json.load(f)

    added_total = 0
    for gid, pred in GROUP_RULES:
        grp = next((g for g in data['grupos'] if g['id'] == gid), None)
        if not grp:
            continue
        ids = set(grp.get('evento_ids', []))
        before = len(ids)
        for clave, ev in tsv.items():
            if not pred({'clave': clave, 'era': ev['era']}):
                continue
            h = hechos.get(clave)
            if h:
                ids.add(int(h['id']))
        grp['evento_ids'] = sorted(ids)
        added_total += len(ids) - before
        print(gid, '+', len(ids) - before, '->', len(ids), 'eventos')

    with open(GRUPOS, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write('\n')
    print('OK —', added_total, 'ids añadidos a grupos.json')


if __name__ == '__main__':
    main()
