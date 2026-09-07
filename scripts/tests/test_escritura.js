// Regresión: coherencia de los sucesos de redacción de libros bíblicos.
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.resolve(__dirname, '../..');
let fails = 0;
function ok(cond, msg){
  console.log((cond ? 'ok  ' : 'ERROR: ') + msg);
  if(!cond) fails++;
}

const detalle = JSON.parse(fs.readFileSync(path.join(REPO, 'linea-tiempo-detalle.json'), 'utf8'));
const det = id => (detalle.eventosDetail || []).find(e => e.id === id) || {};

/* Los nombres y las fechas viven en el bundle, no en el detalle. */
const datos = JSON.parse(
  fs.readFileSync(path.join(REPO, 'linea-tiempo-datos.js'), 'utf8')
    .split('=').slice(1).join('=').trim().replace(/;\s*$/, '')
);
const evt = id => (datos.eventos || []).find(e => e.id === id) || {};

const HUELLA_MATEO = /genealog[ií]a desde Abrah[aá]n/;
const conPerfilMateo = (detalle.eventosDetail || [])
  .filter(e => HUELLA_MATEO.test(String(e.d || '')))
  .map(e => e.id);

ok(conPerfilMateo.length === 1 && conPerfilMateo[0] === 377,
  'el perfil del Evangelio de Mateo está solo en el suceso 377 (está en: ' + conPerfilMateo.join(', ') + ')');
ok(det(377).lug === 'Palestina',
  'el suceso de Mateo registra Palestina como lugar de escritura (lug=' + JSON.stringify(det(377).lug) + ')');
ok(!/genealog/i.test(String(det(194).d || '')),
  'el suceso de Lucas (194) ya no lleva la descripción de Mateo');
/* Antes acá se exigía lug vacío, porque al sacarle "Palestina" no quedaba nada.
   Hoy la 194 tiene su lugar propio (Cesarea, que le llega de su gemela 196), así
   que lo que hay que sostener es que no sea el de Mateo. */
ok(det(194).lug !== 'Palestina',
  'el suceso de Lucas (194) no conserva el lugar de Mateo (lug=' + JSON.stringify(det(194).lug) + ')');
ok(/t[eé]rminos m[eé]dicos/i.test(String(det(196).d || '')),
  'el perfil propio de Lucas sigue en el suceso 196');

/* Las cuatro filas "X escribe el Evangelio" tienen que tener perfil propio y no
   la repetición de su título, y cada una el perfil de su evangelio. */
const PERFIL_SERIE_A = [
  [377, /genealog[ií]a desde Abrah[aá]n/, 'Mateo'],
  [194, /t[eé]rminos m[eé]dicos/i, 'Lucas'],
  [379, /lectores romanos/i, 'Marcos'],
  [380, /informaci[oó]n suplementaria/i, 'Juan'],
];
for(const [id, huella, quien] of PERFIL_SERIE_A){
  const d = String(det(id).d || '');
  ok(huella.test(d), 'el suceso ' + id + ' lleva el perfil de ' + quien);
  ok(d !== String(evt(id).n || ''),
    'el suceso ' + id + ' no repite su título como descripción');
}

/* El rango de fechas no puede estar invertido: la 194 llegó a tener fin 41,
   que era el año de Mateo.

   Estos cuatro vienen invertidos de antes y por otro motivo: su `fecha_fin` no
   guarda el fin de la escritura sino el comienzo del período que el libro
   abarca (Ezequiel se completa c. 591 a.E.C. pero cubre desde 600). Arreglarlos
   pide decidir qué representa la barra, así que quedan anotados como excepción
   conocida para que el test siga detectando inversiones nuevas. */
const INVERSION_CONOCIDA = new Set([106, 171, 172, 187]);
const invertidos = (datos.eventos || [])
  .filter(e => e.fa != null && e.fa_fin != null && e.fa_fin < e.fa)
  .map(e => e.id);
const nuevos = invertidos.filter(id => !INVERSION_CONOCIDA.has(id));
ok(nuevos.length === 0,
  'ningún suceso nuevo tiene el rango de fechas invertido'
  + (nuevos.length ? ' — aparecieron ' + nuevos.length + ': ' + nuevos.join(', ') : ''));
ok(!invertidos.includes(194),
  'el suceso de Lucas (194) ya no arranca en 57 para terminar en 41');

/* El parche debe ser idempotente. */
const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/fix_mateo_perfil.js'), '--check'], {
  cwd: REPO, encoding: 'utf8',
});
ok(r.status === 0 && /Sin cambios/.test(r.stdout || ''),
  'fix_mateo_perfil.js --check no reporta correcciones pendientes');

/* La auditoría no debe encontrar descripciones cruzadas. */
const a = spawnSync(process.execPath, [path.join(REPO, 'scripts/audit_escritura_duplicados.js')], {
  cwd: REPO, encoding: 'utf8',
});
ok(a.status === 0 && /no corresponden al libro del t[íi]tulo ===\s*\n\s*\(ninguna\)/.test(a.stdout || ''),
  'la auditoría no encuentra descripciones cruzadas entre libros');

console.log(fails ? '\n' + fails + ' fallo(s)' : '\nTodo OK');
process.exit(fails ? 1 : 0);
