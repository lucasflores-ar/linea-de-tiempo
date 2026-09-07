# -*- coding: utf-8 -*-
"""Alinea el suceso de redacción de Malaquías al estilo de sus hermanos.

Malaquías era el único libro profético sin suceso de redacción: solo estaba la
fila 185, «Profecía de Malaquías» (tipo=profecía). Se decidió crearle el suyo,
como tienen los otros once, y merge_libros_biblia.py lo creó con el nombre de la
tabla («Malaquías completado») y una descripción generada («Escritor: … Lugar de
escritura: …»).

Los once hermanos usan otro estilo, que es el que manda:

    172  Amós completa el libro de Amós      | Profecía de Amós contra la injusticia social.
    187  Nahúm completa el libro de Nahúm    | Profecía de la caída de Nínive.
    191  Sofonías completa el libro...       | Profecía sobre el día de Jehová.

La descripción se toma textual de la fila 185, que ya la tenía curada, para no
inventar contenido.

Uso:
    python scripts/fix_csv_malaquias.py --check   # muestra qué haría
    python scripts/fix_csv_malaquias.py           # escribe, con backup
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

# Estado final buscado, declarado entero para que el script converja desde
# cualquier punto y sea idempotente.
ESPERADO = {
    '439': {
        'nombre': 'Malaquías completa el libro de Malaquías',
        'descripcion': 'Última profecía del AT sobre el mensajero que prepara '
                       'el camino.',
    },
}


def main():
    solo_ver = '--check' in sys.argv

    with open(CSV, encoding='utf-8-sig', newline='') as f:
        crudo = f.read()
    filas = list(csv.DictReader(io.StringIO(crudo, newline='')))
    campos = list(filas[0].keys())

    pendientes = []
    for fila in filas:
        quiere = ESPERADO.get(fila['id'])
        if not quiere:
            continue
        for col, valor in quiere.items():
            actual = fila.get(col) or ''
            if actual != valor:
                pendientes.append((fila['id'], col, actual, valor))
                if not solo_ver:
                    fila[col] = valor

    if not pendientes:
        print('[ok] nada que cambiar: el CSV ya está como se espera.')
        return 0

    for rid, col, antes, ahora in pendientes:
        print('  fila %s | %s' % (rid, col))
        print('      antes: %r' % (antes[:74],))
        print('      ahora: %r' % (ahora[:74],))

    if solo_ver:
        print('\n[check] no se escribió nada. %d cambio(s) pendiente(s).'
              % len(pendientes))
        return 1

    sello = datetime.datetime.now().strftime('%Y%m%d-%H%M%S')
    backup = '%s.bak-malaquias-%s' % (CSV, sello)
    shutil.copy2(CSV, backup)
    print('\nbackup -> %s' % os.path.basename(backup))

    # newline='' y CRLF explícito: la base usa CRLF y BOM, y escribirla de otro
    # modo deja el archivo entero como un solo diff.
    salida = io.StringIO()
    w = csv.DictWriter(salida, fieldnames=campos, quoting=csv.QUOTE_MINIMAL,
                       lineterminator='\r\n')
    w.writeheader()
    w.writerows(filas)
    with open(CSV, 'w', encoding='utf-8-sig', newline='') as f:
        f.write(salida.getvalue())

    # Verificación: releer y comprobar celda por celda que quedó lo pedido.
    with open(CSV, encoding='utf-8-sig', newline='') as f:
        releidas = {r['id']: r for r in csv.DictReader(io.StringIO(f.read(), newline=''))}
    mal = [(rid, col) for rid, quiere in ESPERADO.items()
           for col, valor in quiere.items()
           if (releidas.get(rid, {}).get(col) or '') != valor]
    if mal:
        print('[ERROR] no quedó como se esperaba: %s' % mal)
        return 2

    print('OK — %d cambio(s) aplicado(s) y verificado(s).' % len(pendientes))
    return 0


if __name__ == '__main__':
    sys.exit(main())
