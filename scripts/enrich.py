# -*- coding: utf-8 -*-
"""Enriquece preguntas_unificadas.csv con columnas de suceso geografico/cronologico.
Lectura: preguntas_unificadas.csv + hechos_biblicos.csv + periods.py
Salida:  preguntas_unificadas_enriquecidas.csv
Columnas nuevas: hecho_id, hecho_nombre, fecha_suceso, fecha_anio, era_suceso,
lugar_suceso, lat, lon, tipo_suceso, fuente_dato  (fuente_dato: HECHO | PERIODO)
Estrategia:
  1) match exacto por (libro, capitulo) -> hecho
  2) fallback por periodo de libro/capitulo (era, fecha, region)
  3) fallback por texto (keyword)
"""
import csv, re, io, sys, unicodedata, collections, importlib.util, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, SCRIPTS_DIR

BASE = db()
INP  = db('preguntas_unificadas.csv')
HECH = db('hechos_biblicos.csv')
OUT  = db('preguntas_unificadas_enriquecidas.csv')

spec = importlib.util.spec_from_file_location('periods', os.path.join(SCRIPTS_DIR, 'periods.py'))
periods_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(periods_mod)
PERIODS = periods_mod.PERIODS

# acentuador (diccionario Hunspell es_ES + lista blanca de nombres propios JW)
from paths import repo  # noqa: E402  (paths ya estaba arriba)
import acentuacion  # noqa: E402  (mismo directorio, en sys.path)

# lista blanca: nombres propios con grafia canonica JW (solo personajes, que son los
# que el acentuador generico acentua mal: Eliseo -> Elíseo, etc.). Los lugares se dejan
# acentuar por el diccionario (estan casi todos bien en los CSV).
def _cargar_blanca():
    blancos = []
    try:
        with open(db('personajes_biblicos.csv'), encoding='utf-8-sig') as f:
            rd = csv.DictReader(f)
            for r in rd:
                n = (r.get('nombre') or '').strip()
                if n:
                    for parte in re.split(r'[;,()]', n):
                        parte = parte.strip()
                        if parte:
                            blancos.append(parte)
    except Exception:
        pass
    # toponimos/nombres con grafia especifica JW que NO llevan tilde
    blancos += ['Moria', 'Bet-saida', 'Enon', 'Neapolis', 'Tiberia', 'Rode', 'Apia',
                'Roman', 'Pua']
    acentuacion.cargar_lista_blanca(blancos)

_cargar_blanca()

# ---------------------------------------------------------------- helpers
def fix_mojibake(s):
    try:
        return s.encode('latin-1').decode('utf-8')
    except Exception:
        return s

# Palabras que deben llevar 'ñ' y en el banco aparecen con 'n' simple (mojibake).
# Reemplazo de PALABRA COMPLETA (con límites de palabra) para no tocar 'n' legítimas.
_ANIO_FIX = {
    'anos': 'años',
    'anio': 'año',
    'senor': 'señor',
    'senora': 'señora',
    'nino': 'niño',
    'ninos': 'niños',
    'companero': 'compañero',
    'companeros': 'compañeros',
    'compania': 'compañía',
}

# Secuencias de mojibake inequívocas (nunca aparecen en español bien codificado).
# NOTA: las dos primeras etapas se cubren llamando dos veces a fix_mojibake (la segunda
# deshace la capa UTF-8->latin-1 y la primera la repercutida). Estos reemplazos
# puntuales cubren los casos restantes (¿/¡/soft hyphen).
_MOJI_FIX = {
    'Ã±': 'ñ',
    'Â¿': '¿',
    'Â¡': '¡',
    'Â´': '´',
    '\u00ad': '',  # soft hyphen (guión suave invisible)
    'Ã\u00ad': '',
}

def clean_text(s):
    """Corrige mojibake y la pérdida de 'ñ' (en palabras conocidas) en un campo de texto."""
    if not s:
        return s
    # 1) doble pasada de fix_mojibake para mojibake residual de doble UTF-8
    s = fix_mojibake(s)
    s = fix_mojibake(s)
    # 2) remplazos puntuales de secuencias inequívocas (¿ / ¡ / soft hyphen / ´)
    for bad, good in _MOJI_FIX.items():
        s = s.replace(bad, good)
    # 3) diccionario de palabra completa para ñ (año/señor/niñ...), respetando mayúscula inicial
    for bad, good in _ANIO_FIX.items():
        s = re.sub(r'\b' + bad, lambda m: good, s, flags=re.IGNORECASE)
    return s

def norm(s):
    if not s:
        return ''
    s = fix_mojibake(s)
    s = s.upper().replace('Ã', 'Á').replace('Õ', 'Ó')
    s = unicodedata.normalize('NFD', s)
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')

ALIASES = {
 'GÉNESIS':['GENESIS','GEN','GE','GÉN','GEN.'],
 'ÉXODO':['EXODO','EXO','EX','ÉX','ÉXO','EXO.','EX.','?XODO','?XO.','?X.'],
 'LEVÍTICO':['LEVITICO','LEV','LEVIT.'],
 'NÚMEROS':['NUMEROS','NUM','NÚM','NUM.','NÚM.'],
 'DEUTERONOMIO':['DEUTERONOMIO','DEUT','DEU','DT','DEUT.','DEU.'],
 'JOSUÉ':['JOSUE','JOS','JOSU','JOS.'],
 'JUECES':['JUECES','JUE','JUEC.','JUE.'],
 'RUT':['RUT'],
 '1 SAMUEL':['1 SAMUEL','1 SAM.','1 SAMUEL','1SA','1 SAM'],
 '2 SAMUEL':['2 SAMUEL','2 SAM.','2 SAMUEL','2SA','2 SAM'],
 '1 REYES':['1 REYES','1 REY.','1 REY','1 REYES','1REY.'],
 '2 REYES':['2 REYES','2 REY.','2 REY','2 REYES','2REY.'],
 '1 CRÓNICAS':['1 CRONICAS','1 CRON.','1 CRONICAS'],
 '2 CRÓNICAS':['2 CRONICAS','2 CRON.','2 CRONICAS'],
 'ESDRAS':['ESDRAS','ESD'],
 'NEHEMÍAS':['NEHEMIAS','NEH','NEHE.'],
 'ESTER':['ESTER','EST'],
 'JOB':['JOB'],
 'SALMOS':['SALMOS','SALMO','SAL','SAL.','SALMOS'],
 'PROVERBIOS':['PROVERBIOS','PROV','PRO','PROV.','PRO.'],
 'ECLESIASTÉS':['ECLESIASTES','ECLES','ECL','ECL.'],
 'CANTAR':['CANTAR','CANT.','CANTAR DE SALOMÓN'],
 'ISAÍAS':['ISAIAS','ISA','IS','ISA.','IS.'],
 'JEREMÍAS':['JEREMIAS','JEREMIAS','JER','JER.'],
 'LAMENTACIONES':['LAMENTACIONES','LAM','LAM.'],
 'EZEQUIEL':['EZEQUIEL','EZE','EZQ','EZE.'],
 'DANIEL':['DANIEL','DAN','DAN.'],
 'OSEAS':['OSEAS','OSE'],
 'JOEL':['JOEL'],
 'AMÓS':['AMOS'],
 'ABDÍAS':['ABDIAS','ABD'],
 'JONÁS':['JONAS','JON','JON.'],
 'MIQUEAS':['MIQUEAS','MIQ'],
 'NAHUM':['NAHUM','NAH','NAH.'],
 'HABACUC':['HABACUC','HAB','HAB.'],
 'SOFONÍAS':['SOFONIAS','SOF','SOF.'],
 'HAGEO':['HAGEO','HAG'],
 'ZACARÍAS':['ZACARIAS','ZAC','ZAC.'],
 'MALAQUÍAS':['MALAQUIAS','MAL','MAL.'],
 'MATEO':['MATEO','MAT','MAT.','MATEO'],
 'MARCOS':['MARCOS','MAR','MAR.'],
 'LUCAS':['LUCAS','LUC','LUC.'],
 'JUAN':['JUAN'],
 'HECHOS':['HECHOS','HECH','HECH.','HECHOS DE LOS APÓSTOLES'],
 'ROMANOS':['ROMANOS','ROM','ROM.'],
 '1 CORINTIOS':['1 CORINTIOS','1 COR.','1 CORINTIOS'],
 '2 CORINTIOS':['2 CORINTIOS','2 COR.','2 CORINTIOS'],
 'GÁLATAS':['GALATAS','GAL','GÁL','GAL.','GÁL.'],
 'EFESIOS':['EFESIOS','EFE','EFES','EFE.','EFES.'],
 'FILIPENSES':['FILIPENSES','FILIP','FILI','FILIP.','FILI.','FILIPENSES'],
 'COLOSENSES':['COLOSENSES','COL','COL.'],
 '1 TESALONICENSES':['1 TESALONICENSES','1 TES.','1 TES'],
 '2 TESALONICENSES':['2 TESALONICENSES','2 TES.','2 TES'],
 '1 TIMOTEO':['1 TIMOTEO','1 TIM.','1 TIM'],
 '2 TIMOTEO':['2 TIMOTEO','2 TIM.','2 TIM'],
 'TITO':['TITO'],
 'FILEMÓN':['FILEMON','FILEM','FILE','FILEM.','FILE.'],
 'HEBREOS':['HEBREOS','HEB','HEB.'],
 'SANTIAGO':['SANTIAGO','SANT','SANT.'],
 '1 PEDRO':['1 PEDRO','1 PED.','1 PED'],
 '2 PEDRO':['2 PEDRO','2 PED.','2 PED'],
 '1 JUAN':['1 JUAN'],
 '2 JUAN':['2 JUAN'],
 '3 JUAN':['3 JUAN'],
 'JUDAS':['JUDAS','JUD','JUD.'],
 'APOCALIPSIS':['APOCALIPSIS','APOCALIPSIS','APOC','REV','REV.','APOC.','REVELACIÓN','REVELACION'],
}

def canonical_book(tok):
    t = norm(tok).strip()
    if not t:
        return None
    for canon, aliases in ALIASES.items():
        for a in aliases:
            if t == norm(a).strip():
                return canon
    return None

REF_SPLIT = re.compile(r'[;,]')
CHAP_RANGE = re.compile(r'(\d{1,3}):\d+[\-–—](\d{1,3}):\d+')
def parse_ref(ref):
    if not ref:
        return []
    ref = fix_mojibake(ref)
    out = []
    last_book = None
    for seg in REF_SPLIT.split(ref):
        seg = seg.strip()
        m = re.match(r'^([0-9]+\s+)?([A-Za-zÁÉÍÓÚÜÑáéíóúüñ\.\s]{1,22}?)\s*(\d{1,3})', seg)
        if not m:
            m2 = re.match(r'^(\d{1,3})', seg)
            if m2 and last_book:
                out.append((last_book, normalize_chap(last_book, int(m2.group(1)))))
            continue
        pre, name, chap = m.group(1), m.group(2), m.group(3)
        book = canonical_book((pre or '') + name.strip())
        if book:
            last_book = book
            out.append((book, normalize_chap(book, int(chap))))
            # rango "13:1-16:31" -> anadir tambien el capitulo final
            cr = CHAP_RANGE.search(seg)
            if cr and int(cr.group(2)) != int(chap):
                out.append((book, normalize_chap(book, int(cr.group(2)))))
    return out

def period_for(book, chap):
    for (b, ci, cf, f, a, era, lugar, lat, lon) in PERIODS:
        if b == book and ci <= chap <= cf:
            return {'fecha_texto': f, 'fecha_anio': a, 'era': era, 'lugar': lugar, 'lat': lat, 'lon': lon}
    return None

# -------- deteccion de libro canonico en texto libre y periodo por libro --------
# libros con nombre "de una palabra corta" que colisionan con otras palabras (JUAN, JOB, RUT)
# se buscan como token exacto; el resto como substring.
_BOOKS = sorted(set(p[0] for p in PERIODS), key=len, reverse=True)

def book_in(text):
    """Devuelve el libro canonico presente en `text`, o None. Busca por token exacto
    de inicio de palabra para evitar falsos positivos (p.ej. 'JOB' no dentro de 'JOVEN')."""
    if not text:
        return None
    t = ' ' + norm(text) + ' '
    for b in _BOOKS:
        bn = norm(b)
        if bn and (' ' + bn + ' ' in t or t.startswith(bn + ' ')):
            return b
    return None

def period_for_book(book):
    """Periodo representativo de un libro (sin capitulo): bloque con el anio mediano."""
    blocks = [p for p in PERIODS if p[0] == book]
    if not blocks:
        return None
    blocks.sort(key=lambda p: (p[4] is None, p[4]))
    mid = blocks[len(blocks) // 2]
    (b, ci, cf, f, a, era, lugar, lat, lon) = mid
    return {'fecha_texto': f, 'fecha_anio': a, 'era': era, 'lugar': lugar, 'lat': lat, 'lon': lon}

# libros de un solo capitulo: el numero tras el libro es versiculo, no capitulo
SINGLE_CHAP = {'FILEMÓN', '2 JUAN', '3 JUAN', 'JUDAS', 'ABDÍAS', '2 JUAN'}
def normalize_chap(book, chap):
    return 1 if book in SINGLE_CHAP else chap

# ---------------------------------------------------------------- hechos
hechos = []
with open(HECH, encoding='utf-8-sig', newline='') as f:
    for r in csv.DictReader(f):
        hechos.append(r)
by_id = {h['id']: h for h in hechos}

index = collections.defaultdict(list)
for h in hechos:
    libro = canonical_book(h['libro'])
    ci = int(h['capitulo_inicio'] or 0)
    cf = int(h['capitulo_fin'] or ci)
    if libro:
        for ch in range(ci, cf + 1):
            index[(libro, ch)].append(h['id'])
    for (b, c) in parse_ref(h['referencia']):
        index[(b, c)].append(h['id'])

def hecho_tokens(h):
    return set(re.findall(r'[A-ZÁÉÍÓÚÑ]{3,}', norm(h['nombre'] + ' ' + h['descripcion'] + ' ' + h['personajes'] + ' ' + h['lugar_antiguo'] + ' ' + h['tipo_suceso'])))

def hecho_nombre_tokens(h):
    return set(re.findall(r'[A-ZÁÉÍÓÚÑ]{3,}', norm(h['nombre'])))

def pick_hecho(cands, q):
    cands = list(dict.fromkeys(cands))
    if len(cands) == 1:
        return cands[0]
    qtext = norm(q['pregunta'] + ' ' + q['personaje'] + ' ' + q['opcion_a'] + ' ' + q['opcion_b'] + ' ' + q['opcion_c'] + ' ' + q['opcion_d'])
    qtoks = set(re.findall(r'[A-ZÁÉÍÓÚÑ]{3,}', qtext)) - STOP
    best, bestscore = None, -1
    for hid in cands:
        h = by_id[hid]
        inter = len(qtoks & hecho_tokens(h))
        inter_n = len(qtoks & hecho_nombre_tokens(h))
        qpers = norm(q['personaje'])
        bonus = 5 if (qpers and qpers in norm(h['personajes'])) else 0
        if bonus and canonical_book(q['personaje']):
            bonus = 0
        score = inter + 3 * inter_n + bonus
        if score > bestscore:
            best, bestscore = hid, score
    return best

# indice personaje -> hechos (para fallback de refs vacias)
pers_index = collections.defaultdict(list)
for h in hechos:
    for p in re.split(r'[,/]', norm(h['personajes'])):
        p = p.strip()
        if len(p) >= 3:
            pers_index[p].append(h['id'])

def personaje_fallback(q):
    """usa el personaje para acotar candidatos; solo si <=4 hechos y keyword fuerte dentro de ellos"""
    qpers = q['personaje']
    if not qpers or canonical_book(qpers):
        return None
    cands = pers_index.get(norm(qpers))
    if not cands:
        return None
    cands = list(dict.fromkeys(cands))
    if len(cands) == 1:
        return cands[0]
    if len(cands) > 4:
        return None
    return keyword_match(q, cands=cands)

STOP = set(norm(w) for w in ['DE','DEL','LA','EL','EN','DE','LOS','LAS','JESUS','JESÚS','DIOS','POR','QUE','CUAL','COMO','PARA','CON','SU','SUS','UN','UNA','AL'])
def keyword_match(q, cands=None):
    qpers = q['personaje']
    src = q['pregunta'] + ' ' + q['opcion_a'] + ' ' + q['opcion_b']
    if qpers and not canonical_book(qpers):
        src += ' ' + qpers
    text = norm(src)
    toks = set(re.findall(r'[A-ZÁÉÍÓÚÑ]{4,}', text)) - STOP
    if len(toks) < 2:
        return None
    pool = [h for h in hechos if h['id'] in cands] if cands else hechos
    best, bestscore = None, 0
    for h in pool:
        inter = len(toks & hecho_tokens(h))
        inter_n = len(toks & hecho_nombre_tokens(h))
        score = inter + 3 * inter_n
        # evidencia fuerte: >=2 tokens en el NOMBRE del hecho, o >=3 totales con >=1 en nombre
        ok = inter_n >= 2 or (inter >= 3 and inter_n >= 1)
        if ok and score > bestscore:
            best, bestscore = h['id'], score
    if bestscore >= 2:
        return best
    return None

# ---------------------------------------------------------------- proceso
rows = list(csv.DictReader(open(INP, encoding='utf-8-sig')))
NEWCOLS = ['hecho_id', 'hecho_nombre', 'fecha_suceso', 'fecha_anio', 'era_suceso',
           'lugar_suceso', 'lat', 'lon', 'tipo_suceso', 'fuente_dato']

stats = collections.Counter()
for q in rows:
    # limpiar mojibake/pérdida de ñ + acentuación en todos los campos de texto
    for _f in ('pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d',
               'respuesta_correcta', 'personaje'):
        if _f in q:
            v = clean_text(q[_f])
            v = acentuacion.acentuar_texto(v)
            if _f == 'pregunta':
                # solo en el enunciado la primera palabra interrogativa lleva tilde
                v = acentuacion.acentuar_interrogativos_texto(v)
            q[_f] = v
    q['personaje'] = q.get('personaje', '')
    for col in NEWCOLS:
        q[col] = ''
    hid = None
    fuente = ''
    refs = parse_ref(q['referencia_biblica'])
    if refs:
        cands = []
        for (b, c) in refs:
            cands.extend(index.get((b, c), []))
        if cands:
            hid = pick_hecho(cands, q)
            fuente = 'HECHO'
    if not hid:
        # fallback periodo
        for (b, c) in refs:
            p = period_for(b, c)
            if p:
                q['fecha_suceso'] = p['fecha_texto']
                q['fecha_anio'] = p['fecha_anio']
                q['era_suceso'] = p['era']
                q['lugar_suceso'] = p['lugar']
                q['lat'] = p['lat']
                q['lon'] = p['lon']
                q['fuente_dato'] = 'PERIODO'
                break
    if not hid and not q['fuente_dato']:
        # fallback por libro detectado en 'capitulo' (tema de la pregunta)
        bk = book_in(q['capitulo']) or book_in(q['personaje'])
        if bk:
            p = period_for_book(bk)
            if p:
                q['fecha_suceso'] = p['fecha_texto']
                q['fecha_anio'] = p['fecha_anio']
                q['era_suceso'] = p['era']
                q['lugar_suceso'] = p['lugar']
                q['lat'] = p['lat']
                q['lon'] = p['lon']
                q['fuente_dato'] = 'PERIODO'
    if not hid and not q['fuente_dato']:
        # fallback por personaje (acotado), luego keyword global
        hid = personaje_fallback(q)
        if hid:
            fuente = 'PERSONAJE'
        else:
            hid = keyword_match(q)
            if hid:
                fuente = 'TEXTO'
    if hid:
        h = by_id[hid]
        q['hecho_id'] = h['id']
        q['hecho_nombre'] = h['nombre']
        q['fecha_suceso'] = h['fecha_texto']
        q['fecha_anio'] = h['fecha_anio']
        q['era_suceso'] = h['era']
        q['lugar_suceso'] = h['lugar_antiguo']
        q['lat'] = h['lat']
        q['lon'] = h['lon']
        q['tipo_suceso'] = h['tipo_suceso']
        q['fuente_dato'] = fuente or 'TEXTO'
    stats[q['fuente_dato']] += 1

COLS = ['id','pregunta','opcion_a','opcion_b','opcion_c','opcion_d','respuesta_correcta',
        'categoria','dificultad','capitulo','personaje','referencia_biblica'] + NEWCOLS
with open(OUT, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=COLS, extrasaction='ignore')
    w.writeheader()
    for q in rows:
        w.writerow(q)

with_d = sum(1 for q in rows if q['fuente_dato'])
print('filas:', len(rows))
print('con dato:', with_d)
for k, v in stats.most_common():
    print(' ', k or '(sin dato)', v)