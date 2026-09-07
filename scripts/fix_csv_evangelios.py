# -*- coding: utf-8 -*-
"""Corrige en el origen (hechos_biblicos.csv) los datos de redacción de los
Evangelios, para que los parches del repo sobrevivan a una regeneración.

Tres arreglos:

1. La fila 194 se titula "Lucas escribe el Evangelio llamado 'Lucas'" pero su
   `descripcion` y su `lugar_antiguo` son los de Mateo (audiencia judía,
   genealogía desde Abrahán, 42 % de contenido exclusivo, Palestina). El perfil
   real de Lucas está en la fila 196 (Cesarea, términos médicos). Se mueven a la
   fila 377, que es la de Mateo y no tenía descripción propia.

2. Las filas 377 y 379 tienen `libro` vacío, así que no recibían categoría de
   escritura y quedaban en el tema OTROS, invisibles en todos los carriles.

Reescribe el archivo completo con el módulo csv, que reproduce el original byte
a byte (verificado con scripts/check_csv_roundtrip.py). Hace copia de seguridad
antes de escribir y comprueba que solo cambien las celdas previstas.

Uso:
    python scripts/fix_csv_evangelios.py --check   # no escribe
    python scripts/fix_csv_evangelios.py
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

ID_LUCAS = '194'
ID_MATEO = '377'
ID_MARCOS = '379'
HUELLA_MATEO = 'genealogía desde Abrahán'

# (id, columna, valor nuevo, motivo). El valor None se resuelve en tiempo de ejecución.
CAMBIOS = [
    (ID_MATEO, 'descripcion', None, 'hereda el perfil de Mateo que estaba en la fila 194'),
    (ID_MATEO, 'lugar_antiguo', 'Palestina', 'lugar de escritura de Mateo'),
    (ID_MATEO, 'libro', 'MATEO', 'estaba vacío, así que no recibía categoría de escritura'),
    (ID_LUCAS, 'descripcion', None, 'pasa a repetir su título, como el resto de su serie'),
    (ID_LUCAS, 'lugar_antiguo', '', '"Palestina" era de Mateo; el de Lucas (Cesarea) está en la fila 196'),
    (ID_MARCOS, 'libro', 'MARCOS', 'estaba vacío, así que no recibía categoría de escritura'),
]


def leer():
    with open(CSV, 'rb') as f:
        original = f.read()
    texto = original.decode('utf-8-sig')
    filas = list(csv.DictReader(io.StringIO(texto, newline='')))
    return original, filas


def serializar(filas, campos, con_bom):
    buf = io.StringIO(newline='')
    w = csv.DictWriter(buf, fieldnames=campos, lineterminator='\r\n', quoting=csv.QUOTE_MINIMAL)
    w.writeheader()
    w.writerows(filas)
    salida = buf.getvalue()
    return (('\ufeff' + salida) if con_bom else salida).encode('utf-8')


def main():
    original, filas = leer()
    campos = list(filas[0].keys())
    con_bom = original.startswith(b'\xef\xbb\xbf')

    # El módulo csv debe reproducir el original antes de que confiemos en él.
    if serializar(filas, campos, con_bom) != original:
        print('ABORTADO: el modulo csv no reproduce el archivo original byte a byte.')
        return 2

    por_id = {}
    for fila in filas:
        por_id.setdefault(fila['id'], fila)
    for fid in (ID_LUCAS, ID_MATEO, ID_MARCOS):
        if fid not in por_id:
            print('ABORTADO: no existe la fila', fid)
            return 2

    lucas, mateo = por_id[ID_LUCAS], por_id[ID_MATEO]

    perfil_en_mateo = HUELLA_MATEO in (mateo['descripcion'] or '')
    perfil_en_lucas = HUELLA_MATEO in (lucas['descripcion'] or '')
    if not perfil_en_mateo and not perfil_en_lucas:
        print('ABORTADO: no se encuentra el perfil de Mateo en las filas 194 ni 377.')
        return 2

    perfil = mateo['descripcion'] if perfil_en_mateo else lucas['descripcion']
    resueltos = []
    for fid, col, valor, motivo in CAMBIOS:
        if valor is None:
            valor = perfil if fid == ID_MATEO else por_id[fid]['nombre']
        resueltos.append((fid, col, valor, motivo))

    pendientes = [c for c in resueltos if (por_id[c[0]][c[1]] or '') != c[2]]
    if not pendientes:
        print('Sin cambios: el CSV de origen ya esta corregido.')
        return 0

    print(('PENDIENTE' if SOLO_VERIFICAR else 'APLICADO') + ' - ' + str(len(pendientes)) + ' celda(s):')
    for fid, col, valor, motivo in pendientes:
        antes = (por_id[fid][col] or '')
        print('  fila ' + fid + ' . ' + col)
        print('      antes: ' + repr(antes[:70]))
        print('      ahora: ' + repr(valor[:70]))
        print('      ' + motivo)

    if SOLO_VERIFICAR:
        return 1

    for fid, col, valor, _ in resueltos:
        por_id[fid][col] = valor

    datos = serializar(filas, campos, con_bom)

    # Verificacion: releer lo que vamos a escribir y comparar celda por celda.
    releidas = list(csv.DictReader(io.StringIO(datos.decode('utf-8-sig'), newline='')))
    if len(releidas) != len(filas):
        print('ABORTADO: cambio la cantidad de filas.')
        return 2
    esperado = {(fid, col): valor for fid, col, valor, _ in resueltos}
    _, originales = leer()
    for antes_fila, ahora_fila in zip(originales, releidas):
        if antes_fila['id'] != ahora_fila['id']:
            print('ABORTADO: cambio el orden de las filas.')
            return 2
        for col in campos:
            a, b = (antes_fila[col] or ''), (ahora_fila[col] or '')
            if a == b:
                continue
            if esperado.get((antes_fila['id'], col)) == b:
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
