# -*- coding: utf-8 -*-
"""Genera linea-tiempo-datos.js: eventos con temas + preguntas vinculadas desde los CSV.
temas: GENESIS, EXODO, CONQUISTA, JUECES, REYES, PROFETAS, RESTAURACION, EXILIO, SIGLO-PRIMERO, HECHOS
Un evento puede pertenecer a varios temas (union por AND/OR segun filtro).
"""
import csv, json, io, re, collections, unicodedata, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

BASE = db()
OUT  = repo('linea-tiempo-datos.js')

hechos = list(csv.DictReader(open(db('hechos_biblicos.csv'), encoding='utf-8-sig')))
rows   = list(csv.DictReader(open(db('preguntas_unificadas_enriquecidas.csv'), encoding='utf-8-sig')))
personajes = list(csv.DictReader(open(db('personajes_biblicos.csv'), encoding='utf-8-sig')))

# ---------------- temas por evento ----------------
def temas_de(h):
    er  = (h['era'] or '').upper()
    li  = (h['libro'] or '').upper()
    per = (h['personajes'] or '').upper()
    nom = (h['nombre'] or '').upper()
    t = set()
    if li in ('GÉNESIS', 'GÉNESIS', 'GENESIS') or er.startswith('PREHISTORIA') or er.startswith('PATRIARCA') or er in ('DILUVIO', 'POSTDILUVIANO'):
        t.add('GENESIS')
    if li in ('ÉXODO', 'EXODO', 'LEVÍTICO', 'NÚMEROS', 'DEUTERONOMIO') or er.startswith('EXODO') or er.startswith('EGIPTO') or er.startswith('LEY') or er.startswith('DESIERTO'):
        t.add('EXODO')
    if li == 'JOSUÉ' or er.startswith('CONQUISTA'):
        t.add('CONQUISTA')
    if li == 'JUECES' or li == 'RUT' or er.startswith('JUECES'):
        t.add('JUECES')
    if li in ('1 SAMUEL', '2 SAMUEL', '1 REYES', '2 REYES', '1 CRÓNICAS', '2 CRÓNICAS') or er.startswith('MONARQUÍA') or er.startswith('REINO DIVIDIDO'):
        t.add('REYES')
    if li in ('ISAÍAS', 'JEREMÍAS', 'EZEQUIEL', 'DANIEL', 'OSEAS', 'JOEL', 'AMÓS', 'ABDÍAS',
              'JONÁS', 'MIQUEAS', 'NAHUM', 'HABACUC', 'SOFONÍAS', 'HAGEO', 'ZACARÍAS', 'MALAQUÍAS', 'LAMENTACIONES'):
        t.add('PROFETAS')
    if 'ELÍAS' in per or 'ELIAS' in per or 'ELISEO' in per or 'ELISEO' in per or 'SAMUEL' in per or 'NATÁN' in per or 'NATAN' in per:
        t.add('PROFETAS')
    if li in ('ESDRAS', 'NEHEMÍAS', 'ESTER') or er.startswith('RESTAURACIÓN'):
        t.add('RESTAURACION')
    if li in ('DANIEL', 'EZEQUIEL', 'LAMENTACIONES') or er.startswith('EXILIO'):
        t.add('EXILIO')
    if li in ('MATEO', 'MARCOS', 'LUCAS', 'JUAN') and (h['era'] or '').upper().startswith('E.C.'):
        t.add('SIGLO-PRIMERO')
    if li == 'HECHOS':
        t.add('HECHOS')
    if li in ('ROMANOS', '1 CORINTIOS', '2 CORINTIOS', 'GÁLATAS', 'EFESIOS', 'FILIPENSES',
              'COLOSENSES', '1 TESALONICENSES', '2 TESALONICENSES', '1 TIMOTEO', '2 TIMOTEO',
              'TITO', 'FILEMÓN', 'HEBREOS', 'SANTIAGO', '1 PEDRO', '2 PEDRO', '1 JUAN', '2 JUAN',
              '3 JUAN', 'JUDAS', 'APOCALIPSIS'):
        t.add('HECHOS')
    if 'SALMOS' in li or 'PROVERBIOS' in li or 'ECLESIASTÉS' in li or 'CANTAR' in li or 'JOB' in li:
        t.add('REYES') if er.startswith('MONARQUÍA') else t.add('GENESIS')
    if not t:
        t.add('OTROS')
    return sorted(t)

# ---------------- preguntas por hecho ----------------
q_por_hecho = collections.defaultdict(list)
for r in rows:
    hid = r['hecho_id']
    if hid:
        q_por_hecho[hid].append({
            'id': r['id'],
            'q': r['pregunta'],
            'cat': r['categoria'],
            'dif': r['dificultad'],
            'a': r['respuesta_correcta'],
        })

# ---------------- estructura de salida ----------------
def fnum(s):
    try:
        v = float(s)
        return int(v) if v == int(v) else v
    except Exception:
        return None

evts = []
for h in hechos:
    evts.append({
        'id': int(h['id']),
        'n': h['nombre'],
        'd': h['descripcion'],
        'ft': h['fecha_texto'],
        'fa': fnum(h['fecha_anio']),
        'era': h['era'],
        'lug': h['lugar_antiguo'],
        'lat': fnum(h['lat']),
        'lon': fnum(h['lon']),
        'tipo': h['tipo_suceso'],
        'per': h['personajes'],
        'ref': h['referencia'],
        't': temas_de(h),
        'nq': len(q_por_hecho[h['id']]),
    })

# preguntas con fecha (para busqueda global y para validar cobertura)
qdata = []
for r in rows:
    fa = fnum(r['fecha_anio'])
    qdata.append({
        'id': r['id'],
        'q': r['pregunta'],
        'cat': r['categoria'],
        'fa': fa,
        'ft': r['fecha_suceso'],
        'era': r['era_suceso'],
        'lug': r['lugar_suceso'],
        'lat': fnum(r['lat']),
        'lon': fnum(r['lon']),
        'hid': int(r['hecho_id']) if r['hecho_id'] else None,
        'fu': r['fuente_dato'] or '',
    })

# personajes (barras de vida tipo vis-timeline)
pers = []
for pe in personajes:
    pers.append({
        'id': int(pe['id']),
        'n': pe['nombre'],
        'inicio': fnum(pe['inicio']),
        'fin': fnum(pe['fin']),
        'seccion': pe['seccion'],
        'grupo': pe['grupo'],
        'nota': pe['nota'],
    })

data = {'eventos': evts, 'preguntas': qdata, 'personajes': pers}

js = '/* GENERADO AUTOMATICAMENTE */\nwindow.LT_DATA = ' + json.dumps(data, ensure_ascii=False) + ';\n'
open(OUT, 'w', encoding='utf-8').write(js)

# reporte
print('eventos:', len(evts))
print('preguntas:', len(qdata))
temas = collections.Counter()
for e in evts:
    for t in e['t']:
        temas[t] += 1
for t, c in temas.most_common():
    print('  %s: %d eventos' % (t, c))
nq = sum(1 for r in qdata if r['fa'] is not None)
print('preguntas con fecha:', nq)