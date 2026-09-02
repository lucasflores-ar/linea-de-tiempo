# -*- coding: utf-8 -*-
"""Genera curacion/jesus_vida_eventos.tsv con sucesos de la vida de Jesús."""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import repo

HEADER = [
    'fase_codigo', 'fase_titulo', 'dia_titulo', 'clave', 'fecha_anio', 'fecha_prefijo',
    'ministerio_cuando', 'hecho_id', 'nombre', 'descripcion', 'lugar_antiguo', 'lat', 'lon',
    'tipo_suceso', 'personajes', 'referencia', 'libro', 'capitulo_inicio', 'capitulo_fin',
    'etiqueta_jw',
]


def ev(fase, titulo, clave, anio, nombre, ref, dia='', **kw):
    row = {k: '' for k in HEADER}
    row.update({
        'fase_codigo': fase, 'fase_titulo': titulo, 'dia_titulo': dia,
        'clave': clave, 'fecha_anio': str(anio), 'nombre': nombre, 'referencia': ref,
    })
    for k, v in kw.items():
        if v is not None and v != '':
            row[k] = str(v)
    return row


def main():
    rows = []

    T0 = 'Antes del ministerio de Jesús'
    rows += [
        ev('J0', T0, 'juan_predicho_zacarias', -3, 'Nacimiento de Juan predicho a Zacarías', 'Luc. 1:5-25',
           lugar_antiguo='Jerusalén, templo', lat='31.78', lon='35.21', tipo_suceso='profecía',
           personajes='Zacarías, Gabriel', libro='LUCAS', capitulo_inicio='1', capitulo_fin='1',
           descripcion='Gabriel anuncia a Zacarías el nacimiento de Juan.', etiqueta_jw='Juan predicho a Zacarías'),
        ev('J0', T0, 'jesus_predicho_maria', -2, 'Nacimiento de Jesús predicho a María', 'Luc. 1:26-56',
           fecha_prefijo='c', ministerio_cuando='c. 2 a.E.C.', lugar_antiguo='Nazaret; Judea',
           lat='32.7', lon='35.3', tipo_suceso='profecía', personajes='María, Gabriel, Elisabet',
           libro='LUCAS', capitulo_inicio='1', capitulo_fin='1',
           descripcion='Gabriel anuncia a María; ella visita a Elisabet.', etiqueta_jw='Jesús predicho a María'),
        ev('J0', T0, 'nacimiento_juan_bautista', -2, 'Nace Juan el Bautizante', 'Luc. 1:57-80', hecho_id='108',
           lugar_antiguo='Colinas de Judea', lat='31.7', lon='35.2', tipo_suceso='nacimiento',
           personajes='Juan el Bautista, Zacarías, Elisabet', libro='LUCAS', capitulo_inicio='1', capitulo_fin='1',
           descripcion='Nace Juan; más tarde vive en el desierto.', etiqueta_jw='Nace Juan el Bautizante'),
        ev('J0', T0, 'nacimiento_jesus_belen', -2, 'Nace Jesús en Belén', 'Mt 1:1-25; Lu 2:1-7; Jn 1:1-14',
           ministerio_cuando='c. 1 de oct.', lugar_antiguo='Belén', lat='31.7', lon='35.2',
           tipo_suceso='nacimiento', personajes='Jesús, María, José', libro='LUCAS', capitulo_inicio='2', capitulo_fin='2',
           descripcion='La Palabra se hace carne; descendiente de Abrahán y David.', etiqueta_jw='Nace Jesús en Belén'),
        ev('J0', T0, 'pastores_belen', -2, 'Pastores visitan al bebé Jesús', 'Luc. 2:8-20',
           lugar_antiguo='Cerca de Belén', lat='31.7', lon='35.2', tipo_suceso='anuncio',
           personajes='Jesús, pastores', libro='LUCAS', capitulo_inicio='2', capitulo_fin='2',
           etiqueta_jw='Pastores en Belén'),
        ev('J0', T0, 'circuncision_presentacion', -2, 'Jesús circuncidado y presentado en el templo', 'Luc. 2:21-38',
           lugar_antiguo='Belén; Jerusalén', lat='31.78', lon='35.21', tipo_suceso='ley',
           personajes='Jesús, María, José, Simeón, Ana', libro='LUCAS', capitulo_inicio='2', capitulo_fin='2',
           etiqueta_jw='Circuncisión y presentación'),
        ev('J0', T0, 'astrologos_huida_egipto', -1, 'Astrólogos, huida a Egipto y regreso', 'Mt 2:1-23; Lu 2:39, 40',
           hecho_id='109', ministerio_cuando='1 a.E.C. ó 1 E.C.', lugar_antiguo='Jerusalén; Belén; Nazaret',
           lat='31.78', lon='35.21', tipo_suceso='viaje', personajes='Jesús, María, José', libro='MATEO',
           capitulo_inicio='2', capitulo_fin='2', etiqueta_jw='Astrólogos; huida a Egipto'),
        ev('J0', T0, 'jesus_doce_anos_templo', 12, 'Jesús de 12 años en el templo', 'Luc. 2:41-52', hecho_id='110',
           lugar_antiguo='Jerusalén', lat='31.78', lon='35.21', tipo_suceso='enseñanza',
           personajes='Jesús, María, José', libro='LUCAS', capitulo_inicio='2', capitulo_fin='2',
           etiqueta_jw='Jesús de 12 años en el templo'),
        ev('J0', T0, 'ministerio_juan_primavera_29', 29, 'Ministerio de Juan el Bautizante', 'Mt 3:1-12; Mr 1:1-8; Lu 3:1-18; Jn 1:6-28',
           ministerio_cuando='primavera', lugar_antiguo='Desierto, Jordán', lat='31.8', lon='35.5',
           tipo_suceso='ministerio', personajes='Juan el Bautista', libro='MATEO', capitulo_inicio='3', capitulo_fin='3',
           etiqueta_jw='Ministerio de Juan el Bautizante'),
    ]

    T1 = 'El principio del ministerio de Jesús'
    rows += [
        ev('J1', T1, 'bautismo_jesus', 29, 'Bautismo y unción de Jesús', 'Mt 3:13-17; Mr 1:9-11; Lu 3:21-38; Jn 1:32-34',
           hecho_id='111', ministerio_cuando='otoño', lugar_antiguo='Río Jordán', lat='31.8', lon='35.5',
           tipo_suceso='bautismo', personajes='Jesús, Juan el Bautista', libro='MATEO', capitulo_inicio='3', capitulo_fin='3',
           etiqueta_jw='Bautismo y unción de Jesús'),
        ev('J1', T1, 'tentacion_jesus', 29, 'Ayuno y tentación de Jesús', 'Mt 4:1-11; Mr 1:12, 13; Lu 4:1-13', hecho_id='112',
           ministerio_cuando='otoño', lugar_antiguo='Desierto de Judea', lat='31.7', lon='35.3', tipo_suceso='tentación',
           personajes='Jesús, Satanás', libro='MATEO', capitulo_inicio='4', capitulo_fin='4', etiqueta_jw='Tentación de Jesús'),
        ev('J1', T1, 'testimonio_juan_betania', 29, 'Testimonio de Juan acerca de Jesús', 'Jn 1:15, 29-34',
           lugar_antiguo='Betania más allá del Jordán', lat='31.85', lon='35.54', tipo_suceso='testimonio',
           personajes='Juan el Bautista, Jesús', libro='JUAN', capitulo_inicio='1', capitulo_fin='1', etiqueta_jw='Testimonio de Juan'),
        ev('J1', T1, 'juan_cordero_discipulos', 29, 'Primeros discípulos de Jesús', 'Jn 1:35-51', hecho_id='209',
           ministerio_cuando='otoño', lugar_antiguo='Valle del Alto Jordán', lat='31.85', lon='35.54', tipo_suceso='llamamiento',
           personajes='Jesús, Andrés, Pedro, Felipe, Natanael', libro='JUAN', capitulo_inicio='1', capitulo_fin='1',
           etiqueta_jw='Primeros discípulos de Jesús'),
        ev('J1', T1, 'milagro_cana', 29, 'Primer milagro en Caná; visita Capernaum', 'Jn 2:1-12', hecho_id='114',
           ministerio_cuando='otoño', lugar_antiguo='Caná de Galilea; Capernaum', lat='32.75', lon='35.33',
           tipo_suceso='milagro', personajes='Jesús, María', libro='JUAN', capitulo_inicio='2', capitulo_fin='2',
           etiqueta_jw='Primer milagro en Caná'),
        ev('J1', T1, 'limpia_templo_pascua_30', 30, 'Pascua: echa del templo a los mercaderes', 'Jn 2:13-25', hecho_id='115',
           ministerio_cuando='Pascua', lugar_antiguo='Jerusalén', lat='31.78', lon='35.21', tipo_suceso='limpieza',
           personajes='Jesús', libro='JUAN', capitulo_inicio='2', capitulo_fin='2', etiqueta_jw='Jesús limpia el templo'),
        ev('J1', T1, 'nicodemo', 30, 'Conversación de Jesús con Nicodemo', 'Jn 3:1-21', hecho_id='116',
           ministerio_cuando='Pascua', lugar_antiguo='Jerusalén', lat='31.78', lon='35.21', tipo_suceso='enseñanza',
           personajes='Jesús, Nicodemo', libro='JUAN', capitulo_inicio='3', capitulo_fin='3', etiqueta_jw='Nicodemo'),
        ev('J1', T1, 'juan_bautiza_judea', 30, 'Discípulos bautizan; Juan habrá de menguar', 'Jn 3:22-36',
           ministerio_cuando='Pascua', lugar_antiguo='Judea; Enón', lat='31.9', lon='35.4', tipo_suceso='bautismo',
           personajes='Jesús, Juan el Bautista', libro='JUAN', capitulo_inicio='3', capitulo_fin='3',
           etiqueta_jw='Bautismo en Judea'),
        ev('J1', T1, 'juan_encarcelado_galilea', 30, 'Juan apresado; Jesús parte para Galilea', 'Mt 4:12; Mr 1:14; Lu 4:14; Jn 4:1-3',
           ministerio_cuando='Pascua', lugar_antiguo='Tiberíades', lat='32.88', lon='35.53', tipo_suceso='arresto',
           personajes='Juan el Bautista, Herodes, Jesús', libro='MATEO', capitulo_inicio='4', capitulo_fin='4',
           etiqueta_jw='Juan encarcelado'),
        ev('J1', T1, 'mujer_samaritana', 30, 'Jesús enseña a los samaritanos', 'Jn 4:4-43', hecho_id='117',
           ministerio_cuando='Pascua', lugar_antiguo='Sicar, Samaria', lat='32.21', lon='35.28', tipo_suceso='enseñanza',
           personajes='Jesús, mujer samaritana', libro='JUAN', capitulo_inicio='4', capitulo_fin='4', etiqueta_jw='Mujer samaritana'),
    ]

    T2 = 'Gran ministerio de Jesús en Galilea'
    gal = [
        ('reino_cercado_galilea', 30, 'Anuncia: el reino de los cielos se ha acercado', 'Mt 4:17; Mr 1:14, 15; Lu 4:14, 15', 'Galilea', 'enseñanza', 'MATEO', '4', '4'),
        ('sana_muchacho_capernaum', 30, 'Sana a un muchacho; lee su comisión; se muda a Capernaum', 'Mt 4:13-16; Lu 4:16-31; Jn 4:46-54', 'Nazaret; Caná; Capernaum', 'milagro', 'LUCAS', '4', '4'),
        ('llama_pescadores', 30, 'Llama a Simón, Andrés, Santiago y Juan', 'Mt 4:18-22; Mr 1:16-20; Lu 5:1-11', 'Mar de Galilea', 'llamamiento', 'MATEO', '4', '4'),
        ('endemoniado_suegra_pedro', 30, 'Sana endemoniado, suegra de Pedro y muchos otros', 'Mt 8:14-17; Mr 1:21-34; Lu 4:31-41', 'Capernaum', 'milagro', 'MATEO', '8', '8'),
        ('primera_gira_galilea', 30, 'Primera gira de Galilea', 'Mt 4:23-25; Mr 1:35-39; Lu 4:42, 43', 'Galilea', 'predicación', 'MATEO', '4', '4'),
        ('leproso_sanado', 30, 'Leproso sanado', 'Mt 8:1-4; Mr 1:40-45; Lu 5:12-16', 'Galilea', 'milagro', 'MATEO', '8', '8'),
        ('paralitico_capernaum', 30, 'Sana a un paralítico', 'Mt 9:1-8; Mr 2:1-12; Lu 5:17-26', 'Capernaum', 'milagro', 'MATEO', '9', '9'),
        ('llama_mateo', 30, 'Llama a Mateo; banquete con recaudadores', 'Mt 9:9-17; Mr 2:13-22; Lu 5:27-39', 'Capernaum', 'llamamiento', 'MATEO', '9', '9'),
        ('predica_sinagogas_judea', 30, 'Predica en sinagogas de Judea', 'Luc. 4:44', 'Judea', 'predicación', 'LUCAS', '4', '4'),
        ('pascua_jerusalen_sana', 31, 'Pascua: sana a un hombre; reprende a fariseos', 'Jn 5:1-47', 'Jerusalén', 'milagro', 'JUAN', '5', '5', 'Pascua'),
        ('espigas_sabado', 31, 'Discípulos arrancan espigas en sábado', 'Mt 12:1-8; Mr 2:23-28; Lu 6:1-5', 'Camino de Jerusalén', 'enseñanza', 'MATEO', '12', '12'),
        ('sana_mano_sabado', 31, 'Sana mano en sábado; sana en la orilla del mar', 'Mt 12:9-21; Mr 3:1-12; Lu 6:6-11', 'Galilea; mar de Galilea', 'milagro', 'MATEO', '12', '12'),
        ('doce_apostoles', 31, 'Los 12 escogidos como apóstoles', 'Mr 3:13-19; Lu 6:12-16', 'Monte cerca de Capernaum', 'llamamiento', 'MARCOS', '3', '3'),
        ('sermon_monte', 31, 'El Sermón del Monte', 'Mt 5:1–7:29; Lu 6:17-49', 'Cerca de Capernaum', 'enseñanza', 'MATEO', '5', '7', '', '118'),
        ('siervo_oficial', 31, 'Sana al siervo de un oficial', 'Mt 8:5-13; Lu 7:1-10', 'Capernaum', 'milagro', 'MATEO', '8', '8'),
        ('nain_viuda', 31, 'Levanta al hijo de una viuda en Naín', 'Lu 7:11-17', 'Naín', 'milagro', 'LUCAS', '7', '7'),
        ('juan_desde_carcel', 31, 'Juan en prisión envía discípulos a Jesús', 'Mt 11:2-19; Lu 7:18-35', 'Galilea', 'enseñanza', 'MATEO', '11', '11'),
        ('ciudades_reconvenidas', 31, 'Ciudades reconvenidas; yugo suave', 'Mt 11:20-30', 'Galilea', 'enseñanza', 'MATEO', '11', '11'),
        ('pecadora_unge', 31, 'Pecadora unge los pies de Jesús', 'Lu 7:36-50', 'Galilea', 'enseñanza', 'LUCAS', '7', '7'),
        ('segunda_gira_galilea', 31, 'Segunda gira de Galilea con los 12', 'Lu 8:1-3', 'Galilea', 'predicación', 'LUCAS', '8', '8'),
        ('endemoniado_beelzebub', 31, 'Sana endemoniado; acusado de Beelzebub', 'Mt 12:22-37; Mr 3:19-30', 'Galilea', 'milagro', 'MATEO', '12', '12'),
        ('fariseos_senal', 31, 'Escribas y fariseos buscan una señal', 'Mt 12:38-45', 'Galilea', 'enseñanza', 'MATEO', '12', '12'),
        ('parientes_jesus', 31, 'Parientes cercanos de Jesús', 'Mt 12:46-50; Mr 3:31-35; Lu 8:19-21', 'Galilea', 'enseñanza', 'MATEO', '12', '12'),
        ('parabolas_sembrador', 31, 'Parábolas: sembrador, mala hierba y otras', 'Mt 13:1-53; Mr 4:1-34; Lu 8:4-18', 'Mar de Galilea', 'enseñanza', 'MATEO', '13', '13', '', '212'),
        ('calma_tempestad', 31, 'Calma tempestad al cruzar el lago', 'Mt 8:18, 23-27; Mr 4:35-41; Lu 8:22-25', 'Mar de Galilea', 'milagro', 'MATEO', '8', '8', '', '119'),
        ('gerasa_endemoniados', 31, 'Sana a dos endemoniados; cerdos', 'Mt 8:28-34; Mr 5:1-20; Lu 8:26-39', 'Gadara', 'milagro', 'MATEO', '8', '8', '', '120'),
        ('jairo_hija', 31, 'Resucita a hija de Jairo; sana a mujer con hemorragias', 'Mt 9:18-26; Mr 5:21-43; Lu 8:40-56', 'Capernaum', 'milagro', 'MATEO', '9', '9', '', '121'),
        ('dos_ciegos_mudo', 31, 'Sana a dos ciegos y a un endemoniado mudo', 'Mt 9:27-34', 'Capernaum', 'milagro', 'MATEO', '9', '9', '', '213'),
        ('rechazo_nazaret', 31, 'Rechazado de nuevo en Nazaret', 'Mt 13:54-58; Mr 6:1-6', 'Nazaret', 'rechazo', 'MATEO', '13', '13', '', '214'),
        ('tercera_gira_doce', 31, 'Tercera gira de Galilea; envía a los apóstoles', 'Mt 9:35–11:1; Mr 6:6-13; Lu 9:1-6', 'Galilea', 'predicación', 'MATEO', '9', '11', '', '215'),
        ('juan_decapitado', 31, 'Juan el Bautizante decapitado', 'Mt 14:1-12; Mr 6:14-29; Lu 9:7-9', 'Tiberíades', 'muerte', 'MATEO', '14', '14', '', '216'),
        ('alimenta_cinco_mil', 32, 'Alimenta a 5.000', 'Mt 14:13-21; Mr 6:30-44; Lu 9:10-17; Jn 6:1-13', 'NE mar de Galilea', 'milagro', 'MATEO', '14', '14', 'cerca de la Pascua', '122'),
        ('camina_sobre_mar', 32, 'Camina sobre el mar; cura en Genesaret', 'Mt 14:22-36; Mr 6:45-56; Jn 6:14-21', 'Mar de Galilea', 'milagro', 'MATEO', '14', '14', '', '123'),
        ('pan_de_vida', 32, 'Identifica el pan de la vida', 'Jn 6:22-71', 'Capernaum', 'enseñanza', 'JUAN', '6', '6', '', '217'),
        ('tradiciones_humanas', 32, 'Tradiciones que invalidan la Palabra de Dios', 'Mt 15:1-20; Mr 7:1-23; Jn 7:1', 'Capernaum', 'enseñanza', 'MATEO', '15', '15', 'después de la Pascua', '218'),
        ('sirofenicia_cuatro_mil', 32, 'Fenicia, Decápolis; alimenta a 4.000', 'Mt 15:21-38; Mr 7:24–8:9', 'Fenicia; Decápolis', 'milagro', 'MATEO', '15', '15', '', '219'),
        ('senal_jonas', 32, 'Saduceos y fariseos buscan una señal', 'Mt 15:39–16:4; Mr 8:10-12', 'Magadán', 'enseñanza', 'MATEO', '16', '16', '', '220'),
        ('levadura_fariseos', 32, 'Levadura de fariseos; sana a un ciego', 'Mt 16:5-12; Mr 8:13-26', 'Betsaida', 'milagro', 'MATEO', '16', '16', '', '221'),
        ('llaves_reino', 32, 'Jesús el Mesías; predice muerte y resurrección', 'Mt 16:13-28; Mr 8:27–9:1; Lu 9:18-27', 'Cesarea de Filipo', 'enseñanza', 'MATEO', '16', '16', '', '222'),
        ('transfiguracion', 32, 'Transfiguración', 'Mt 17:1-13; Mr 9:2-13; Lu 9:28-36', 'Monte Hermón', 'milagro', 'MATEO', '17', '17', '', '124'),
        ('muchacho_endemoniado', 32, 'Sana endemoniado que discípulos no pudieron sanar', 'Mt 17:14-20; Mr 9:14-29; Lu 9:37-43', 'Cesarea de Filipo', 'milagro', 'MATEO', '17', '17', '', '223'),
        ('predice_muerte_2', 32, 'Predice otra vez muerte y resurrección', 'Mt 17:22, 23; Mr 9:30-32; Lu 9:43-45', 'Galilea', 'profecía', 'MATEO', '17', '17', '', '224'),
        ('moneda_pez', 32, 'Moneda del pez para impuesto del templo', 'Mt 17:24-27', 'Capernaum', 'milagro', 'MATEO', '17', '17', '', '225'),
        ('mayor_en_reino', 32, 'Mayor en el Reino; parábolas de perdón', 'Mt 18:1-35; Mr 9:33-50; Lu 9:46-50', 'Capernaum', 'enseñanza', 'MATEO', '18', '18', '', '226'),
        ('dejar_todo_reino', 32, 'Sale hacia fiesta de las Cabañas', 'Mt 8:19-22; Lu 9:51-62; Jn 7:2-10', 'Galilea; Samaria', 'viaje', 'LUCAS', '9', '9', '', '227'),
    ]
    for g in gal:
        clave, anio, nom, ref, lug, tipo, libro, c1, c2 = g[:9]
        cuando = g[9] if len(g) > 9 else ''
        hid = g[10] if len(g) > 10 else ''
        kw = dict(lugar_antiguo=lug, lat='32.8', lon='35.5', tipo_suceso=tipo,
                  personajes='Jesús', libro=libro, capitulo_inicio=c1, capitulo_fin=c2,
                  etiqueta_jw=nom[:60])
        if cuando:
            kw['ministerio_cuando'] = cuando
        if hid:
            kw['hecho_id'] = hid
        rows.append(ev('J2', T2, clave, anio, nom, ref, **kw))

    # J3 Judea posterior
    T3 = 'Ministerio posterior de Jesús en Judea'
    j3 = [
        ('fiesta_tabernaculos', 32, 'Enseñanza en la fiesta de las Cabañas', 'Jn 7:11-52', 'Jerusalén', 'enseñanza', 'JUAN', '7', '7', 'fiesta de las Cabañas', '228'),
        ('luz_mundo_ciego', 32, 'Enseñanza después de la fiesta; sana a un ciego', 'Jn 8:12–9:41', 'Jerusalén', 'milagro', 'JUAN', '8', '9', '', '229'),
        ('envio_setenta', 32, 'Envía a 70 a predicar', 'Lu 10:1-24', 'Judea', 'predicación', 'LUCAS', '10', '10', '', '230'),
        ('marta_maria', 32, 'Buen samaritano; Marta y María', 'Lu 10:25-42', 'Betania', 'enseñanza', 'LUCAS', '10', '10', '', '231'),
        ('oracion_modelo', 32, 'Oración modelo; persistencia en pedir', 'Lu 11:1-13', 'Judea', 'enseñanza', 'LUCAS', '11', '11', '', '232'),
        ('demonios_dedo_dios', 32, 'Refuta acusación falsa', 'Lu 11:14-36', 'Judea', 'milagro', 'LUCAS', '11', '11', '', '233'),
        ('fariseo_hipocresia', 32, 'Denuncia a los hipócritas', 'Lu 11:37-54', 'Judea', 'enseñanza', 'LUCAS', '11', '11', '', '234'),
        ('rico_insensato', 32, 'Cuidado de Dios; mayordomo fiel', 'Lu 12:1-59', 'Judea', 'enseñanza', 'LUCAS', '12', '12', '', '235'),
        ('mujer_encorvada', 32, 'Sana a mujer inválida en sábado', 'Lu 13:1-21', 'Judea', 'milagro', 'LUCAS', '13', '13', '', '236'),
        ('pastor_excelente', 32, 'Fiesta de la Dedicación; Pastor Excelente', 'Jn 10:1-39', 'Jerusalén', 'enseñanza', 'JUAN', '10', '10', 'fiesta de la Dedicación', '237'),
    ]
    for g in j3:
        clave, anio, nom, ref, lug, tipo, libro, c1, c2 = g[:9]
        cuando = g[9] if len(g) > 9 else ''
        hid = g[10] if len(g) > 10 else ''
        kw = dict(lugar_antiguo=lug, lat='31.9', lon='35.4', tipo_suceso=tipo,
                  personajes='Jesús', libro=libro, capitulo_inicio=c1, capitulo_fin=c2, etiqueta_jw=nom[:60])
        if cuando:
            kw['ministerio_cuando'] = cuando
        if hid:
            kw['hecho_id'] = hid
        rows.append(ev('J3', T3, clave, anio, nom, ref, **kw))

    # J4 Perea
    T4 = 'Ministerio posterior al este del Jordán'
    j4 = [
        ('betania_jordan', 32, 'Muchos cifran su fe en Jesús', 'Jn 10:40-42', 'Más allá del Jordán', 'predicación', 'JUAN', '10', '10', '', '238'),
        ('ensena_perea_camino', 32, 'Enseña avanzando hacia Jerusalén', 'Lu 13:22', 'Perea', 'enseñanza', 'LUCAS', '13', '13', '', '239'),
        ('entrada_reino_herodes', 32, 'Entrada al Reino; amenaza de Herodes', 'Lu 13:23-35', 'Perea', 'enseñanza', 'LUCAS', '13', '13'),
        ('humildad_cena', 32, 'Humildad; parábola de la cena magnífica', 'Lu 14:1-24', 'Perea', 'enseñanza', 'LUCAS', '14', '14'),
        ('costo_discipulado', 32, 'Calcular el costo del discipulado', 'Lu 14:25-35', 'Perea', 'enseñanza', 'LUCAS', '14', '14'),
        ('parabolas_perea_15', 32, 'Oveja perdida, moneda, hijo pródigo', 'Lu 15:1-32', 'Perea', 'enseñanza', 'LUCAS', '15', '15', '', '240'),
        ('mayordomo_lazaro_rico', 32, 'Mayordomo injusto; hombre rico y Lázaro', 'Lu 16:1-31', 'Perea', 'enseñanza', 'LUCAS', '16', '16'),
        ('perdon_fe_esclavos', 32, 'Perdón y fe', 'Lu 17:1-10', 'Perea', 'enseñanza', 'LUCAS', '17', '17'),
        ('lazaro_resucitado', 32, 'Levanta a Lázaro de entre los muertos', 'Jn 11:1-46', 'Betania', 'milagro', 'JUAN', '11', '11', '', '125'),
        ('traman_matar_jesus', 32, 'Consejo contra Jesús; se retira', 'Jn 11:47-54', 'Jerusalén; Efraín', 'conspiración', 'JUAN', '11', '11', '', '241'),
        ('diez_leprosos', 32, 'Sana en Samaria y Galilea', 'Lu 17:11-37', 'Samaria; Galilea', 'milagro', 'LUCAS', '17', '17', '', '242'),
        ('viuda_fariseo', 32, 'Viuda insistente; fariseo y recaudador', 'Lu 18:1-14', 'Samaria o Galilea', 'enseñanza', 'LUCAS', '18', '18', '', '243'),
        ('matrimonio_ninos', 32, 'Enseña sobre divorcio; bendice niños', 'Mt 19:1-15; Mr 10:1-16; Lu 18:15-17', 'Perea', 'enseñanza', 'MATEO', '19', '19', '', '244'),
        ('hombre_rico_vina', 32, 'Joven rico; obreros en la viña', 'Mt 19:16–20:16; Mr 10:17-31; Lu 18:18-30', 'Perea', 'enseñanza', 'MATEO', '19', '20', '', '245'),
        ('predice_muerte_3', 32, 'Tercera predicción de muerte y resurrección', 'Mt 20:17-19; Mr 10:32-34; Lu 18:31-34', 'Perea', 'profecía', 'MATEO', '20', '20', '', '246'),
        ('santiago_juan_peticion', 32, 'Puestos en el Reino para Santiago y Juan', 'Mt 20:20-28; Mr 10:35-45', 'Perea', 'enseñanza', 'MATEO', '20', '20', '', '247'),
        ('zaqueo_jerico', 32, 'Ciegos en Jericó; Zaqueo; diez minas', 'Mt 20:29-34; Mr 10:46-52; Lu 18:35–19:28', 'Jericó', 'milagro', 'LUCAS', '18', '19', '', '248'),
    ]
    for g in j4:
        clave, anio, nom, ref, lug, tipo, libro, c1, c2 = g[:9]
        cuando = g[9] if len(g) > 9 else ''
        hid = g[10] if len(g) > 10 else ''
        kw = dict(lugar_antiguo=lug, lat='31.86', lon='35.44', tipo_suceso=tipo,
                  personajes='Jesús', libro=libro, capitulo_inicio=c1, capitulo_fin=c2, etiqueta_jw=nom[:60])
        if cuando:
            kw['ministerio_cuando'] = cuando
        if hid:
            kw['hecho_id'] = hid
        rows.append(ev('J4', T4, clave, anio, nom, ref, **kw))

    # B12 última semana
    TB = 'Ministerio final de Jesús en Jerusalén'
    b12 = [
        ('8 de nisán (sábado)', 'llegada_betania_8nis', 33, 'Llega a Betania seis días antes de la Pascua', 'Jn 11:55–12:1', '249'),
        ('9 de nisán', 'cena_simon_ungimiento', 33, 'Banquete en casa de Simón; María unge a Jesús', 'Mt 26:6-13; Mr 14:3-9; Jn 12:2-11', '250'),
        ('9 de nisán', 'entrada_triunfal', 33, 'Entrada triunfal en Jerusalén', 'Mt 21:1-11; Mr 11:1-11; Lu 19:29-44; Jn 12:12-19', '126'),
        ('10 de nisán', 'maldice_higuera', 33, 'Maldice higuera sin fruto; limpia el templo', 'Mt 21:18, 19, 12, 13; Mr 11:12-17; Lu 19:45, 46'),
        ('10 de nisán', 'sacerdotes_traman', 33, 'Sacerdotes traman destruir a Jesús', 'Mr 11:18, 19; Lu 19:47, 48'),
        ('10 de nisán', 'discusion_griegos', 33, 'Discusión con griegos; incredulidad', 'Jn 12:20-50', '254'),
        ('11 de nisán', 'higuera_marchita', 33, 'Hallada marchita la higuera', 'Mt 21:19-22; Mr 11:20-25'),
        ('11 de nisán', 'autoridad_templo', 33, 'Autoridad de Cristo en tela de juicio', 'Mt 21:23-32; Mr 11:27-33; Lu 20:1-8'),
        ('11 de nisán', 'cultivadores_inicuos', 33, 'Cultivadores inicuos; banquete de bodas', 'Mt 21:33–22:14; Mr 12:1-12; Lu 20:9-19'),
        ('11 de nisán', 'preguntas_capciosas', 33, 'Preguntas sobre impuesto, resurrección, mandamiento', 'Mt 22:15-40; Mr 12:13-34; Lu 20:20-40'),
        ('11 de nisán', 'mesias_descendencia', 33, 'Pregunta sobre descendencia del Mesías', 'Mt 22:41-46; Mr 12:35-37; Lu 20:41-44'),
        ('11 de nisán', 'ayes_fariseos', 33, 'Denuncia contra escribas y fariseos', 'Mt 23:1-39; Mr 12:38-40; Lu 20:45-47', '255'),
        ('11 de nisán', 'viuda_monedas', 33, 'Monedas de poco valor de la viuda', 'Mr 12:41-44; Lu 21:1-4'),
        ('11 de nisán', 'profecia_monte_olivos', 33, 'Predicción de la caída de Jerusalén', 'Mt 24:1-51; Mr 13:1-37; Lu 21:5-38', '256'),
        ('11 de nisán', 'parabolas_virgenes', 33, 'Diez vírgenes, talentos, ovejas y cabras', 'Mt 25:1-46'),
        ('12 de nisán', 'traman_matarse', 33, 'Líderes traman matar a Jesús', 'Mt 26:1-5; Mr 14:1, 2; Lu 22:1, 2', '257'),
        ('12 de nisán', 'judas_traicion', 33, 'Judas regatea para traicionar a Jesús', 'Mt 26:14-16; Mr 14:10, 11; Lu 22:3-6'),
        ('13 de nisán (jueves tarde)', 'preparativos_pascua_13nis', 33, 'Arreglos para la Pascua', 'Mt 26:17-19; Mr 14:12-16; Lu 22:7-13', '258'),
        ('14 de nisán', 'ultima_cena', 33, 'Come la Pascua con los 12', 'Mt 26:20, 21; Mr 14:17, 18; Lu 22:14-18', '127'),
        ('14 de nisán', 'lava_pies', 33, 'Jesús lava los pies de sus apóstoles', 'Jn 13:1-20', '128'),
        ('14 de nisán', 'identifica_judas', 33, 'Identifica y despide a Judas', 'Mt 26:21-25; Mr 14:18-21; Lu 22:21-23; Jn 13:21-30'),
        ('14 de nisán', 'cena_conmemorativa', 33, 'Instituye cena conmemorativa', 'Mt 26:26-29; Mr 14:22-25; Lu 22:19, 20; 1 Cor. 11:23-25'),
        ('14 de nisán', 'predice_pedro', 33, 'Predice negación de Pedro y dispersión', 'Mt 26:31-35; Mr 14:27-31; Lu 22:31-38; Jn 13:31-38'),
        ('14 de nisán', 'discurso_adios', 33, 'Discurso de despedida y oración', 'Jn 14:1–17:26'),
        ('14 de nisán', 'getsemani_arresto', 33, 'Getsemaní: agonía, traición y arresto', 'Mt 26:30, 36-56; Mr 14:26, 32-52; Lu 22:39-53; Jn 18:1-12', '129'),
        ('14 de nisán', 'sanedrin_caifas', 33, 'Interrogado por Anás y Caifás; Pedro niega', 'Mt 26:57–27:1; Mr 14:53–15:1; Lu 22:54-71; Jn 18:13-27', '259'),
        ('14 de nisán', 'judas_ahorca', 33, 'Judas el traidor se ahorca', 'Mt 27:3-10'),
        ('14 de nisán', 'pilato_herodes', 33, 'Ante Pilato, Herodes y otra vez Pilato', 'Mt 27:2, 11-14; Mr 15:1-5; Lu 23:1-12; Jn 18:28-38', '130'),
        ('14 de nisán', 'sentenciado_muerte', 33, 'Entregado para morir', 'Mt 27:15-30; Mr 15:6-19; Lu 23:13-25; Jn 18:39–19:16'),
        ('14 de nisán', 'muerte_golgota', 33, 'Muerte de Jesús en el madero', 'Mt 27:31-56; Mr 15:20-41; Lu 23:26-49; Jn 19:16-30', '131'),
        ('14 de nisán', 'sepultura_jesus', 33, 'Cuerpo enterrado', 'Mt 27:57-61; Mr 15:42-47; Lu 23:50-56; Jn 19:31-42', '260'),
        ('15 de nisán (sábado)', 'guardia_tumba', 33, 'Guardia para la tumba', 'Mt 27:62-66'),
        ('16 de nisán', 'resurreccion_jesus', 33, 'Resurrección de Jesús', 'Mt 28:1-15; Mr 16:1-8; Lu 24:1-49; Jn 20:1-25', '132'),
        ('d. 16 de nisán', 'apariciones_posteriores', 33, 'Otros aparecimientos de Jesucristo', 'Mt 28:16-20; 1 Cor. 15:5-7; Hech. 1:3-8; Jn 20:26–21:25', '', 'd'),
        ('25 de Iyar', 'ascension_jesus', 33, 'Ascensión de Jesús', 'Hech. 1:9-12; Lu 24:50-53', '', '', '25 de Iyar'),
    ]
    for item in b12:
        dia = item[0]
        clave = item[1]
        anio = item[2]
        nom = item[3]
        ref = item[4]
        hid = item[5] if len(item) > 5 else ''
        pref = item[6] if len(item) > 6 else ''
        cuando = item[7] if len(item) > 7 else dia
        kw = dict(dia_titulo=dia, lugar_antiguo='Jerusalén', lat='31.78', lon='35.21',
                  tipo_suceso='suceso', personajes='Jesús', ministerio_cuando=cuando, etiqueta_jw=nom[:60])
        if pref:
            kw['fecha_prefijo'] = pref
        if hid:
            kw['hecho_id'] = hid
        rows.append(ev('B12', TB, clave, anio, nom, ref, **kw))

    out = repo('curacion', 'jesus_vida_eventos.tsv')
    with open(out, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=HEADER, delimiter='\t', extrasaction='ignore')
        w.writeheader()
        w.writerows(rows)
    print('OK —', len(rows), 'filas ->', out)


if __name__ == '__main__':
    main()
