# -*- coding: utf-8 -*-
"""Completa las filas «X escribe el Evangelio» con los datos de su fila gemela.

En hechos_biblicos.csv cada Evangelio aparece dos veces (ver
docs/mejora-exploracion/PASO8-EPOCAS.md, que llama serie A a las primeras y
serie B a las segundas):

  «Evangelio según X», sin jw_codigo:      195 Marcos, 196 Lucas, 197 Juan
  «X escribe el Evangelio», jw_codigo B10: 194 Lucas, 377 Mateo, 379 Marcos,
                                           380 Juan

Los perfiles reales (audiencia romana de Marcos, términos médicos de Lucas,
92 % suplementario de Juan) viven en las filas «Evangelio según X»; en las
«X escribe» la `descripcion` repite el título y faltan lugar y referencia. Este
script copia esos datos a las «X escribe» y, cuando las dos discrepan en el
año, hace mandar a la gemela:

  194 Lucas   c. 57            -> c. 56 a c. 58
  379 Marcos  c. 62            -> c. 60 a c. 65
  380 Juan    c. 98 sin fin    -> c. 98 a c. 98

La fila 194 traía además `fecha_fin` 41, que es el año de Mateo y dejaba el
rango invertido: es el último resto del cruce que arregló fix_csv_evangelios.py.

No se toca la 377 (Mateo): no tiene gemela, así que su `referencia` y sus
capítulos siguen vacíos a falta de una cita de origen. Tampoco se borra ninguna
fila: las dos series quedan en pie.

Sobrescribe solo celdas vacías o con el título repetido, salvo las fechas en
conflicto, que sí se reemplazan. Reescribe el archivo con el módulo csv, que
reproduce el original byte a byte, hace copia de seguridad y aborta si cambia
alguna celda no prevista.

Uso:
    python scripts/fix_csv_evangelios_serieb.py --check   # no escribe
    python scripts/fix_csv_evangelios_serieb.py
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

# fila «X escribe el Evangelio» -> su gemela «Evangelio según X»
GEMELAS = {'194': '196', '379': '195', '380': '197'}

# Columnas que se copian de la gemela solo si el destino está vacío o si su
# `descripcion` es el título repetido.
COPIAR_SI_FALTA = ('descripcion', 'lugar_antiguo', 'referencia',
                   'capitulo_inicio', 'capitulo_fin')

# Fechas: se toman de la gemela aunque el destino ya tenga valor, porque la
# decisión fue que en los conflictos manda la serie B. Cada año va con su texto
# legible, que se copia solo si el año cambió: si no, «c. 98 e. c.» y
# «c. 98 e.c.» son la misma fecha y reescribirla solo ensucia el diff.
COPIAR_FECHAS = (('fecha_anio', 'fecha_texto'), ('fecha_fin', 'fecha_fin_texto'))

HUELLA_MATEO = 'genealogía desde Abrahán'


def mismo_anio(a, b):
    a, b = a.strip(), b.strip()
    if a == b:
        return True
    try:
        return int(float(a)) == int(float(b))
    except ValueError:
        return False


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


def planificar(por_id):
    """Devuelve [(id, columna, valor, motivo)] con lo que habría que escribir."""
    cambios = []
    for destino, fuente in GEMELAS.items():
        dst, src = por_id[destino], por_id[fuente]
        titulo = (dst['nombre'] or '').strip()

        for col in COPIAR_SI_FALTA:
            actual = (dst[col] or '').strip()
            nuevo = (src[col] or '').strip()
            if not nuevo:
                continue
            vacio = not actual
            titulo_repetido = col == 'descripcion' and actual == titulo
            if vacio or titulo_repetido:
                motivo = ('perfil real, estaba el titulo repetido' if titulo_repetido
                          else 'estaba vacio; lo trae la fila ' + fuente)
                cambios.append((destino, col, nuevo, motivo))

        for col_anio, col_texto in COPIAR_FECHAS:
            actual = (dst[col_anio] or '').strip()
            nuevo = (src[col_anio] or '').strip()
            if not nuevo or mismo_anio(actual, nuevo):
                continue
            motivo = ('estaba vacio; lo trae la fila ' + fuente if not actual
                      else 'en conflicto manda la fila ' + fuente)
            cambios.append((destino, col_anio, nuevo, motivo))
            texto = (src[col_texto] or '').strip()
            if texto and (dst[col_texto] or '').strip() != texto:
                cambios.append((destino, col_texto, texto, 'texto del año nuevo'))
    return cambios


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
    for fid in list(GEMELAS) + list(GEMELAS.values()) + ['377']:
        if fid not in por_id:
            print('ABORTADO: no existe la fila ' + fid)
            return 2

    # El arreglo previo (fix_csv_evangelios.py) tiene que estar aplicado: si el
    # perfil de Mateo sigue en la 194, este script copiaria encima del cruce.
    if HUELLA_MATEO not in (por_id['377']['descripcion'] or ''):
        print('ABORTADO: la fila 377 no tiene el perfil de Mateo.')
        print('          Corre antes: python scripts/fix_csv_evangelios.py')
        return 2

    cambios = planificar(por_id)
    if not cambios:
        print('Sin cambios: las filas "X escribe el Evangelio" ya estan completas.')
        return 0

    print(('PENDIENTE' if SOLO_VERIFICAR else 'APLICADO') + ' - '
          + str(len(cambios)) + ' celda(s):')
    for fid, col, valor, motivo in cambios:
        antes = (por_id[fid][col] or '')
        print('  fila ' + fid + ' . ' + col)
        print('      antes: ' + repr(antes[:70]))
        print('      ahora: ' + repr(valor[:70]))
        print('      ' + motivo)

    if SOLO_VERIFICAR:
        return 1

    for fid, col, valor, _ in cambios:
        por_id[fid][col] = valor

    datos = serializar(filas, campos, con_bom)

    # Releer lo que vamos a escribir y comparar celda por celda con el original.
    releidas = list(csv.DictReader(io.StringIO(datos.decode('utf-8-sig'), newline='')))
    if len(releidas) != len(filas):
        print('ABORTADO: cambio la cantidad de filas.')
        return 2
    esperado = {(fid, col): valor for fid, col, valor, _ in cambios}
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
