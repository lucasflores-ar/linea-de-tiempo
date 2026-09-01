# -*- coding: utf-8 -*-
"""gen_fichas.py — Genera fichas de personajes bíblicos cruzando las fuentes existentes.

Fuentes:
  - personajes_biblicos.csv            (54 fichas con vida: inicio/fin/seccion/grupo/nota)
  - hechos_biblicos.csv                (159 sucesos; col 'personajes' -> hitos del personaje)
  - preguntas_unificadas_enriquecidas.csv  (12499 preguntas; col 'personaje' -> num_preguntas)
  - lugares_biblicos.csv               (no usado directamente: lat/lon vienen de hechos)
  - fichas/*.xlsx (openpyxl)           (taxonomía de roles + 32 biografías -> profesión)

Salidas:
  - fichas_personajes.csv              (hoja de datos para curación manual)
  - fichas-personajes.js               (window.LT_FICHAS para el visor de fichas)

Campos narrativos SIN dato se dejan vacíos (versiculo_clave, opinion_jehova,
opinion_ref, opinion_cita, cualidades, cualidades_refs, defectos, defectos_refs,
leccion, genero, tribu, profesion_2) para completarse manualmente.
"""
import csv, os, re, unicodedata, sys
from collections import Counter

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scripts'))
from paths import db, repo

BASE = db()
FICHAS_XLSX = [
    db('fichas', 'preguntas_fichas_biblia_personajes_medidas.xlsx'),
    db('fichas', 'JW GAMES preguntas fichas-1274.xlsx'),
]
OUT_CSV = repo('fichas_personajes.csv')
OUT_JS  = repo('fichas-personajes.js')
CURACION_JSON = repo('curacion', 'manual.json')

CAMPOS_CURACION = [
    'genero', 'tribu', 'profesion', 'profesion_subtipo', 'profesion_2',
    'versiculo_clave', 'opinion_jehova', 'opinion_ref', 'opinion_cita',
    'cualidades', 'cualidades_refs', 'defectos', 'defectos_refs', 'leccion',
]

def load_curacion():
    """Carga parches manuales desde curacion/manual.json (no se pierden al regenerar)."""
    if not os.path.exists(CURACION_JSON):
        return {}
    import json
    with open(CURACION_JSON, encoding='utf-8') as f:
        data = json.load(f)
    entries = data.get('entries', data)
    if not isinstance(entries, dict):
        return {}
    return entries

def apply_curacion(rows, curacion):
    """Aplica parches por nombre exacto de ficha (con fallback por norm())."""
    if not curacion:
        return 0
    by_name = {r['nombre']: r for r in rows}
    by_norm = {norm(r['nombre']): r for r in rows}
    applied = 0
    for nombre, patch in curacion.items():
        if not isinstance(patch, dict):
            continue
        row = by_name.get(nombre) or by_norm.get(norm(nombre))
        if not row:
            print('AVISO curación: sin ficha para', repr(nombre))
            continue
        touched = False
        for field in CAMPOS_CURACION:
            val = patch.get(field)
            if val is None:
                continue
            val = str(val).strip()
            if val or field in patch:
                row[field] = val
                touched = True
        if touched:
            fu = row.get('fuente', '')
            if 'curacion_manual' not in fu.split(','):
                row['fuente'] = (fu + ',curacion_manual').strip(',')
            applied += 1
    return applied

# ------------------------------------------------------------------ normalización
def norm(s):
    s = (s or '').lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c))
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    return ' '.join(s.split())

def person_tokens(per):
    s = per or ''
    return [t.strip() for t in re.split(r'[,;/]+', s) if t.strip()]

def person_index_key(tok):
    """Clave de índice; conserva disambiguadores entre paréntesis: Oseas (rey) != Oseas."""
    return norm(tok)

# tokens que NO son personas (naciones, grupos, títulos genéricos, deidad)
STOP = {'israel', 'juda', 'judios', 'asiria', 'roma', 'levitas', 'sacerdotes',
        'soldados', 'artesanos', 'faraones', 'jehova', 'dios', 'profetas de baal',
        'los discipulos', 'los apostoles', 'sus hermanos', 'los ninivitas',
        'los magos', 'los pastores', 'los soldados'}
def es_persona(tok):
    n = norm(tok)
    if not n: return False
    if n in STOP: return False
    if re.match(r'^(los|las|el|la|sus|su|otros|un|una|unas|varios)\s', n): return False
    return True

# ------------------------------------------------------------------ potencias
POT = [('Egipto', -1600, -874), ('Asiria', -874, -625), ('Babilonia', -625, -539),
       ('Medopersia', -539, -332), ('Grecia', -332, -63), ('Roma', -63, 100)]
def potencia_de(anio):
    if anio is None: return None
    for n, a, b in POT:
        if a <= anio <= b: return n
    return None
def potencia_activa(lo, hi):
    if lo is None and hi is None: return ''
    lo = lo if lo is not None else hi
    hi = hi if hi is not None else lo
    out = [n for n, a, b in POT if not (a > hi or b < lo)]
    if out: return '; '.join(out)
    return 'Sin potencia (anterior a Egipto)'

# ------------------------------------------------------------------ eras
ERA_MAP = {  # era de hechos_biblicos -> eraKey
    'PREHISTORIA / GÉNESIS': 'pre', 'DILUVIO': 'pre', 'POSTDILUVIANO': 'pat',
    'PATRIARCAS': 'pat', 'EGIPTO': 'egi', 'EXODO': 'egi', 'CONQUISTA': 'jue',
    'JUECES': 'jue', 'MONARQUÍA': 'mon', 'REINO DIVIDIDO': 'div', 'EXILIO': 'exi',
    'RESTAURACIÓN': 'res', 'E.C.': 'ec',
}
def era_key(e):
    e = (e or '').strip()
    if not e: return 'ec'
    for k, v in ERA_MAP.items():
        if k in e or e in k: return v
    return 'ec'
SEC_POR_ERA = {'pre': 'S1', 'pat': 'S1', 'egi': 'S1', 'jue': 'S1', 'mon': 'S2',
               'div': 'S2', 'exi': 'S2', 'res': 'S2', 'ec': 'S3'}

# ------------------------------------------------------------------ lecturas
def lee_csv(path, *cols):
    with open(path, encoding='utf-8-sig', errors='replace') as f:
        return list(csv.DictReader(f))

personajes = lee_csv(os.path.join(BASE, 'personajes_biblicos.csv'))
hechos = lee_csv(os.path.join(BASE, 'hechos_biblicos.csv'))
preguntas = lee_csv(os.path.join(BASE, 'preguntas_unificadas_enriquecidas.csv'))

# fichas xlsx: {person_norm: {nq, roles: Counter, cats: Counter}}
bio = {}
try:
    import openpyxl
    for p in FICHAS_XLSX:
        if not os.path.exists(p): continue
        wb = openpyxl.load_workbook(p, read_only=True)
        for ws in wb.worksheets:
            it = ws.iter_rows(values_only=True)
            next(it, None)  # header
            for r in it:
                if not r or not r[0] or str(r[0]).strip() == 'question_text': continue
                notes = str(r[8]).strip() if r[8] else ''
                cat = str(r[5]).strip() if r[5] else ''
                if notes.startswith('Biografía:') or notes.startswith('Biografia:'):
                    person = notes.split(':', 1)[1].strip()
                    k = norm(person)
                    d = bio.setdefault(k, {'nombre': person, 'nq': 0, 'roles': Counter(), 'cats': Counter()})
                    d['nq'] += 1
                    d['cats'][cat] += 1
                    if 'Personaje' in cat:
                        d['roles'][cat] += 1
        wb.close()
except ImportError:
    print('AVISO: openpyxl no disponible; se omiten los xlsx de fichas')

# ------------------------------------------------------------------ aliases manuales
VARIANTE_A_CANONICO = {  # norm(variante) -> norm(canonico)
    'juan marcos': 'marcos', 'juan bautista': 'juan el bautista',
    'juan': 'juan el apostol', 'jesus de nazaret': 'jesus', 'jesucristo': 'jesus',
    'cristo': 'jesus', 'saulo': 'pablo', 'pablo de tarso': 'pablo',
    'simon pedro': 'pedro', 'simon': 'pedro', 'felipe': 'felipe el evangelizador',
    'sadrac': 'hananias misael y azarias', 'mesac': 'hananias misael y azarias',
    'abednego': 'hananias misael y azarias',
    'oseas rey': 'hosea',
}

# ------------------------------------------------------------------ construir targets
targets = {}  # key norm(nombre) -> dict ficha
order = []

def add_target(nombre, vida=None, grupo='', nota='', seccion='', de_xlsx=False):
    k = norm(nombre)
    if k not in targets:
        targets[k] = {'nombre': nombre, 'alt': [], 'vida': vida, 'grupo': grupo,
                      'nota': nota, 'seccion': seccion, 'xlsx': de_xlsx,
                      'hitos': [], 'nq': 0, 'roles': Counter(), 'cats': Counter()}
        order.append(k)
    return k

for p in personajes:
    try:
        vida = (int(p['inicio']), int(p['fin']))
    except (ValueError, KeyError):
        vida = None
    add_target(p['nombre'], vida, p.get('grupo', ''), p.get('nota', ''), p.get('seccion', ''))

for k, d in bio.items():
    add_target(d['nombre'], de_xlsx=True)

for e in hechos:
    for tok in person_tokens(e['personajes']):
        if es_persona(tok):
            add_target(tok)

# aliases por persona
for k in list(targets):
    t = targets[k]
    for part in re.split(r'[,/;]+', t['nombre']):
        a = norm(part)
        if a and a not in targets[k]['alt'] and a != k:
            targets[k]['alt'].append(a)
for src, dst in VARIANTE_A_CANONICO.items():
    if dst in targets:
        if src not in targets[dst]['alt']:
            targets[dst]['alt'].append(src)

# índice inverso alias -> key
index = {}
for k, t in targets.items():
    for a in [k] + t['alt']:
        index.setdefault(a, k)

# ------------------------------------------------------------------ datos de preguntas
for q in preguntas:
    k = index.get(person_index_key(q.get('personaje', '')))
    if k: targets[k]['nq'] += 1

# ------------------------------------------------------------------ datos de hechos (hitos)
for e in hechos:
    try:
        fa = int(e['fecha_anio'])
    except (ValueError, TypeError):
        fa = None
    keys = set()
    for tok in person_tokens(e['personajes']):
        k = index.get(person_index_key(tok))
        if k: keys.add(k)
    for k in keys:
        t = targets[k]
        t['hitos'].append({
            'id': e['id'], 'n': e['nombre'], 'fa': fa, 'ft': e['fecha_texto'],
            'ref': e['referencia'], 'era': era_key(e['era']), 'lugar': e['lugar_antiguo'],
        })
        if e['era']: t['cats'][e['era']] += 1

# ------------------------------------------------------------------ profesiones
ROLE_LABEL = {'Reyes': 'Rey', 'Profetas': 'Profeta', 'Príncipes': 'Príncipe',
              'Sumo Sacerdotes': 'Sumo sacerdote', 'Levitas': 'Levita', 'Jueces': 'Juez',
              'Soldados': 'Soldado', 'Sacerdotes': 'Sacerdote', 'Funcionarios': 'Funcionario',
              'Escribas': 'Escriba'}
KW = [('Profeta', ['profecía', 'profecia', 'profetiza', 'profeta', 'profetisa']),
      ('Rey', ['reinado de', ' rey', 'rey ', 'reina', 'trono', 'corona', 'monarca']),
      ('Sumo sacerdote', ['sumo sacerdote']),
      ('Sacerdote', ['sacerdote', 'sacerdotal']),
      ('Levita', ['levita']),
      ('Juez', ['juez', 'jueza']),
      ('Soldado', ['soldado', 'general', 'capitán', 'ejército', 'guerrero', 'comandante']),
      ('Escriba', ['escriba']),
      ('Funcionario', ['gobernador', 'funcionario', 'copero', 'tesorero', 'administrador', 'primer ministro']),
      ('Apóstol', ['apóstol', 'apostol']),
      ('Misionero', ['misionero', 'misionera']),
      ('Evangelizador', ['evangelizador'])]
KW_SUB = {p: 'Ficha de Personaje: ' + {'Rey': 'Reyes', 'Profeta': 'Profetas',
          'Sumo sacerdote': 'Sumo Sacerdotes',
          'Levita': 'Levitas', 'Juez': 'Jueces', 'Soldado': 'Soldados',
          'Sacerdote': 'Sacerdotes', 'Funcionario': 'Funcionarios',
          'Escriba': 'Escribas'}.get(p, p) for p, _ in KW}

GRUPO_PROF = {
    'Profetas': ('Profeta', 'Ficha de Personaje: Profetas'),
    'Reyes de Judá': ('Rey', 'Ficha de Personaje: Reyes'),
    'Reyes de Israel': ('Rey', 'Ficha de Personaje: Reyes'),
    'Un solo reino': ('Rey', 'Ficha de Personaje: Reyes'),
    'Época de los jueces': ('Juez', 'Ficha de Personaje: Jueces'),
}

def role_of_grupo(k):
    g = (targets[k].get('grupo') or '').strip()
    return GRUPO_PROF.get(g, (None, None))

def role_of_xlsx(k):
    t = targets[k]
    best = t['roles'].most_common(1)
    return (ROLE_LABEL.get(best[0][0].split(':')[-1].strip(), best[0][0]), best[0][0]) if best else (None, None)

def role_of_texto(k):
    t = targets[k]
    texto = ' '.join([t['nota']] + [h['n'] + ' ' + (h['ref'] or '') for h in t['hitos']]).lower()
    for prof, kws in KW:
        if any(w in texto for w in kws): return prof
    return None

# ------------------------------------------------------------------ relacionadas
rel = {k: Counter() for k in targets}
for e in hechos:
    keys = []
    for tok in person_tokens(e['personajes']):
        if es_persona(tok):
            k = index.get(person_index_key(tok))
            if k: keys.append(k)
    for a in keys:
        for b in keys:
            if a != b: rel[a][b] += 1

# ------------------------------------------------------------------ ensamblar fichas
def lugares_de(t):
    out = []
    for h in t['hitos']:
        if h['lugar'] and h['lugar'] not in out: out.append(h['lugar'])
    return out

def hito_str(h):
    s = h['n']
    if h['ft']: s += ' (' + h['ft'] + ')'
    if h['ref']: s += ' [' + h['ref'] + ']'
    return s

rows = []
for k in order:
    t = targets[k]
    v = t['vida']
    nac, fal = v if v else (None, None)
    edad = (fal - nac) if (v and fal >= nac) else None
    hitos = sorted(t['hitos'], key=lambda h: (h['fa'] or -99999))
    era_counter = Counter(h['era'] for h in t['hitos'])
    era = era_counter.most_common(1)[0][0] if era_counter else era_key(t['grupo'])
    seccion = t['seccion'] or SEC_POR_ERA.get(era, '')
    prof, prof_sub = role_of_grupo(k)
    if not prof:
        prof, prof_sub = role_of_xlsx(k)
    if not prof:
        prof = role_of_texto(k)
        prof_sub = KW_SUB.get(prof, '') if prof else ''
    rels = rel[k].most_common(6)
    prim = min((h['fa'] for h in hitos if h['fa'] is not None), default=None)
    ult = max((h['fa'] for h in hitos if h['fa'] is not None), default=None)
    if v:
        pot = potencia_activa(nac, fal)
    else:
        pot = potencia_activa(prim, ult) if prim is not None else ''
    fuente = []
    if t['vida']: fuente.append('personajes_biblicos')
    if hitos: fuente.append('hechos_biblicos')
    if k in bio: fuente.append('fichas_xlsx')
    if t['nq']: fuente.append('preguntas')
    rows.append({
        'id': len(rows) + 1,
        'nombre': t['nombre'],
        'nombre_alt': '; '.join(sorted(set(t['alt']))),
        'genero': '',
        'tribu': '',
        'profesion': prof or '',
        'profesion_subtipo': prof_sub,
        'profesion_2': '',
        'nacimiento': str(nac) if nac is not None else '',
        'fallecimiento': str(fal) if fal is not None else '',
        'edad': str(edad) if edad is not None else '',
        'era': era,
        'seccion': seccion,
        'potencia_activa': pot,
        'lugares': '; '.join(lugares_de(t)),
        'hitos': '; '.join(hito_str(h) for h in hitos),
        'personajes_relacionados': '; '.join(targets[rk]['nombre'] + ' (' + str(n) + ')' for rk, n in rels),
        'primera_mencion': str(prim) if prim is not None else '',
        'ultima_mencion': str(ult) if ult is not None else '',
        'versiculo_clave': '',
        'opinion_jehova': '',
        'opinion_ref': '',
        'opinion_cita': '',
        'cualidades': '',
        'cualidades_refs': '',
        'defectos': '',
        'defectos_refs': '',
        'leccion': '',
        'num_preguntas': str(t['nq']),
        'num_hitos': str(len(hitos)),
        'fuente': ','.join(fuente),
    })

curacion = load_curacion()
n_cur = apply_curacion(rows, curacion)
if n_cur:
    print('Curación manual aplicada a', n_cur, 'fichas')

COLS = list(rows[0].keys())
with open(OUT_CSV, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=COLS)
    w.writeheader()
    w.writerows(rows)

# ------------------------------------------------------------------ JS
def js_bool(v): return 'true' if v else 'false'
js = ['window.LT_FICHAS = [\n']
for r in rows:
    hitos = [h for h in r['hitos'].split('; ') if h]
    rels = r['personajes_relacionados'].split('; ') if r['personajes_relacionados'] else []
    lugares = [x for x in r['lugares'].split('; ') if x]
    js.append('  {\n')
    js.append('    id:%s, nombre:%r, alt:%r, genero:%r, tribu:%r,\n' % (r['id'], r['nombre'], r['nombre_alt'], r['genero'], r['tribu']))
    js.append('    profesion:%r, profesion_sub:%r, profesion_2:%r,\n' % (r['profesion'], r['profesion_subtipo'], r['profesion_2']))
    js.append('    nac:%r, fal:%r, edad:%r, era:%r, seccion:%r, potencia:%r,\n' % (r['nacimiento'], r['fallecimiento'], r['edad'], r['era'], r['seccion'], r['potencia_activa']))
    js.append('    lugares:%r, hitos:%r, rel:%r,\n' % (lugares, hitos, rels))
    js.append('    primera:%r, ultima:%r,\n' % (r['primera_mencion'], r['ultima_mencion']))
    js.append('    versiculo:%r, opinion_jehova:%r, opinion_ref:%r, opinion_cita:%r,\n' % (r['versiculo_clave'], r['opinion_jehova'], r['opinion_ref'], r['opinion_cita']))
    js.append('    cualidades:%r, cualidades_refs:%r, defectos:%r, defectos_refs:%r, leccion:%r,\n' % (r['cualidades'], r['cualidades_refs'], r['defectos'], r['defectos_refs'], r['leccion']))
    js.append('    nq:%s, nh:%s, fuente:%r\n' % (r['num_preguntas'], r['num_hitos'], r['fuente']))
    js.append('  },\n')
js.append('];\n')
with open(OUT_JS, 'w', encoding='utf-8', newline='') as f:
    f.writelines(js)

# ------------------------------------------------------------------ resumen
con_vida = sum(1 for r in rows if r['nacimiento'] and r['fallecimiento'])
con_prof = sum(1 for r in rows if r['profesion'])
con_hitos = sum(1 for r in rows if r['num_hitos'] != '0')
con_nq = sum(1 for r in rows if r['num_preguntas'] != '0')
con_cur = sum(1 for r in rows if 'curacion_manual' in r.get('fuente', ''))
print('FICHAS generadas:', len(rows))
print('  con vida (nac..fal):', con_vida)
print('  con profesión:', con_prof)
print('  con >=1 hito:', con_hitos)
print('  con preguntas (>0):', con_nq)
print('  con curación manual:', con_cur)
print('CSV:', OUT_CSV)
print('JS :', OUT_JS)