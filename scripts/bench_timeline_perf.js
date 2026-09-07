#!/usr/bin/env node
/**
 * Benchmark de coste puro (sin DOM) para densificar, seleccionar e indexar.
 * Ejecutar: node scripts/bench_timeline_perf.mjs
 *
 * Escalas: 1× (datos reales), 5× y 10× (sucesos sintéticos clonados).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const os = require('os');

const root = path.resolve(__dirname, '..');
const DATA = JSON.parse(
  fs.readFileSync(path.join(root, 'linea-tiempo-datos.js'), 'utf8')
    .split('=')[1].trim().replace(/;$/, '')
);

function load(name){
  const sandbox = { window: {}, console, Number, String, Object, Array, Map, Set, Math };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(fs.readFileSync(path.join(root, name), 'utf8'), sandbox);
  return sandbox;
}

const dens = load('timeline-density.js').LTDensity;
const sel = load('timeline-selectors.js').LTSelectors;
const dates = load('timeline-dates.js').LTDates;

function cloneEvents(base, factor){
  if(factor === 1) return base.map(e=> ({ ...e }));
  const out = [];
  let id = 1;
  for(let f = 0; f < factor; f++){
    for(const e of base){
      out.push({
        ...e,
        id: id++,
        n: e.n + (f ? ' ·x' + f : ''),
        fa: e.fa != null ? e.fa + f * 0.0001 : e.fa,
      });
    }
  }
  return out;
}

function yearToX(y, a, b, w){
  return ((y - a) / (b - a || 1)) * w;
}

function time(label, fn, runs = 5){
  const times = [];
  for(let i = 0; i < runs; i++){
    const t0 = process.hrtime.bigint();
    fn();
    const t1 = process.hrtime.bigint();
    times.push(Number(t1 - t0) / 1e6);
  }
  times.sort((a, b)=> a - b);
  const med = times[Math.floor(times.length / 2)];
  return { label, medMs: +med.toFixed(3), minMs: +times[0].toFixed(3), maxMs: +times[times.length - 1].toFixed(3) };
}

function searchHaystack(events, q){
  const nq = String(q || '').toLowerCase();
  let n = 0;
  for(const e of events){
    const hay = (e._n || String(e.n || '').toLowerCase()) + ' ' + (e._nref || String(e.ref || '').toLowerCase());
    if(hay.includes(nq)) n++;
  }
  return n;
}

const base = DATA.eventos || [];
const report = {
  when: new Date().toISOString(),
  env: {
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    cpus: os.cpus().length,
    model: (os.cpus()[0] && os.cpus()[0].model) || '?',
    totalMemMB: Math.round(os.totalmem() / 1024 / 1024),
  },
  counts: {
    eventosBase: base.length,
    personajes: (DATA.personajes || []).length,
    detailDeferred: !!DATA._detailDeferred,
  },
  runs: [],
};

for(const factor of [1, 5, 10]){
  const events = cloneEvents(base, factor);
  for(const e of events){
    e._n = String(e.n || '').toLowerCase();
    e._nref = String(e.ref || '').toLowerCase();
  }
  const data = { eventos: events, preguntas: [] };
  const idx = sel.buildIndexes(data);
  const items = events
    .filter(e=> e.fa != null && e.fa >= 29 && e.fa <= 34)
    .map(e=> ({ id: e.id, year: e.fa, ev: e }));
  const layout = { yMin: 29, yMax: 34, chartW: 900, yearToX };

  const row = {
    factor: factor + '×',
    nEventos: events.length,
    nMinisterio: items.length,
    indexBuild: time('buildIndexes', ()=> sel.buildIndexes(data)),
    selectRange: time('selectEvents 29–34', ()=> sel.selectEvents(data, { ymin: 29, ymax: 34 })),
    densify: time('densify ministerio', ()=> dens.densifyEvents(items, layout, { minGapPx: 44, maxMembers: 50 })),
    searchDavid: time('search "david"', ()=> searchHaystack(events, 'david')),
    fmtYear: time('fmtYear×n', ()=>{
      for(const e of events) dates.fmtYear(e.fa);
    }, 3),
  };
  const densOnce = dens.densifyEvents(items, layout, { minGapPx: 44, maxMembers: 50 });
  const cov = dens.assertCoverage(items.map(i=> i.id), densOnce.nodes);
  row.densityCoverageOk = cov.ok;
  row.densityNodes = densOnce.nodes.length;
  row.indexSize = idx.byEventId.size;
  report.runs.push(row);
}

const outPath = path.join(root, 'docs/mejora-exploracion/PASO7-PERF.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

console.log('PASO7 perf bench');
console.log('env:', report.env.node, report.env.platform, report.env.cpus + ' cpu');
console.log('base eventos:', report.counts.eventosBase);
for(const r of report.runs){
  console.log(
    r.factor,
    'n=' + r.nEventos,
    '| idx', r.indexBuild.medMs + 'ms',
    '| sel', r.selectRange.medMs + 'ms',
    '| dens', r.densify.medMs + 'ms',
    '| search', r.searchDavid.medMs + 'ms',
    '| nodes', r.densityNodes,
    '| cov', r.densityCoverageOk
  );
}
console.log('wrote', outPath);
