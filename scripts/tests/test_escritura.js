// Regresión: coherencia de los sucesos de redacción de libros bíblicos.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
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
ok(det(377).lug === 'Israel',
  'el suceso de Mateo registra Israel como lugar de escritura (lug=' + JSON.stringify(det(377).lug) + ')');
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

/* En un suceso de redacción `fa` es cuándo se completó el libro y `fa_fin` el
   otro extremo del período que abarca, que casi siempre es anterior. Por eso
   `fa_fin < fa` no es un error acá: es la orientación que espera `evToRow()`,
   que llama `completion` a `fa` y dibuja ahí el pin dentro de la barra.

   Lo que sí sería un error es que aparezca en una fila que no declaramos, o que
   desaparezca de una que sí. Fuera de esta lista el orden tiene que ser el
   cronológico (las cartas de Pablo, por ejemplo, usan el rango como ventana de
   incertidumbre y van de menor a mayor). */
const CON_PERIODO = [90, 103, 104, 106, 186, 188, 198, 340, 342, 344, 348, 349, 364, 367, 369];
const conFinAnterior = (datos.eventos || [])
  .filter(e => e.fa != null && e.fa_fin != null && e.fa_fin < e.fa)
  .map(e => e.id)
  .sort((a, b) => a - b);
const esperados = CON_PERIODO.slice().sort((a, b) => a - b);
ok(conFinAnterior.join(',') === esperados.join(','),
  'los sucesos con período que abarca son exactamente los declarados'
  + ' (hay: ' + conFinAnterior.join(', ') + ')');

/* Y en todos ellos `fa` tiene que ser la compleción, o sea el extremo más
   reciente: si se invirtiera, el pin marcaría el principio del período. */
for(const id of CON_PERIODO){
  const e = evt(id);
  ok(e.fa != null && e.fa_fin != null && e.fa > e.fa_fin,
    'el suceso ' + id + ' guarda la compleción en fa (fa=' + e.fa + ', fa_fin=' + e.fa_fin + ')');
}

const ezequiel = evt(106);
ok(ezequiel.fa === -591 && ezequiel.fa_fin === -613,
  'Ezequiel (106) se completó c. 591 a.E.C. y abarca desde 613'
  + ' (fa=' + ezequiel.fa + ', fa_fin=' + ezequiel.fa_fin + ')');
for(const id of [171, 172, 187]){
  ok(evt(id).fa_fin == null,
    'el suceso ' + id + ' queda puntual: su libro no tiene período que abarque');
}

/* La línea de fecha tiene que leerse del año más antiguo al más reciente,
   aunque los campos vengan al revés. */
const cajaFechas = { console, Number, String, Object, Array, Map, Set, Math };
cajaFechas.window = cajaFechas;
cajaFechas.globalThis = cajaFechas;
vm.runInNewContext(fs.readFileSync(path.join(REPO, 'timeline-dates.js'), 'utf8'), cajaFechas);
const LTDates = cajaFechas.LTDates;
ok(/^613 a\. E\. C\. – c\. 591 a\. E\. C\./.test(LTDates.fmtEventDateLine(ezequiel)),
  'la ficha de Ezequiel ordena las fechas: ' + JSON.stringify(LTDates.fmtEventDateLine(ezequiel)));

/* Datos aportados para libros que los tenían mal o incompletos. */
ok(det(171).lug == null || det(171).lug === '',
  'Abdías (171) no declara lugar de escritura: «Edom» era el destinatario'
  + ' (lug=' + JSON.stringify(det(171).lug) + ')');
ok(!/Esdras completa/.test(String(det(368).d || '')),
  'Ageo (368) ya no arrastra la descripción de Esdras');
ok(/Jag·g[aá]i|profetas menores/.test(String(det(368).d || '')),
  'Ageo (368) tiene su propia descripción');
ok(String(det(367).d || '') !== String(evt(367).n || '')
  && /Zekjar·y[aá]h|templo/.test(String(det(367).d || '')),
  'Zacarías (367) tiene descripción propia y no la repetición de su título');

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
