// El alto de fila era fijo (54 px) y el contenido de una barra no: crece con la
// escala de texto, y el pin de un grupo mide el doble que el de un suceso. Con
// escala 1,2 —la que se aplica sola en pantallas táctiles— un grupo ya no
// entraba y su nombre se metía en la fila de abajo: se pisaban «5 sucesos» con
// «30 E.C.». Acá se fija que el alto salga del contenido y que las constantes
// de JS no se separen del CSS.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '../..');
const JS = fs.readFileSync(path.join(REPO, 'linea-paralela.js'), 'utf-8');
const HTML = fs.readFileSync(path.join(REPO, 'linea-paralela.html'), 'utf-8');

const fails = [];
function ok(cond, msg){ if(!cond) fails.push(msg); }

/* ── 1. Las constantes de JS reflejan el CSS ──────────────────────────────
   Son dos fuentes que tienen que decir lo mismo. Si alguien cambia el CSS y
   no el JS, la medición miente y los textos se vuelven a pisar. */
function constJS(nombre){
  const m = JS.match(new RegExp('const ' + nombre + ' = ([\\d.]+);'));
  return m ? parseFloat(m[1]) : null;
}

const esperado = [
  // [constante JS, valor que declara el CSS, de dónde sale]
  ['BAR_PAD_Y', 2, '.bar-compact-narrow padding:2px 0'],
  ['BAR_STACK_GAP', 3, '.bar-compact-narrow gap:3px'],
  ['CAP_NAME_PX', 12, '.bar-caption__name font-size'],
  ['CAP_DATES_PX', 11, '.bar-caption__dates font-size'],
  ['CAP_LINE_H', 1.15, 'line-height de los captions'],
  ['POINT_PIN_PX', 12, '.bar-point-event__pin'],
  ['GROUP_PIN_PX', 24, '.bar-point-event--group .bar-point-event__pin'],
  ['PIN_FOCUS_RING_PX', 4, 'box-shadow 0 0 0 4px al hover/foco'],
];
for(const [nom, val, de] of esperado){
  ok(constJS(nom) === val, `${nom} debería valer ${val} (${de}), vale ${constJS(nom)}`);
}

/* Y el CSS tiene que seguir diciendo eso mismo. */
ok(/\.bar-compact-narrow\{[^}]*gap:3px/.test(HTML.replace(/\s*\n\s*/g, '')),
  'el CSS de .bar-compact-narrow debería seguir con gap:3px');
ok(/\.bar-compact-narrow\{[^}]*padding:2px 0/.test(HTML.replace(/\s*\n\s*/g, '')),
  'el CSS de .bar-compact-narrow debería seguir con padding:2px 0');
ok(/font:600 calc\(12px \* var\(--tl-font-scale\)\)\/1\.15/.test(HTML),
  'el nombre del caption debería seguir en 12px/1.15 por la escala');
ok(/font:400 calc\(11px \* var\(--tl-font-scale\)\)\/1\.15/.test(HTML),
  'las fechas del caption deberían seguir en 11px/1.15 por la escala');
ok(/\.bar-point-event--group \.bar-point-event__pin\{\s*width:24px;height:24px/
   .test(HTML.replace(/\s*\n\s*/g, '')),
  'el pin de grupo debería seguir midiendo 24px');

/* ── 2. La geometría, ejecutada de verdad ─────────────────────────────── */
function slice(desde, hasta, nombre){
  const a = JS.indexOf(desde), b = JS.indexOf(hasta);
  ok(a >= 0 && b > a, 'no se encontró el bloque de ' + nombre);
  return a >= 0 && b > a ? JS.slice(a, b) : '';
}

const ctx = vm.createContext({ fontScale: 1, rowLayout: 'compact' });
vm.runInContext([
  slice('const BAR_PAD_Y', 'function applyRowLayout', 'constantes de alto'),
  slice('function trackRowHeight', 'function countTracks', 'trackRowHeight'),
  'this.peStackHeight = peStackHeight;',
  'this.trackRowHeight = trackRowHeight;',
  'this.peMiddleHeight = peMiddleHeight;',
].join('\n'), ctx);

const { peStackHeight, trackRowHeight, peMiddleHeight } = ctx;
const L = { rowH: 54 };
const suceso = { n: 'Nace Jesús en Belén' };
const grupo = { n: '5 sucesos', isEventGroup: true };

/* El pin de un grupo es el doble, así que su stack necesita más alto. */
ok(peMiddleHeight(grupo) === 24, 'el medio de un grupo debería ser el pin de 24px');
ok(peMiddleHeight(suceso) === 12, 'el medio de un suceso debería ser el pin de 12px');
ok(peStackHeight(grupo, 1) > peStackHeight(suceso, 1),
  'un grupo debería necesitar más alto que un suceso suelto');

/* Crece con la escala: es el punto del arreglo. */
ok(peStackHeight(suceso, 2) > peStackHeight(suceso, 1.4),
  'el alto necesario debería crecer con la escala de texto');
ok(peStackHeight(suceso, 1.4) > peStackHeight(suceso, 1),
  'el alto necesario debería crecer de escala 1 a 1,4');

/* En escala 1 con filas normales no cambia nada: el alto viejo alcanza y no
   queremos regalar scroll a quien no tenía el problema. */
ok(trackRowHeight(L, [suceso], 1) === 54,
  'escala 1 y un suceso suelto deberían seguir en 54px, vale ' + trackRowHeight(L, [suceso], 1));

/* Los casos que la auditoría midió como roto. */
ok(trackRowHeight(L, [grupo], 1) > 54,
  'un grupo ya no entra en 54px ni en escala 1');
ok(trackRowHeight(L, [grupo], 1.2) > trackRowHeight(L, [grupo], 1),
  'el caso táctil (escala 1,2) debería pedir más alto todavía');
ok(trackRowHeight(L, [suceso], 2) > 54,
  'en escala 200% ni un suceso suelto entra en 54px');

/* El alto de la pista lo manda su contenido más alto. */
ok(trackRowHeight(L, [suceso, grupo], 1) === trackRowHeight(L, [grupo], 1),
  'el alto de la pista debería ser el máximo de sus elementos');

/* Nunca por debajo del piso histórico. */
for(const escala of [1, 1.2, 1.4, 2]){
  ok(trackRowHeight(L, [suceso], escala) >= 54,
    'el alto nunca debería bajar de 54px (escala ' + escala + ')');
  ok(trackRowHeight(L, [], escala) === 54,
    'una pista vacía debería quedarse en el alto de siempre (escala ' + escala + ')');
}

/* ── 3. Los sitios que la llaman le pasan el contenido ────────────────────
   Con solo la cantidad de elementos no se puede saber si alguno es un grupo
   ni a qué escala está el texto: por eso el alto era fijo. */
ok(/function trackRowHeight\(L, people, scale\)/.test(JS),
  'trackRowHeight debería recibir la lista de pe, no su cantidad');
const llamadas = JS.match(/trackRowHeight\([^)]*\)/g) || [];
const conConteo = llamadas.filter(c => /\.length/.test(c));
ok(conConteo.length === 0,
  'ningún sitio debería seguir pasando .length a trackRowHeight: ' + conConteo.join(', '));
ok(llamadas.length >= 6,
  'deberían seguir siendo al menos 6 usos (definición + 5 sitios), hay ' + llamadas.length);

/* ── 4. El presupuesto se mide sobre un contenedor ya acomodado ───────────
   El primer render medía chartScroll.clientHeight antes de que la botonera de
   filtros terminara de acomodarse: 929px cuando el alto real era 824, y esos
   105px se le regalaban a la zona de sucesos. */
ok(/new ResizeObserver\(/.test(JS),
  'debería observarse el contenedor, no solo window.resize');
ok(/function contenedorCambio\(\)/.test(JS),
  'debería compararse el tamaño antes de recalcular');
const cambio = (JS.match(/function contenedorCambio\(\)\{[\s\S]*?\n\}/) || [''])[0];
ok(/Math\.abs\(prev\.w - w\) < 1 && Math\.abs\(prev\.h - h\) < 1/.test(cambio),
  'contenedorCambio debería cortar cuando las dimensiones no cambiaron');
ok(/if\(!w \|\| !h\) return false/.test(cambio),
  'no debería medirse el contenedor cuando está oculto');
ok(/RELAYOUT_MAX_SEGUIDOS/.test(JS),
  'debería haber un tope que corte una oscilación de barra de scroll');
ok(/requestAnimationFrame/.test(JS.slice(JS.indexOf('function observarContenedor'))),
  'los recálculos deberían agruparse por frame');

/* El eje es sticky y tapa lo de abajo: hace falta reserva para que el foco
   pueda revelar el elemento completo. */
ok(/scroll-padding-bottom:calc\(var\(--axis-h\) \+ 8px\)/.test(HTML),
  'el contenedor debería reservar el alto del eje para el scroll');

if(fails.length){
  console.error('FAIL scripts/tests/test_alturas.js');
  fails.forEach(f=> console.error('  - ' + f));
  process.exit(1);
}
console.log('PASS scripts/tests/test_alturas.js');
