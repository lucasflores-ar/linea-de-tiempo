// Regresión: los sucesos sueltos se despliegan en filas cuando sobra alto,
// y solo se agrupan en «N sucesos próximos» cuando los personajes lo ocuparon.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '../..');
let fails = 0;
function ok(cond, msg){
  console.log((cond ? 'ok  ' : 'ERROR: ') + msg);
  if(!cond) fails++;
}

/* ---------- 1. fanLevels, la función pura del reparto en filas ---------- */

const sandbox = { window: {}, console, Number, String, Object, Array, Map, Set, Math, Infinity };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.runInNewContext(
  fs.readFileSync(path.join(REPO, 'timeline-density.js'), 'utf8'), sandbox);
const LTDensity = sandbox.LTDensity;

ok(typeof LTDensity.fanLevels === 'function', 'LTDensity expone fanLevels');

{
  /* Separados de sobra: todos van al riel, una sola fila. */
  const r = LTDensity.fanLevels([0, 200, 400], { gapPx: 92, maxAbs: 3 });
  ok(r.ok && r.rows === 1 && r.levels.every(l=> l === 0),
    'puntos separados comparten el nivel 0 (filas=' + r.rows + ')');
}

{
  /* Cinco encimados con lugar: se abren en abanico 0, 1, −1, 2, −2. */
  const r = LTDensity.fanLevels([10, 12, 14, 16, 18], { gapPx: 92, maxAbs: 3 });
  ok(r.ok, 'cinco encimados con maxAbs=3 entran sin superponerse');
  ok(r.rows === 5, 'ocupan 5 filas (rows=' + r.rows + ')');
  ok(JSON.stringify(r.levels) === JSON.stringify([0, 1, -1, 2, -2]),
    'el abanico alterna abajo/arriba: ' + JSON.stringify(r.levels));
}

{
  /* Los mismos cinco sin lugar: avisa que no entran. */
  const r = LTDensity.fanLevels([10, 12, 14, 16, 18], { gapPx: 92, maxAbs: 1 });
  ok(!r.ok, 'con maxAbs=1 avisa que cinco encimados no entran');
}

{
  const r = LTDensity.fanLevels([10, 12], { gapPx: 92, maxAbs: 0 });
  ok(!r.ok, 'con maxAbs=0 no hay dónde desplegar');
  const vacio = LTDensity.fanLevels([], { gapPx: 92, maxAbs: 3 });
  ok(vacio.ok && vacio.rows === 1, 'sin puntos no falla');
}

/* ---------- 2. El presupuesto vertical y el layout desplegado ---------- */

const JS = fs.readFileSync(path.join(REPO, 'linea-paralela.js'), 'utf8');

function slice(desde, hasta, nombre){
  const a = JS.indexOf(desde), b = JS.indexOf(hasta);
  ok(a >= 0 && b > a, 'se encontró el bloque de ' + nombre + ' en linea-paralela.js');
  return a >= 0 && b > a ? JS.slice(a, b) : '';
}

const ctx = vm.createContext({
  console, Math, Number, String, Object, Array, Map, Set, JSON, Infinity,
  window: { LTDensity },
  LTDensity,
  /* Escala lineal simple: alcanza para ubicar los puntos en x. */
  yearToX: (y, yMin, yMax, chartW)=> ((y - yMin) / (yMax - yMin)) * chartW,
  chartYear: ev=> ev.fa,
});

vm.runInContext([
  slice('const LOOSE_EVT_TITLE_CHARS', 'function themesInChipScope', 'constantes'),
  slice('function layoutLooseExpanded', 'function layoutLooseEventLanes', 'layoutLooseExpanded'),
  'this.looseFanHeight = looseFanHeight;',
  'this.looseMaxAbsForBudget = looseMaxAbsForBudget;',
  'this.looseSlotsForBudget = looseSlotsForBudget;',
  'this.looseComponents = looseComponents;',
  'this.layoutLooseExpanded = layoutLooseExpanded;',
  'this.SLOT_H = LOOSE_EVT_SLOT_H;',
  'this.GAP_PX = LOOSE_EVT_GAP_PX;',
  'this.looseCaptionTramos = looseCaptionTramos;',
  'this.looseCaptionBox = looseCaptionBox;',
  'this.CAP_MIN_GAP = LOOSE_CAP_MIN_GAP;',
  'this.CAP_EDGE_PAD = LOOSE_CAP_EDGE_PAD;',
].join('\n'), ctx);

const { looseFanHeight, looseMaxAbsForBudget, looseSlotsForBudget,
  looseComponents, layoutLooseExpanded, SLOT_H, GAP_PX,
  looseCaptionTramos, looseCaptionBox, CAP_MIN_GAP, CAP_EDGE_PAD } = ctx;
const LOOSE_EVT_SLOT_H = SLOT_H;

ok(looseMaxAbsForBudget(0) === 0, 'sin alto libre no se despliega');
ok(looseMaxAbsForBudget(undefined) === 0, 'sin dato de alto no se despliega');
{
  const base = looseFanHeight(0, 0);
  ok(looseMaxAbsForBudget(base) === 0,
    'con el alto justo del riel todavía no entra ningún nivel');
  ok(looseMaxAbsForBudget(base + SLOT_H * 2 + 8) >= 1,
    'con dos slots más ya entra un nivel a cada lado');
  ok(looseMaxAbsForBudget(base + SLOT_H * 6 + 8) >= 3,
    'con seis slots entran tres niveles a cada lado');
}
ok(looseFanHeight(3, 3) > looseFanHeight(1, 1),
  'más niveles piden más alto');

/* Siete sucesos casi en el mismo año, que es el caso que motivó el cambio. */
const apinados = [];
for(let i = 0; i < 7; i++) apinados.push({ id: 100 + i, n: 'Suceso ' + i, fa: -1200 - i });
const ARGS = [-1450, -1120, 900];

{
  /* Pantalla con una sola fila de personajes: espacio de sobra. */
  const alto = looseFanHeight(3, 3) + 40;
  const r = layoutLooseExpanded(apinados, ...ARGS, alto);
  ok(r !== null, 'con alto de sobra los siete se despliegan');
  if(r){
    ok(r.mode === 'expandido', 'el modo declarado es «expandido»');
    ok(r.items.length === 7, 'hay un marcador por suceso (' + r.items.length + ')');
    ok(r.items.every(i=> !i.isAggregate), 'ninguno es un agregado');
    ok(new Set(r.items.map(i=> i.level)).size === 7,
      'cada uno cae en una fila distinta');
    ok(r.items.every(i=> Number.isFinite(i.top)),
      'todos tienen posición vertical resuelta');
    const ids = new Set(r.items.map(i=> i.ev.id));
    ok(apinados.every(e=> ids.has(e.id)), 'no se pierde ningún id al desplegar');
  }
}

{
  /* Personajes ocupando la pantalla: no queda alto y hay que agrupar. */
  ok(layoutLooseExpanded(apinados, ...ARGS, 0) === null,
    'sin alto libre devuelve null para que el llamador agrupe');

  /* Con alto para una sola fila, los siete apiñados no entran separados. Antes
     esto devolvía null y el llamador agrupaba la banda entera; ahora la
     decisión es por zona, así que agrupa solo el tramo que no cabe y lo
     declara. Que no devuelva null es la mejora, no un fallo. */
  const apretado = layoutLooseExpanded(apinados, ...ARGS, looseFanHeight(1, 1));
  ok(apretado !== null,
    'con alto para una sola fila resuelve agregando, en vez de rendirse');
  if(apretado){
    ok(apretado.mode === 'agrupado',
      'si ninguna zona cabe, el modo declarado es «agrupado» (' + apretado.mode + ')');
    ok(apretado.items.every(i=> i.isAggregate),
      'los siete apiñados quedan dentro de agregados');
    const ids = new Set(apretado.items.flatMap(i=> i.events.map(e=> e.id)));
    ok(apinados.every(e=> ids.has(e.id)),
      'agrupar no pierde ningún id');
    /* Nunca dos controles en la misma posición: eso es lo que R9 prohíbe. */
    const pos = apretado.items.map(i=> i.x + ':' + i.level);
    ok(new Set(pos).size === pos.length,
      'ningún par de controles comparte posición y nivel');
  }
}

{
  /* Decisión por zona: un tramo imposible no debe arrastrar a los que sí
     tienen lugar de sobra. Era el defecto de fondo de R3: alcanzaba con que un
     punto no entrara para agrupar toda la banda. */
  const mezcla = [
    ...Array.from({ length: 12 }, (_, i)=> ({ id: 700 + i, n: 'Denso ' + i, fa: 10 })),
    { id: 800, n: 'Lejano A', fa: 400 },
    { id: 801, n: 'Lejano B', fa: 800 },
  ];
  const r = layoutLooseExpanded(mezcla, ...ARGS, looseFanHeight(1, 1));
  ok(r !== null, 'la mezcla se resuelve');
  if(r){
    ok(r.mode === 'mixto', 'el modo declarado es «mixto» (' + r.mode + ')');
    const sueltos = r.items.filter(i=> !i.isAggregate).map(i=> i.ev.n);
    ok(sueltos.includes('Lejano A') && sueltos.includes('Lejano B'),
      'los sucesos separados se despliegan aunque el racimo denso no quepa');
    ok(r.items.some(i=> i.isAggregate && i.events.length === 12),
      'el racimo denso queda en un solo agregado');
    ok(r.expandidos === 2 && r.agregados === 12,
      'el layout informa cuántos se desplegaron y cuántos se agruparon');
  }
}

{
  /* Presupuesto impar: con lugar para tres filas hay que usar las tres.
     looseMaxAbsForBudget contaba pares arriba/abajo, así que descartaba la
     tercera por no tener pareja. */
  const tres = looseSlotsForBudget(looseFanHeight(1, 1) + LOOSE_EVT_SLOT_H);
  ok(tres >= 3, 'un presupuesto con lugar para tres filas devuelve tres (' + tres + ')');
  const orden = LTDensity.levelOrder({ slots: 3 });
  ok(orden.length === 3, 'el orden de niveles usa las tres filas (' + orden.join(',') + ')');
  ok(orden[0] === 0, 'la primera fila es el riel');
}

{
  /* Dos sucesos encimados necesitan mucho menos alto que siete: el mismo
     presupuesto que rechaza a los siete tiene que aceptarlos. */
  const dos = apinados.slice(0, 2);
  const alto = looseFanHeight(1, 1) + 40;
  const r = layoutLooseExpanded(dos, ...ARGS, alto);
  ok(r !== null && r.items.length === 2 && !r.items.some(i=> i.isAggregate),
    'un grupo de dos se despliega con menos alto que uno de siete');
}

{
  /* Sucesos bien separados en el eje: entran en una fila aunque haya poco alto. */
  const separados = [
    { id: 1, n: 'A', fa: -1450 },
    { id: 2, n: 'B', fa: -1300 },
    { id: 3, n: 'C', fa: -1150 },
  ];
  const r = layoutLooseExpanded(separados, ...ARGS, looseFanHeight(0, 0) + 40);
  ok(r !== null && r.items.every(i=> i.level === 0),
    'sucesos separados no necesitan filas extra');
}

/* ---------- 3. Anchos de título por hueco real, no por tope fijo (R7) ------ */

/* Caja pintada de un título: [izq, der] tras aplicar su corrimiento. */
const caja = (x, box)=> ({
  izq: x - box.w / 2 + box.shift,
  der: x + box.w / 2 + box.shift,
});

{
  const W = 900;
  const solo = { x: 450, level: 0 };
  const tramos = looseCaptionTramos([solo], W);
  const t = tramos.get(solo);
  ok(t.izq === CAP_EDGE_PAD && t.der === W - CAP_EDGE_PAD,
    'sin vecinos, un título puede usar todo el ancho del gráfico');

  /* Antes el tope era 108px sin importar el lugar: un título de 300px se
     recortaba aunque tuviera media pantalla libre al lado. */
  const ancho = looseCaptionBox(450, t, 300, 2);
  ok(ancho.w >= 300, 'con lugar de sobra el título usa su ancho real (' + ancho.w + ')');
  ok(ancho.lineas === 1, 'y no necesita una segunda línea');

  /* Pegado al borde: el nombre arrancaba en x negativo y se veía cortado. */
  const izq = looseCaptionBox(10, t, 90, 1);
  const cIzq = caja(10, izq);
  ok(izq.shift > 0, 'un título pegado a la izquierda se empuja hacia adentro');
  ok(cIzq.izq >= CAP_EDGE_PAD - 1, 'y su borde izquierdo ya no queda fuera: ' + cIzq.izq);
  ok(izq.shift <= izq.w / 2, 'sin despegarse más de media caja de su marcador');

  const der = looseCaptionBox(W - 10, t, 90, 1);
  const cDer = caja(W - 10, der);
  ok(der.shift < 0, 'un título pegado a la derecha se empuja hacia adentro');
  ok(cDer.der <= W - CAP_EDGE_PAD + 1, 'y su borde derecho ya no se sale: ' + cDer.der);

  ok(looseCaptionBox(450, t, 12, 1).shift === 0,
    'un título corto en el medio no necesita corrimiento');
}

{
  /* Dos vecinos del mismo nivel: cada uno recibe su tramo y las cajas
     pintadas no se pisan. Antes dos cajas de 108px con centros a 92px se
     solapaban 16px. */
  const W = 900;
  const a = { x: 400, level: 0 };
  const b = { x: 492, level: 0 };
  const tramos = looseCaptionTramos([a, b], W);
  const ta = tramos.get(a), tb = tramos.get(b);
  ok(ta.der <= tb.izq, 'los tramos de dos vecinos del mismo nivel no se pisan');
  ok(tb.izq - ta.der >= CAP_MIN_GAP - 0.01,
    'y quedan separados por la holgura mínima: ' + (tb.izq - ta.der));

  const ca = caja(400, looseCaptionBox(400, ta, 300, 2));
  const cb = caja(492, looseCaptionBox(492, tb, 300, 2));
  ok(ca.der <= cb.izq + 0.01,
    'las cajas pintadas tampoco se pisan: ' + ca.der + ' vs ' + cb.izq);

  /* En cambio, dos títulos de niveles distintos pueden usar todo su ancho:
     no comparten banda vertical. */
  const c = { x: 400, level: 0 };
  const d = { x: 420, level: 1 };
  const t2 = looseCaptionTramos([c, d], W);
  ok(t2.get(c).der === W - CAP_EDGE_PAD && t2.get(d).der === W - CAP_EDGE_PAD,
    'niveles distintos no se reparten el ancho entre sí');
}

{
  /* Hueco chico: se usa la segunda línea antes de recortar. */
  const tramo = { izq: 0, der: 100 };
  const dos = looseCaptionBox(50, tramo, 180, 2);
  ok(dos.lineas === 2, 'si no entra en una línea se usa la segunda');
  ok(dos.w <= 100, 'sin pasarse del hueco disponible: ' + dos.w);

  /* Con una sola línea permitida (200% de fuente) se recorta, no se desborda. */
  const una = looseCaptionBox(50, tramo, 180, 1);
  ok(una.lineas === 1 && una.w <= 100,
    'con una sola línea permitida el título se acota al hueco');
}

/* ---------- 4. Cableado en el render ---------- */

ok(/const expandido = layoutLooseExpanded\(/.test(JS),
  'layoutLooseEventLanes intenta desplegar antes de agregar');
ok(/if\(expandido\) return expandido;/.test(JS),
  'si el despliegue entra, se usa y no se agrega');
ok(/mode: 'agrupado'/.test(JS) && /mode: 'expandido'/.test(JS),
  'cada layout declara su modo');
ok(/looseMode: looseLayout \? looseLayout\.mode : null/.test(JS),
  'el modo queda expuesto en lastLayout para QA');
ok(/const freeBelow = Math\.max\(0, viewH - peopleHEstimate/.test(JS),
  'el alto libre se calcula descontando lo que ocupan los personajes');
ok(/layoutLooseEventLanes\(looseEvents, yMin, yMax, chartW, freeBelow\)/.test(JS),
  'el alto libre se pasa al layout de sucesos sueltos');
ok(/sucesos desplegados/.test(JS),
  'la nota de QA distingue el modo desplegado');
ok(/--cap-w:'\+box\.w\+'px;--cap-lines:'\+box\.lineas\+';--cap-shift:'\+box\.shift\+'px/.test(JS),
  'cada marcador emite su ancho, sus líneas y su corrimiento de título');
ok(/looseCaptionTramos\(layout\.items, chartW\)/.test(JS),
  'el render reparte el ancho entre los títulos antes de dibujarlos');
ok(!/truncateCaption\(ev\.n, LOOSE_EVT_TITLE_CHARS\)/.test(JS),
  'el título ya no se recorta por cantidad de caracteres antes de medir el hueco');

const HTML = fs.readFileSync(path.join(REPO, 'linea-paralela.html'), 'utf8');
ok(/translateX\(calc\(-50% \+ var\(--cap-shift, 0px\)\)\)/.test(HTML),
  'el CSS del título aplica --cap-shift');
ok((HTML.match(/var\(--cap-shift, 0px\)/g) || []).length >= 2,
  'lo aplica tanto arriba como abajo del riel');
const cssTitulo = (HTML.match(/\.loose-evt-zone__title\{[^}]*\}/) || [''])[0];
ok(/width:var\(--cap-w/.test(cssTitulo),
  'el ancho del título viene de --cap-w, no de un tope fijo');
ok(!/max-width:108px/.test(cssTitulo),
  'no debería quedar el tope fijo de 108px');
ok(/line-clamp:var\(--cap-lines/.test(cssTitulo),
  'la cantidad de líneas la decide --cap-lines');
ok(/calc\(10px \* var\(--tl-font-scale\)\)/.test(cssTitulo),
  'la fuente del título debería seguir el control de escala');

if(fails){
  console.log('\n' + fails + ' fallo(s)');
  process.exit(1);
}
console.log('\ntest_despliegue OK');
