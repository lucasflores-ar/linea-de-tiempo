// Los nombres de personajes se pisaban porque el empaquetado en tracks y el
// tope de ancho del caption suponían que toda barra empieza en su año de
// inicio. Las barras cortas se dibujan como caja centrada en el periodo, así
// que empiezan media caja antes, y ahí se creía haber más espacio del real.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '../..');
const JS = fs.readFileSync(path.join(REPO, 'linea-paralela.js'), 'utf-8');

const fails = [];
function ok(cond, msg){ if(!cond) fails.push(msg); }

/* ── Geometría real, con lo de alrededor apenas simulado ── */
function slice(desde, hasta, nombre){
  const a = JS.indexOf(desde), b = JS.indexOf(hasta);
  ok(a >= 0 && b > a, 'no se encontró el bloque de ' + nombre + ' en linea-paralela.js');
  return a >= 0 && b > a ? JS.slice(a, b) : '';
}

const ctx = vm.createContext({
  /* Constantes del módulo que quedan fuera de los trozos. */
  CAPTION_MAX_PX: 200,
  CAPTION_MIN_PX: 72,
  SHORT_PERIOD_MAX_YEARS: 12,
  SHORT_PERIOD_POINT_YEARS: 3,
  NARROW_BAR_PX: 56,
  /* Estado de UI que consulta la caché. */
  showMarkers: true,
  fontScale: 1,
  vizStyle: 'editorial',
  /* Escala fija de 1 px por año, con los años negativos creciendo a la derecha. */
  yearToX: (y)=> (y + 1200) * 1,
  eventHasRange: ()=> false,
  /* Cada personaje declara el ancho de su caption y su corrimiento. */
  captionStackWidth: (pe)=> Math.max(72, pe._cap || 72),
  markerNameInset: (pe)=> pe._inset || 0,
});

vm.runInContext([
  slice('function clampBarLeft', 'function captionFonts', 'clampBarLeft'),
  slice('function periodSpanYears', 'function barLabelFitsInside', 'shouldRenderAsPoint'),
  slice('function pointEventBoxLayout', 'function layoutBlockTracks', 'visualBarBounds'),
  'this.visualBarBounds = visualBarBounds;',
  'this.captionMaxPx = captionMaxPx;',
  'this.periodVisualClash = periodVisualClash;',
  'this.shouldRenderAsPoint = shouldRenderAsPoint;',
].join('\n'), ctx);

const { visualBarBounds, captionMaxPx, periodVisualClash, shouldRenderAsPoint } = ctx;
const CHART = 4000;
const bounds = (pe)=> visualBarBounds(pe, -1200, 100, CHART);

/* ── Una barra corta se dibuja como punto y empieza antes de su año ── */
/* Reinado de 8 años: a 1 px/año son 8 px, menos que NARROW_BAR_PX. */
const corto = { n: 'Jehoram', inicio: -913, fin: -905, _cap: 110 };
ok(shouldRenderAsPoint(corto, 8) === true, 'un reinado de 8 años debería dibujarse como punto');
const bCorto = bounds(corto);
ok(bCorto.left < 287 - 40,
  'la caja del punto debería empezar bastante antes de su año; empieza en ' + bCorto.left);
ok(Math.abs(bCorto.left - (287 + 4 - 110 / 2)) < 1,
  'la caja del punto debería quedar centrada en el periodo; left=' + bCorto.left);

/* Un reinado largo sí arranca en su año de inicio. */
const largo = { n: 'Uzías', inicio: -829, fin: -777, _cap: 105 };
ok(shouldRenderAsPoint(largo, 52) === false, 'un reinado de 52 años no debería dibujarse como punto');
ok(bounds(largo).left === 371, 'una barra de periodo debería empezar en su año; left=' + bounds(largo).left);

/* ── El caption corrido por un marcador cuenta como espacio ocupado ── */
const conMarcador = { n: 'Jonás', inicio: -844, fin: -844, _cap: 72, _inset: 49 };
const sinMarcador = { n: 'Jonás', inicio: -844, fin: -844, _cap: 72, _inset: 0 };
ok(bounds(conMarcador).width > bounds(sinMarcador).width,
  'el corrimiento del caption debería ampliar la extensión declarada de la barra');
ok(bounds(conMarcador).width >= 49 + 72,
  'la extensión debería cubrir el corrimiento más el caption; es ' + bounds(conMarcador).width);

/* ── El empaquetado separa lo que se pisaría ── */
/* Antes se los ponía en la misma fila: la caja de Jehoram parecía empezar en
   su año, 84 px después del fin del caption de Rehoboam. */
const rehoboam = { n: 'Rehoboam', inicio: -997, fin: -980, _cap: 105 };
ok(periodVisualClash(rehoboam, corto, { yMin: -1200, yMax: 100, chartW: CHART }) === true,
  'Rehoboam y un reinado corto cercano deberían detectarse como colisión');
/* Dos periodos bien separados siguen compartiendo fila. */
const lejano = { n: 'Josías', inicio: -659, fin: -628, _cap: 100 };
ok(periodVisualClash(rehoboam, lejano, { yMin: -1200, yMax: 100, chartW: CHART }) === false,
  'dos periodos separados no deberían detectarse como colisión');

/* ── El tope de ancho se mide desde donde empieza el texto ── */
ok(captionMaxPx(100, null) === 200, 'sin barra siguiente el tope debería ser CAPTION_MAX_PX');
ok(captionMaxPx(100, 1000) === 200, 'con mucho espacio el tope debería ser CAPTION_MAX_PX');
ok(captionMaxPx(100, 200) === 92, 'el tope debería dejar 8 px de aire; da ' + captionMaxPx(100, 200));
/* El corrimiento del caption sale del espacio disponible. */
ok(captionMaxPx(100 + 49, 200) < captionMaxPx(100, 200),
  'un caption corrido debería recibir un tope menor');
ok(captionMaxPx(100, 110) === 40, 'con el hueco casi cerrado el tope debería caer al piso de 40 px');

/* ── El cableado en el módulo ── */
ok(/nextLeft = visualBarBoundsCached\(people\[i \+ 1\], yMin, yMax, chartW\)\.left/.test(JS),
  'renderTrackCanvas debería medir el borde real de la barra siguiente, no su año de inicio');
ok(!/const nextX = yearToX\(people\[i \+ 1\]\.inicio/.test(JS),
  'quedó el cálculo viejo de gapToNext contra el año de inicio de la barra siguiente');
ok(/const maxCapPx = captionMaxPx\(x \+ capShift, layoutOpts\?\.nextLeft\)/.test(JS),
  'renderCompactNarrowBar debería topear el caption descontando su corrimiento');
ok(/const maxCapPx = captionMaxPx\(left \+ capShift, layoutOpts\?\.nextLeft\)/.test(JS),
  'renderPointEventBar debería topear el caption igual que las barras de periodo');
ok(/const caja = shouldRenderAsPoint\(pe, spanW\)/.test(JS),
  'visualBarBounds debería usar el mismo criterio de punto que renderPersonBar');
ok(/const ba = visualBarBoundsCached\(a, yMin, yMax, chartW\)/.test(JS),
  'periodVisualClash debería usar la versión cacheada');
ok(/const textWidthMemo = new Map\(\)/.test(JS), 'falta la memoria de medidas de texto');
ok(/document\.fonts\.ready\.then\(\(\)=>textWidthMemo\.clear\(\)\)/.test(JS),
  'la memoria de medidas debería vaciarse al terminar de cargar las fuentes');

if(fails.length){
  console.error('FAIL scripts/tests/test_captions.js');
  fails.forEach(f=> console.error('  - ' + f));
  process.exit(1);
}
console.log('PASS scripts/tests/test_captions.js');
