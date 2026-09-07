/**
 * Paso 5 — densidad visual: proyección, agregados y cobertura de IDs.
 * Ejecutar: node scripts/tests/test_paso5.js
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
vm.runInNewContext(fs.readFileSync(path.join(root, 'timeline-density.js'), 'utf8'), sandbox);
const LTDensity = sandbox.LTDensity;
assert(LTDensity, 'LTDensity');

/* 50 sucesos misma fecha → un agregado, cobertura completa */
const sameDay = [];
for(let i = 1; i <= 50; i++){
  sameDay.push({ id: i, year: 32, ev: { id: i, n: 'E' + i, fa: 32 } });
}
const dens50 = LTDensity.densifyEvents(sameDay, {
  yMin: 29, yMax: 34, chartW: 800,
  yearToX: (y, a, b, w)=> ((y - a) / (b - a)) * w,
}, { minGapPx: 44, maxMembers: 50 });
assert(dens50.nodes.length === 1, '50 misma fecha → 1 nodo');
assert(dens50.nodes[0].type === 'aggregate', 'es agregado');
assert(dens50.nodes[0].count === 50, 'count 50');
const cov50 = LTDensity.assertCoverage(sameDay.map(x=> x.id), dens50.nodes);
assert(cov50.ok, 'cobertura 50');

/* 0 y 1 */
assert(LTDensity.densifyEvents([], { yMin:0, yMax:10, chartW:100 }).nodes.length === 0, '0 eventos');
const one = LTDensity.densifyEvents([{ id:7, year:5, ev:{id:7,n:'Solo'} }], { yMin:0, yMax:10, chartW:100 });
assert(one.nodes.length === 1 && one.nodes[0].type === 'single', '1 single');

/* Dos fechas lejanas no se fusionan */
const far = LTDensity.densifyEvents([
  { id:1, year:10, ev:{id:1} },
  { id:2, year:90, ev:{id:2} },
], { yMin:0, yMax:100, chartW:1000 }, { minGapPx: 44, maxSpanPx: 120 });
assert(far.nodes.length === 2, 'lejanos separados');
assert(far.nodes.every(n=> n.type === 'single'), 'ambos singles');

/* Dos muy próximos se agregan */
const near = LTDensity.densifyEvents([
  { id:1, year:50, ev:{id:1,n:'A'} },
  { id:2, year:50.01, ev:{id:2,n:'B'} },
], { yMin:0, yMax:100, chartW:200 }, { minGapPx: 44, maxSpanPx: 120 });
assert(near.nodes.length === 1 && near.nodes[0].type === 'aggregate', 'próximos agregados');

/* Span máximo evita encadenar todo el carril */
const chain = [];
for(let i = 0; i < 20; i++){
  chain.push({ id: i + 1, year: i * 2, ev: { id: i + 1 } });
}
const chained = LTDensity.densifyEvents(chain, {
  yMin: 0, yMax: 40, chartW: 400,
}, { minGapPx: 30, maxSpanPx: 80, maxMembers: 8 });
assert(chained.nodes.length > 1, 'no encadena todo el carril');
assert(LTDensity.assertCoverage(chain.map(c=> c.id), chained.nodes).ok, 'cobertura cadena');

const src = fs.readFileSync(path.join(root, 'linea-paralela.js'), 'utf8');
assert(src.includes('densifyPointPeople'), 'densify en lanes');
assert(src.includes('openDensityAggregate'), 'abre explorador');
assert(src.includes('isDensityAggregate'), 'flag agregado');
assert(src.includes('densitySummary'), 'export/layout summary');
assert(src.includes('sucesos próximos'), 'etiqueta contrato');

const html = fs.readFileSync(path.join(root, 'linea-paralela.html'), 'utf8');
assert(html.includes('timeline-density.js'), 'script density');

console.log('PASS test_paso5');
console.log('50→', dens50.nodes[0].count, '| near→', near.nodes[0].type, '| chain nodes:', chained.nodes.length);
