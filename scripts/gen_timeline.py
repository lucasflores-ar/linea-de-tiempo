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

# ---------------- jerarquia de grupos (curada) ----------------
# curacion/grupos.json: lista de grupos con los ids de hechos que contienen.
# Un hecho puede pertenecer a un solo grupo (2 niveles maximo: raiz -> grupo).
GRUPOS_PATH = repo('curacion', 'grupos.json')
grupos_curados = []
if os.path.exists(GRUPOS_PATH):
    import json as _json
    try:
        with open(GRUPOS_PATH, encoding='utf-8') as f:
            grupos_curados = _json.load(f).get('grupos', [])
    except Exception as e:
        print('[warn] no se pudo leer grupos.json:', e)

# evento_id -> dict del grupo al que pertenece
grupo_por_evento = {}
grupos_out = []
for g in grupos_curados:
    gid = g.get('id')
    nombre = g.get('nombre') or gid
    ids = [int(x) for x in g.get('evento_ids', [])]
    grupos_out.append({
        'id': gid,
        'n': nombre,
        'd': g.get('descripcion') or '',
        'eventos': ids,
    })
    for eid in ids:
        grupo_por_evento[eid] = gid

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
        'g': grupo_por_evento.get(int(h['id'])),   # id de grupo anidado (null si raiz)
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

data = {'eventos': evts, 'preguntas': qdata, 'personajes': pers, 'grupos': grupos_out}

# enriquecer grupos con rango de fechas de sus eventos
for g in grupos_out:
    fes = [e['fa'] for e in evts if e['id'] in g['eventos'] and e['fa'] is not None]
    g['fa_min'] = min(fes) if fes else None
    g['fa_max'] = max(fes) if fes else None
    g['n_ev'] = len(g['eventos'])
    g['nq'] = sum(e['nq'] for e in evts if e['id'] in g['eventos'])

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
print('grupos:', len(grupos_out))
for g in grupos_out:
    print('  %s: %d eventos (%s..%s)' % (g['id'], g['n_ev'], g['fa_min'], g['fa_max']))