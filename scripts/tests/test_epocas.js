// Regresión: los temas de época deben corresponder a la era del suceso, para que
// ningún suceso se dibuje en un carril al que no pertenece.
'use strict';
const fs = require('fs');
const path = require('path');
const audit = require('../audit_event_themes.js');

const REPO = path.resolve(__dirname, '../..');
let fails = 0;
function ok(cond, msg){
  console.log((cond ? 'ok  ' : 'ERROR: ') + msg);
  if(!cond) fails++;
}

const data = audit.loadData();
const scopes = audit.loadLaneScopes();

/* --- Invariantes de datos --- */
const leaks = audit.findLaneLeaks(data, scopes);
ok(leaks.length === 0,
  'ningún suceso de la era común cae en un carril del AT' +
  (leaks.length ? ' (fugas: ' + leaks.map(x => x.ev.id + '→' + x.lanes.join('/')).join(', ') + ')' : ''));

const ecAt = audit.findEcWithAtThemes(data);
ok(ecAt.length === 0,
  'ningún suceso de la era común lleva temas del AT' +
  (ecAt.length ? ' (ids: ' + ecAt.map(e => e.id).join(', ') + ')' : ''));

const atNt = audit.findAtWithNtThemes(data);
ok(atNt.length === 0,
  'ningún suceso del AT lleva temas del siglo I' +
  (atNt.length ? ' (ids: ' + atNt.map(e => e.id).join(', ') + ')' : ''));

const orphans = audit.findOrphans(data, scopes);
ok(orphans.length === 0,
  'ningún suceso de la era común queda fuera de todos los carriles' +
  (orphans.length ? ' (ids: ' + orphans.map(e => e.id).join(', ') + ')' : ''));

/* --- Casos concretos reportados --- */
const byId = id => data.eventos.find(e => e.id === id);
const temas = id => (byId(id).t || []).join(',');

ok(temas(209) === 'SIGLO-PRIMERO',
  '"Primeros discípulos de Jesús" (29 E.C.) pertenece al siglo I, no a Profetas — temas: ' + temas(209));
ok(temas(140) === 'SIGLO-PRIMERO',
  '"Fin de las 70 semanas / Cornelio" (36 E.C.) pertenece al siglo I, no a Profetas — temas: ' + temas(140));
ok(/NT-EVANGELIOS/.test(temas(377)) && /NT-EVANGELIOS/.test(temas(379)),
  'la redacción de los Evangelios de Mateo y Marcos está en el carril Evangelios');
ok(!/HECHOS/.test(temas(47)),
  '"Samuel unge a Saúl" (1117 a.E.C.) no lleva el tema del libro de Hechos que lo cita');

/* Los sucesos del nacimiento están fechados en 3-1 a.E.C. pero son del siglo I. */
const natividad = [108, 109, 384, 385, 386, 387, 388];
ok(natividad.every(id => /SIGLO-PRIMERO/.test(temas(id))),
  'los sucesos de la natividad (3-1 a.E.C., era E.C.) siguen en el siglo I');

/* --- La ventana del carril Profetas no debe alcanzar la era común --- */
ok(scopes.years.pro.max < 0,
  'la ventana del carril Profetas termina antes de la era común (max=' + scopes.years.pro.max + ')');

const proEvents = data.eventos.filter(e => (e.t || []).includes('PROFETAS') && e.fa != null);
const proFuera = proEvents.filter(e => e.fa > scopes.years.pro.max);
ok(proFuera.length === 0,
  'ningún suceso con tema PROFETAS queda fuera de la ventana del carril' +
  (proFuera.length ? ' (ids: ' + proFuera.map(e => e.id).join(', ') + ')' : ''));

/* --- La causa raíz sigue cubierta en el generador --- */
const gen = fs.readFileSync(path.join(REPO, 'scripts/gen_timeline.py'), 'utf8');
ok(/def menciona_persona/.test(gen),
  'gen_timeline.py compara nombres de profetas por palabra completa (evita Natanael→Natán)');
ok(/li_at = '' if ec else li/.test(gen),
  'gen_timeline.py no deriva temas del AT del libro cuando la era es del siglo I');
ok(/li_nt = li if ec else ''/.test(gen),
  'gen_timeline.py no deriva temas del NT del libro cuando la era es del AT');

/* --- El parche de datos es idempotente --- */
const { spawnSync } = require('child_process');
const r = spawnSync(process.execPath, [path.join(REPO, 'scripts/fix_event_themes.js'), '--check'], {
  cwd: REPO, encoding: 'utf8',
});
ok(r.status === 0 && /Sin cambios/.test(r.stdout || ''),
  'fix_event_themes.js --check no reporta correcciones pendientes');

console.log(fails ? '\n' + fails + ' fallo(s)' : '\nTodo OK');
process.exit(fails ? 1 : 0);
