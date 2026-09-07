# -*- coding: utf-8 -*-
"""Corrige «Booz» -> «Boaz» en hechos_biblicos.csv (fila 44).

«Booz» es la grafía de Reina-Valera; la Traducción del Nuevo Mundo, que es la
que sigue el resto del proyecto, escribe «Boaz». El banco de preguntas ya usa
Boaz en 42 celdas; la única fila que quedó con la grafía vieja es la 44, en
`nombre` y `personajes`.

No es solo cosmético. La ficha del personaje sale de la columna `personajes`
de esta fila (Boaz no está en `personajes_biblicos.csv`), y el enriquecido
enlaza preguntas a sucesos comparando `norm(pregunta.personaje)` contra
`norm(hecho.personajes)`. Como `norm` saca tildes pero no cambia letras,
`boaz` nunca coincidía con `booz`: hay 12 preguntas con `personaje='Boaz'`
que no se enlazan, y por eso la ficha 135 muestra 0 preguntas.

Ojo con el reemplazo global: la pregunta 10144 responde «Jakín y Boaz», las
columnas del templo. Ese Boaz ya está bien escrito y no es esta persona. Por
eso acá se tocan celdas puntuales y no se pasa un sed por el archivo.

La clave de `curacion/manual.json` se renombra en el mismo commit: es la clave
de join por nombre de ficha, y si queda desalineada `apply_curacion()` avisa
«sin ficha para» y la ficha pierde sus ocho campos curados.

Uso:
    python scripts/fix_csv_boaz.py --check   # no escribe
    python scripts/fix_csv_boaz.py
"""
import csv
import datetime
import io
import os
import shutil
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db

CSV = db('hechos_biblicos.csv')
SOLO_VERIFICAR = '--check' in sys.argv

# Estado final buscado, declarado entero para que el script converja desde
# cualquier punto y sea idempotente.
ESPERADO = {
    '44': {
        'nombre': 'Rut y Boaz',
        'personajes': 'Rut, Noemí, Boaz',
    },
}


def leer():
    with open(CSV, 'rb') as f:
        original = f.read()
    filas = list(csv.DictReader(io.StringIO(original.decode('utf-8-sig'), newline='')))
    return original, filas


def serializar(filas, campos, con_bom):
    buf = io.StringIO(newline='')
    w = csv.DictWriter(buf, fieldnames=campos, lineterminator='\r\n',
                       quoting=csv.QUOTE_MINIMAL)
    w.writeheader()
    w.writerows(filas)
    salida = buf.getvalue()
    return (('\ufeff' + salida) if con_bom else salida).encode('utf-8')


def main():
    original, filas = leer()
    campos = list(filas[0].keys())
    con_bom = original.startswith(b'\xef\xbb\xbf')

    if serializar(filas, campos, con_bom) != original:
        print('ABORTADO: el modulo csv no reproduce el archivo original byte a byte.')
        return 2

    por_id = {}
    for fila in filas:
        por_id.setdefault(fila['id'], fila)
    for fid in ESPERADO:
        if fid not in por_id:
            print('ABORTADO: no existe la fila ' + fid)
            return 2

    cambios = []
    for fid, campos_esperados in ESPERADO.items():
        for col, valor in campos_esperados.items():
            if (por_id[fid][col] or '').strip() != valor:
                cambios.append((fid, col, valor))

    # Nadie más en el archivo debería quedar con la grafía vieja.
    rezagados = [(f['id'], c) for f in filas for c in campos
                 if 'Booz' in (f[c] or '')
                 and (f['id'], c) not in [(a, b) for a, b, _ in cambios]]
    if rezagados:
        print('ATENCION: queda «Booz» en celdas que este script no toca:')
        for fid, col in rezagados:
            print('  fila %s . %s' % (fid, col))

    if not cambios:
        print('Sin cambios: la fila 44 ya dice Boaz.')
        return 0 if not rezagados else 1

    print(('PENDIENTE' if SOLO_VERIFICAR else 'APLICADO') + ' - '
          + str(len(cambios)) + ' celda(s):')
    for fid, col, valor in cambios:
        print('  fila %-5s %-14s %r -> %r'
              % (fid, col, (por_id[fid][col] or ''), valor))

    if SOLO_VERIFICAR:
        return 1

    for fid, col, valor in cambios:
        por_id[fid][col] = valor

    datos = serializar(filas, campos, con_bom)

    releidas = list(csv.DictReader(io.StringIO(datos.decode('utf-8-sig'), newline='')))
    if len(releidas) != len(filas):
        print('ABORTADO: cambio la cantidad de filas.')
        return 2
    esperado = {(fid, col): valor for fid, col, valor in cambios}
    _, originales = leer()
    for antes_fila, ahora_fila in zip(originales, releidas):
        if antes_fila['id'] != ahora_fila['id']:
            print('ABORTADO: cambio el orden de las filas.')
            return 2
        for col in campos:
            a, b = (antes_fila[col] or ''), (ahora_fila[col] or '')
            if a == b or esperado.get((antes_fila['id'], col)) == b:
                continue
            print('ABORTADO: cambio inesperado en fila ' + antes_fila['id'] + ' . ' + col)
            return 2

    marca = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    copia = CSV + '.bak-' + marca
    shutil.copy2(CSV, copia)
    with open(CSV, 'wb') as f:
        f.write(datos)
    print('\nCopia de seguridad: ' + copia)
    print('Escrito ' + CSV)
    return 0


if __name__ == '__main__':
    sys.exit(main())
