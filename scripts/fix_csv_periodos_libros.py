# -*- coding: utf-8 -*-
"""Dibuja los libros bíblicos con el período que abarcan y carga los datos
que faltaban de Abdías, Amós, Nahúm, Mateo, Lucas, Ageo y Zacarías.

De cada libro hay dos fechas distintas: **cuándo se completó** y el **período
que abarca**. La regla acordada es que el período es la barra y la compleción
es un punto dentro de ella; cuando la compleción cae fuera del período, va como
suceso aparte (eso último no lo hace este script: quedan listados en
`docs/REVISION-PERIODOS-LIBROS.md` a la espera de nombre).

Orientación de los campos, que es lo que el render ya espera:

  fecha_anio / fecha_texto          -> cuándo se completó (ancla del suceso)
  fecha_fin  / fecha_fin_texto      -> el otro extremo del período que abarca

`evToRow()` de `linea-paralela.js` llama `completion` a `fa` y dibuja ahí el
`.bar-libro-pin`, y la barra la traza entre el mínimo y el máximo de ambos. Por
eso `fecha_fin` suele ser **anterior** a `fecha_anio` en estas filas: no es un
rango invertido, es «se completó en X y abarca desde Y». `libros_biblia_data.py`
ya usa esa misma orientación (`anio` = compleción, `anio_fin` = otro extremo).

Las fechas salen de la tabla de los libros de la Biblia
(`docs/LIBROS-ESCRITURA-REFERENCIA.md`). Los lugares y las descripciones de
Mateo, Lucas, Ageo y Zacarías los aportó el usuario.

Uso:
    python scripts/fix_csv_periodos_libros.py --check   # no escribe
    python scripts/fix_csv_periodos_libros.py
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


DESC_MATEO = (
    'Escrito principalmente para los judíos, como muestran su genealogía desde '
    'Abrahán y sus numerosas referencias a las Escrituras Hebreas. Se calcula que '
    'contiene alrededor de un centenar de referencias a las Escrituras Hebreas, '
    'unas 40 de ellas citas directas.'
    '\n\n'
    'Hay pruebas de que originalmente Mateo escribió su Evangelio en hebreo tan '
    'solo ocho años después de la muerte de Jesús. Es posible que él mismo lo '
    'tradujera al griego.'
    '\n\n'
    'Mateo había sido cobrador de impuestos; quizá por eso habló de manera '
    'específica sobre unidades monetarias y cifras (17:27; 26:15; 27:3). Solo '
    'Mateo menciona que Jesús señaló vez tras vez la importancia de mostrar '
    'compasión además de hacer sacrificios (9:9-13; 12:7; 18:21-35).'
    '\n\n'
    'Mateo usa el término Reino más de 50 veces. En los primeros 18 capítulos '
    'destaca el tema del Reino, y por eso no narra todos los acontecimientos en '
    'orden cronológico; los hechos de los últimos 10 capítulos (del 19 al 28) en '
    'su mayor parte sí están ordenados cronológicamente.'
    '\n\n'
    'Es el primero y uno de los evangelios sinópticos. Más del 40 % de su '
    'contenido —alrededor del 42 %— no se encuentra en ningún otro Evangelio. '
    'Esto incluye por lo menos 10 parábolas: la mala hierba entre el trigo '
    '(13:24-30), el tesoro escondido (13:44), la perla muy valiosa (13:45, 46), '
    'la red de pesca (13:47-50), el esclavo que no quiso perdonar (18:23-35), los '
    'trabajadores y el denario (20:1-16), el padre y sus dos hijos (21:28-32), la '
    'boda del hijo del rey (22:1-14), las 10 vírgenes (25:1-13) y los talentos '
    '(25:14-30).'
)

DESC_LUCAS = (
    'Alrededor del 60 % del contenido del Evangelio de Lucas no aparece en Mateo, '
    'Marcos ni Juan; es el más largo de los cuatro. Esto incluye por lo menos seis '
    'milagros específicos (Lu 5:1-6; 7:11-15; 13:11-13; 14:1-4; 17:12-14; 22:50, '
    '51) y también muchas comparaciones, como las que se encuentran en Lu '
    '10:30-35; 15:11-32 y 16:19-31.'
    '\n\n'
    'Parece que el Evangelio de Lucas se escribió después del de Mateo pero antes '
    'del de Marcos. Es probable que Lucas lo escribiera después de volver con '
    'Pablo de Filipos, al final del tercer viaje misionero de Pablo. Quizá compiló '
    'su relato durante los dos años que el apóstol estuvo preso en Cesarea, antes '
    'de que lo llevaran a Roma por su apelación a César.'
    '\n\n'
    'Todo indica que Mateo, Marcos y Lucas escribieron sus Evangelios pensando en '
    'públicos diferentes. Parece que Mateo escribió especialmente para los judíos, '
    'Marcos para los no judíos —sobre todo para los romanos— y Lucas para todo '
    'tipo de personas.'
    '\n\n'
    'Lucas, que era médico, suministra detalles adicionales del estado físico de '
    'algunos enfermos (Lu 4:38; 5:12; Col 4:14). Emplea más de 300 términos '
    'médicos o con significado médico, y utiliza un vocabulario más amplio que el '
    'de los otros tres escritores de los Evangelios juntos, lo que dice mucho de '
    'su nivel educativo.'
    '\n\n'
    'Aunque no se menciona a Lucas por nombre en ninguna parte de su relato, el '
    'Fragmento de Muratori (finales del siglo segundo de nuestra era) se lo '
    'atribuye a él. Además, escritores del siglo segundo, como Clemente de '
    'Alejandría e Ireneo, lo reconocen como el escritor.'
    '\n\n'
    'En vista de que Lucas no era uno de los Doce y probablemente ni siquiera '
    'llegó a ser creyente hasta después de la muerte de Jesús, no fue testigo '
    'ocular de todos los sucesos que menciona. Pero, como acompañó a Pablo a '
    'Jerusalén al final del tercer viaje misionero del apóstol (Hch 21:15-17), '
    'estaba en condiciones de investigar con exactitud todo lo relacionado con '
    'Jesucristo en la misma zona en la que el Hijo de Dios llevó a cabo sus '
    'actividades. Tuvo la oportunidad de entrevistar en persona a muchos testigos '
    'oculares de la vida de Jesús, como los discípulos que aún estaban vivos y '
    'quizá la madre de Jesús, María. Además, puede que consultara el Evangelio de '
    'Mateo.'
)

DESC_AGEO = (
    'Ageo es el décimo de los llamados profetas menores y el primero de los tres '
    'que sirvieron después de que los judíos regresaran del destierro en 537 a. E. C.; '
    'los otros dos fueron Zacarías y Malaquías. Su nombre (hebreo: Jag·gái) '
    'significa «[Nacido en una] Fiesta», lo que quizá indique que nació en un día '
    'festivo.'
    '\n\n'
    'Es razonable concluir, en conformidad con la tradición judía, que Ageo nació '
    'en Babilonia y volvió a Jerusalén con Zorobabel y el sumo sacerdote Josué. '
    'Sirvió lado a lado con el profeta Zacarías, y en Esdras 5:1 y 6:14 se indica '
    'que los dos animaron a los hijos del destierro a reanudar la construcción del '
    'templo. Fue profeta de Jehová en dos sentidos: exhortó a los judíos a cumplir '
    'sus deberes para con Dios y predijo, entre otras cosas, que Dios mecería a '
    'todas las naciones (Ageo 2:6, 7).'
    '\n\n'
    'En 537 a. E. C. Ciro había emitido el decreto que permitía a los judíos '
    'regresar a su país para reconstruir la casa de Jehová, pero en 520 a. E. C. '
    'el templo estaba lejos de estar completo. Durante todos aquellos años los '
    'judíos habían permitido que la oposición de los enemigos, además de su propia '
    'apatía y materialismo, les impidieran realizar el propósito mismo por el que '
    'habían regresado (Esd. 1:1-4; 3:10-13; 4:1-24; Ageo 1:4).'
    '\n\n'
    'Tan pronto como se pusieron los cimientos del templo, en 536 a. E. C., «la '
    'gente de la tierra estuvo continuamente debilitando las manos del pueblo de '
    'Judá y desanimándolos de edificar» (Esd. 4:4, 5). En 522 a. E. C. aquellos '
    'opositores lograron que se proclamara una prohibición oficial de la obra. Fue '
    'en el segundo año del rey persa Darío Histaspes, es decir, en 520 a. E. C., '
    'cuando Ageo empezó a profetizar y animó a los judíos a reanudar la '
    'construcción. Los gobernadores vecinos enviaron a Darío una carta pidiendo un '
    'fallo, y Darío restableció el decreto de Ciro a favor de los judíos.'
    '\n\n'
    'El libro abarca 112 días del año 520 a. E. C.'
)

DESC_ZACARIAS = (
    'Cuando Zacarías empezó a profetizar, la construcción del templo de Jehová en '
    'Jerusalén estaba paralizada. A Salomón le había tomado siete años y medio '
    'construir el templo original (1 Rey. 6:37, 38), pero ya habían pasado 17 años '
    'desde que los judíos repatriados volvieron a Jerusalén y el nuevo templo '
    'seguía lejos de terminarse. La obra se había detenido por completo tras la '
    'prohibición que impuso Artajerjes. Jehová utilizó a Ageo y a Zacarías para '
    'incitar al pueblo a reanudarla y continuar hasta terminarla (Esd. 4:23, 24; '
    '5:1, 2).'
    '\n\n'
    'La tarea parecía una montaña (Zac. 4:6, 7). Ellos eran pocos y los '
    'opositores, muchos; aunque los judíos tenían un príncipe de la línea davídica, '
    'Zorobabel, no tenían rey y estaban bajo dominación extranjera. Se utilizó a '
    'Zacarías para hacerles percibir los propósitos de Dios para aquel momento y '
    'otros futuros más grandiosos, algo que los fortalecería para la obra que '
    'tenían por delante (8:9, 13). No era tiempo de ser como sus antepasados, que '
    'no habían mostrado aprecio (1:5, 6).'
    '\n\n'
    'En la Biblia se menciona a unas 30 personas con el nombre de Zacarías. Del '
    'escritor de este libro se dice que era «Zacarías hijo de Berekías hijo de Idó '
    'el profeta» (Zac. 1:1; Esd. 5:1; Neh. 12:12, 16). Su nombre (hebreo: '
    'Zekjar·yáh) significa «Jehová Ha Recordado», y el libro muestra que «Jehová de '
    'los ejércitos» recuerda a Su pueblo para tratar bien con él por causa de Su '
    'propio nombre (Zac. 1:3).'
    '\n\n'
    'Fue en el «octavo mes del segundo año de Darío» (octubre-noviembre de 520 '
    'a. E. C.) cuando se reanudó la construcción del templo y Zacarías empezó a '
    'profetizar (1:1). El libro también hace referencia al «día cuatro del mes '
    'noveno, es decir, en Kislev», del «cuarto año de Darío» (alrededor del 1 de '
    'diciembre de 518 a. E. C.) (7:1). Por lo tanto, la profecía de Zacarías se '
    'pronunció y se puso por escrito durante los años 520-518 a. E. C. (Esd. 4:24).'
)


# Estado final buscado, declarado entero para que el script converja desde
# cualquier punto y sea idempotente.
ESPERADO = {
    # --- Período que abarca: la barra va del otro extremo a la compleción ---
    '90':  {'fecha_fin': '-493',  'fecha_fin_texto': '493 a. E. C.'},        # Ester 493–c. 475
    '103': {'fecha_fin': '-618',  'fecha_fin_texto': '618 a. E. C.'},        # Daniel 618–c. 536
    '104': {'fecha_fin': '-778',  'fecha_fin_texto': 'c. 778 a. E. C.'},     # Isaías c. 778–d. 732
    '106': {'fecha_anio': '-591', 'fecha_texto': 'c. 591 a. E. C.',          # Ezequiel 613–c. 591
            'fecha_fin': '-613',  'fecha_fin_texto': '613 a. E. C.'},
    '186': {'fecha_fin': '-777',  'fecha_fin_texto': 'c. 777 a. E. C.'},     # Miqueas c. 777–717
    '188': {'fecha_fin': '-804',  'fecha_fin_texto': 'a. 804 a. E. C.'},     # Oseas a. 804–d. 745
    '198': {'fecha_fin': '33',    'fecha_fin_texto': '33 e. c.'},            # Hechos 33–c. 61
    '340': {'fecha_fin': '-1657', 'fecha_fin_texto': '1657 a. E. C.'},       # Éxodo 1657–1512
    '342': {'fecha_fin': '-1512', 'fecha_fin_texto': '1512 a. E. C.'},       # Números 1512–1473
    '344': {'fecha_fin': '-1473', 'fecha_fin_texto': '1473 a. E. C.'},       # Josué 1473–c. 1450
    '348': {'fecha_fin': '-1180', 'fecha_fin_texto': 'c. 1180 a. E. C.'},    # 1 Samuel c. 1180–1078
    '349': {'fecha_fin': '-1077', 'fecha_fin_texto': '1077 a. E. C.'},       # 2 Samuel 1077–c. 1040
    '364': {'fecha_fin': '-1040', 'fecha_fin_texto': 'c. 1040 a. E. C.'},    # Reyes c. 1040–580
    '367': {'fecha_fin': '-520',  'fecha_fin_texto': '520 a. E. C.',         # Zacarías 520–518
            'descripcion': DESC_ZACARIAS},
    '369': {'fecha_fin': '-456',  'fecha_fin_texto': '456 a. E. C.'},        # Nehemías 456–d. 443

    # --- Datos aportados por el usuario ---
    # Abdías: la tabla no da lugar de escritura. «Edom» es el destinatario de la
    # profecía, no dónde escribió Abdías, y `libros_biblia_data.py` lo tiene vacío.
    '171': {'lugar_antiguo': ''},
    # Ageo tenía la descripción de Esdras.
    '368': {'descripcion': DESC_AGEO},
    # Mateo: «Dónde se escribió: Israel» (el CSV decía «Palestina»).
    '377': {'lugar_antiguo': 'Israel', 'descripcion': DESC_MATEO},
    # Las dos filas gemelas de Lucas comparten perfil.
    '194': {'descripcion': DESC_LUCAS},
    '196': {'descripcion': DESC_LUCAS},
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


def resumir(valor):
    v = (valor or '').replace('\n', ' / ')
    return v if len(v) <= 60 else v[:57] + '...'


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
    for fid, celdas in ESPERADO.items():
        for col, valor in celdas.items():
            if col not in campos:
                print('ABORTADO: no existe la columna ' + col)
                return 2
            if (por_id[fid][col] or '') != valor:
                cambios.append((fid, col, valor))

    if not cambios:
        print('Sin cambios: los libros ya tienen su periodo y sus datos.')
        return 0

    print(('PENDIENTE' if SOLO_VERIFICAR else 'APLICADO') + ' - '
          + str(len(cambios)) + ' celda(s):')
    for fid, col, valor in cambios:
        print('  fila %-5s %-18s %-62s -> %s'
              % (fid, col, repr(resumir(por_id[fid][col])), repr(resumir(valor))))

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
