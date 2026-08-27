# -*- coding: utf-8 -*-
"""Genera personajes_biblicos.csv: vidas (inicio/fin) de personajes segun cronologia JW.
Secciones de la publicacion "Seamos valientes":
  S1 = De los dias de los patriarcas a la epoca de los jueces
  S2 = De los dias de los reyes a la reconstruccion de Jerusalen
  S3 = Del Mesias a los cristianos del primer siglo
Columna grupo = fila (row) en la linea de tiempo vis.
"""
import csv, io, sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from paths import db

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

P = [
 # ---- Seccion 1: Antes del Diluvio ----
 dict(nombre='Adán',            inicio=-4026, fin=-3096, seccion='S1', grupo='Antes del Diluvio', nota='930 años'),
 dict(nombre='Enoc',            inicio=-3404, fin=-3037, seccion='S1', grupo='Antes del Diluvio', nota='365 años'),
 dict(nombre='Noé',             inicio=-2970, fin=-2020, seccion='S1', grupo='Antes del Diluvio', nota='950 años'),
 # ---- Seccion 1: Despues del Diluvio ----
 dict(nombre='Abrahán',         inicio=-2018, fin=-1843, seccion='S1', grupo='Después del Diluvio', nota='175 años'),
 dict(nombre='Sara',            inicio=-1982, fin=-1878, seccion='S1', grupo='Después del Diluvio', nota='127 años'),
 dict(nombre='Isaac',           inicio=-1918, fin=-1738, seccion='S1', grupo='Después del Diluvio', nota='180 años'),
 dict(nombre='Rebeca',          inicio=-1885, fin=-1700, seccion='S1', grupo='Después del Diluvio', nota='aprox.'),
 dict(nombre='Jacob',           inicio=-1858, fin=-1711, seccion='S1', grupo='Después del Diluvio', nota='147 años'),
 dict(nombre='José',            inicio=-1757, fin=-1647, seccion='S1', grupo='Después del Diluvio', nota='110 años'),
 dict(nombre='Amram',           inicio=-1640, fin=-1503, seccion='S1', grupo='Después del Diluvio', nota='137 años, aprox.'),
 dict(nombre='Jokébed',         inicio=-1620, fin=-1490, seccion='S1', grupo='Después del Diluvio', nota='aprox.'),
 dict(nombre='Míriam',          inicio=-1595, fin=-1473, seccion='S1', grupo='Después del Diluvio', nota='aprox.'),
 dict(nombre='Moisés',          inicio=-1593, fin=-1473, seccion='S1', grupo='Después del Diluvio', nota='120 años'),
 dict(nombre='Aarón',           inicio=-1596, fin=-1473, seccion='S1', grupo='Después del Diluvio', nota='123 años'),
 dict(nombre='Josué',           inicio=-1557, fin=-1447, seccion='S1', grupo='Después del Diluvio', nota='110 años, aprox.'),
 dict(nombre='Caleb',           inicio=-1553, fin=-1430, seccion='S1', grupo='Después del Diluvio', nota='85 años al entrar en Canaán'),
 dict(nombre='Rahab',           inicio=-1520, fin=-1440, seccion='S1', grupo='Después del Diluvio', nota='aprox.'),
 # ---- Seccion 1: Epoca de los jueces ----
 dict(nombre='Noemí',           inicio=-1400, fin=-1320, seccion='S1', grupo='Época de los jueces', nota='aprox.'),
 dict(nombre='Rut',             inicio=-1370, fin=-1300, seccion='S1', grupo='Época de los jueces', nota='aprox.'),
 dict(nombre='Débora',          inicio=-1350, fin=-1250, seccion='S1', grupo='Época de los jueces', nota='aprox.'),
 dict(nombre='Barac',           inicio=-1350, fin=-1250, seccion='S1', grupo='Época de los jueces', nota='aprox.'),
 dict(nombre='Jael',            inicio=-1350, fin=-1250, seccion='S1', grupo='Época de los jueces', nota='aprox.'),
 dict(nombre='Gedeón',          inicio=-1300, fin=-1200, seccion='S1', grupo='Época de los jueces', nota='aprox.'),
 dict(nombre='Jefté',           inicio=-1200, fin=-1110, seccion='S1', grupo='Época de los jueces', nota='aprox.'),
 dict(nombre='Sansón',          inicio=-1150, fin=-1118, seccion='S1', grupo='Época de los jueces', nota='aprox.'),
 # ---- Seccion 2: Un solo reino ----
 dict(nombre='Samuel',          inicio=-1150, fin=-1080, seccion='S2', grupo='Un solo reino', nota='aprox.'),
 dict(nombre='Saúl',            inicio=-1117, fin=-1077, seccion='S2', grupo='Un solo reino', nota='rey 1117-1077'),
 dict(nombre='Jonatán',         inicio=-1110, fin=-1077, seccion='S2', grupo='Un solo reino', nota='hijo de Saúl'),
 dict(nombre='David',           inicio=-1107, fin=-1037, seccion='S2', grupo='Un solo reino', nota='70 años; rey 1077-1037'),
 dict(nombre='Abigaíl',         inicio=-1080, fin=-1000, seccion='S2', grupo='Un solo reino', nota='aprox.'),
 dict(nombre='Natán',           inicio=-1060, fin=-990,  seccion='S2', grupo='Un solo reino', nota='profeta, aprox.'),
 dict(nombre='Mefibóset',       inicio=-1075, fin=-1000, seccion='S2', grupo='Un solo reino', nota='hijo de Jonatán, aprox.'),
 dict(nombre='Salomón',         inicio=-1037, fin=-997,  seccion='S2', grupo='Un solo reino', nota='rey 1037-997'),
 # ---- Seccion 2: Reino dividido ----
 dict(nombre='Asá',             inicio=-977,  fin=-936,  seccion='S2', grupo='Reino dividido', nota='rey 977-936'),
 dict(nombre='Jehoiadá',        inicio=-900,  fin=-830,  seccion='S2', grupo='Reino dividido', nota='130 años, aprox.'),
 dict(nombre='Eliás',           inicio=-920,  fin=-890,  seccion='S2', grupo='Reino dividido', nota='profeta, aprox.'),
 dict(nombre='Eliseo',          inicio=-915,  fin=-850,  seccion='S2', grupo='Reino dividido', nota='profeta, aprox.'),
 dict(nombre='Ezequiás',        inicio=-757,  fin=-716,  seccion='S2', grupo='Reino dividido', nota='rey 745-716'),
 dict(nombre='Manasés',         inicio=-709,  fin=-661,  seccion='S2', grupo='Reino dividido', nota='rey 716-661'),
 dict(nombre='Josiás',          inicio=-680,  fin=-629,  seccion='S2', grupo='Reino dividido', nota='rey 659-629'),
 # ---- Seccion 2: Destierro en Babilonia ----
 dict(nombre='Daniel',          inicio=-627,  fin=-535,  seccion='S2', grupo='Destierro en Babilonia', nota='aprox.'),
 dict(nombre='Hananiás, Misael y Azariás', inicio=-627, fin=-535, seccion='S2', grupo='Destierro en Babilonia', nota='vidas fusionadas, aprox.'),
 # ---- Seccion 2: Despues del destierro ----
 dict(nombre='Ester',           inicio=-484,  fin=-450,  seccion='S2', grupo='Después del destierro', nota='reina ~478-?', ),
 dict(nombre='Esdras',          inicio=-480,  fin=-420,  seccion='S2', grupo='Después del destierro', nota='escriba, aprox.'),
 dict(nombre='Nehemíás',        inicio=-470,  fin=-410,  seccion='S2', grupo='Después del destierro', nota='gobernador 455-443'),
 # ---- Seccion 3: Siglo primero ----
 dict(nombre='Juan el Bautista',inicio=-2,    fin=32,    seccion='S3', grupo='Siglo primero', nota='6 meses mayor que Jesús'),
 dict(nombre='Jesús',           inicio=-2,    fin=33,    seccion='S3', grupo='Siglo primero', nota='2 a.E.C.-33 E.C.'),
 dict(nombre='Pedro',           inicio=-1,    fin=64,    seccion='S3', grupo='Siglo primero', nota='apóstol, m. c. 64'),
 dict(nombre='Pablo',           inicio=1,     fin=65,    seccion='S3', grupo='Siglo primero', nota='apóstol, m. c. 65'),
 dict(nombre='Esteban',         inicio=1,     fin=33,    seccion='S3', grupo='Siglo primero', nota='mártir, aprox.'),
 dict(nombre='Marcos',          inicio=5,     fin=65,    seccion='S3', grupo='Siglo primero', nota='escritor de evangelio, aprox.'),
 dict(nombre='Felipe el evangelizador', inicio=1, fin=60, seccion='S3', grupo='Siglo primero', nota='aprox.'),
 dict(nombre='Timoteo',         inicio=30,    fin=97,    seccion='S3', grupo='Siglo primero', nota='compañero de Pablo, aprox.'),
 dict(nombre='Juan el apóstol', inicio=1,     fin=100,   seccion='S3', grupo='Siglo primero', nota='m. c. 100'),
]

path = db('personajes_biblicos.csv')
with open(path, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=['id','nombre','inicio','fin','seccion','grupo','nota'], lineterminator='\n')
    w.writeheader()
    for i, r in enumerate(P, 1):
        w.writerow(dict(id=i, **r))
print('personajes:', len(P))
from collections import Counter
print(Counter(r['grupo'] for r in P))
print('guardado en', path)