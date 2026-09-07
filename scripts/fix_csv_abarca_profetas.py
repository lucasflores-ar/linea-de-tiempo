# -*- coding: utf-8 -*-
"""Endereza el rango de cuatro libros proféticos en hechos_biblicos.csv.

De cada libro hay dos fechas distintas: cuándo se completó y el período que
abarca. En estas cuatro filas estaban cruzadas: `fecha_anio` tenía la compleción
y `fecha_fin` un año anterior, así que el rango salía invertido (fin antes del
inicio) y la barra se dibujaba como un punto de 4 px con las fechas dadas vuelta.

El criterio es usar el período que abarca para la barra, con la compleción
cerrándola. Pero eso solo se puede hacer donde el período existe: en la tabla de
los libros de la Biblia (`libros_biblia_data.py`, que es la fuente de
`merge_libros_biblia.py`) únicamente **Ezequiel** tiene
«Tiempo que abarca: 613–c. 591 a.E.C.». Amós, Abdías y Nahúm tienen
`anio_fin=None` y `tiempo_abarca=''`: de ellos solo se conoce el año de
compleción, y el año anterior que traía el CSV no viene de esa tabla ni coincide
con ninguna de las dos fechas conocidas, así que se descarta.

  106 Ezequiel  c. 591 / fin 600  ->  613 a c. 591   (periodo que abarca)
                                      con `fecha_anio` = c. 591, la compleción
  171 Abdías    c. 607 / fin 610  ->  c. 607         (suceso puntual)
  172 Amós      c. 804 / fin 810  ->  c. 804         (suceso puntual)
  187 Nahúm     a. 632 / fin 640  ->  a. 632         (suceso puntual)

Así queda coherente con lo que escribiría `apply_book()` del merge, que ahora
ordena los extremos en vez de dejar el fin antes del inicio.

Si aparecen los «tiempo que abarca» de esos tres libros, van primero a
`libros_biblia_data.py` y después acá.

Uso:
    python scripts/fix_csv_abarca_profetas.py --check   # no escribe
    python scripts/fix_csv_abarca_profetas.py
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
    # La orientación de Ezequiel la fija hoy `fix_csv_periodos_libros.py`:
    # `fecha_anio` es la compleción y `fecha_fin` el otro extremo del período.
    '106': {'fecha_anio': '-591', 'fecha_texto': 'c. 591 a. E. C.',
            'fecha_fin': '-613', 'fecha_fin_texto': '613 a. E. C.'},
    '171': {'fecha_anio': '-607', 'fecha_texto': 'c. 607 a. E. C.',
            'fecha_fin': '', 'fecha_fin_texto': ''},
    '172': {'fecha_anio': '-804', 'fecha_texto': 'c. 804 a. E. C.',
            'fecha_fin': '', 'fecha_fin_texto': ''},
    '187': {'fecha_anio': '-632', 'fecha_texto': 'a. 632 a. E. C.',
            'fecha_fin': '', 'fecha_fin_texto': ''},
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

    if not cambios:
        print('Sin cambios: los cuatro libros ya tienen las fechas esperadas.')
        return 0

    print(('PENDIENTE' if SOLO_VERIFICAR else 'APLICADO') + ' - '
          + str(len(cambios)) + ' celda(s):')
    for fid, col, valor in cambios:
        print('  fila %-5s %-16s %r -> %r'
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
