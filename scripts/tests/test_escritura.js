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
ok(det(194).lug == null,
  'el suceso de Lucas (194) no conserva el lugar de Mateo (lug=' + JSON.stringify(det(194).lug) + ')');
ok(/t[eé]rminos m[eé]dicos/i.test(String(det(196).d || '')),
  'el perfil propio de Lucas sigue en el suceso 196');

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
