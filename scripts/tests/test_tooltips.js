// Los tips de los marcadores en modo compacto cuelgan arriba y centrados, y
// .chart-scroll recorta: sin corrección, el de la fila superior queda cortado.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '../..');
const JS = fs.readFileSync(path.join(REPO, 'linea-paralela.js'), 'utf-8');
const HTML = fs.readFileSync(path.join(REPO, 'linea-paralela.html'), 'utf-8');

const fails = [];
function ok(cond, msg){ if(!cond) fails.push(msg); }

/* ── La función pura de ubicación ── */
const ctx = vm.createContext({});
/* Solo necesitamos las dos funciones de geometría, no el módulo entero. */
const trozo = JS.slice(JS.indexOf('const CSS_TIP_GAP'), JS.indexOf('function placeCssTip'));
ok(/const CSS_TIP_GAP/.test(trozo), 'no se encontró CSS_TIP_GAP en linea-paralela.js');
ok(/function cssTipPlacement/.test(trozo), 'no se encontró cssTipPlacement en linea-paralela.js');
vm.runInContext(trozo + '\nthis.cssTipPlacement = cssTipPlacement;\nthis.CSS_TIP_GAP = CSS_TIP_GAP;', ctx);
const place = ctx.cssTipPlacement;
const GAP = ctx.CSS_TIP_GAP;

const rect = (left, top, width, height)=> ({
  left, top, width, height, right: left + width, bottom: top + height,
});
/* Área visible del gráfico usada por todos los casos. */
const view = rect(0, 100, 800, 500);
const tip = { width: 180, height: 20 };
/* Marcador de 15 px, como .bar-event-pin. */
const marcador = (left, top)=> rect(left, top, 15, 15);

/* Con espacio arriba, el tip se queda arriba (comportamiento original). */
let p = place(marcador(400, 300), tip, view, GAP);
ok(p.below === false, 'con espacio arriba el tip no debería voltearse');
ok(p.shift === 0, 'con espacio a los lados no debería haber corrimiento');

/* Fila superior: no cabe arriba, así que va abajo. */
p = place(marcador(400, view.top), tip, view, GAP);
ok(p.below === true, 'el tip de la fila superior debería voltearse hacia abajo');

/* Justo en el límite: cabe arriba por 1 px, no debe voltearse. */
p = place(marcador(400, view.top + tip.height + GAP), tip, view, GAP);
ok(p.below === false, 'si el tip cabe justo arriba no debería voltearse');
p = place(marcador(400, view.top + tip.height + GAP - 1), tip, view, GAP);
ok(p.below === true, 'si falta 1 px arriba el tip debería voltearse');

/* Última fila sin espacio abajo: se queda arriba, cortar arriba no ayuda. */
p = place(marcador(400, view.bottom - 15), tip, view, GAP);
ok(p.below === false, 'sin espacio abajo el tip debe quedarse arriba');

/* Borde izquierdo: el tip se corre a la derecha lo justo para entrar. */
p = place(marcador(0, 300), tip, view, GAP);
ok(p.shift > 0, 'contra el borde izquierdo el tip debería correrse a la derecha');
const izq = (0 + 15 / 2) - tip.width / 2 + p.shift;
ok(izq >= view.left + GAP - 1, 'tras el corrimiento el tip sigue saliendo por la izquierda: ' + izq);

/* Borde derecho: se corre a la izquierda. */
p = place(marcador(view.right - 15, 300), tip, view, GAP);
ok(p.shift < 0, 'contra el borde derecho el tip debería correrse a la izquierda');
const der = (view.right - 15 + 15 / 2) + tip.width / 2 + p.shift;
ok(der <= view.right - GAP + 1, 'tras el corrimiento el tip sigue saliendo por la derecha: ' + der);

/* Esquina superior izquierda: las dos correcciones a la vez. */
p = place(marcador(0, view.top), tip, view, GAP);
ok(p.below === true && p.shift > 0, 'en la esquina superior izquierda deberían aplicarse ambas correcciones');

/* ── El cableado en el JS ── */
ok(/if\(markerUsesCssTip\(m\)\)\{\s*placeCssTip\(m\);/.test(JS),
  'el handler de mouseover debería llamar a placeCssTip para los marcadores con tip CSS');
ok(/addEventListener\('focusin'/.test(JS), 'falta el listener de focusin para el tip por teclado');
ok(/addEventListener\('focusout'/.test(JS), 'falta el listener de focusout que resetea el tip');
ok(/function resetCssTip/.test(JS), 'falta resetCssTip');
ok(/resetCssTip\(m\);\s*\n\s*hideTip\(\);/.test(JS), 'mouseout debería resetear el tip antes de ocultarlo');

/* ── El CSS que aplica las correcciones ── */
ok(/transform:translateX\(calc\(-50% \+ var\(--tip-shift, 0px\)\)\)/.test(HTML),
  'el tip debería usar --tip-shift en su transform');
ok(/\.evt-marker--tip-below \.evt-marker__tip\{[^}]*bottom:auto[^}]*top:calc\(100% \+ 5px\)/.test(HTML),
  'falta la regla que baja el tip con .evt-marker--tip-below');

if(fails.length){
  console.error('FAIL scripts/tests/test_tooltips.js');
  fails.forEach(f=> console.error('  - ' + f));
  process.exit(1);
}
console.log('PASS scripts/tests/test_tooltips.js');
