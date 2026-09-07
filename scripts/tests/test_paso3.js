/**
 * Paso 3 — explorador de lista y pila de navegación.
 * Ejecutar: node scripts/tests/test_paso3.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../..');

function assert(cond, msg){
  if(!cond) throw new Error('FAIL: ' + msg);
}

const sandbox = {
  window: {},
  console,
  encodeURIComponent,
  decodeURIComponent,
  Number, String, Object, Array, Map, Set, Math,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root, 'timeline-list.js'), 'utf8'), sandbox);
const LTList = sandbox.LTList;
assert(LTList, 'LTList');

const stack = LTList.createNavStack();
stack.push({ type: 'list' });
stack.push({ type: 'event', evId: 1 });
assert(stack.size() === 2, 'stack size');
assert(stack.pop().evId === 1, 'pop event');
assert(stack.peek().type === 'list', 'peek list');

const events = [
  { id: 1, n: 'Uno', ref: 'Mt 1' },
  { id: 1, n: 'Uno dup' },
  { id: 2, n: 'Dos', d: 'texto' },
  { id: 3, n: 'Tres', lug: 'Jerusalén' },
];
const deduped = LTList.dedupeById(events);
assert(deduped.length === 3, 'dedupe');
assert(LTList.filterEvents(deduped, 'jeru').length === 1, 'filter lug');
assert(LTList.filterEvents(deduped, 'xyz').length === 0, 'filter empty');

const rootEl = {
  innerHTML: '',
  scrollTop: 0,
  querySelector(){ return null; },
  querySelectorAll(){ return []; },
};
const painted = LTList.renderExplorer(rootEl, {
  events: deduped,
  query: '',
  fmtYear: y => String(y),
  esc: s => String(s),
});
assert(painted.total === 3 && painted.count === 3, 'render count');
assert(rootEl.innerHTML.includes('tl-list__ul'), 'list markup');
assert(rootEl.innerHTML.includes('data-action="chart"'), 'ver en línea');
assert(rootEl.innerHTML.includes('data-action="open"'), 'abrir detalle');

const emptyPaint = LTList.renderExplorer(rootEl, {
  events: deduped,
  query: 'zzzz',
  esc: s => String(s),
});
assert(emptyPaint.count === 0, 'empty count');
assert(rootEl.innerHTML.includes('Limpiar búsqueda') || rootEl.innerHTML.includes('clear-q'), 'clear action');

const src = fs.readFileSync(path.join(root, 'linea-paralela.js'), 'utf8');
assert(src.includes('openExplorerList'), 'openExplorerList');
assert(src.includes('popDrawerNav'), 'popDrawerNav');
assert(src.includes('showEventOnChart'), 'showEventOnChart');
assert(src.includes('keepStack'), 'keepStack');

const html = fs.readFileSync(path.join(root, 'linea-paralela.html'), 'utf8');
assert(html.includes('timeline-list.js'), 'script list');
assert(html.includes('id="d-explorer"'), 'explorer root');
assert(html.includes('id="d-back"'), 'back button');

console.log('PASS test_paso3');
console.log('dedupe:', deduped.length, '| stack ok');
