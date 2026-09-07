# -*- coding: utf-8 -*-
"""Comprueba si hechos_biblicos.csv se puede reescribir con el módulo csv sin
alterar ni un byte. Si el ida y vuelta no es idéntico, no es seguro parchearlo
reescribiendo el archivo completo.

Uso: python scripts/check_csv_roundtrip.py
"""
import csv
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db

CSV = db('hechos_biblicos.csv')

with open(CSV, 'rb') as f:
    original = f.read()

texto = original.decode('utf-8-sig')
tiene_bom = original.startswith(b'\xef\xbb\xbf')
crlf = texto.count('\r\n')
lf_solo = texto.count('\n') - crlf
print('bytes:', len(original))
print('BOM utf-8:', tiene_bom)
print('saltos CRLF:', crlf, '| saltos LF sueltos:', lf_solo)

rows = list(csv.DictReader(io.StringIO(texto, newline='')))
campos = list(rows[0].keys())
print('filas:', len(rows), '| columnas:', len(campos))

for terminador in ('\r\n', '\n'):
    for quoting, nombre in ((csv.QUOTE_MINIMAL, 'MINIMAL'), (csv.QUOTE_ALL, 'ALL')):
        buf = io.StringIO(newline='')
        w = csv.DictWriter(buf, fieldnames=campos, lineterminator=terminador, quoting=quoting)
        w.writeheader()
        w.writerows(rows)
        salida = buf.getvalue()
        datos = (('\ufeff' + salida) if tiene_bom else salida).encode('utf-8')
        etiqueta = ('CRLF' if terminador == '\r\n' else 'LF') + '/' + nombre
        if datos == original:
            print('IDENTICO con', etiqueta)
            sys.exit(0)
        print('difiere con', etiqueta, '->', len(datos), 'bytes')

print('\nNinguna combinacion reproduce el archivo byte a byte.')
sys.exit(1)
