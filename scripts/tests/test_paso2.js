/**
 * Paso 2 — estado compartible, selectores e IDs de grupo estables.
 * Ejecutar: node scripts/tests/test_paso2.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../..');

function assert(cond, msg){
  if(!cond) throw new Error('FAIL: ' + msg);
}

function loadScript(name, sandbox){
  vm.runInNewContext(fs.readFileSync(path.join(root, name), 'utf8'), sandbox);
}

const sandbox = { window: {}, console, encodeURIComponent, decodeURIComponent, Number, String, Object, Array, Map, Set, Math };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
loadScript('timeline-state.js', sandbox);
loadScript('timeline-selectors.js', sandbox);

const LTState = sandbox.LTState;
const LTSelectors = sandbox.LTSelectors;
assert(LTState && LTSelectors, 'APIs globales');

const lanes = ['pre','jud','isr','pro','jes','sem'];

/* Serialización / parse round-trip */
const sample = {
  vista: 'explorar',
  filas: ['jes','sem'],
  q: 'bautismo',
  qscope: 'todo',
  ymin: 29,
  ymax: 33,
  ev: 120,
  grupo: null,
};
const hash = LTState.serializeShareable(sample, lanes);
assert(hash.includes('v=1'), 'versión en hash');
assert(hash.includes('vista=explorar'), 'vista');
assert(hash.includes('filas=jes,sem'), 'filas');
assert(hash.includes('q=bautismo') || hash.includes('q=' + encodeURIComponent('bautismo')), 'q');
assert(hash.includes('qscope=todo'), 'qscope');
assert(hash.includes('ymin=29') && hash.includes('ymax=33'), 'rango');
assert(hash.includes('ev=120'), 'ev');

const parsed = LTState.parseShareable(hash, lanes);
assert(parsed.vista === 'explorar', 'parse vista');
assert(parsed.filas.join(',') === 'jes,sem', 'parse filas');
assert(parsed.q === 'bautismo', 'parse q');
assert(parsed.qscope === 'todo', 'parse qscope');
assert(parsed.ymin === 29 && parsed.ymax === 33, 'parse rango');
assert(parsed.ev === 120, 'parse ev');
assert(parsed.filas !== null, 'filas explícitas');

/* Sin filas en URL → null (no pisar localStorage) */
const noFilas = LTState.parseShareable('v=1&vista=comparar&ev=10', lanes);
assert(noFilas.filas === null, 'filas ausentes = null');
assert(noFilas.ev === 10, 'ev sin filas');

/* Compat legado */
const legacy = LTState.parseShareable('filas=jud,isr&ev=77', lanes);
assert(legacy.filas.join(',') === 'jud,isr', 'legado filas');
assert(legacy.ev === 77, 'legado ev');
const legacyComma = LTState.parseShareable('jes,sem', lanes);
assert(legacyComma.filas.join(',') === 'jes,sem', 'legado coma');

/* IDs de grupo estables */
assert(LTSelectors.stableGroupId('ministerio', 32) === 'ministerio:32', 'grupo año');
assert(LTSelectors.stableGroupId('ministerio', 'antes-bautismo') === 'ministerio:antes-bautismo', 'grupo antes');
assert(LTSelectors.parseGroupId('ministerio:32').key === '32', 'parse grupo');

/* Índices y selector canónico */
const dataCtx = { window: {}, console };
vm.runInNewContext(
  fs.readFileSync(path.join(root, 'linea-tiempo-datos.js'), 'utf8') + '\nthis.D=window.LT_DATA;',
  dataCtx,
);
const D = dataCtx.D;
const idx = LTSelectors.buildIndexes(D);
assert(idx.byEventId.size === D.eventos.length || idx.byEventId.size > 100, 'índice eventos');
const sampleEv = D.eventos.find(e=> e.id != null);
assert(idx.byEventId.get(Number(sampleEv.id)) === sampleEv, 'lookup evento');

const selected = LTSelectors.selectEvents(D, {
  ymin: 29,
  ymax: 33,
  qscope: 'intervalo',
  inChipScope: ()=> true,
});
const ids = selected.map(e=> e.id);
assert(ids.length === new Set(ids).size, 'sin duplicados');
assert(selected.every(e=> {
  const y = LTSelectors.chartYearOf(e);
  const y2 = Number.isFinite(e.fa_fin) ? e.fa_fin : y;
  return LTSelectors.eventOverlapsRange(e, 29, 33);
}), 'todos en rango 29–33');

/* Fuente: IDs estables en linea-paralela */
const src = fs.readFileSync(path.join(root, 'linea-paralela.js'), 'utf8');
assert(src.includes('stableGroupRowId') || src.includes('stableGroupId'), 'IDs estables cableados');
assert(src.includes('ministerio:antes-bautismo') || src.includes("'antes-bautismo'"), 'clave antes-bautismo');
assert(src.includes('popstate'), 'Back/Forward');
assert(src.includes('getShareableState'), 'estado compartible');
assert(src.includes('selectCanonicalEvents'), 'selector canónico expuesto');
assert(src.includes('rebuildDataIndexes'), 'índices al cargar detalle');

const html = fs.readFileSync(path.join(root, 'linea-paralela.html'), 'utf8');
assert(html.includes('timeline-state.js'), 'script state en HTML');
assert(html.includes('timeline-selectors.js'), 'script selectors en HTML');

console.log('PASS test_paso2');
console.log('hash sample:', hash.slice(0, 80) + '…');
console.log('sucesos 29–33:', selected.length, '| índice:', idx.byEventId.size);
