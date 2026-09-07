/**
 * Selectores e índices de datos de la cronología (puros / sin DOM).
 * API: window.LTSelectors
 */
(function(global){
'use strict';

function buildIndexes(data){
  const byEventId = new Map();
  const questionsByHid = new Map();
  const eventos = (data && data.eventos) || [];
  const preguntas = (data && data.preguntas) || [];
  for(const ev of eventos){
    if(ev && ev.id != null) byEventId.set(Number(ev.id), ev);
  }
  for(const p of preguntas){
    if(!p || p.hid == null) continue;
    const hid = Number(p.hid);
    if(!questionsByHid.has(hid)) questionsByHid.set(hid, []);
    questionsByHid.get(hid).push(p);
  }
  return { byEventId, questionsByHid };
}

/** ID estable de grupo curado: ministerio:32 | ministerio:antes-bautismo | semana:... */
function stableGroupId(kind, key){
  const k = String(kind || 'grupo');
  const rest = key == null ? '' : String(key);
  return rest ? (k + ':' + rest) : k;
}

function parseGroupId(id){
  if(!id) return null;
  const s = String(id);
  const i = s.indexOf(':');
  if(i < 0) return { kind: s, key: null };
  return { kind: s.slice(0, i), key: s.slice(i + 1) };
}

function chartYearOf(ev){
  if(!ev) return null;
  if(Number.isFinite(ev.fa)) return ev.fa;
  if(Number.isFinite(ev.ini)) return ev.ini;
  return null;
}

function eventOverlapsRange(ev, ymin, ymax){
  if(ymin == null && ymax == null) return true;
  const a = chartYearOf(ev);
  const b = Number.isFinite(ev.fa_fin) ? ev.fa_fin : a;
  if(a == null) return false;
  const lo = ymin == null ? -Infinity : ymin;
  const hi = ymax == null ? Infinity : ymax;
  const e0 = Math.min(a, b == null ? a : b);
  const e1 = Math.max(a, b == null ? a : b);
  return e0 <= hi && lo <= e1;
}

function normText(s){
  return String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/**
 * Selector canónico de sucesos para lista/explorador.
 * - Deduplica por id
 * - No excluye por personaje oculto en la gráfica
 * - opts.inChipScope(ev) reutiliza reglas de chip/época
 * - opts.qscope: 'intervalo' filtra por ymin/ymax; 'todo' ignora rango
 */
function selectEvents(data, opts){
  const o = opts || {};
  const eventos = (data && data.eventos) || [];
  const q = normText(o.q || '');
  const qscope = o.qscope === 'todo' ? 'todo' : 'intervalo';
  const seen = new Set();
  const out = [];
  for(const ev of eventos){
    if(!ev || ev.id == null || ev.tipo === 'reinado') continue;
    const id = Number(ev.id);
    if(seen.has(id)) continue;
    if(typeof o.inChipScope === 'function' && !o.inChipScope(ev)) continue;
    if(qscope === 'intervalo' && !eventOverlapsRange(ev, o.ymin, o.ymax)) continue;
    if(q){
      const hay = normText(ev.n).includes(q)
        || normText(ev.ref || '').includes(q)
        || normText(ev.d || '').includes(q);
      if(!hay) continue;
    }
    seen.add(id);
    out.push(ev);
  }
  out.sort((a, b)=>{
    const ya = chartYearOf(a);
    const yb = chartYearOf(b);
    if(ya == null && yb == null) return String(a.n).localeCompare(String(b.n), 'es');
    if(ya == null) return 1;
    if(yb == null) return -1;
    if(ya !== yb) return ya - yb;
    return String(a.n || '').localeCompare(String(b.n || ''), 'es');
  });
  return out;
}

function dedupeEventIds(ids){
  const seen = new Set();
  const out = [];
  for(const raw of ids || []){
    const id = Number(raw);
    if(!Number.isFinite(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

global.LTSelectors = {
  buildIndexes,
  stableGroupId,
  parseGroupId,
  chartYearOf,
  eventOverlapsRange,
  selectEvents,
  dedupeEventIds,
};
})(typeof window !== 'undefined' ? window : globalThis);
