#!/usr/bin/env node
/**
 * Ejecuta la batería de tests Node del proyecto (sin npm).
 * Uso: node scripts/run_tests.js
 */
'use strict';
const { spawnSync } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const tests = [
  'scripts/tests/test_paso1.js',
  'scripts/tests/test_paso2.js',
  'scripts/tests/test_paso3.js',
  'scripts/tests/test_paso4.js',
  'scripts/tests/test_paso5.js',
  'scripts/tests/test_paso6.js',
  'scripts/tests/test_paso7.js',
  'scripts/tests/test_epocas.js',
  'scripts/tests/test_escritura.js',
  'scripts/tests/test_tooltips.js',
  'scripts/tests/test_par.js',
  'scripts/tests/test_fichas.js',
  'scripts/tests/test_vis.js',
];

let failed = 0;
for(const rel of tests){
  const r = spawnSync(process.execPath, [path.join(root, rel)], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const out = (r.stdout || '') + (r.stderr || '');
  const ok = r.status === 0 && !/ERROR:|FAIL:|test drawer ERROR/i.test(out);
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + rel);
  if(!ok){
    failed++;
    console.log(out.trim().split('\n').slice(-12).join('\n'));
  }
}
if(failed){
  console.log('\n' + failed + ' test(s) fallaron');
  process.exit(1);
}
console.log('\nTodos los tests OK (' + tests.length + ')');
