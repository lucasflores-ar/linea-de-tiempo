/**
 * Paso 7 — splitter protegido, fuentes documentadas, bench e índices.
 * Ejecutar: node scripts/tests/test_paso7.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '../..');

function assert(cond, msg){
  if(!cond) throw new Error('FAIL: ' + msg);
}

const splitSrc = fs.readFileSync(path.join(root, 'scripts/split_timeline_bundle.mjs'), 'utf8');
assert(splitSrc.includes('_detailDeferred'), 'splitter mira _detailDeferred');
assert(splitSrc.includes('--force'), 'splitter admite --force');

const r = spawnSync(process.execPath, [path.join(root, 'scripts/split_timeline_bundle.mjs')], {
  cwd: root, encoding: 'utf8',
});
assert(r.status === 2, 'splitter aborta sobre paquete ya dividido (exit 2)');
assert(/ABORTADO|_detailDeferred/i.test((r.stderr || '') + (r.stdout || '')), 'mensaje de aborto');

const html = fs.readFileSync(path.join(root, 'linea-paralela.html'), 'utf8');
assert(/media="print"\s+onload=/.test(html) || html.includes("onload=\"this.media='all'\""), 'fuentes no bloquean render');
assert(html.includes('Georgia'), 'fallback serif local');
assert(html.includes('Segoe UI'), 'fallback sans local');
assert(html.includes('ensureChartInteractionDelegation') === false, 'delegación está en JS no HTML');

const js = fs.readFileSync(path.join(root, 'linea-paralela.js'), 'utf8');
assert(js.includes('ensureChartInteractionDelegation'), 'delegación de marcadores');
assert(js.includes('ev._n = norm'), 'caché de búsqueda');
assert(js.includes('chartInteractionsBound'), 'bind único');

const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
assert(readme.includes('linea-paralela.html'), 'README menciona cronología paralela');
assert(/Google Fonts|fuentes/i.test(readme), 'README documenta fuentes');
assert(readme.includes('split_timeline_bundle'), 'README advierte splitter');
assert(readme.includes('run_tests.js') || readme.includes('test_paso'), 'README indica tests');

const leg = fs.readFileSync(path.join(root, 'docs/LEGIBILIDAD-TIMELINE.md'), 'utf8');
assert(/densidad|agregad/i.test(leg), 'LEGIBILIDAD cubre densidad');

assert(fs.existsSync(path.join(root, 'docs/mejora-exploracion/PASO7-PERF.json')), 'bench JSON');
assert(fs.existsSync(path.join(root, 'scripts/bench_timeline_perf.js')), 'bench script');
assert(fs.existsSync(path.join(root, 'scripts/run_tests.js')), 'run_tests');

console.log('PASS test_paso7');
