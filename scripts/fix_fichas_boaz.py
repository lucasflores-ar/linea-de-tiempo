# -*- coding: utf-8 -*-
"""Renombra Booz -> Boaz en los artefactos de fichas, sin regenerarlos.

`gen_fichas.py` ya produce «Boaz» desde que se corrigió la fila 44 de
hechos_biblicos.csv, pero correrlo completo arrastra cambios ajenos: la base
externa se movió desde la última regeneración y aparecen 6 fichas nuevas más
varias fusiones y desambiguaciones («Abigaíl y Natán», «María (la madre de
Jesús)»…). Eso corre todos los `id` hasta 6 lugares, y `fichas.html?id=N` es
un punto de entrada compartible: un enlace viejo abriría a otra persona.

Así que acá se toca solo lo del nombre, con los `id` intactos, y la
regeneración completa queda como decisión aparte.

Se parchea celda por celda, no con un reemplazo global: hay un «Boaz» legítimo
que no es esta persona (las columnas del templo, «Jakín y Boaz»), y conviene
que el script falle si aparece la cadena en un lugar no previsto.

También se corrige `num_preguntas` de la ficha de Boaz. Estaba en 0 porque el
conteo compara `norm(pregunta.personaje)` contra el nombre de la ficha, y
`norm` saca tildes pero no cambia letras: `boaz` nunca coincidía con `booz`.
Las 12 preguntas existían y no se mostraban.

Uso:
    python scripts/fix_fichas_boaz.py --check   # no escribe
    python scripts/fix_fichas_boaz.py
"""
import io
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOLO_VERIFICAR = '--check' in sys.argv

CSV = os.path.join(REPO, 'fichas_personajes.csv')
JS = os.path.join(REPO, 'fichas-personajes.js')

# (archivo, texto viejo, texto nuevo, cuántas veces se espera)
PARCHES = [
    # Ficha 135: el nombre y su hito.
    (CSV, '135,Booz,', '135,Boaz,', 1),
    (CSV, 'Rut y Booz (c. 1100 a. E. C.)', 'Rut y Boaz (c. 1100 a. E. C.)', 2),
    (CSV, 'Sísara (3); Booz (2)', 'Sísara (3); Boaz (2)', 1),
    (JS, "nombre:'Booz'", "nombre:'Boaz'", 1),
    (JS, "'Rut y Booz (c. 1100 a. E. C.) [Rut 1:1-4:22]'",
         "'Rut y Boaz (c. 1100 a. E. C.) [Rut 1:1-4:22]'", 2),
    (JS, "'Sísara (3)', 'Booz (2)'", "'Sísara (3)', 'Boaz (2)'", 1),
]

# Conteo de preguntas de la ficha 135, que el desalineo de grafías dejaba en 0.
#
# Los comodines van acotados a propósito. Con `.*?` y DOTALL el patrón arranca
# en la ficha de Boaz pero puede seguir cruzando líneas hasta encontrar el
# `,0,1,...` de otra ficha cualquiera, y entonces la segunda corrida del script
# corrompe una fila ajena en vez de no hacer nada. Acá el CSV no sale de su
# línea y el JS no puede cruzar el `nombre:` de la ficha siguiente.
NQ = [
    (CSV, re.compile(r'(^135,Boaz,[^\n]*?),0,1,"hechos_biblicos,curacion_manual"',
                     re.M),
     r'\g<1>,12,1,"hechos_biblicos,preguntas,curacion_manual"'),
    (JS, re.compile(r"(nombre:'Boaz'(?:(?!nombre:')[\s\S])*?)"
                    r"nq:0, nh:1, fuente:'hechos_biblicos,curacion_manual'"),
     r"\g<1>nq:12, nh:1, fuente:'hechos_biblicos,preguntas,curacion_manual'"),
]


def leer(ruta):
    with open(ruta, encoding='utf-8', newline='') as f:
        return f.read()


def main():
    textos = {ruta: leer(ruta) for ruta in (CSV, JS)}
    pendientes = []

    for ruta, viejo, nuevo, veces in PARCHES:
        t = textos[ruta]
        hay_viejo, hay_nuevo = t.count(viejo), t.count(nuevo)
        if hay_nuevo == veces and hay_viejo == 0:
            continue  # ya aplicado
        if hay_viejo != veces:
            print('ABORTADO: en %s esperaba %d vez/veces %r y encontré %d.'
                  % (os.path.basename(ruta), veces, viejo, hay_viejo))
            return 2
        textos[ruta] = t.replace(viejo, nuevo)
        pendientes.append((ruta, viejo, nuevo, veces))

    for ruta, patron, reemplazo in NQ:
        nuevo_txt, n = patron.subn(reemplazo, textos[ruta], count=1)
        if n:
            textos[ruta] = nuevo_txt
            pendientes.append((ruta, 'num_preguntas de Boaz', '0 -> 12', 1))

    # Nada más en estos archivos debería quedar con la grafía vieja.
    for ruta in (CSV, JS):
        if 'Booz' in textos[ruta]:
            print('ABORTADO: queda «Booz» en ' + os.path.basename(ruta))
            return 2

    if not pendientes:
        print('Sin cambios: las fichas ya dicen Boaz.')
        return 0

    print(('PENDIENTE' if SOLO_VERIFICAR else 'APLICADO') + ' - '
          + str(len(pendientes)) + ' parche(s):')
    for ruta, viejo, nuevo, veces in pendientes:
        print('  %-24s %dx  %s -> %s'
              % (os.path.basename(ruta), veces, viejo[:46], nuevo[:46]))

    if SOLO_VERIFICAR:
        return 1

    for ruta in (CSV, JS):
        original = leer(ruta)
        if textos[ruta] == original:
            continue
        with open(ruta, 'w', encoding='utf-8', newline='') as f:
            f.write(textos[ruta])
        print('Escrito ' + os.path.basename(ruta))
    return 0


if __name__ == '__main__':
    sys.exit(main())
