# -*- coding: utf-8 -*-
"""Genera personajes_biblicos.csv: vidas (inicio/fin) de personajes segun cronologia JW.
Secciones de la publicacion "Seamos valientes":
  S1 = De los dias de los patriarcas a la epoca de los jueces
  S2 = De los dias de los reyes a la reconstruccion de Jerusalen
  S3 = Del Mesias a los cristianos del primer siglo
Columna grupo = fila (row) en la linea de tiempo vis.
"""
import csv, io, json, sys, os, unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

P = [
 # ---- Seccion 1: Antes del Diluvio (lamina JW S1) ----
 dict(nombre='Adán',            inicio=-4026, fin=-3096, seccion='S1', grupo='Antes del Diluvio', nota='930 años'),
 dict(nombre='Enoc',            inicio=-3404, fin=-3039, seccion='S1', grupo='Antes del Diluvio', nota='365 años; trasladado 3039 a.e.c.'),
 dict(nombre='Noé',             inicio=-2970, fin=-2020, seccion='S1', grupo='Antes del Diluvio',
      nota='950 años; engendra a los 500 (2470); Diluvio a los 600 (2370); padre de Sem, Cam y Jafet'),
 dict(nombre='Sem',             inicio=-2468, fin=-1868, seccion='S1', grupo='Antes del Diluvio',
      nota='600 años; hijo de Noé (502 años); Arpaksad 2368; antepasado de Abrahán; muere 1868 a.e.c.'),
 # ---- Seccion 1: Despues del Diluvio (lamina JW S1) ----
 dict(nombre='Abrahán',         inicio=-2018, fin=-1843, seccion='S1', grupo='Después del Diluvio', nota='175 años'),
 dict(nombre='Sara',            inicio=-2008, fin=-1881, seccion='S1', grupo='Después del Diluvio', nota='127 años'),
 dict(nombre='Isaac',           inicio=-1918, fin=-1738, seccion='S1', grupo='Después del Diluvio', nota='180 años'),
 dict(nombre='Rebeca',          inicio=-1900, fin=-1775, seccion='S1', grupo='Después del Diluvio', ini_est=1, fin_est=1, nota='aprox. (lámina S1)'),
 dict(nombre='Jacob',           inicio=-1858, fin=-1711, seccion='S1', grupo='Después del Diluvio', nota='147 años'),
 dict(nombre='José',            inicio=-1767, fin=-1647, seccion='S1', grupo='Después del Diluvio', nota='110 años'),
 dict(nombre='Sifrá, Pua, Amram, Jokébed y Míriam', inicio=-1645, fin=-1474, seccion='S1', grupo='Después del Diluvio',
      ini_est=1, fin_est=1, nota='Vidas agrupadas; años aprox. (lámina S1)'),
 dict(nombre='Moisés',          inicio=-1593, fin=-1473, seccion='S1', grupo='Después del Diluvio', nota='120 años'),
 dict(nombre='Aarón',           inicio=-1596, fin=-1473, seccion='S1', grupo='Después del Diluvio', nota='123 años'),
 dict(nombre='Caleb',           inicio=-1552, fin=-1450, seccion='S1', grupo='Después del Diluvio', fin_est=1, nota='85 años al entrar en Canaán; fin aprox.'),
 dict(nombre='Josué',           inicio=-1560, fin=-1450, seccion='S1', grupo='Después del Diluvio', ini_est=1, fin_est=1, nota='110 años, aprox. (lámina S1)'),
 dict(nombre='Rahab',           inicio=-1500, fin=-1400, seccion='S1', grupo='Después del Diluvio', ini_est=1, fin_est=1, nota='aprox. (lámina S1)'),
 # ---- Seccion 1: Epoca de los jueces (lamina JW S1: una fila, 330 años) ----
 dict(nombre='Noemí, Rut, Débora, Barac, Jael, Gedeón, Jefté y su hija, y Sansón',
      inicio=-1450, fin=-1120, seccion='S1', grupo='Época de los jueces', ini_est=1, fin_est=1,
      nota=('Periodo de 330 años (lámina S1). '
            'No se puede precisar en todos los casos cuándo ni sobre qué zona exacta ejerció su '
            'jurisdicción cada uno de los jueces. Puede que en ciertas épocas varios jueces juzgaran '
            'al mismo tiempo en diferentes partes de Israel; el registro también indica que entre un '
            'juez y otro mediaron períodos de opresión.'),
      referencia=(
          'JUECES — Hombres que Jehová levantó para librar a su pueblo antes del período de los '
          'reyes humanos de Israel. (Jue 2:16.) Moisés, el mediador del pacto de la Ley y caudillo '
          'nombrado por Dios, juzgó a Israel durante cuarenta años. Pero normalmente se considera que '
          'el período de los jueces empezó con Otniel algún tiempo después de la muerte de Josué, y duró '
          'hasta Samuel el profeta, a quien por lo general no se le incluye entre ellos. De modo que el '
          'período de los jueces abarcó unos trescientos años. (Jue 2:16; Hch 13:20.)\n\n'
          'Jehová seleccionó y nombró a los jueces de entre las diversas tribus de Israel. Entre Josué y '
          'Samuel el registro bíblico menciona a doce jueces (sin incluir a Débora), según el siguiente '
          'orden:\n\n'
          'Juez | Tribu\n'
          'Otniel | Judá\n'
          'Ehúd | Benjamín\n'
          'Samgar | Neftalí (?)\n'
          'Barac | Neftalí\n'
          'Gedeón | Manasés\n'
          'Tolá | Isacar\n'
          'Jaír | Manasés\n'
          'Jefté | Manasés\n'
          'Ibzán | Zabulón (?)\n'
          'Elón | Zabulón\n'
          'Abdón | Efraín\n'
          'Sansón | Dan\n\n'
          '“(?)” significa que no se sabe su tribu con certeza.')),
 # ---- Seccion 2: Un solo reino ----
 dict(nombre='Samuel',          inicio=-1150, fin=-1080, seccion='S2', grupo='Un solo reino', nota='aprox.'),
 dict(nombre='Saúl',            inicio=-1117, fin=-1077, seccion='S2', grupo='Un solo reino', nota='rey 1117-1077'),
 dict(nombre='Jonatán',         inicio=-1110, fin=-1077, seccion='S2', grupo='Un solo reino', nota='hijo de Saúl'),
 dict(nombre='David',           inicio=-1107, fin=-1037, seccion='S2', grupo='Un solo reino', nota='70 años; rey 1077-1037'),
 dict(nombre='Abigaíl',         inicio=-1080, fin=-1000, seccion='S2', grupo='Un solo reino', nota='aprox.'),
 dict(nombre='Natán',           inicio=-1060, fin=-990,  seccion='S2', grupo='Un solo reino', nota='profeta, aprox.'),
 dict(nombre='Mefibóset',       inicio=-1075, fin=-1000, seccion='S2', grupo='Un solo reino', nota='hijo de Jonatán, aprox.'),
 dict(nombre='Salomón',         inicio=-1037, fin=-997,  seccion='S2', grupo='Un solo reino', nota='rey 1037-997'),
 # ---- Seccion 2: Reino dividido — reyes de Judá (A6) ----
 dict(nombre='Rehoboam',        inicio=-997,  fin=-980,  seccion='S2', grupo='Reyes de Judá', nota='rey 997-980'),
 dict(nombre='Abías',           inicio=-980,  fin=-977,  seccion='S2', grupo='Reyes de Judá', nota='rey 980-977'),
 dict(nombre='Asá',             inicio=-978,  fin=-937,  seccion='S2', grupo='Reyes de Judá', nota='rey 978-937'),
 dict(nombre='Jehosafat',       inicio=-937,  fin=-912,  seccion='S2', grupo='Reyes de Judá', nota='rey 937-912'),
 dict(nombre='Jehoram (Judá)',  inicio=-913,  fin=-905,  seccion='S2', grupo='Reyes de Judá', nota='rey 913-905'),
 dict(nombre='Ocozías (Judá)',  inicio=-906,  fin=-905,  seccion='S2', grupo='Reyes de Judá', nota='rey c.906-905'),
 dict(nombre='Atalía',          inicio=-905,  fin=-899,  seccion='S2', grupo='Reyes de Judá', nota='reina c.905-899'),
 dict(nombre='Jehoás (Judá)',   inicio=-898,  fin=-858,  seccion='S2', grupo='Reyes de Judá', nota='rey 898-858'),
 dict(nombre='Amasías',         inicio=-858,  fin=-829,  seccion='S2', grupo='Reyes de Judá', nota='rey 858-829'),
 dict(nombre='Uzías',           inicio=-829,  fin=-777,  seccion='S2', grupo='Reyes de Judá', nota='rey 829-777'),
 dict(nombre='Jotán',           inicio=-777,  fin=-762,  seccion='S2', grupo='Reyes de Judá', nota='rey 777-762'),
 dict(nombre='Acaz',            inicio=-762,  fin=-746,  seccion='S2', grupo='Reyes de Judá', nota='rey 762-746'),
 dict(nombre='Ezequías',        inicio=-746,  fin=-716,  seccion='S2', grupo='Reyes de Judá', nota='rey 746-716'),
 dict(nombre='Manasés',         inicio=-716,  fin=-661,  seccion='S2', grupo='Reyes de Judá', nota='rey 716-661'),
 dict(nombre='Amón',            inicio=-661,  fin=-659,  seccion='S2', grupo='Reyes de Judá', nota='rey 661-659'),
 dict(nombre='Josías',          inicio=-659,  fin=-628,  seccion='S2', grupo='Reyes de Judá', nota='rey 659-628'),
 dict(nombre='Jehoacaz',        inicio=-628,  fin=-628,  seccion='S2', grupo='Reyes de Judá', nota='rey 628 (3 meses)'),
 dict(nombre='Jehoiaquim',      inicio=-628,  fin=-618,  seccion='S2', grupo='Reyes de Judá', nota='rey 628-618'),
 dict(nombre='Joaquín',         inicio=-618,  fin=-617,  seccion='S2', grupo='Reyes de Judá', nota='rey 618-617'),
 dict(nombre='Sedequías',       inicio=-617,  fin=-607,  seccion='S2', grupo='Reyes de Judá', nota='rey 617-607'),
 # ---- Seccion 2: Reino dividido — reyes de Israel (A6) ----
 dict(nombre='Jeroboán I',      inicio=-997,  fin=-975,  seccion='S2', grupo='Reyes de Israel', nota='rey 997-975'),
 dict(nombre='Nadab',           inicio=-976,  fin=-975,  seccion='S2', grupo='Reyes de Israel', nota='rey c.976-975'),
 dict(nombre='Baasá',           inicio=-975,  fin=-951,  seccion='S2', grupo='Reyes de Israel', nota='rey c.975-951'),
 dict(nombre='Elá',             inicio=-952,  fin=-951,  seccion='S2', grupo='Reyes de Israel', nota='rey c.952-951'),
 dict(nombre='Zimrí',           inicio=-951,  fin=-951,  seccion='S2', grupo='Reyes de Israel', nota='rey c.951 (7 días)'),
 dict(nombre='Omrí',            inicio=-940,  fin=-932,  seccion='S2', grupo='Reyes de Israel', nota='rey c.940-932'),
 dict(nombre='Acab',            inicio=-920,  fin=-898,  seccion='S2', grupo='Reyes de Israel', nota='rey c.920-898'),
 dict(nombre='Ocozías (Israel)',inicio=-917,  fin=-915,  seccion='S2', grupo='Reyes de Israel', nota='rey c.917-915'),
 dict(nombre='Jehoram (Israel)',inicio=-917,  fin=-905,  seccion='S2', grupo='Reyes de Israel', nota='rey c.917-905'),
 dict(nombre='Jehú',            inicio=-905,  fin=-877,  seccion='S2', grupo='Reyes de Israel', nota='rey c.905-877'),
 dict(nombre='Jehoacaz (Israel)',inicio=-876, fin=-862,  seccion='S2', grupo='Reyes de Israel', nota='rey 876-862'),
 dict(nombre='Jehoás (Israel)', inicio=-859,  fin=-843,  seccion='S2', grupo='Reyes de Israel', nota='rey c.859-843'),
 dict(nombre='Jeroboán II',     inicio=-844,  fin=-803,  seccion='S2', grupo='Reyes de Israel', nota='rey 844-c.803'),
 dict(nombre='Zacarías (rey)',  inicio=-792,  fin=-791,  seccion='S2', grupo='Reyes de Israel', nota='rey c.792 (6 meses)'),
 dict(nombre='Salum',           inicio=-791,  fin=-791,  seccion='S2', grupo='Reyes de Israel',
      nota='Decimosexto rey de Israel; reinó un mes en Samaria (c. 791 a.e.c.)',
      referencia=(
          'Decimosexto rey del reino de diez tribus; hijo de Jabés. Salum mató en una conspiración '
          'a Zacarías, el último descendiente de Jehú que gobernó, y reinó en Samaria durante un mes '
          'lunar (c. 791 a. E.C.), hasta que lo asesinó Menahem. (2Re 15:8, 10-15.)')),
 dict(nombre='Menahem',         inicio=-780,  fin=-770,  seccion='S2', grupo='Reyes de Israel', nota='rey c.780-770'),
 dict(nombre='Pecahías',        inicio=-778,  fin=-776,  seccion='S2', grupo='Reyes de Israel', nota='rey c.778-776'),
 dict(nombre='Pécah',           inicio=-778,  fin=-758,  seccion='S2', grupo='Reyes de Israel', nota='rey c.778-758'),
 dict(nombre='Hosea',             inicio=-748,  fin=-740,  seccion='S2', grupo='Reyes de Israel',
      nota='Último rey de Israel; 9 años desde c. 748',
      referencia=(
          'Parece que alrededor del año 748 Hosea es reconocido plenamente como rey o quizás '
          'consigue el apoyo del monarca asirio Tiglat-Piléser III. Reinó 9 años (c. 748-740 a.e.c.); '
          'bajo su reinado Samaria fue sitiada y cayó. (2 Reyes 17:1-6.)')),
 # ---- Seccion 2: Profetas del reino dividido (A6) ----
 dict(nombre='Eliás',           inicio=-940,  fin=-917,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.940-917 (lámina A6, estimado)'),
 dict(nombre='Eliseo',          inicio=-917,  fin=-850,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.917-850 (lámina A6, estimado)'),
 dict(nombre='Jonás',           inicio=-844,  fin=-844,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='días de Jeroboán II; año del viaje no fechado'),
 dict(nombre='Joel',            inicio=-830,  fin=-820,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.830-820 (lámina A6, estimado)'),
 dict(nombre='Amós',            inicio=-820,  fin=-810,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.820-810 (lámina A6, estimado)'),
 dict(nombre='Oseas',           inicio=-810,  fin=-745,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.810-745 (lámina A6b, estimado)'),
 dict(nombre='Isaías',          inicio=-778,  fin=-732,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.778-732 (lámina A6b, estimado)'),
 dict(nombre='Miqueas',         inicio=-775,  fin=-717,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.775-717 (lámina A6b, estimado)'),
 dict(nombre='Nahúm',           inicio=-659,  fin=-640,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.659-640 (lámina A6b, estimado)'),
 dict(nombre='Sofonías',        inicio=-648,  fin=-635,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.648-635 (lámina A6b, estimado)'),
 dict(nombre='Jeremías',        inicio=-647,  fin=-600,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.647-600+ (lámina A6b, estimado)'),
 dict(nombre='Habacuc',         inicio=-628,  fin=-618,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.628-618 (lámina A6b, estimado)'),
 dict(nombre='Abdías',          inicio=-618,  fin=-610,  seccion='S2', grupo='Profetas', ini_est=1, fin_est=1, nota='ministerio c.618-610 (lámina A6b, estimado)'),
 dict(nombre='Jehoiadá',        inicio=-900,  fin=-830,  seccion='S2', grupo='Reino dividido', nota='130 años, aprox.'),
 # ---- Seccion 2: Destierro en Babilonia ----
 dict(nombre='Daniel',          inicio=-617,  fin=-532,  seccion='S2', grupo='Destierro en Babilonia',
      ini_est=1, fin_est=1,
      nota='Deportado c.617; última visión datada 536 (3.º de Ciro); muerte estimada c.532'),
 dict(nombre='Ezequiel',        inicio=-617,  fin=-600,  seccion='S2', grupo='Destierro en Babilonia', ini_est=1, fin_est=1, nota='ministerio c.617-600+ (lámina A6b, estimado)'),
 dict(nombre='Hananiás, Misael y Azariás', inicio=-627, fin=-535, seccion='S2', grupo='Destierro en Babilonia', nota='vidas fusionadas, aprox.'),
 # ---- Seccion 2: Despues del destierro ----
 dict(nombre='Ester',           inicio=-484,  fin=-450,  seccion='S2', grupo='Después del destierro', nota='reina ~478-?', ),
 dict(nombre='Esdras',          inicio=-480,  fin=-420,  seccion='S2', grupo='Después del destierro', nota='escriba, aprox.'),
 dict(nombre='Nehemíás',        inicio=-470,  fin=-410,  seccion='S2', grupo='Después del destierro', nota='gobernador 455-443'),
 # ---- Seccion 3: Siglo primero ----
 dict(nombre='Juan el Bautista',inicio=-2,    fin=32,    seccion='S3', grupo='Siglo primero', nota='6 meses mayor que Jesús'),
 dict(nombre='Jesús',           inicio=-2,    fin=33,    seccion='S3', grupo='Siglo primero', nota='2 a.E.C.-33 E.C.'),
 dict(nombre='Pedro',           inicio=-1,    fin=64,    seccion='S3', grupo='Siglo primero', nota='apóstol, m. c. 64'),
 dict(nombre='Pablo',           inicio=1,     fin=65,    seccion='S3', grupo='Siglo primero', nota='apóstol, m. c. 65'),
 dict(nombre='Esteban',         inicio=1,     fin=33,    seccion='S3', grupo='Siglo primero', nota='mártir, aprox.'),
 dict(nombre='Marcos',          inicio=5,     fin=65,    seccion='S3', grupo='Siglo primero', nota='escritor de evangelio, aprox.'),
 dict(nombre='Felipe el evangelizador', inicio=1, fin=60, seccion='S3', grupo='Siglo primero', nota='aprox.'),
 dict(nombre='Timoteo',         inicio=30,    fin=97,    seccion='S3', grupo='Siglo primero', nota='compañero de Pablo, aprox.'),
 dict(nombre='Juan el apóstol', inicio=1,     fin=100,   seccion='S3', grupo='Siglo primero', nota='m. c. 100'),
]


def norm_name(s):
    s = unicodedata.normalize('NFD', s or '')
    s = ''.join(c for c in s if unicodedata.category != 'Mn')
    return s.lower().strip()


def name_keys(nombre):
    keys = [norm_name(nombre)]
    if '(' in nombre:
        short = norm_name(nombre.split('(')[0].strip())
        if short not in keys:
            keys.append(short)
    return keys


def est_from_jw(entry):
    exact = entry.get('fechas_exactas', True)
    circa = entry.get('circa', False)
    fin_circa = entry.get('fin_circa', False)
    if exact and not circa and not fin_circa:
        return 0, 0
    ie = 1 if (not exact or circa) else 0
    fe = 1 if (not exact or fin_circa) else 0
    return ie, fe


def load_jw_est_lookup():
    path = repo('curacion', 'jw_reyes_profetas.json')
    if not os.path.exists(path):
        return {}
    with open(path, encoding='utf-8') as f:
        spec = json.load(f)
    lookup = {}
    for parte in spec.get('partes', []):
        for group in ('judah', 'israel', 'profetas'):
            for entry in parte.get(group, []):
                ie, fe = est_from_jw(entry)
                full = norm_name(entry['nombre'])
                lookup[full] = (ie, fe)
                if '(' in entry['nombre']:
                    short = norm_name(entry['nombre'].split('(')[0].strip())
                    if short not in lookup:
                        lookup[short] = (ie, fe)
    return lookup


def apply_jw_est_flags(personajes, lookup):
    patched = 0
    for r in personajes:
        for k in name_keys(r['nombre']):
            if k in lookup:
                ie, fe = lookup[k]
                r['ini_est'] = ie
                r['fin_est'] = fe
                patched += 1
                break
    return patched


JW_EST = load_jw_est_lookup()
n_est = apply_jw_est_flags(P, JW_EST)
if JW_EST:
    print('ini_est/fin_est desde jw_reyes_profetas:', n_est, 'personajes')

path = db('personajes_biblicos.csv')
with open(path, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['id','nombre','inicio','fin','seccion','grupo','nota','referencia','ini_est','fin_est'], lineterminator='\n')
    w.writeheader()
    for i, r in enumerate(P, 1):
        w.writerow({
            'id': i, 'nombre': r['nombre'], 'inicio': r['inicio'], 'fin': r['fin'],
            'seccion': r['seccion'], 'grupo': r['grupo'], 'nota': r['nota'],
            'referencia': r.get('referencia', ''),
            'ini_est': r.get('ini_est', 0), 'fin_est': r.get('fin_est', 0),
        })
print('personajes:', len(P))
from collections import Counter
print(Counter(r['grupo'] for r in P))
print('guardado en', path)