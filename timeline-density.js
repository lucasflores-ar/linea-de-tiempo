/**
 * Agrupación visual por densidad (Paso 5).
 * Puro: sin DOM. API: window.LTDensity
 *
 * Contrato: elegibles = unión de singles ∪ miembros de agregados (sin perder IDs).
 * Agregado = proximidad en pantalla («N sucesos próximos»), no relación histórica.
 */
(function(global){
'use strict';

const DEFAULTS = {
  minGapPx: 44,
  exitGapPx: 36, /* histéresis al acercar: desagrupa antes */
  maxSpanPx: 120,
  maxMembers: 50,
  maxTracks: 3,
};

function clampOpts(opts){
  const o = Object.assign({}, DEFAULTS, opts || {});
  o.minGapPx = Math.max(8, Number(o.minGapPx) || DEFAULTS.minGapPx);
  o.exitGapPx = Math.max(4, Math.min(o.minGapPx, Number(o.exitGapPx) || DEFAULTS.exitGapPx));
  o.maxSpanPx = Math.max(o.minGapPx, Number(o.maxSpanPx) || DEFAULTS.maxSpanPx);
  o.maxMembers = Math.max(2, Number(o.maxMembers) || DEFAULTS.maxMembers);
  o.maxTracks = Math.max(1, Number(o.maxTracks) || DEFAULTS.maxTracks);
  return o;
}

/** Proyecta ítems con year → x. items: { id, year, ev?, labelW? } */
function projectPoints(items, ctx){
  const c = ctx || {};
  const yMin = c.yMin;
  const yMax = c.yMax;
  const chartW = c.chartW || 1;
  const yearToX = typeof c.yearToX === 'function'
    ? c.yearToX
    : (y)=>{
      const span = yMax - yMin;
      if(!Number.isFinite(span) || span <= 0) return chartW / 2;
      return ((y - yMin) / span) * chartW;
    };
  const out = [];
  for(const it of items || []){
    if(!it || it.id == null) continue;
    const year = Number.isFinite(it.year) ? it.year : null;
    if(year == null) continue;
    const x = yearToX(year, yMin, yMax, chartW);
    if(!Number.isFinite(x)) continue;
    const labelW = Number.isFinite(it.labelW) ? it.labelW : 0;
    out.push({
      id: Number(it.id),
      year,
      x,
      left: x - Math.max(22, labelW / 2),
      right: x + Math.max(22, labelW / 2),
      ev: it.ev || null,
      labelW,
    });
  }
  out.sort((a, b)=> a.x - b.x || a.id - b.id);
  return out;
}

/**
 * Agrupa puntos por vecindad visual con tope de span y miembros.
 * gapPx: umbral de unión (usar minGapPx al agrupar, exitGapPx al desagrupar).
 */
function clusterProjected(points, opts){
  const o = clampOpts(opts);
  const gap = Number.isFinite(opts && opts.gapPx) ? opts.gapPx : o.minGapPx;
  const pts = (points || []).slice().sort((a, b)=> a.x - b.x || a.id - b.id);
  if(!pts.length) return [];

  const clusters = [];
  let cur = [pts[0]];
  let curLeft = pts[0].left;
  let curRight = pts[0].right;

  function flush(){
    if(cur.length) clusters.push(cur);
    cur = [];
  }

  for(let i = 1; i < pts.length; i++){
    const p = pts[i];
    const spanIfAdd = Math.max(curRight, p.right) - Math.min(curLeft, p.left);
    const touches = p.left - curRight < gap || (p.x - cur[cur.length - 1].x) < gap;
    if(touches && cur.length < o.maxMembers && spanIfAdd <= o.maxSpanPx){
      cur.push(p);
      curLeft = Math.min(curLeft, p.left);
      curRight = Math.max(curRight, p.right);
    } else {
      flush();
      cur = [p];
      curLeft = p.left;
      curRight = p.right;
    }
  }
  flush();
  return clusters;
}

function clusterToNode(cluster){
  const members = cluster.map(p=>({
    id: p.id,
    year: p.year,
    ev: p.ev,
    x: p.x,
  }));
  const ids = members.map(m=> m.id);
  const years = members.map(m=> m.year);
  const yearMin = Math.min(...years);
  const yearMax = Math.max(...years);
  const x = members.reduce((s, m)=> s + m.x, 0) / members.length;
  if(members.length === 1){
    return {
      type: 'single',
      id: members[0].id,
      year: members[0].year,
      yearMin,
      yearMax,
      x,
      members,
      ids,
      label: members[0].ev && members[0].ev.n ? members[0].ev.n : ('Suceso ' + members[0].id),
    };
  }
  return {
    type: 'aggregate',
    id: 'agg:' + ids.slice().sort((a,b)=>a-b).join('-'),
    year: (yearMin + yearMax) / 2,
    yearMin,
    yearMax,
    x,
    members,
    ids,
    count: members.length,
    label: members.length + ' sucesos próximos',
  };
}

/**
 * Si hay demasiados nodos apilables, fusiona vecinos hasta caber en maxTracks
 * por «columna» aproximada (misma franja de maxSpan).
 */
function enforceTrackBudget(nodes, opts){
  const o = clampOpts(opts);
  if(!nodes.length || nodes.length <= o.maxTracks) return nodes.slice();
  /* Reagrupar todos los puntos subyacentes con gap más agresivo */
  const points = [];
  for(const n of nodes){
    for(const m of n.members){
      points.push({
        id: m.id,
        year: m.year,
        x: m.x,
        left: m.x - 22,
        right: m.x + 22,
        ev: m.ev,
      });
    }
  }
  let gap = o.minGapPx;
  let clustered = clusterProjected(points, Object.assign({}, o, { gapPx: gap }));
  let result = clustered.map(clusterToNode);
  let guard = 0;
  while(result.length > Math.max(o.maxTracks * 8, o.maxTracks) && guard < 8){
    gap *= 1.45;
    clustered = clusterProjected(points, Object.assign({}, o, {
      gapPx: gap,
      maxSpanPx: Math.max(o.maxSpanPx, gap * 3),
    }));
    result = clustered.map(clusterToNode);
    guard++;
  }
  return result;
}

/**
 * Pipeline completo: proyectar → agrupar → nodos single/aggregate.
 * items: { id, year, ev?, labelW? }
 * ctx: { yMin, yMax, chartW, yearToX? }
 * opts: density options + { expanding?: bool } para histéresis
 */
function densifyEvents(items, ctx, opts){
  const o = clampOpts(opts);
  const expanding = !!(opts && opts.expanding);
  const gapPx = expanding ? o.exitGapPx : o.minGapPx;
  const projected = projectPoints(items, ctx);
  const undated = (items || []).filter(it=> it && it.id != null && !Number.isFinite(it.year));
  const clusters = clusterProjected(projected, Object.assign({}, o, { gapPx }));
  let nodes = clusters.map(clusterToNode);
  nodes = enforceTrackBudget(nodes, o);
  const coverage = coverageIds(nodes);
  for(const u of undated){
    const id = Number(u.id);
    if(!coverage.has(id)){
      nodes.push({
        type: 'single',
        id,
        year: null,
        yearMin: null,
        yearMax: null,
        x: null,
        members: [{ id, year: null, ev: u.ev || null, x: null }],
        ids: [id],
        label: (u.ev && u.ev.n) || ('Suceso ' + id),
        undated: true,
      });
      coverage.add(id);
    }
  }
  return {
    nodes,
    projected,
    coverage,
    opts: o,
    summary: nodes.some(n=> n.type === 'aggregate'),
  };
}

function coverageIds(nodes){
  const set = new Set();
  for(const n of nodes || []){
    for(const id of (n.ids || [])) set.add(Number(id));
  }
  return set;
}

function assertCoverage(eligibleIds, nodes){
  const cov = coverageIds(nodes);
  const missing = [];
  const extra = [];
  for(const id of eligibleIds || []){
    if(!cov.has(Number(id))) missing.push(Number(id));
  }
  for(const id of cov){
    if(!(eligibleIds || []).map(Number).includes(id)) extra.push(id);
  }
  return { ok: missing.length === 0 && extra.length === 0, missing, extra, coverage: cov };
}

function membersEvents(node){
  return (node && node.members || []).map(m=> m.ev).filter(Boolean);
}

global.LTDensity = {
  DEFAULTS,
  projectPoints,
  clusterProjected,
  densifyEvents,
  coverageIds,
  assertCoverage,
  membersEvents,
  clusterToNode,
  enforceTrackBudget,
  clampOpts,
};
})(typeof window !== 'undefined' ? window : globalThis);
