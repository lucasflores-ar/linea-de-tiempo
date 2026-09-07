/**
 * Paso 1 — fiabilidad y controles: estados de carga, teclado en grupos, zoom label.
 * Ejecutar: node scripts/tests/test_paso1.js
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '../..');

function loadData(){
  const ctx = { window: {}, console };
  vm.runInNewContext(fs.readFileSync(path.join(root, 'linea-tiempo-datos.js'), 'utf8') + '\nthis.D=window.LT_DATA;', ctx);
  return ctx.D;
}

function assert(cond, msg){
  if(!cond) throw new Error('FAIL: ' + msg);
}

const src = fs.readFileSync(path.join(root, 'linea-paralela.js'), 'utf8');

assert(src.includes("detailStatus = D._detailDeferred ? 'idle' : 'ready'"), 'detailStatus presente');
assert(src.includes('function resetDetailLoad'), 'resetDetailLoad presente');
assert(src.includes('function resetFichasLoad'), 'resetFichasLoad presente');
assert(src.includes('detailPromise = null'), 'reintento limpia detailPromise');
assert(src.includes('relEdgeButtonHtml'), 'filas de grupo como botones');
assert(src.includes('bindRelEdgeControls'), 'teclado en relaciones/grupos');
assert(src.includes('pointerWasPan'), 'cancelar apertura tras arrastre');
assert(src.includes('Un toque abre'), 'un toque abre en táctil');
assert(src.includes("copyBtn.title = 'No se pudo copiar'"), 'clipboard no finge éxito');
assert(src.includes('pixelsPerYear'), 'zoom usa px/año real');
assert(src.includes('yearsPerPixel'), 'umbrales conservan yearsPerPixel');
assert(src.includes('personCount'), 'conteo separado de personajes');
assert(src.includes('groupCount'), 'conteo de grupos');
assert(src.includes('setAttribute(\'inert\''), 'sheet inert al cerrar');
assert(src.includes('d-retry'), 'botón reintentar en UI de error');

/* Semántica zoom: años/px * px/año ≈ 1 */
const yearsPerPixel = 4000 / 1400;
const pixelsPerYear = 1 / yearsPerPixel;
assert(Math.abs(pixelsPerYear * yearsPerPixel - 1) < 1e-9, 'inverso zoom');
assert(pixelsPerYear > 0.2 && pixelsPerYear < 1, 'px/año razonable en vista amplia');

const D = loadData();
assert(Array.isArray(D.eventos) && D.eventos.length > 100, 'datos de sucesos');

console.log('PASS test_paso1');
console.log('sucesos:', D.eventos.length, '| zoom check:', pixelsPerYear.toFixed(3), 'px/año');
