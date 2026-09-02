# -*- coding: utf-8 -*-
"""Genera un CSV de revision de nombres propios (personas y lugares) del banco de
preguntas, para que un humano revise grafias erroneas/inconsistentes.

Salida: nombres_propios_revision.csv con columnas:
  tipo, nombre_base, variantes, apariciones, categoria, fuente

Agrupa nombres por forma normalizada (sin tildes/minusculas) y lista en 'variantes'
las distintas grafias que coexisten en el banco, para detectar errores de acentuacion
(Elías/Elias, Moisés/Moises, Nehemías/Nehemíás, etc.).
"""
import csv, os, re, sys, unicodedata, collections

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, repo

BASE = db()

# ---------------------------------------------------------------- normalizacion
def norm(s):
    s = unicodedata.normalize('NFD', (s or ''))
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')  # quitar tildes
    s = re.sub(r'[^a-z0-9 ]', ' ', s.lower())
    return ' '.join(s.split())


# ---------------------------------------------------------------- carga
def read_csv(name):
    p = db(name)
    if not os.path.exists(p):
        return []
    return list(csv.DictReader(open(p, encoding='utf-8-sig')))


personajes = read_csv('personajes_biblicos.csv')
lugares = read_csv('lugares_biblicos.csv')
hechos = read_csv('hechos_biblicos.csv')
preguntas = read_csv('preguntas_unificadas.csv')

# ---------------------------------------------------------------- exclusiones
# libros biblicos y temas (no son personas, no interesan en la revision de nombres)
LIBROS = {
    'genesis', 'exodo', 'levitico', 'numeros', 'deuteronomio', 'josue', 'jueces',
    'rut', '1 samuel', '2 samuel', '1 reyes', '2 reyes', '1 cronicas', '2 cronicas',
    'esdras', 'nehemias', 'ester', 'job', 'salmos', 'proverbios', 'eclesiastes',
    'cantar', 'isaias', 'jeremias', 'lamentaciones', 'ezequiel', 'daniel', 'oseas',
    'joel', 'amos', 'abdias', 'jonas', 'miqueas', 'nahum', 'habacuc', 'sofonias',
    'hageo', 'zacarias', 'malaquias', 'mateo', 'marcos', 'lucas', 'juan', 'hechos',
    'romanos', 'corintios', 'galatas', 'efesios', 'filipenses', 'colosenses',
    'tesalonicenses', 'timoteo', 'tito', 'filemon', 'hebreos', 'santiago', 'pedro',
    'judas', 'apocalipsis', 'cronicas', 'paralipomenos',
}
TEMAS = {
    'calendario', 'calendario hebreo', 'general', 'monedas', 'monedas y pesos',
    'medidas', 'medidas biblicas', 'medidas usadas para el comercio', 'geografia',
    'arqueologia', 'costumbres', 'nombres', 'numeros', 'fechas', 'lugares',
    'suceso', 'otro', 'parentesco', 'edad', 'leccion', 'doctrina',
}

# colectivos/grupos que no son nombres individuales
COLECTIVOS = {
    'los apostoles', 'apostoles', 'los discipulos', 'discipulos', 'fariseos',
    'los fariseos', 'saduceos', 'los saduceos', 'judios', 'los judios',
    'sacerdotes', 'los sacerdotes', 'levitas', 'los levitas', 'escribas',
    'carcelero', 'los magos', 'magos', 'los pastores', 'los soldados',
    'israelitas', 'los israelitas', 'los ancianos', 'los sacerdotes',
    'filisteos', 'los filisteos', 'cristianos', 'los cristianos', 'profetas',
    'los profetas', 'los reyes', 'samaritanos', 'los samaritanos', 'gentiles',
    'los gentiles', 'los ninivitas', 'publicanos', 'los publicanos',
}

def es_ruido(nombre):
    n = norm(nombre)
    if n in LIBROS or n in TEMAS or n in COLECTIVOS:
        return True
    return False

# ---------------------------------------------------------------- recoleccion
reg = {}

def add(tipo, nombre, apariciones=1, fuente='', categoria=''):
    nombre = (nombre or '').strip()
    if not nombre or len(nombre) < 3:
        return
    if es_ruido(nombre):
        return
    k = norm(nombre)
    if not k:
        return
    d = reg.setdefault(k, {'tipo': tipo, 'variantes': set(), 'n': 0,
                           'fuente': set(), 'categoria': set(), 'nombre': nombre})
    d['variantes'].add(nombre)
    d['n'] += apariciones
    if fuente:
        d['fuente'].add(fuente)
    if categoria:
        d['categoria'].add(categoria)
    # conservar la grafia "mas acentuada/completa" como nombre_base
    if len(nombre) >= len(d['nombre']):
        d['nombre'] = nombre


# 1) lugares (lugares_biblicos.csv)
for l in lugares:
    add('lugar', l['lugar_antiguo'], 0, 'lugares_biblicos.csv', '')

# 2) lugares de hechos (lugar_antiguo)
for h in hechos:
    for parte in re.split(r'[→/]', h.get('lugar_antiguo') or ''):
        add('lugar', parte.strip(), 0, 'hechos_biblicos.csv', '')

# 3) personajes (personajes_biblicos.csv) -> expandir nombres agrupados
for p in personajes:
    nombre = p['nombre']
    grupo = p.get('grupo') or ''
    # nombres agrupados por comas -> expandir en personas individuales
    for parte in re.split(r'[,;]', nombre):
        parte = parte.strip()
        # ignorar colectivos descriptivos ("y su hija", "y Sansón", etc.)
        if not parte or re.match(r'^(y\b|e\b|su\b|hija|hijo)', parte, re.I):
            continue
        add('persona', parte, 0, 'personajes_biblicos.csv', grupo)

# 4) personajes en hechos (campo 'personajes')
for h in hechos:
    for parte in re.split(r'[,/]', h.get('personajes') or ''):
        add('persona', parte.strip(), 0, 'hechos_biblicos.csv', '')

# 5) campo 'personaje' del banco de preguntas (muy rico en nombres)
for q in preguntas:
    add('persona', q.get('personaje'), 1, 'preguntas.personaje', q.get('categoria') or '')

# (se omite el barrido de capitalizadas en texto libre: mete demasiado ruido;
#  las fuentes canonicas + el campo 'personaje' ya cubren practicamente todo)

# ---------------------------------------------------------------- orden + salida
def tilde_form(s):
    """forma canonica sin tildes (para comparar ortografia, ignorando case)."""
    return norm(s)

def problema_de(d):
    vars_ = list(d['variantes'])
    # detectar mojibake (caracteres latinos raros provenientes de mala codificacion)
    if any('Ã' in v or 'Â' in v or '�' in v for v in vars_):
        return 'mojibake'
    # detectar si hay variantes con tilde y sin tilde (falta de acento)
    con_tilde = [v for v in vars_ if any(c in v for c in 'áéíóúñ')]
    sin_tilde = [v for v in vars_ if not any(c in v for c in 'áéíóúñÁÉÍÓÚÑ')]
    if con_tilde and sin_tilde:
        # confirmar que son la misma palabra (difieren solo en tilde)
        if len(sin_tilde) > 0:
            return 'sin_tilde'
    return ''

rows = list(reg.values())
rows.sort(key=lambda d: (0 if d['tipo'] == 'persona' else 1, -d['n'], d['nombre'].lower()))

OUT = repo('nombres_propios_revision.csv')
with open(OUT, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['tipo', 'nombre_base', 'variantes', 'apariciones', 'problema', 'categoria', 'fuente'])
    for d in rows:
        variantes = ' | '.join(sorted(d['variantes'], key=len, reverse=True))
        w.writerow([
            d['tipo'],
            d['nombre'],
            variantes,
            d['n'],
            problema_de(d),
            '; '.join(sorted(d['categoria'])) if d['categoria'] else '',
            '; '.join(sorted(d['fuente'])),
        ])

print('nombres unicos:', len(rows))
print('personas:', sum(1 for r in rows if r['tipo'] == 'persona'))
print('lugares:', sum(1 for r in rows if r['tipo'] == 'lugar'))
multi = [r for r in rows if len(r['variantes']) > 1]
print('con >1 variante (incl. mayusculas):', len(multi))
prob = [r for r in rows if problema_de(r)]
print('con problema ortografico (mojibake/sin_tilde):', len(prob))
print('salida:', OUT)