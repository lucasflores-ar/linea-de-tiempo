/**
 * Paso 4 — vista Explorar/Comparar en móvil.
 * Ejecutar: node scripts/tests/test_paso4.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');

function assert(cond, msg){
  if(!cond) throw new Error('FAIL: ' + msg);
}

const src = fs.readFileSync(path.join(root, 'linea-paralela.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'linea-paralela.html'), 'utf8');

assert(html.includes('id="vista-explorar"'), 'botón Explorar');
assert(html.includes('id="vista-comparar"'), 'botón Comparar');
assert(html.includes('id="explore-panel"'), 'panel explorar');
assert(html.includes('id="explore-main-list"'), 'lista principal');
assert(html.includes('data-vista="explorar"') || html.includes("html[data-vista=\"explorar\"]"), 'CSS explorar');
assert(html.includes('html[data-vista="explorar"] .chart-wrap'), 'oculta gráfica en explorar');

assert(src.includes('function resolveInitialVista'), 'default vista');
assert(src.includes('function refreshExplorePanel'), 'refresh explore');
assert(src.includes('function syncVistaChrome'), 'chrome vista');
assert(src.includes("VISTA_PREF_KEY = 'lt-par-vista'"), 'preferencia persistida');
assert(src.includes('isNarrowViewport'), 'breakpoint 760');
assert(src.includes("applyAppVista('explorar'"), 'toggle explorar');
assert(src.includes("applyAppVista('comparar'"), 'toggle comparar');
assert(src.includes('EXPLORE_PERIODS'), 'periodos rápidos');
assert(src.includes('safe-area-inset-bottom') || html.includes('safe-area-inset-bottom'), 'safe area');

/* Default móvil: sin preferencia ni hash → explorar */
assert(src.includes("if(isNarrowViewport()) return 'explorar'"), 'default móvil explorar');

console.log('PASS test_paso4');
