# -*- coding: utf-8 -*-
"""Genera hechos nuevos para los libros biblicos que no tienen ningun suceso en
hechos_biblicos.csv, usando la fecha/era/lugar de periods.py.

Este script cubre el punto ciego de la timeline: cartas del NT, profetas menores y
libros sapienciales que el banco de preguntas referencia pero que no existen como
sucesos. Es determinista y reproducible: regenera los ids 160+ anexandolos al CSV
original (sin tocar los 159 suceso curados a mano).

Uso (se integra en run_pipeline.py, ANTES de enrich.py):
    python scripts/gen_hechos_libros.py
"""
import csv, os, sys, importlib.util, collections, unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db, SCRIPTS_DIR
from libros_biblia_data import LIBROS

HECH = db('hechos_biblicos.csv')
LIBROS_CUBIERTOS = {b['libro'] for b in LIBROS}

spec = importlib.util.spec_from_file_location('periods', os.path.join(SCRIPTS_DIR, 'periods.py'))
periods_mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(periods_mod)
PERIODS = periods_mod.PERIODS

def norm(s):
    if not s:
        return ''
    s = unicodedata.normalize('NFD', s)
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn').upper().strip()

# ---- nombres y descripciones curados por libro (redaccion/evento del libro) ----
# clave = libro canonico. valor = (nombre, tipo_suceso, personajes, descripcion)
LIBRO_META = {
    'ROMANOS': ('Pablo escribe a los Romanos', 'redacción/epístola', 'Pablo', 'Roma',
                'Carta de Pablo a los cristianos de Roma exponiendo la justicia y la fe.'),
    '1 CORINTIOS': ('Pablo escribe 1 Corintios', 'redacción/epístola', 'Pablo', 'Corinto',
                    'Primera carta de Pablo a la congregación de Corinto, corrigiendo divisiones y conducta.'),
    '2 CORINTIOS': ('Pablo escribe 2 Corintios', 'redacción/epístola', 'Pablo', 'Corinto',
                    'Segunda carta de Pablo a los corintios defendiendo su apostolado.'),
    'GÁLATAS': ('Pablo escribe a los Gálatas', 'redacción/epístola', 'Pablo', 'Galacia',
                'Carta de Pablo contra el legalismo judaizante.'),
    'EFESIOS': ('Pablo escribe a los Efesios', 'redacción/epístola', 'Pablo', 'Éfeso',
                'Carta de Pablo sobre la unidad y la armadura espiritual.'),
    'FILIPENSES': ('Pablo escribe a los Filipenses', 'redacción/epístola', 'Pablo', 'Filipos',
                   'Carta de Pablo llena de gozo escrita desde prisión.'),
    'COLOSENSES': ('Pablo escribe a los Colosenses', 'redacción/epístola', 'Pablo', 'Colosas',
                   'Carta de Pablo sobre la preeminencia de Cristo.'),
    '1 TESALONICENSES': ('Pablo escribe 1 Tesalonicenses', 'redacción/epístola', 'Pablo', 'Tesalónica',
                         'Primera carta de Pablo a los tesalonicenses sobre la venida del Señor.'),
    '2 TESALONICENSES': ('Pablo escribe 2 Tesalonicenses', 'redacción/epístola', 'Pablo', 'Tesalónica',
                         'Segunda carta de Pablo corrigiendo ideas sobre el día del Señor.'),
    '1 TIMOTEO': ('Pablo escribe 1 Timoteo', 'redacción/epístola', 'Pablo, Timoteo', 'Éfeso',
                  'Instrucciones de Pablo a Timoteo sobre organización congregacional.'),
    '2 TIMOTEO': ('Pablo escribe 2 Timoteo', 'redacción/epístola', 'Pablo, Timoteo', 'Roma',
                  'Última carta de Pablo animando a Timoteo a mantenerse fiel.'),
    'TITO': ('Pablo escribe a Tito', 'redacción/epístola', 'Pablo, Tito', 'Creta',
             'Carta de Pablo a Tito sobre nombramientos y sana enseñanza.'),
    'FILEMÓN': ('Pablo escribe a Filemón', 'redacción/epístola', 'Pablo, Filemón, Onésimo', 'Colosas',
                'Carta de Pablo intercediendo por el esclavo Onésimo.'),
    'HEBREOS': ('Carta a los Hebreos', 'redacción/epístola', 'Pablo', '',
                'Carta que muestra la superioridad del sacrificio de Cristo.'),
    'SANTIAGO': ('Carta de Santiago', 'redacción/epístola', 'Santiago', '',
                 'Carta de Santiago sobre la fe que se demuestra con obras.'),
    '1 PEDRO': ('Pedro escribe 1 Pedro', 'redacción/epístola', 'Pedro', 'Babilonia',
                'Primera carta de Pedro animando a resistir la persecución.'),
    '2 PEDRO': ('Pedro escribe 2 Pedro', 'redacción/epístola', 'Pedro', '',
                'Segunda carta de Pedro advirtiendo sobre falsos maestros.'),
    '1 JUAN': ('Juan escribe 1 Juan', 'redacción/epístola', 'Juan', 'Éfeso',
               'Primera carta de Juan sobre el amor y la verdad.'),
    '2 JUAN': ('Juan escribe 2 Juan', 'redacción/epístola', 'Juan', '',
               'Breve carta de Juan a la señora escogida.'),
    '3 JUAN': ('Juan escribe 3 Juan', 'redacción/epístola', 'Juan, Gayo', '',
               'Carta de Juan a Gayo destacando la hospitalidad.'),
    'JUDAS': ('Carta de Judas', 'redacción/epístola', 'Judas', '',
              'Carta de Judas contra los falsos maestros.'),
    'OSEAS': ('Profecía de Oseas', 'profecía', 'Oseas', '',
              'Profecía que ilustra el amor de Jehová por la infiel Israel.'),
    'JOEL': ('Profecía de Joel', 'profecía', 'Joel', '',
             'Profecía sobre el día de Jehová y el derramamiento del espíritu.'),
    'AMÓS': ('Profecía de Amós', 'profecía', 'Amós', '',
             'Profecía de Amós contra la injusticia social.'),
    'ABDÍAS': ('Profecía de Abdías', 'profecía', 'Abdías', 'Edom',
               'Profecía más breve contra Edom.'),
    'MIQUEAS': ('Profecía de Miqueas', 'profecía', 'Miqueas', '',
                'Profecía sobre el juicio y la restauración.'),
    'NAHUM': ('Profecía de Nahum', 'profecía', 'Nahum', 'Nínive',
              'Profecía de la caída de Nínive.'),
    'HABACUC': ('Profecía de Habacuc', 'profecía', 'Habacuc', '',
                'Profecía del diálogo entre Habacuc y Jehová.'),
    'SOFONÍAS': ('Profecía de Sofonías', 'profecía', 'Sofonías', '',
                 'Profecía sobre el día de Jehová.'),
    'HAGEO': ('Profecía de Hageo', 'profecía', 'Hageo, Zorobabel', 'Jerusalén',
              'Profecía animando a reconstruir el templo.'),
    'ZACARÍAS': ('Profecía de Zacarías', 'profecía', 'Zacarías', 'Jerusalén',
                 'Profecías mesiánicas sobre la restauración.'),
    'MALAQUÍAS': ('Profecía de Malaquías', 'profecía', 'Malaquías', 'Jerusalén',
                  'Última profecía del AT sobre el mensajero que prepara el camino.'),
    'LAMENTACIONES': ('Lamentaciones de Jeremías', 'profecía', 'Jeremías', 'Jerusalén',
                      'Lamentos por la destrucción de Jerusalén.'),
    'CANTAR': ('Cantar de los Cantares', 'redacción', 'Salomón', 'Jerusalén',
               'Poema sobre el amor conyugal.'),
}


def main():
    hechos = list(csv.DictReader(open(HECH, encoding='utf-8-sig')))

    libros_hechos = set()
    for h in hechos:
        lb = (h.get('libro') or '').strip()
        if lb:
            libros_hechos.add(lb)

    # libros de periods.py sin hecho (excluye catálogo canónico de 66 libros)
    libros_todos = sorted(set(p[0] for p in PERIODS))
    faltan = [b for b in libros_todos if b not in libros_hechos and b not in LIBROS_CUBIERTOS]

    # ids nuevos a partir del max actual
    max_id = max(int(h['id']) for h in hechos)

    nuevos = []
    for libro in faltan:
        blocks = [p for p in PERIODS if p[0] == libro]
        if not blocks:
            continue
        blocks.sort(key=lambda p: (p[4] is None, p[4]))
        b = blocks[len(blocks) // 2]
        (lib, ci, cf, ft, fa, era, lugar, lat, lon) = b
        meta = LIBRO_META.get(libro)
        if meta:
            nombre, tipo, pers, lugar_extra, desc = meta
            lugar_final = lugar_extra or lugar
        else:
            nombre = 'Redacción de ' + libro
            tipo = 'redacción'
            pers = ''
            lugar_final = lugar
            desc = 'Evento/redacción asociado al libro bíblico ' + libro + '.'
        max_id += 1
        nuevos.append({
            'id': str(max_id),
            'nombre': nombre,
            'descripcion': desc,
            'fecha_texto': ft,
            'fecha_anio': str(fa),
            'era': era,
            'lugar_antiguo': lugar_final,
            'lat': str(lat),
            'lon': str(lon),
            'tipo_suceso': tipo,
            'personajes': pers,
            'referencia': libro + ' ' + str(ci) + '-' + str(cf),
            'libro': libro,
            'capitulo_inicio': str(ci),
            'capitulo_fin': str(cf),
        })

    if not nuevos:
        print('No hay libros sin hecho; nada que generar.')
        return

    COLS = list(hechos[0].keys())
    with open(HECH, 'w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader()
        for h in hechos:
            w.writerow(h)
        for n in nuevos:
            w.writerow(n)

    print('libros sin hecho:', len(faltan))
    print('hechos generados:', len(nuevos))
    for n in nuevos:
        print('  %s: %s (%s)' % (n['id'], n['nombre'], n['fecha_texto']))


if __name__ == '__main__':
    main()