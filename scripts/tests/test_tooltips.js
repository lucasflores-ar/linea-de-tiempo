// Los tips viven en una capa flotante (#tooltip es position:fixed): antes eran
// un hijo del marcador y .lane-block{overflow:hidden} los recortaba, sin que
// ningún z-index pudiera escapar de ese recorte (R6).
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
/* Solo necesitamos la geometría, no el módulo entero. */
const trozo = JS.slice(JS.indexOf('const TIP_GAP'), JS.indexOf('/* Ancla viva del tip'));
ok(/const TIP_GAP/.test(trozo), 'no se encontró TIP_GAP en linea-paralela.js');
ok(/function anchoredTipBox/.test(trozo), 'no se encontró anchoredTipBox en linea-paralela.js');
vm.runInContext(
  trozo + '\nthis.anchoredTipBox = anchoredTipBox;\nthis.TIP_GAP = TIP_GAP;\nthis.TIP_EDGE = TIP_EDGE;',
  ctx);
const place = ctx.anchoredTipBox;
const GAP = ctx.TIP_GAP;
const EDGE = ctx.TIP_EDGE;

const rect = (left, top, width, height)=> ({
  left, top, width, height, right: left + width, bottom: top + height,
});
/* Área útil: el viewport menos el eje, como la devuelve tipViewBox(). */
const view = rect(0, 0, 800, 600);
const tip = { width: 180, height: 40 };
/* Marcador de 15 px, como .evt-marker--in-row. */
const marcador = (left, top)=> rect(left, top, 15, 15);

/* Con espacio arriba, el tip cuelga arriba y centrado en el marcador. */
let p = place(marcador(400, 300), tip, view, GAP);
ok(p.below === false, 'con espacio arriba el tip no debería voltearse');
ok(p.top === 300 - tip.height - GAP, 'el tip debería colgar justo arriba: ' + p.top);
ok(p.left === Math.round(400 + 15 / 2 - tip.width / 2),
  'el tip debería quedar centrado en el marcador: ' + p.left);

/* Primera fila: no cabe arriba, así que va abajo. Este era el defecto. */
p = place(marcador(400, view.top), tip, view, GAP);
ok(p.below === true, 'el tip de la primera fila debería voltearse hacia abajo');
ok(p.top >= view.top + EDGE, 'volteado hacia abajo no debería salir por arriba: ' + p.top);

/* Justo en el límite: cabe arriba por 1 px, no debe voltearse. */
p = place(marcador(400, view.top + tip.height + GAP + EDGE), tip, view, GAP);
ok(p.below === false, 'si el tip cabe justo arriba no debería voltearse');
p = place(marcador(400, view.top + tip.height + GAP + EDGE - 1), tip, view, GAP);
ok(p.below === true, 'si falta 1 px arriba el tip debería voltearse');

/* Última fila sin espacio abajo: se queda arriba, cortar arriba no ayuda. */
p = place(marcador(400, view.bottom - 15), tip, view, GAP);
ok(p.below === false, 'sin espacio abajo el tip debe quedarse arriba');

/* Los cuatro bordes: nunca se sale del área útil. */
for(const [x, y, donde] of [[0, 300, 'izquierda'], [view.right - 15, 300, 'derecha'],
                            [400, 0, 'arriba'], [400, view.bottom - 15, 'abajo'],
                            [0, 0, 'esquina superior izquierda'],
                            [view.right - 15, view.bottom - 15, 'esquina inferior derecha']]){
  p = place(marcador(x, y), tip, view, GAP);
  ok(p.left >= view.left + EDGE, `el tip se sale por la izquierda en ${donde}: ${p.left}`);
  ok(p.left + tip.width <= view.right - EDGE + 1,
    `el tip se sale por la derecha en ${donde}: ${p.left + tip.width}`);
  ok(p.top >= view.top + EDGE, `el tip se sale por arriba en ${donde}: ${p.top}`);
  ok(p.top + tip.height <= view.bottom - EDGE + 1,
    `el tip se sale por abajo en ${donde}: ${p.top + tip.height}`);
}

/* Un tip más ancho que el área: se acota por el borde de inicio y no queda
   en negativo. Volcar de un lado no garantiza que el opuesto entre. */
const gigante = { width: 900, height: 40 };
p = place(marcador(400, 300), gigante, view, GAP);
ok(p.left === view.left + EDGE,
  'un tip más ancho que la pantalla debería apoyarse en el borde izquierdo: ' + p.left);

/* Un tip más alto que el área tampoco se va por arriba. */
p = place(marcador(400, 300), { width: 180, height: 900 }, view, GAP);
ok(p.top === view.top + EDGE, 'un tip más alto que la pantalla debería apoyarse arriba: ' + p.top);

/* ── El cableado en el JS ── */
ok(/function tipViewBox\(\)/.test(JS), 'falta tipViewBox, que descuenta el eje');
const vista = (JS.match(/function tipViewBox\(\)\{[\s\S]*?\n\}/) || [''])[0];
ok(/axisArea/.test(vista) && /box\.bottom = Math\.min/.test(vista),
  'tipViewBox debería descontar el alto del eje para no tapar los años');

ok(/function showMarkerTip\(m\)/.test(JS), 'falta showMarkerTip, el tip unificado de marcador');
const marca = (JS.match(/function showMarkerTip\(m\)\{[\s\S]*?\n\}/) || [''])[0];
ok(/showTipHtml\([\s\S]*?null, m\)/.test(marca),
  'showMarkerTip debería anclar el tip al marcador, no seguir al ratón');

/* Hover, foco y salida usan el mismo camino: mismo contenido en los tres. */
ok(/addEventListener\('mouseover'[\s\S]{0,600}?showMarkerTip\(m\)/.test(JS),
  'mouseover debería mostrar el tip flotante del marcador');
ok(/addEventListener\('focusin'[\s\S]{0,300}?showMarkerTip\(m\)/.test(JS),
  'focusin debería mostrar el mismo tip que el hover');
ok(/addEventListener\('focusout'[\s\S]{0,300}?hideTip\(\)/.test(JS),
  'focusout debería ocultar el tip');

/* El tip anclado no se mueve con el gráfico: hay que reubicarlo. */
ok(/function repositionTip\(\)/.test(JS), 'falta repositionTip');
const repos = (JS.match(/function repositionTip\(\)\{[\s\S]*?\n\}/) || [''])[0];
ok(/isConnected/.test(repos), 'repositionTip debería soltar un ancla que ya no está en el DOM');
ok(/hideTip\(\)/.test(repos), 'repositionTip debería esconder el tip si el ancla salió de la vista');
ok(/addEventListener\('scroll'[\s\S]{0,300}?repositionTip\(\)/.test(JS),
  'el scroll del gráfico debería reubicar el tip anclado');

/* moveTip acota por los dos extremos, no solo por el derecho. */
const mueve = (JS.match(/function moveTip\(ev\)\{[\s\S]*?\n\}/) || [''])[0];
ok((mueve.match(/Math\.max\(TIP_EDGE/g) || []).length >= 2,
  'moveTip debería acotar x e y por el borde de inicio, no solo por el final');

/* Ya no debería quedar rastro del tip recortado dentro del marcador. */
ok(!/evt-marker__tip/.test(JS), 'el tip hijo del marcador debería estar eliminado del JS');
ok(!/evt-marker__tip/.test(HTML), 'el CSS del tip hijo del marcador debería estar eliminado');
ok(!/placeCssTip|cssTipPlacement|--tip-shift/.test(JS + HTML),
  'quedó código del mecanismo de tip recortado');

/* ── El CSS de la capa flotante ── */
const css = (HTML.match(/#tooltip\{[^}]*\}/) || [''])[0];
ok(/position:fixed/.test(css), '#tooltip debería ser position:fixed para escapar del recorte');
ok(/max-height/.test(css), '#tooltip debería acotar su alto');
ok(/max-width/.test(css), '#tooltip debería acotar su ancho');
ok(/#tooltip \.t-name\{[^}]*overflow-wrap:break-word/.test(HTML),
  'el título del tip debería poder ocupar varias líneas para leerse completo');

if(fails.length){
  console.error('FAIL scripts/tests/test_tooltips.js');
  fails.forEach(f=> console.error('  - ' + f));
  process.exit(1);
}
console.log('PASS scripts/tests/test_tooltips.js');
