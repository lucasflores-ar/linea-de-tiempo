/**
 * Estado compartible de la cronología (URL / historial).
 * Preferencias visuales (tema, autofit, zoom, layout) siguen en localStorage.
 * API: window.LTState
 */
(function(global){
'use strict';

const VISTA = { EXPLORAR: 'explorar', COMPARAR: 'comparar' };
const QSCOPE = { INTERVALO: 'intervalo', TODO: 'todo' };
const HASH_VERSION = 1;

function defaultShareableState(){
  return {
    v: HASH_VERSION,
    vista: VISTA.COMPARAR,
    /** null = no especificado en URL (usar localStorage); [] = vacío explícito */
    filas: null,
    q: '',
    qscope: QSCOPE.INTERVALO,
    ymin: null,
    ymax: null,
    ev: null,
    grupo: null,
  };
}

function clampVista(v){
  return v === VISTA.EXPLORAR ? VISTA.EXPLORAR : VISTA.COMPARAR;
}

function clampQscope(v){
  return v === QSCOPE.TODO ? QSCOPE.TODO : QSCOPE.INTERVALO;
}

function parseNum(v){
  if(v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Lee hash (#...) o search (?...) a estado compartible.
 * Compatible con legado: #filas=a,b&ev=12  y  #jud,isr,pro
 */
function parseShareable(raw, laneOrder){
  const order = Array.isArray(laneOrder) ? laneOrder : [];
  const out = defaultShareableState();
  if(!raw) return out;
  let h = String(raw).replace(/^#/, '');
  if(!h) return out;

  /* Legado: solo ids de fila separados por coma */
  if(!/[=&]/.test(h) && !h.startsWith('v=')){
    const ids = h.split(',').map(s=>s.trim()).filter(id=> order.includes(id));
    if(ids.length) out.filas = ids;
    return out;
  }

  const params = {};
  h.split('&').forEach(part=>{
    const i = part.indexOf('=');
    if(i < 0){
      if(part) params[decodeURIComponent(part)] = '';
      return;
    }
    const k = decodeURIComponent(part.slice(0, i));
    const val = decodeURIComponent(part.slice(i + 1));
    params[k] = val;
  });

  if(Object.prototype.hasOwnProperty.call(params, 'filas')){
    out.filas = String(params.filas || '').split(',').map(s=>s.trim()).filter(id=> id && order.includes(id));
  }
  if(params.ev != null && params.ev !== ''){
    const ev = parseInt(params.ev, 10);
    if(Number.isFinite(ev)) out.ev = ev;
  }
  if(params.grupo) out.grupo = String(params.grupo);
  if(params.q) out.q = String(params.q);
  if(params.qscope) out.qscope = clampQscope(params.qscope);
  if(params.vista) out.vista = clampVista(params.vista);
  out.ymin = parseNum(params.ymin);
  out.ymax = parseNum(params.ymax);
  if(params.v != null){
    const v = parseInt(params.v, 10);
    if(Number.isFinite(v)) out.v = v;
  }
  return out;
}

/** Serializa estado compartible a fragmento hash (sin #). */
function serializeShareable(state, laneOrder){
  const s = Object.assign(defaultShareableState(), state || {});
  const order = Array.isArray(laneOrder) ? laneOrder : [];
  const filas = Array.isArray(s.filas) ? s.filas.filter(id=> order.includes(id)) : [];
  const parts = ['v=' + HASH_VERSION];
  parts.push('vista=' + clampVista(s.vista));
  parts.push('filas=' + filas.join(','));
  if(s.q) parts.push('q=' + encodeURIComponent(s.q));
  if(s.qscope && s.qscope !== QSCOPE.INTERVALO) parts.push('qscope=' + clampQscope(s.qscope));
  if(s.ymin != null && Number.isFinite(Number(s.ymin))) parts.push('ymin=' + Number(s.ymin));
  if(s.ymax != null && Number.isFinite(Number(s.ymax))) parts.push('ymax=' + Number(s.ymax));
  if(s.grupo) parts.push('grupo=' + encodeURIComponent(s.grupo));
  if(s.ev != null && Number.isFinite(Number(s.ev))) parts.push('ev=' + Number(s.ev));
  return parts.join('&');
}

function applyHash(state, laneOrder, opts){
  const hash = serializeShareable(state, laneOrder);
  const url = '#' + hash;
  const mode = (opts && opts.push) ? 'push' : 'replace';
  if(typeof history !== 'undefined'){
    if(mode === 'push') history.pushState(null, '', url);
    else history.replaceState(null, '', url);
  }
  return hash;
}

global.LTState = {
  VISTA,
  QSCOPE,
  HASH_VERSION,
  defaultShareableState,
  parseShareable,
  serializeShareable,
  applyHash,
  clampVista,
  clampQscope,
};
})(typeof window !== 'undefined' ? window : globalThis);
