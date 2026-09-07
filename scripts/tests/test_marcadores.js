// Regresión R2 y R4: cada suceso de una barra tiene una zona de clic propia,
// y ningún suceso se dibuja dos veces (arriba en un grupo, abajo suelto).
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

const JS = fs.readFileSync(path.join(REPO, 'linea-paralela.js'), 'utf8');
const HTML = fs.readFileSync(path.join(REPO, 'linea-paralela.html'), 'utf8');

function slice(desde, hasta, nombre){
  const a = JS.indexOf(desde), b = JS.indexOf(hasta);
  ok(a >= 0 && b > a, 'se encontró el bloque de ' + nombre + ' en linea-paralela.js');
  return a >= 0 && b > a ? JS.slice(a, b) : '';
}

/* ---------- R2: agrupar los marcadores que pelean por el mismo gesto ------ */

let punteroGrueso = false;
const ctx = vm.createContext({
  console, Math, Number, String, Object, Array, Map, Set, JSON, Infinity,
  yearToX: (y, yMin, yMax, chartW)=> ((y - yMin) / (yMax - yMin)) * chartW,
  chartYear: ev=> ev.fa,
  isCoarsePointer: ()=> punteroGrueso,
});
ctx.window = ctx;
ctx.globalThis = ctx;

vm.runInContext([
  slice('const MARKER_HIT_PX', 'function renderRowEventMarkers', 'groupRowMarkers'),
  'this.groupRowMarkers = groupRowMarkers;',
  'this.markerHitWidth = markerHitWidth;',
  'this.MARKER_HIT_PX = MARKER_HIT_PX;',
  'this.MARKER_TOUCH_INSET = MARKER_TOUCH_INSET;',
  'this.MARKER_AGG_PX = MARKER_AGG_PX;',
].join('\n'), ctx);

const { groupRowMarkers } = ctx;

/* Las constantes son un espejo a mano del CSS: si el CSS cambia y el JS no,
   la agrupación vuelve a medir mal y los marcadores se pisan de nuevo. */
ok(/\.evt-marker--in-row[\s\S]{0,120}?width:15px/.test(HTML),
  'el CSS sigue dibujando el marcador de fila a ' + ctx.MARKER_HIT_PX + 'px');
ok(/\.evt-marker--in-row::before\s*\{[\s\S]{0,120}?inset:\s*-18px/.test(HTML),
  'en puntero grueso el ::before suma ' + ctx.MARKER_TOUCH_INSET + 'px por lado');
ok(/\.evt-marker--agg\s*\{[\s\S]{0,80}?min-width:28px/.test(HTML),
  'el agregado mide ' + ctx.MARKER_AGG_PX + 'px, más que un marcador suelto');

/* Escala usada abajo: 1000 años en 1000px, o sea 1px por año. */
const YMIN = 0, YMAX = 1000, W = 1000;
const ev = (id, fa)=> ({ id, fa, n: 'Suceso ' + id });

{
  const g = groupRowMarkers([ev(1, 100), ev(2, 500), ev(3, 900)], YMIN, YMAX, W);
  ok(g.length === 3 && g.every(x=> x.miembros.length === 1),
    'sucesos separados conservan cada uno su marcador (' + g.length + ' controles)');
}

{
  /* El caso real: Ezequías (id 75) y Senaquerib (id 354) a pocos px. */
  const g = groupRowMarkers([ev(75, 500), ev(354, 508)], YMIN, YMAX, W);
  ok(g.length === 1 && g[0].miembros.length === 2,
    'dos sucesos a 8px quedan en un solo control agregado');
  ok(g[0].x === 504, 'el agregado se centra entre sus miembros (x=' + g[0].x + ')');
}

{
  /* Justo en el límite: 15px de marcador + 3px de aire. */
  const sep = ctx.MARKER_HIT_PX + 3;
  const juntos = groupRowMarkers([ev(1, 500), ev(2, 500 + sep - 1)], YMIN, YMAX, W);
  const sueltos = groupRowMarkers([ev(1, 500), ev(2, 500 + sep)], YMIN, YMAX, W);
  ok(juntos.length === 1, 'a ' + (sep - 1) + 'px todavía se agrupan');
  ok(sueltos.length === 2, 'a ' + sep + 'px ya caben separados');
}

{
  /* Escalonados: cada uno está lejos del centro del grupo pero cerca del
     anterior. Si se comparara contra el centro quedarían pares pisándose. */
  const evs = [ev(1, 500), ev(2, 510), ev(3, 520), ev(4, 530), ev(5, 540)];
  const g = groupRowMarkers(evs, YMIN, YMAX, W);
  ok(g.length === 1 && g[0].miembros.length === 5,
    'una hilera escalonada se encadena en un agregado (' + g.length + ' controles)');
}

{
  /* Ningún par de controles renderizados puede quedar a distancia de pisarse. */
  const evs = [];
  for(let i = 0; i < 40; i++) evs.push(ev(i, 200 + i * 7));
  evs.push(ev(99, 900));
  const g = groupRowMarkers(evs, YMIN, YMAX, W);
  let choque = 0;
  for(let i = 1; i < g.length; i++){
    const anchoA = (g[i - 1].miembros.length > 1 ? ctx.MARKER_AGG_PX : ctx.MARKER_HIT_PX) / 2;
    const anchoB = (g[i].miembros.length > 1 ? ctx.MARKER_AGG_PX : ctx.MARKER_HIT_PX) / 2;
    if(g[i].x - g[i - 1].x < anchoA + anchoB) choque++;
  }
  ok(choque === 0, 'con 41 sucesos apretados no queda ningún par superpuesto');
  const ids = new Set();
  for(const grupo of g) for(const m of grupo.miembros) ids.add(m.id);
  ok(ids.size === 41, 'agrupar no pierde ningún suceso (' + ids.size + '/41)');
}

{
  /* En pantalla táctil la zona es 51px, así que agrupa mucho antes. */
  punteroGrueso = true;
  const g = groupRowMarkers([ev(1, 500), ev(2, 530)], YMIN, YMAX, W);
  punteroGrueso = false;
  ok(ctx.markerHitWidth() === ctx.MARKER_HIT_PX,
    'en puntero fino la zona es de ' + ctx.MARKER_HIT_PX + 'px');
  ok(g.length === 1, 'en puntero grueso dos sucesos a 30px se agrupan');
}

/* El halo táctil no puede dejar al personaje sin zona propia. Un agregado de
   28px con 18px de halo por lado ocupa 64px: sobre una barra más angosta tapa
   también el nombre, que es el control del personaje. */
ok(ctx.MARKER_AGG_PX + ctx.MARKER_TOUCH_INSET * 2 === 64,
  'el halo de un agregado ocupa 64px de ancho');
const rowMk = slice('function renderRowEventMarkers', 'const LEGACY_DEFAULT_LANES',
                    'renderRowEventMarkers');
ok(/barW\s*<\s*MARKER_HALO_SAFE_W/.test(rowMk),
  'los marcadores de una barra angosta se marcan con halo recortado');
ok(/renderRowEventMarkers\(pe,\s*yMin,\s*yMax,\s*chartW,\s*q,\s*w\)/.test(JS),
  'el render le pasa el ancho de la barra');
ok(/evt-marker--halo-bajo::before\s*\{\s*inset:\s*0\s+-18px\s+-18px\s+-18px/.test(HTML),
  'el halo recortado no crece hacia arriba, que es donde va el nombre');

/* El nombre del personaje se corre según los marcadores agrupados, no según
   los sucesos en crudo: un agregado va en otra x y es más ancho. */
const inset = slice('function markerNameInset', 'const MARKER_HIT_PX', 'markerNameInset');
ok(/groupRowMarkers\(/.test(inset),
  'markerNameInset mide la misma agrupación que se dibuja');
ok(/MARKER_AGG_PX/.test(inset),
  'markerNameInset cuenta el ancho extra del agregado');

/* ---------- R4: un suceso dibujado arriba no se repite abajo -------------- */

const ctx4 = vm.createContext({
  console, Math, Number, String, Object, Array, Map, Set, JSON,
  norm: s=> String(s || '').toLowerCase(),
  chartYear: e=> e.fa,
  eventInChipScope: ()=> true,
  eventMatchesPerson: (e, pe)=> (pe.eventIds || []).includes(e.id),
  D: { eventos: [] },
});
ctx4.window = ctx4;
vm.runInContext([
  slice('function collectRepresentedEventIds', 'function layoutLooseExpanded',
        'collectRepresentedEventIds/collectLooseEvents'),
  'this.collectRepresentedEventIds = collectRepresentedEventIds;',
  'this.collectLooseEvents = collectLooseEvents;',
].join('\n'), ctx4);

const { collectRepresentedEventIds, collectLooseEvents } = ctx4;

{
  const laneData = [{ tracks: [{ people: [
    { n: 'Grupo', groupEvents: [ev(10, 100), ev(11, 110)] },
    { isEvent: true, ev: ev(12, 120) },
    { n: 'Persona', eventIds: [13] },
  ] }] }];
  const ids = collectRepresentedEventIds(laneData);
  ok(ids.has(10) && ids.has(11), 'los miembros de un agregado cuentan como representados');
  ok(ids.has(12), 'una fila de suceso propia cuenta como representada');
  ok(!ids.has(13), 'un suceso en la barra de un personaje no es una fila propia');
  ok(collectRepresentedEventIds([]).size === 0 && collectRepresentedEventIds(null).size === 0,
    'sin filas no falla');

  ctx4.D.eventos = [ev(10, 100), ev(11, 110), ev(12, 120), ev(13, 130), ev(14, 140)];
  const gente = [{ n: 'Persona', eventIds: [13] }];

  const sinFiltro = collectLooseEvents(gente, 0, 1000, '', null).map(e=> e.id);
  ok(JSON.stringify(sinFiltro) === JSON.stringify([10, 11, 12, 14]),
    'antes del arreglo la zona suelta repetía lo de arriba: ' + JSON.stringify(sinFiltro));

  const conFiltro = collectLooseEvents(gente, 0, 1000, '', ids).map(e=> e.id);
  ok(JSON.stringify(conFiltro) === JSON.stringify([14]),
    'con el descarte solo queda lo que no está dibujado arriba: ' + JSON.stringify(conFiltro));

  /* Nada se pierde: cada suceso del alcance está arriba o abajo, nunca en los dos. */
  const cubiertos = new Set([...ids, ...conFiltro, 13]);
  ok(cubiertos.size === 5, 'los 5 sucesos del alcance siguen teniendo un lugar');
}

/* El descarte tiene que estar cableado en el render, no solo disponible. */
ok(/const representedEventIds\s*=\s*collectRepresentedEventIds\(laneData\)/.test(JS),
  'el render calcula los ids ya representados');
ok(/collectLooseEvents\(activePeople,\s*yMin,\s*yMax,\s*query,\s*representedEventIds\)/.test(JS),
  'y se los pasa a collectLooseEvents');

console.log(fails ? '\n' + fails + ' fallo(s)' : '\nmarcadores sin superposición y sin repetidos');
process.exit(fails ? 1 : 0);
