/**
 * Paso 6 — fechas centralizadas, año 0, estimado, fichas/QA.
 * Ejecutar: node scripts/tests/test_paso6.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../..');

function assert(cond, msg){
  if(!cond) throw new Error('FAIL: ' + msg);
}

const sandbox = { window: {}, console, Number, String, Object, Array, Map, Set, Math };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root, 'timeline-dates.js'), 'utf8'), sandbox);
const LTDates = sandbox.LTDates;
assert(LTDates, 'LTDates');

assert(LTDates.fmtYear(0) === '—', 'año 0 → —');
assert(LTDates.fmtYear(0).indexOf('0') === -1 || LTDates.fmtYear(0) === '—', 'no muestra 0 literal');
assert(LTDates.shouldSkipAxisTick(0), 'eje salta año 0');
assert(LTDates.fmtYear(-607) === '607 a.E.C.', 'a.E.C.');
assert(LTDates.fmtYear(33) === '33 E.C.', 'E.C.');
assert(LTDates.fmtYear(33.05).includes('nisán'), 'fracción nisán');
assert(LTDates.fmtRange(-1, 1) === '1 a.E.C. – 1 E.C.', 'cruce a.E.C./E.C.');
assert(LTDates.fmtRange(0, 1) === '1 E.C.', 'rango con 0 omite el cero');

const est = LTDates.fmtEventDateLine({ fa: 56, fest: true });
assert(est.includes('estimada'), 'fecha estimada');
assert(LTDates.eventIsEstimated({ ini_est: true }), 'ini_est');

const ticks = [];
LTDates.forEachAxisTick(-2, 2, 1, t=> ticks.push(t));
assert(ticks.some(t=> t.y === 0 && t.skipLabel), 'tick 0 sin etiqueta');
assert(ticks.filter(t=> !t.skipLabel).every(t=> !/^\s*0\s*$/.test(t.label)), 'ninguna etiqueta es 0');

const src = fs.readFileSync(path.join(root, 'linea-paralela.js'), 'utf8');
assert(src.includes('window.LTDates'), 'paralela usa LTDates');
assert(src.includes('shouldSkipAxisTick') || src.includes('forEachAxisTick'), 'eje usa skip 0');
assert(src.includes('eventDateLine') || src.includes('fmtEventDateLine'), 'línea fecha drawer');
assert(src.includes('FONT_SCALE_OPTIONS = [1, 1.2, 1.4, 2]'), 'escala 200%');

const html = fs.readFileSync(path.join(root, 'linea-paralela.html'), 'utf8');
assert(html.includes('timeline-dates.js'), 'script dates');
assert(html.includes('id="d-qa"') || html.includes('<details class="qa"'), 'QA colapsable');
assert(html.includes('value="2"'), 'opción 200%');
assert(html.includes('data-font-scale'), 'CSS 200%');

const fichas = fs.readFileSync(path.join(root, 'fichas.html'), 'utf8');
assert(fichas.includes('timeline-dates.js'), 'fichas carga dates');
assert(fichas.includes('role="dialog"'), 'fichas dialog');
assert(fichas.includes('aria-modal'), 'fichas modal');
assert(fichas.includes('fichas de personajes'), 'conteo fichas explícito');
assert(fichas.includes('no de sucesos de la cronología'), 'no mezclar conteos');
assert(fichas.includes('timelineHrefForQuery') || fichas.includes('vista=explorar'), 'enlace a cronología');
assert(fichas.includes('setDrawerOpen') || fichas.includes('aria-hidden'), 'estado drawer a11y');

console.log('PASS test_paso6');
console.log('0→', LTDates.fmtYear(0), '| -607→', LTDates.fmtYear(-607), '| 33.05→', LTDates.fmtYear(33.05));
