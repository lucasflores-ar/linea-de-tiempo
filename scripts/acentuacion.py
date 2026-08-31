# -*- coding: utf-8 -*-
"""Acentuador determinista de espanol basado en el diccionario Hunspell de
LibreOffice. Corrige palabras que perdieron las tildes (mojibake de acentos) de forma
segura: solo acentua una palabra si (1) la forma sin tilde NO es valida y (2) existe
exactamente UNA variante acentuada valida.

Usa spylls (motor Hunspell puro en Python) + el diccionario es_ES/libreoffice local.
Si no esta disponible, no hace nada (no rompe el pipeline).
"""
import os
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# rutas candidatas al diccionario Hunspell espanol (LibreOffice)
_DICT_CANDIDATES = [
    r'C:\Program Files\LibreOffice\share\extensions\dict-es\es',
    '/usr/share/hunspell/es_ES',
    '/usr/share/hunspell/es',
]

_TILDES = {'a': 'á', 'e': 'é', 'i': 'í', 'o': 'ó', 'u': 'ú',
           'á': 'á', 'é': 'é', 'í': 'í', 'ó': 'ó', 'ú': 'ú'}

_lookup = None  # cache
_BLANCA = None  # mayusculas: nombres propios (y su forma sin tilde) que NO se acentuan

# Correcciones forzadas de nombre propio: se aplican ANTES del diccionario, porque
# este valida algunas formas capitalizadas (p. ej. 'Jesus') aunque estan mal.
_FORZAR = {
    'Jesus': 'Jesús',
    'jesus': 'Jesús',
    'JESUS': 'JESÚS',
}


def cargar_lista_blanca(palabras):
    """Registra nombres propios que deben respetarse tal cual (grafia canonica JW)."""
    global _BLANCA
    if _BLANCA is None:
        _BLANCA = set()
    for p in palabras:
        p = (p or '').strip()
        if not p:
            continue
        _BLANCA.add(p)
        _BLANCA.add(p.lower())


def _en_blanca(palabra):
    if not _BLANCA:
        return False
    # comparar ignorando tildes (para no acentuar un nombre ya en lista blanca)
    return palabra in _BLANCA or palabra.lower() in _BLANCA


def _load_lookup():
    global _lookup
    if _lookup is not None:
        return _lookup
    try:
        from spylls.hunspell import Dictionary
    except Exception:
        _lookup = False
        return _lookup
    for base in _DICT_CANDIDATES:
        if os.path.exists(base + '.dic') and os.path.exists(base + '.aff'):
            try:
                d = Dictionary.from_files(base)
                _lookup = d.lookup
                return _lookup
            except Exception:
                continue
    _lookup = False
    return _lookup


def _strip_accents(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


def acentuar_palabra(palabra):
    """Devuelve la palabra correctamente acentuada, o la misma si no hay correccion
    univoca. Preserva la capitalizacion original (incluye nombres propios)."""
    lk = _load_lookup()
    if not lk:
        return palabra  # sin diccionario: no tocar
    if not palabra:
        return palabra
    # correccion forzada de nombre propio (antes de cualquier otra regla)
    if palabra in _FORZAR:
        return _FORZAR[palabra]
    if any(ch in palabra for ch in 'áéíóúñÁÉÍÓÚÑüÜ'):
        # ya tiene tilde/ñ: no tocar
        return palabra
    if _en_blanca(palabra):
        return palabra  # nombre propio canonico: respetar tal cual

    # 1) ya es valida (probando la forma tal cual y en minuscula) -> no tocar
    if lk(palabra) or lk(palabra.lower()):
        return palabra

    # 2) generar variantes con una tilde; aceptar solo si EXACTAMENTE una es valida.
    #    probar cada variante en minuscula y con la capitalizacion de cada posicion.
    llano = palabra.lower()
    validas = []
    for i, ch in enumerate(llano):
        if ch in 'aeiou':
            variante = llano[:i] + _TILDES[ch] + llano[i + 1:]
            ok = lk(variante) or lk(variante[:1].upper() + variante[1:])
            if ok and variante not in validas:
                validas.append(variante)

    # capitalizar igual que la original (respeta mayuscula inicial e internas)
    if len(validas) == 1:
        res = validas[0]
        out = []
        for j, ch in enumerate(res):
            if j < len(palabra) and palabra[j].isupper():
                out.append(ch.upper())
            else:
                out.append(ch)
        return ''.join(out)
    return palabra


def acentuar_texto(texto):
    """Acentua palabra por palabra un texto (conserva puntuacion y espacios)."""
    lk = _load_lookup()
    if not lk or not texto:
        return texto
    out = []
    buf = []
    for ch in texto:
        if ch.isalpha() or ch in 'áéíóúñÁÉÍÓÚÑüÜ':
            buf.append(ch)
        else:
            if buf:
                out.append(acentuar_palabra(''.join(buf)))
                buf = []
            out.append(ch)
    if buf:
        out.append(acentuar_palabra(''.join(buf)))
    return ''.join(out)


# Interrogativos/exclamativos que llevan tilde cuando abren pregunta o exclamacion.
_INTERROG = {
    'cuantos': 'cuántos', 'cuantas': 'cuántas', 'cuanto': 'cuánto',
    'cuanta': 'cuánta', 'cuando': 'cuándo', 'como': 'cómo', 'donde': 'dónde',
    'adonde': 'adónde', 'que': 'qué', 'cual': 'cuál', 'cuales': 'cuáles',
    'quien': 'quién', 'quienes': 'quiénes', 'porque': 'por qué',
    'cuantos': 'cuántos', 'cuant': 'cuánt',
}


def acentuar_interrogativos_texto(texto):
    """Tilda los interrogativos/exclamativos al inicio de frase (o tras '¿'/'¡').
    Como las preguntas del banco perdieron los '¿', tambien se tilda la PRIMERA
    palabra de la frase si es interrogativa (caso tipico del campo 'pregunta')."""
    if not texto:
        return texto
    import re
    toks = re.findall(r'[A-Za-zÁÉÍÓÚÑáéíóúüñ]+|[^A-Za-zÁÉÍÓÚÑáéíóúüñ]+', texto)
    out = []
    at_inicio = True
    prev_palabra = None
    for tk in toks:
        if re.fullmatch(r'[A-Za-zÁÉÍÓÚÑáéíóúüñ]+', tk):
            lw = tk.lower()
            if at_inicio and lw in _INTERROG:
                buen = _INTERROG[lw]
                if tk[0].isupper():
                    buen = buen[0].upper() + buen[1:]
                out.append(buen)
            elif prev_palabra and prev_palabra.lower() == 'por' and lw == 'que':
                # "Por que" al inicio de pregunta -> "Por qué"
                out.append('qué')
            else:
                out.append(tk)
            prev_palabra = tk
            at_inicio = False
        else:
            out.append(tk)
            if '¿' in tk or '¡' in tk or '?' in tk or '!' in tk:
                at_inicio = True
                prev_palabra = None
    return ''.join(out)


if __name__ == '__main__':
    _load_lookup()
    print('diccionario:', 'OK' if _lookup else 'NO DISPONIBLE')
    if _lookup:
        for w in ['comenzo', 'tenia', 'cuantos', 'Cuantos', 'Jesus', 'segun',
                  'despues', 'habia', 'debia', 'pregunto', 'como', 'cuanta',
                  'cuantas', 'años', 'anos', 'senor', 'tenian', 'interrogo']:
            print('  %-12s -> %s' % (w, acentuar_palabra(w)))