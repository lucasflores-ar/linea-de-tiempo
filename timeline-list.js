/**
 * Explorador de lista (Paso 3): render puro + pila de navegación.
 * API: window.LTList
 */
(function(global){
'use strict';

function normText(s){
  return String(s || '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function createNavStack(){
  const items = [];
  return {
    push(entry){ items.push(entry); return items.length; },
    pop(){ return items.pop(); },
    peek(){ return items.length ? items[items.length - 1] : null; },
    clear(){ items.length = 0; },
    size(){ return items.length; },
    snapshot(){ return items.slice(); },
  };
}

function filterEvents(events, q){
  const nq = normText(q);
  if(!nq) return (events || []).slice();
  return (events || []).filter(ev=>{
    return normText(ev.n).includes(nq)
      || normText(ev.ref || '').includes(nq)
      || normText(ev.d || '').includes(nq)
      || normText(ev.lug || '').includes(nq);
  });
}

function dedupeById(events){
  const seen = new Set();
  const out = [];
  for(const ev of events || []){
    if(!ev || ev.id == null) continue;
    const id = Number(ev.id);
    if(seen.has(id)) continue;
    seen.add(id);
    out.push(ev);
  }
  return out;
}

/**
 * Renderiza lista de sucesos en root.
 * opts: { title, subtitle, events, query, fmtYear, esc, onOpen, onShowOnChart, onQuery, emptyHint }
 */
function renderExplorer(root, opts){
  const o = opts || {};
  if(!root) return { count: 0, total: 0 };
  const esc = typeof o.esc === 'function' ? o.esc : (s=> String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
  const fmtYear = typeof o.fmtYear === 'function' ? o.fmtYear : (y=> String(y));
  const all = dedupeById(o.events || []);
  const filtered = filterEvents(all, o.query || '');
  const q = o.query || '';

  const rows = filtered.map(ev=>{
    const y = Number.isFinite(ev.fa) ? ev.fa : (Number.isFinite(ev.ini) ? ev.ini : null);
    const yLabel = y == null ? 'Sin fecha' : fmtYear(y);
    const ref = ev.ref ? esc(ev.ref) : '';
    return (
      '<li class="tl-list__item" data-ev-id="' + esc(String(ev.id)) + '">' +
        '<div class="tl-list__main">' +
          '<button type="button" class="tl-list__open" data-action="open" data-ev-id="' + esc(String(ev.id)) + '">' +
            '<span class="tl-list__year">' + esc(yLabel) + '</span>' +
            '<span class="tl-list__name">' + esc(ev.n || 'Sin título') + '</span>' +
            (ref ? '<span class="tl-list__ref">' + ref + '</span>' : '') +
          '</button>' +
        '</div>' +
        '<div class="tl-list__actions">' +
          '<button type="button" class="tl-list__chart" data-action="chart" data-ev-id="' + esc(String(ev.id)) + '" title="Ver en la línea">En línea</button>' +
        '</div>' +
      '</li>'
    );
  }).join('');

  const empty = !filtered.length
    ? ('<p class="tl-list__empty">' + esc(o.emptyHint || (q
      ? 'Sin coincidencias. Probá limpiar la búsqueda o ampliar el periodo.'
      : 'No hay sucesos en este intervalo.')) +
      (q ? ' <button type="button" class="tl-list__clear-q" data-action="clear-q">Limpiar búsqueda</button>' : '') +
      '</p>')
    : '';

  root.innerHTML =
    '<div class="tl-list" role="region" aria-label="Explorador de sucesos">' +
      '<div class="tl-list__toolbar">' +
        '<label class="tl-list__search">' +
          '<span class="u-visually-hidden">Buscar en esta lista</span>' +
          '<input type="search" class="tl-list__q" placeholder="Buscar en esta lista…" value="' + esc(q) + '" autocomplete="off" />' +
        '</label>' +
        '<p class="tl-list__count" aria-live="polite">' +
          (q
            ? (filtered.length + ' de ' + all.length + ' sucesos')
            : (all.length + ' suceso' + (all.length === 1 ? '' : 's'))) +
        '</p>' +
      '</div>' +
      (empty || ('<ul class="tl-list__ul" role="list">' + rows + '</ul>')) +
    '</div>';

  const qInput = root.querySelector('.tl-list__q');
  if(qInput && typeof o.onQuery === 'function'){
    let t;
    qInput.addEventListener('input', ()=>{
      clearTimeout(t);
      t = setTimeout(()=> o.onQuery(qInput.value), 120);
    });
    qInput.addEventListener('keydown', e=>{
      if(e.key === 'Escape'){
        e.preventDefault();
        o.onQuery('');
      }
    });
  }

  root.querySelectorAll('[data-action]').forEach(btn=>{
    btn.addEventListener('click', e=>{
      e.preventDefault();
      const action = btn.getAttribute('data-action');
      if(action === 'clear-q' && typeof o.onQuery === 'function'){
        o.onQuery('');
        return;
      }
      const id = Number(btn.getAttribute('data-ev-id'));
      if(!Number.isFinite(id)) return;
      if(action === 'open' && typeof o.onOpen === 'function') o.onOpen(id, btn);
      if(action === 'chart' && typeof o.onShowOnChart === 'function') o.onShowOnChart(id, btn);
    });
  });

  return { count: filtered.length, total: all.length };
}

global.LTList = {
  createNavStack,
  filterEvents,
  dedupeById,
  renderExplorer,
  normText,
};
})(typeof window !== 'undefined' ? window : globalThis);
