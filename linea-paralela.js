(function(){
'use strict';
const D = window.LT_DATA;
let pxPerYear = parseFloat(localStorage.getItem('lt-par-zoom')) || 2.4;
const _savedAutofit = localStorage.getItem('lt-par-autofit');
let autoFit = _savedAutofit === null ? true : _savedAutofit === '1';
const MIN_FOCUS_SPAN = 5;
const FONT_SCALE_OPTIONS = [1, 1.2, 1.4];
let viewWindow = loadViewWindow();
let fontScale = loadFontScale();
let rectZoomMode = false;
let focusMarquee = null;
let pinchState = null;

function loadViewWindow(){
  try{
    const raw = localStorage.getItem('lt-par-focus');
    if(!raw) return null;
    const v = JSON.parse(raw);
    if(v && Number.isFinite(v.min) && Number.isFinite(v.max) && v.max > v.min) return v;
  }catch(e){}
  return null;
}
function saveViewWindow(){
  try{
    localStorage.setItem('lt-par-focus', viewWindow ? JSON.stringify(viewWindow) : '');
  }catch(e){}
}
function loadFontScale(){
  const v = parseFloat(localStorage.getItem('lt-par-font-scale'));
  return FONT_SCALE_OPTIONS.includes(v) ? v : 1;
}
function saveFontScale(){
  try{ localStorage.setItem('lt-par-font-scale', String(fontScale)); }catch(e){}
}
function applyFontScale(){
  if(document.documentElement && document.documentElement.style){
    document.documentElement.style.setProperty('--tl-font-scale', String(fontScale));
  }
  if(fontScaleEl) fontScaleEl.value = String(fontScale);
}
const VIZ_STYLES = ['editorial', 'waterfall'];
let vizStyle = VIZ_STYLES.includes(localStorage.getItem('lt-par-viz')) ? localStorage.getItem('lt-par-viz') : 'editorial';
const ROW_LAYOUTS = ['expanded', 'compact'];
let rowLayout = ROW_LAYOUTS.includes(localStorage.getItem('lt-par-row-layout'))
  ? localStorage.getItem('lt-par-row-layout') : 'compact';

function layoutMetrics(){
  const wf = vizStyle === 'waterfall';
  const compact = rowLayout === 'compact';
  const periodRows = compact || wf;
  return {
    rowH: periodRows ? 54 : 48,
    laneGap: wf ? 12 : 14,
    laneHdr: wf ? 28 : 32,
    axisH: wf ? 36 : 40,
    phaseH: wf ? 36 : 0,
    potStrip: 28,
  };
}

function applyRowLayout(){
  document.documentElement.setAttribute('data-row-layout', rowLayout);
}
applyRowLayout();

let _measureCtx;
function measureCtx(){
  if(!_measureCtx){
    const c = document.createElement('canvas');
    _measureCtx = c.getContext('2d');
  }
  return _measureCtx;
}
function textWidth(text, font){
  const ctx = measureCtx();
  ctx.font = font;
  return ctx.measureText(text || '').width;
}
function minBarWidthForPe(pe){
  const wf = vizStyle === 'waterfall';
  const fs = fontScale;
  const nameFont = wf
    ? `600 ${11 * fs}px Inter, "Segoe UI", sans-serif`
    : `600 ${11 * fs}px "Libre Baskerville", Georgia, serif`;
  const dateFont = wf
    ? `400 ${9 * fs}px Inter, "Segoe UI", sans-serif`
    : `400 ${9 * fs}px Karla, "Segoe UI", sans-serif`;
  const nameW = textWidth(pe.n, nameFont);
  const datesW = textWidth(fmtRange(pe.inicio, pe.fin), dateFont);
  return Math.ceil(Math.max(nameW, datesW) + 20);
}
function barLabelFitsInside(pe, w){
  return w >= minBarWidthForPe(pe);
}

const LANE_META = {
  'Reyes de Judá':   { key:'jud', color:'var(--lane-jud)', label:'Reyes de Judá' },
  'Reyes de Israel': { key:'isr', color:'var(--lane-isr)', label:'Reyes de Israel' },
  'Profetas':        { key:'pro', color:'var(--lane-pro)', label:'Profetas' },
  'Época de los jueces': { key:'jue', color:'var(--lane-jue)', label:'Época de los jueces' },
  'Un solo reino':   { key:'uni', color:'var(--lane-uni)', label:'Un solo reino' },
  'Antes del Diluvio': { key:'pre', color:'var(--c-pre)', label:'Antes del Diluvio' },
  'Después del Diluvio': { key:'postd', color:'var(--c-pat)', label:'Después del Diluvio' },
  'Destierro en Babilonia': { key:'babil', color:'var(--c-exi)', label:'Destierro en Babilonia' },
  'Después del destierro': { key:'rest', color:'var(--c-res)', label:'Después del destierro' },
  'Siglo primero': { key:'sig', color:'var(--c-ec)', label:'Siglo primero' },
  'Reino dividido': { key:'rdiv', color:'var(--lane-isr)', label:'Reino dividido' },
};

const THEME_LANE_META = {
  GENESIS: { key:'gen', color:'var(--c-pre)', label:'Sucesos · Génesis' },
  EXODO: { key:'exo', color:'var(--c-egi)', label:'Sucesos · Éxodo' },
  CONQUISTA: { key:'con', color:'var(--c-con)', label:'Sucesos · Conquista' },
  JUECES: { key:'tjue', color:'var(--c-jue)', label:'Sucesos · Jueces' },
  REYES: { key:'tre', color:'var(--c-mon)', label:'Sucesos · Reyes' },
  PROFETAS: { key:'tpro', color:'var(--c-div)', label:'Sucesos · Profetas' },
  EXILIO: { key:'exi', color:'var(--c-exi)', label:'Sucesos · Exilio' },
  RESTAURACION: { key:'tres', color:'var(--c-res)', label:'Sucesos · Restauración' },
  'SIGLO-PRIMERO': { key:'tsig', color:'var(--c-ec)', label:'Sucesos · Siglo primero' },
  HECHOS: { key:'hec', color:'var(--c-pat)', label:'Sucesos · Hechos' },
  'NT-ESCRITURA': { key:'ntesc', color:'var(--c-ntesc)', label:'Sucesos · Escritura NT' },
};

const LANE_FILTERS = [
  { id:'pre',   cron:-5000, mode:'personaje', grupo:'Antes del Diluvio', label:'Antes del Diluvio', color:'var(--c-pre)' },
  { id:'gen',   cron:-4000, mode:'tema', tema:'GENESIS', label:'Génesis', color:'var(--c-pre)' },
  { id:'postd', cron:-3500, mode:'personaje', grupo:'Después del Diluvio', label:'Post-diluvio', color:'var(--c-pat)' },
  { id:'exo',   cron:-1513, mode:'tema', tema:'EXODO', label:'Éxodo', color:'var(--c-egi)' },
  { id:'con',   cron:-1473, mode:'tema', tema:'CONQUISTA', label:'Conquista', color:'var(--c-con)' },
  { id:'jue',   cron:-1380, mode:'personaje', grupo:'Época de los jueces', label:'Jueces', color:'var(--lane-jue)' },
  { id:'tjue',  cron:-1370, mode:'tema', tema:'JUECES', label:'Jueces (sucesos)', color:'var(--c-jue)' },
  { id:'uni',   cron:-1050, mode:'personaje', grupo:'Un solo reino', label:'Un solo reino', color:'var(--lane-uni)' },
  { id:'rdiv',  cron:-997,  mode:'personaje', grupo:'Reino dividido', label:'Reino dividido', color:'var(--lane-isr)' },
  { id:'jud',   cron:-996,  mode:'personaje', grupo:'Reyes de Judá', label:'Reyes de Judá', color:'var(--lane-jud)' },
  { id:'isr',   cron:-995,  mode:'personaje', grupo:'Reyes de Israel', label:'Reyes de Israel', color:'var(--lane-isr)' },
  { id:'tre',   cron:-994,  mode:'tema', tema:'REYES', label:'Reyes (sucesos)', color:'var(--c-mon)' },
  { id:'pro',   cron:-900,  mode:'personaje', grupo:'Profetas', label:'Profetas', color:'var(--lane-pro)' },
  { id:'tpro',  cron:-890,  mode:'tema', tema:'PROFETAS', label:'Profetas (sucesos)', color:'var(--c-div)' },
  { id:'babil', cron:-607,  mode:'personaje', grupo:'Destierro en Babilonia', label:'Destierro', color:'var(--c-exi)' },
  { id:'exi',   cron:-606,  mode:'tema', tema:'EXILIO', label:'Exilio', color:'var(--c-exi)' },
  { id:'rest',  cron:-537,  mode:'personaje', grupo:'Después del destierro', label:'Postexilio', color:'var(--c-res)' },
  { id:'tres',  cron:-536,  mode:'tema', tema:'RESTAURACION', label:'Restauración', color:'var(--c-res)' },
  { id:'sig',   cron:-100,  mode:'personaje', grupo:'Siglo primero', label:'Siglo primero', color:'var(--c-ec)' },
  { id:'jes',   cron:30,    mode:'ministerio', label:'Ministerio de Jesús', color:'var(--lane-jes)' },
  { id:'sem',   cron:33,    mode:'ultima_semana', label:'Última semana', color:'var(--lane-sem)' },
  { id:'tsig',  cron:34,    mode:'tema', tema:'SIGLO-PRIMERO', label:'Siglo primero (sucesos)', color:'var(--c-ec)' },
  { id:'hec',   cron:35,    mode:'tema', tema:'HECHOS', label:'Hechos', color:'var(--c-pat)' },
  { id:'ntesc', cron:36,    mode:'tema', tema:'NT-ESCRITURA', label:'Escritura NT', color:'var(--c-ntesc)' },
];
const LANE_ORDER = [...LANE_FILTERS].sort((a, b)=>a.cron - b.cron).map(f=>f.id);
const DEFAULT_FOCUS_YEAR = 30;
const NISAN_DAYS = [
  '8 de nisán (sábado)', '9 de nisán', '10 de nisán', '11 de nisán', '12 de nisán',
  '13 de nisán', '14 de nisán', '15 de nisán (sábado)', '16 de nisán',
];
const LEGACY_HASH = {
  juda:['jud'], israel:['isr'], reyes:['jud','isr'],
  'juda-profetas':['jud','pro'], 'israel-profetas':['isr','pro'],
  'reyes-profetas':['jud','isr','pro'], 'a6-1':['jud','isr','pro'], 'a6-2':['jud','isr','pro'],
  'ministerio-jesus':['jes'], 'ultima-semana':['sem'], jesus:['jes','sem'],
};

const BANDS = [
  { id:'sam', cls:'band--sam', start:-740, end:-735, label:'Caída de Samaria' },
  { id:'jer', cls:'band--jer', start:-607, end:-602, label:'Caída de Jerusalén' },
  { id:'exi', cls:'band--exi', start:-607, end:-537, label:'Exilio babilónico' },
];

const POTENCIAS = [
  { id:'EGIPTO', label:'Egipto', icon:'🏛️', cls:'band--egy', fill:'#f0a35e', start:-1600, end:-874 },
  { id:'ASIRIA', label:'Asiria', icon:'🐂', cls:'band--asi', fill:'#ff6b6b', start:-874, end:-625 },
  { id:'BABILONIA', label:'Babilonia', icon:'🦁', cls:'band--bab', fill:'#b489ff', start:-625, end:-539 },
  { id:'MEDOPERSIA', label:'Medopersia', icon:'🐻', cls:'band--med', fill:'#56ccf2', start:-539, end:-332 },
  { id:'GRECIA', label:'Grecia', icon:'🐆', cls:'band--gre', fill:'#5cd07b', start:-332, end:-63 },
  { id:'ROMA', label:'Roma', icon:'🦅', cls:'band--rom', fill:'#ffd166', start:-63, end:100 },
];

const BAR_COLORS = {
  jud:'#a8843a', isr:'#9e4a4a', pro:'#6b5b8a', jue:'#a86a32', uni:'#4a7a55',
  pre:'#6b5b8a', postd:'#4a7a55', babil:'#7a7468', rest:'#4a8494', sig:'#3d6b7a', rdiv:'#9e4a4a',
  jes:'#3d6b7a', sem:'#4a8494',
  gen:'#6b5b8a', exo:'#a8843a', con:'#4a7a55', tjue:'#a86a32', tre:'#a8843a', tpro:'#6b5b8a',
  exi:'#7a7468', tres:'#4a8494', tsig:'#3d6b7a', hec:'#4a7a55', ntesc:'#6b6080',
};
const MARKER_COLORS = { batalla:'#9e4a4a', milagro:'#4a8494', 'profecía':'#6b5b8a', juicio:'#a8843a', muerte:'#7a7468', reforma:'#4a7a55', 'destrucción':'#a86a32', otro:'#3d6b7a' };

function markerColorFor(ev){
  const t = ev.tipo || 'otro';
  if(MARKER_COLORS[t]) return MARKER_COLORS[t];
  const flat = t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  for(const [k, v] of Object.entries(MARKER_COLORS)){
    if(k.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase() === flat) return v;
  }
  return MARKER_COLORS.otro;
}

function markerNameInset(pe, barX, yMin, yMax, chartW){
  if(!showMarkers || pe.isEvent) return 0;
  const wf = vizStyle === 'waterfall';
  const nameFont = wf
    ? '600 11px Inter, "Segoe UI", sans-serif'
    : '600 11px "Libre Baskerville", Georgia, serif';
  const nameW = textWidth(pe.n, nameFont);
  const half = 9;
  const gap = 5;
  let inset = 0;
  for(const ev of eventsForPerson(pe, yMin, yMax)){
    const mx = yearToX(chartYear(ev) ?? ev.fa, yMin, yMax, chartW);
    const rel = mx - barX;
    const mLeft = rel - half;
    const mRight = rel + half;
    if(mRight <= 0) continue;
    if(mLeft < nameW + gap){
      inset = Math.max(inset, Math.ceil(mRight + gap));
    }
  }
  return inset;
}

function renderRowEventMarkers(pe, yMin, yMax, chartW, q){
  if(!showMarkers || pe.isEvent) return '';
  if(q && !norm(pe.n).includes(q)) return '';
  let html = '';
  for(const ev of eventsForPerson(pe, yMin, yMax)){
    const mx = yearToX(chartYear(ev) ?? ev.fa, yMin, yMax, chartW);
    const mkColor = markerColorFor(ev);
    html += `<div class="evt-marker evt-marker--in-row" style="left:${mx}px;--mk-color:${mkColor}" data-ev="${ev.id}" tabindex="0" role="button" aria-label="${esc(ev.n)}">`+
      `<span class="evt-marker__tip">${esc(ev.n)}</span></div>`;
  }
  return html;
}

const DEFAULT_LANES = ['jud','isr','pro'];
let didInitialScroll = false;
let selLanes = new Set(
  (JSON.parse(localStorage.getItem('lt-par-lanes') || 'null') ?? DEFAULT_LANES)
    .filter(id=>LANE_ORDER.includes(id))
);

let hiddenPeople = new Set();
try{
  hiddenPeople = new Set(JSON.parse(localStorage.getItem('lt-par-hidden-pe') || '[]'));
}catch(e){ hiddenPeople = new Set(); }

function peKey(pe){ return String(pe.id); }
function isPeSelected(pe){ return !hiddenPeople.has(peKey(pe)); }
function saveHiddenPeople(){
  try{ localStorage.setItem('lt-par-hidden-pe', JSON.stringify([...hiddenPeople])); }catch(e){}
}
function peKeysInView(laneData){
  return laneData.flatMap(b=>b.people.map(peKey));
}
let query = '';
let showMarkers = localStorage.getItem('lt-par-markers') !== '0';
let showConnections = localStorage.getItem('lt-par-conn') !== '0';
let showPotencias = localStorage.getItem('lt-par-pot') !== '0';
let selPots = new Set(JSON.parse(localStorage.getItem('lt-par-pots') || 'null') || POTENCIAS.map(p=>p.id));
let lastLayout = null;

const labelsCol = document.getElementById('labels-col');
const hiddenDock = document.getElementById('hidden-dock');
const chartScroll = document.getElementById('chart-scroll');
const chartWrap = document.querySelector('.chart-wrap');
const chartCanvas = document.getElementById('chart-canvas');
const axisArea = document.getElementById('axis-area');
const laneFiltersEl = document.getElementById('lane-filters');
const searchEl = document.getElementById('search');
const resultCount = document.getElementById('result-count');
const tooltip = document.getElementById('tooltip');
const zoomEl = document.getElementById('zoom');
const zoomVal = document.getElementById('zoom-val');
const optMarkers = document.getElementById('opt-markers');
const optConnections = document.getElementById('opt-connections');
const optPotencias = document.getElementById('opt-potencias');
const potChipsEl = document.getElementById('pot-chips');
const exportBtn = document.getElementById('export-btn');
const fitBtn = document.getElementById('fit-btn');
const focusResetBtn = document.getElementById('focus-reset-btn');
const focusRectBtn = document.getElementById('focus-rect-btn');
const focusVal = document.getElementById('focus-val');
const focusMarqueeEl = document.getElementById('focus-marquee');
const fontScaleEl = document.getElementById('font-scale');
const vizStyleEl = document.getElementById('viz-style');
const rowLayoutEl = document.getElementById('row-layout');
applyFontScale();

function applyVizStyle(){
  document.documentElement.setAttribute('data-viz', vizStyle);
  if(vizStyleEl) vizStyleEl.value = vizStyle;
}
applyVizStyle();

optMarkers.checked = showMarkers;
optConnections.checked = showConnections;
optPotencias.checked = showPotencias;
fitBtn.classList.toggle('on', autoFit);
fitBtn.setAttribute('aria-pressed', autoFit ? 'true' : 'false');

function viewportChartWidth(){
  return Math.max(320, chartScroll.clientWidth - 4);
}

function minChartWidth(span2){
  if(span2 <= 2) return Math.max(960, Math.round(span2 * 40));
  if(span2 <= 20) return Math.max(840, Math.round(span2 * 14));
  if(span2 <= 100) return Math.max(780, Math.round(span2 * 5));
  if(span2 <= 400) return Math.max(720, Math.round(span2 * 1.4));
  return Math.max(720, Math.round(span2 * 0.5));
}

function computeChartWidth(span, span2){
  if(autoFit) return Math.max(viewportChartWidth(), minChartWidth(span2));
  let w = Math.max(720, Math.round(span * pxPerYear));
  if(span < 5) w = Math.max(960, Math.round(span * pxPerYear * 18));
  return w;
}

function updateZoomUi(span2, chartW){
  const effective = span2 > 0 ? span2 / chartW : pxPerYear;
  const fitsViewport = chartW <= viewportChartWidth() + 2;
  fitBtn.classList.toggle('on', autoFit);
  fitBtn.setAttribute('aria-pressed', autoFit ? 'true' : 'false');
  fitBtn.disabled = false;
  fitBtn.hidden = false;
  zoomEl.disabled = false;
  chartScroll.classList.toggle('fit-width', autoFit && fitsViewport);
  if(autoFit){
    zoomVal.textContent = effective.toFixed(2) + ' px/año · auto' + (fitsViewport ? '' : ' · desplaza →');
    const clamped = Math.min(8, Math.max(0.8, effective));
    zoomEl.value = clamped;
  } else {
    zoomEl.value = pxPerYear;
    zoomVal.textContent = pxPerYear.toFixed(1) + ' px/año';
  }
  return effective;
}

function isFullFocusRange(min, max, dataMin, dataMax){
  const span = dataMax - dataMin;
  return span <= 0 || (max - min) >= span * 0.995;
}
function getLogicalRange(dataMin, dataMax){
  if(!viewWindow) return { min: dataMin, max: dataMax };
  return { min: viewWindow.min, max: viewWindow.max };
}
function chartXFromClient(clientX){
  const rect = chartScroll.getBoundingClientRect();
  return clientX - rect.left + chartScroll.scrollLeft;
}
function xToYear(x, yMin, yMax, chartW){
  if(chartW <= 0) return (yMin + yMax) / 2;
  return yMin + (x / chartW) * (yMax - yMin);
}
function touchDistance(touches){
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}
function touchCenterClientX(touches){
  return (touches[0].clientX + touches[1].clientX) / 2;
}
function isTouchLayout(){
  return typeof matchMedia === 'function' &&
    (matchMedia('(max-width: 1024px)').matches || matchMedia('(pointer: coarse)').matches);
}
function prefersScalePinch(){
  return isTouchLayout();
}
function chartHit(clientX, clientY){
  if(!chartScroll) return false;
  const r = chartScroll.getBoundingClientRect();
  return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom;
}
function bothTouchesInChart(touches){
  return touches.length >= 2 &&
    chartHit(touches[0].clientX, touches[0].clientY) &&
    chartHit(touches[1].clientX, touches[1].clientY);
}
function touchPair(touch0, touch1){
  return { 0: touch0, 1: touch1, length: 2 };
}
let pinchRaf = 0;
let pinchPendingTouches = null;
function beginPinch(touches){
  if(!lastLayout || !bothTouchesInChart(touches)) return;
  chartScroll.classList.add('is-pinching');
  drag = false;
  chartScroll.classList.remove('dragging');
  const cx = chartXFromClient(touchCenterClientX(touches));
  const centerYear = xToYear(cx, lastLayout.yMin, lastLayout.yMax, lastLayout.chartW);
  if(prefersScalePinch()){
    autoFit = false;
    localStorage.setItem('lt-par-autofit', '0');
    fitBtn.classList.remove('on');
    fitBtn.setAttribute('aria-pressed', 'false');
    chartScroll.classList.remove('fit-width');
    pinchState = {
      mode: 'scale',
      dist0: touchDistance(touches),
      px0: pxPerYear,
      centerYear,
      viewportX: touchCenterClientX(touches) - chartScroll.getBoundingClientRect().left,
    };
  } else {
    const lr = getLogicalRange(lastLayout.dataMin, lastLayout.dataMax);
    pinchState = {
      mode: 'focus',
      dist0: touchDistance(touches),
      vMin: lr.min,
      vMax: lr.max,
      centerYear,
    };
  }
}
function endPinch(){
  pinchState = null;
  pinchPendingTouches = null;
  if(pinchRaf){ cancelAnimationFrame(pinchRaf); pinchRaf = 0; }
  chartScroll?.classList.remove('is-pinching');
}
function movePinch(touches){
  if(!pinchState || !lastLayout) return;
  const factor = touchDistance(touches) / pinchState.dist0;
  if(!Number.isFinite(factor) || factor <= 0) return;
  if(pinchState.mode === 'scale'){
    const newPx = Math.min(8, Math.max(0.8, pinchState.px0 * factor));
    if(Math.abs(newPx - pxPerYear) < 0.02) return;
    pxPerYear = newPx;
    zoomEl.value = pxPerYear;
    localStorage.setItem('lt-par-zoom', String(pxPerYear));
    render._scrolled = true;
    render();
    const newCx = yearToX(pinchState.centerYear, lastLayout.yMin, lastLayout.yMax, lastLayout.chartW);
    chartScroll.scrollLeft = Math.max(0, newCx - pinchState.viewportX);
    pinchState.px0 = pxPerYear;
    pinchState.dist0 = touchDistance(touches);
    return;
  }
  const span0 = pinchState.vMax - pinchState.vMin;
  const newSpan = Math.max(MIN_FOCUS_SPAN, span0 / factor);
  const t = span0 > 0 ? (pinchState.centerYear - pinchState.vMin) / span0 : 0.5;
  let newMin = pinchState.centerYear - t * newSpan;
  let newMax = newMin + newSpan;
  const { dataMin, dataMax } = lastLayout;
  if(newMin < dataMin){ newMin = dataMin; newMax = dataMin + newSpan; }
  if(newMax > dataMax){ newMax = dataMax; newMin = dataMax - newSpan; }
  const savedCenter = pinchState.centerYear;
  if(isFullFocusRange(newMin, newMax, dataMin, dataMax)){
    if(viewWindow){ viewWindow = null; saveViewWindow(); render._scrolled = true; render(); }
  } else {
    viewWindow = { min: newMin, max: newMax };
    saveViewWindow();
    render._scrolled = true;
    render();
    pinchState = {
      mode: 'focus',
      dist0: touchDistance(touches),
      vMin: newMin,
      vMax: newMax,
      centerYear: savedCenter,
    };
  }
}
function schedulePinchMove(touches){
  pinchPendingTouches = touches;
  if(pinchRaf) return;
  pinchRaf = requestAnimationFrame(()=>{
    pinchRaf = 0;
    if(pinchPendingTouches && pinchState) movePinch(pinchPendingTouches);
    pinchPendingTouches = null;
  });
}
function installPinchGestures(){
  if(!chartScroll) return;
  const ptrMap = new Map();
  function ptrTouchPair(){
    const pts = [...ptrMap.values()];
    return pts.length >= 2 ? touchPair(pts[0], pts[1]) : null;
  }
  function onTouchStart(e){
    if(e.touches.length === 2 && lastLayout && bothTouchesInChart(e.touches)){
      e.preventDefault();
      beginPinch(e.touches);
    }
  }
  function onTouchMove(e){
    if(pinchState && e.touches.length === 2){
      e.preventDefault();
      schedulePinchMove(e.touches);
    }
  }
  function onTouchEnd(e){
    if(pinchState && e.touches.length < 2) endPinch();
  }
  document.addEventListener('touchstart', onTouchStart, { passive: false, capture: true });
  document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
  document.addEventListener('touchend', onTouchEnd, { capture: true });
  document.addEventListener('touchcancel', onTouchEnd, { capture: true });
  if(!chartWrap) return;
  chartWrap.addEventListener('pointerdown', e=>{
    if(e.pointerType !== 'touch') return;
    ptrMap.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if(ptrMap.size === 2 && lastLayout){
      const pair = ptrTouchPair();
      if(pair && bothTouchesInChart(pair)){
        e.preventDefault();
        try{ chartWrap.setPointerCapture(e.pointerId); }catch(_e){}
        beginPinch(pair);
      }
    }
  }, { capture: true, passive: false });
  chartWrap.addEventListener('pointermove', e=>{
    if(e.pointerType !== 'touch' || !ptrMap.has(e.pointerId)) return;
    ptrMap.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    if(pinchState && ptrMap.size >= 2){
      e.preventDefault();
      const pair = ptrTouchPair();
      if(pair) schedulePinchMove(pair);
    }
  }, { capture: true, passive: false });
  function clearPtr(e){
    ptrMap.delete(e.pointerId);
    if(ptrMap.size < 2 && pinchState) endPinch();
  }
  chartWrap.addEventListener('pointerup', clearPtr, { capture: true });
  chartWrap.addEventListener('pointercancel', clearPtr, { capture: true });
}
installPinchGestures();
function applyFocusZoom(newMin, newMax, dataMin, dataMax){
  let min = Math.max(dataMin, newMin);
  let max = Math.min(dataMax, newMax);
  if(max - min < MIN_FOCUS_SPAN){
    const c = (min + max) / 2;
    min = c - MIN_FOCUS_SPAN / 2;
    max = c + MIN_FOCUS_SPAN / 2;
    if(min < dataMin){ min = dataMin; max = dataMin + MIN_FOCUS_SPAN; }
    if(max > dataMax){ max = dataMax; min = dataMax - MIN_FOCUS_SPAN; }
  }
  if(isFullFocusRange(min, max, dataMin, dataMax)){
    viewWindow = null;
  } else {
    viewWindow = { min, max };
  }
  saveViewWindow();
  render._scrolled = true;
  render();
}
function zoomFocusAt(year, factor, dataMin, dataMax){
  const { min: vMin, max: vMax } = getLogicalRange(dataMin, dataMax);
  const span = vMax - vMin;
  const newSpan = Math.max(MIN_FOCUS_SPAN, span / factor);
  const t = span > 0 ? (year - vMin) / span : 0.5;
  let newMin = year - t * newSpan;
  let newMax = newMin + newSpan;
  if(newMin < dataMin){ newMin = dataMin; newMax = dataMin + newSpan; }
  if(newMax > dataMax){ newMax = dataMax; newMin = dataMax - newSpan; }
  applyFocusZoom(newMin, newMax, dataMin, dataMax);
}
function resetFocusZoom(){
  if(!viewWindow) return;
  viewWindow = null;
  saveViewWindow();
  render._scrolled = true;
  render();
}
function updateFocusUi(dataMin, dataMax){
  const focused = viewWindow && !isFullFocusRange(viewWindow.min, viewWindow.max, dataMin, dataMax);
  if(focusResetBtn) focusResetBtn.disabled = !focused;
  chartScroll.classList.toggle('has-focus-zoom', !!focused);
  if(focusVal){
    focusVal.textContent = focused
      ? `${fmtYear(viewWindow.min)} – ${fmtYear(viewWindow.max)}`
      : 'Todo el rango';
  }
}
function setRectZoomMode(on){
  rectZoomMode = !!on;
  if(focusRectBtn){
    focusRectBtn.classList.toggle('on', rectZoomMode);
    focusRectBtn.setAttribute('aria-pressed', rectZoomMode ? 'true' : 'false');
  }
  chartScroll.classList.toggle('focus-rect-mode', rectZoomMode);
}
function hideFocusMarquee(){
  focusMarquee = null;
  if(focusMarqueeEl){
    focusMarqueeEl.hidden = true;
    focusMarqueeEl.classList.remove('is-visible');
    focusMarqueeEl.style.width = '0';
  }
}
function updateFocusMarqueeDom(x0, x1){
  if(!focusMarqueeEl) return;
  const left = Math.min(x0, x1) - chartScroll.scrollLeft;
  const w = Math.abs(x1 - x0);
  focusMarqueeEl.style.left = left + 'px';
  focusMarqueeEl.style.width = w + 'px';
  focusMarqueeEl.hidden = false;
  focusMarqueeEl.classList.add('is-visible');
}

function bandLabelHtml(text, bandW, slot){
  if(bandW < 44) return '';
  let label = text;
  if(bandW < 72 && label.length > 14){
    label = label.replace(/^Caída de /i, '').replace(/^Exilio /i, '');
  }
  if(bandW < 56 && label.length > 10) label = label.split(/\s+/)[0];
  const top = 6 + (slot % 4) * 12;
  const cls = bandW < 80 ? 'band-label band-label--compact' : 'band-label';
  return `<span class="${cls}" style="top:${top}px" title="${esc(text)}">${esc(label)}</span>`;
}

function potBandLabel(p, bandW){
  if(bandW < 36) return '';
  if(bandW < 64) return `<span class="band-label band-label--compact" title="${esc(p.label)}">${p.icon}</span>`;
  return `<span class="band-label" title="${esc(p.label)}">${p.icon} ${esc(p.label)}</span>`;
}
function fmtYear(y){
  if(y == null || isNaN(y)) return '—';
  if(y >= 33 && y < 34 && y % 1 > 0.001){
    const idx = Math.round((y - 33) * 20);
    if(NISAN_DAYS[idx]) return NISAN_DAYS[idx];
  }
  if(y < 0) return Math.abs(y) + ' a.e.c.';
  if(y === 0) return '0';
  return Math.round(y) + ' e.c.';
}
function fmtRange(ini, fin){
  if(ini === fin) return fmtYear(ini);
  return fmtYear(ini) + ' – ' + fmtYear(fin);
}
/** Fondo con fade lateral donde la fecha es estimada (ini/fe en datos). */
function estBarBg(color, pe){
  if(!pe || (!pe.ie && !pe.fe)) return color;
  const fade = 'transparent';
  const mid = `color-mix(in srgb, ${color} 42%, transparent)`;
  if(pe.ie && pe.fe){
    return `linear-gradient(90deg,${fade} 0%,${mid} 11%,${color} 24%,${color} 76%,${mid} 89%,${fade} 100%)`;
  }
  if(pe.ie){
    return `linear-gradient(90deg,${fade} 0%,${mid} 10%,${color} 26%,${color} 100%)`;
  }
  return `linear-gradient(90deg,${color} 0%,${color} 74%,${mid} 90%,${fade} 100%)`;
}
function estBarClasses(pe){
  const cls = [];
  if(pe.ie) cls.push('est-ini');
  if(pe.fe) cls.push('est-fin');
  return cls;
}
function norm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/\p{M}/gu,''); }

function personNamesFromField(s){
  return (s||'').split(/[,;/]/).map(p=>{
    p = p.trim().replace(/^y\s+/i, '').replace(/\s+y su hija$/i, '').trim();
    return norm(p);
  }).filter(n=>n.length > 1);
}
function esc(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
function viewLabel(){
  return LANE_ORDER.filter(id=>selLanes.has(id)).map(id=>LANE_FILTERS.find(f=>f.id===id).label).join(' · ');
}
function chartYear(ev){
  if(ev.fa == null) return null;
  if(ev.fa === 33 && ev.mfase){
    let idx = NISAN_DAYS.indexOf(ev.mfase);
    if(idx < 0){
      const m = norm(ev.mfase);
      idx = NISAN_DAYS.findIndex(d=>m.includes(norm(d).split('(')[0].trim()));
    }
    if(idx >= 0) return 33 + idx / 20;
  }
  return ev.fa;
}
function chartYearEnd(ev){
  const y = chartYear(ev);
  if(y == null) return null;
  if(ev.fa_fin == null || ev.fa_fin === ev.fa) return y;
  return ev.fa_fin;
}
function eventHasRange(pe){
  return !!(pe.isEvent && pe.inicio != null && pe.fin != null && pe.inicio !== pe.fin);
}
function evToRow(ev, barKey){
  const y = chartYear(ev);
  const yFin = chartYearEnd(ev);
  const estIni = ev.ini_est != null ? !!ev.ini_est : !!ev.fest;
  const estFin = ev.fin_est != null ? !!ev.fin_est : !!ev.fest;
  return {
    id:'ev'+ev.id, n:ev.n, inicio:y, fin:yFin ?? y,
    nota: ev.mcuando || ev.d || ev.ref,
    ie: estIni, fe: estFin,
    isEvent: true, ev, barKey,
  };
}
function computeRangeFromLaneData(laneData){
  const years = [];
  for(const block of laneData){
    for(const pe of block.people){
      if(pe.inicio != null) years.push(pe.inicio);
      if(pe.fin != null) years.push(pe.fin);
    }
  }
  if(!years.length) return [-997, -580];
  return [Math.min(...years), Math.max(...years)];
}
function syncHash(){
  const ids = LANE_ORDER.filter(id=>selLanes.has(id));
  history.replaceState(null, '', '#' + ids.join(','));
}
function parseHash(h){
  if(!h) return null;
  if(LEGACY_HASH[h]) return new Set(LEGACY_HASH[h]);
  const ids = h.split(',').filter(id=>LANE_ORDER.includes(id));
  return ids.length ? new Set(ids) : null;
}
function overlaps(a1,a2,b1,b2){ return a1 <= b2 && b1 <= a2; }

/** ¿Dos barras se pisarían en pantalla al zoom/ancho actuales? (solo píxeles, no años abstractos) */
function periodVisualClash(a, b, chartLayout){
  const { yMin, yMax, chartW } = chartLayout || {};
  if(!chartW || a.inicio == null || b.inicio == null || a.fin == null || b.fin == null) return false;
  const left = a.inicio <= b.inicio ? a : b;
  const right = left === a ? b : a;
  const lx = yearToX(left.inicio, yMin, yMax, chartW);
  const rx = yearToX(right.inicio, yMin, yMax, chartW);
  const lBarW = Math.max(4, yearToX(left.fin, yMin, yMax, chartW) - lx);
  const rBarW = Math.max(4, yearToX(right.fin, yMin, yMax, chartW) - rx);
  const labelW = minBarWidthForPe(left);
  const visualEnd = lx + Math.max(lBarW, labelW);
  const gap = 6;
  if(visualEnd + gap > rx) return true;
  const lBarEnd = lx + lBarW;
  const rBarEnd = rx + rBarW;
  return lBarEnd + gap > rx && rBarEnd + gap > lx;
}

function layoutBlockTracks(people, compact, chartLayout){
  if(!compact) return people.map(pe=>({ people: [pe] }));
  const sorted = [...people].sort((a, b)=>
    (a.inicio ?? 9999) - (b.inicio ?? 9999) ||
    (a.fin ?? 9999) - (b.fin ?? 9999) ||
    a.n.localeCompare(b.n, 'es'),
  );
  const tracks = [];
  for(const pe of sorted){
    if(pe.inicio == null || pe.fin == null){
      tracks.push([pe]);
      continue;
    }
    let placed = false;
    for(const track of tracks){
      const clash = track.some(o=> periodVisualClash(o, pe, chartLayout));
      if(!clash){ track.push(pe); placed = true; break; }
    }
    if(!placed) tracks.push([pe]);
  }
  return tracks.map(people=>({ people }));
}

function laneDataForBounds(rawLaneData){
  return rawLaneData.map(block=>({
    ...block,
    tracks: block.people.map(pe=>({ people: [pe] })),
  }));
}

function enrichLaneData(laneData, q, chartLayout){
  const compact = rowLayout === 'compact';
  const nq = norm(q || '');
  return laneData.map(block=>{
    const active = block.people.filter(pe=>{
      if(!compact && !isPeSelected(pe)) return false;
      return !nq || norm(pe.n).includes(nq);
    });
    return {
      ...block,
      tracks: layoutBlockTracks(active, compact, chartLayout),
    };
  });
}

function collectHiddenInView(laneData, q){
  const nq = norm(q || '');
  const out = [];
  for(const block of laneData){
    for(const pe of block.people){
      if(isPeSelected(pe)) continue;
      if(nq && !norm(pe.n).includes(nq)) continue;
      out.push({ pe, meta: block.meta });
    }
  }
  return out.sort((a, b)=>
    (a.pe.inicio ?? 9999) - (b.pe.inicio ?? 9999) ||
    a.pe.n.localeCompare(b.pe.n, 'es'),
  );
}

function hiddenPeChip({ pe, meta }){
  return `<label class="hidden-pe-chip" title="Volver a mostrar en ${esc(meta.label)}">`+
    `<input type="checkbox" class="pe-pick pe-pick--restore" data-pe-key="${esc(peKey(pe))}" aria-label="Mostrar ${esc(pe.n)}" />`+
    `<span class="hidden-pe-chip__name">${esc(pe.n)}</span>`+
    `<span class="hidden-pe-chip__meta">${esc(fmtRange(pe.inicio, pe.fin))} · ${esc(meta.label)}</span>`+
    `</label>`;
}

function renderHiddenDock(hiddenList){
  const dock = document.getElementById('hidden-dock');
  if(!dock) return;
  if(!hiddenList.length){
    dock.hidden = true;
    dock.innerHTML = '';
    return;
  }
  dock.hidden = false;
  dock.innerHTML =
    `<div class="hidden-dock__aside">`+
      `<span class="hidden-dock__title">Ocultos</span>`+
      `<span class="hidden-dock__count">${hiddenList.length}</span>`+
      `<span class="hidden-dock__hint">Marca para volver a la línea</span>`+
    `</div>`+
    `<div class="hidden-dock__chips">${hiddenList.map(hiddenPeChip).join('')}</div>`;
  dock.querySelectorAll('.hidden-pe-chip').forEach(chip=>{
    chip.addEventListener('click', e=>{
      if(e.target.closest('.pe-pick')) return;
      const key = chip.querySelector('.pe-pick')?.dataset.peKey;
      const pe = findPeByKey(key);
      if(pe) openPersonFromClick(pe, e);
    });
  });
}

function findPeByKey(key){
  if(!key) return null;
  const p = D.personajes.find(x=>peKey(x)===key);
  if(p) return p;
  for(const block of buildAllLaneData()){
    for(const pe of block.people){
      if(peKey(pe)===key) return pe;
    }
  }
  return null;
}

function trackRowHeight(L, count){
  if(rowLayout === 'compact') return L.rowH;
  if(count <= 1) return L.rowH;
  return L.rowH + Math.min(count - 1, 5) * 18;
}

function countTracks(laneData){
  return laneData.reduce((n, b)=> n + b.tracks.length, 0);
}

function fichaYearsFromHitos(hitos){
  const years = [];
  (hitos || []).forEach(h=>{
    let m = h.match(/(\d{3,4})\s*a\.?\s*E\.?\s*C\.?/i);
    if(m) years.push(-parseInt(m[1], 10));
    m = h.match(/\((?:c\.\s*)?(\d{3,4})\s*a\.?\s*E/i);
    if(m) years.push(-parseInt(m[1], 10));
    m = h.match(/(\d{1,2})\s*E\.?\s*C\.?(?!\s*C)/i);
    if(m) years.push(parseInt(m[1], 10));
  });
  if(!years.length) return null;
  return [Math.min(...years), Math.max(...years)];
}

function fichaYearRange(f){
  const nac = f.nac !== '' && f.nac != null ? parseInt(f.nac, 10) : NaN;
  const fal = f.fal !== '' && f.fal != null ? parseInt(f.fal, 10) : NaN;
  if(!Number.isNaN(nac) && !Number.isNaN(fal)) return [Math.min(nac, fal), Math.max(nac, fal)];
  if(!Number.isNaN(nac)) return [nac, nac];
  if(!Number.isNaN(fal)) return [fal, fal];
  const p1 = f.primera !== '' && f.primera != null ? parseInt(f.primera, 10) : NaN;
  const p2 = f.ultima !== '' && f.ultima != null ? parseInt(f.ultima, 10) : NaN;
  if(!Number.isNaN(p1) && !Number.isNaN(p2)) return [Math.min(p1, p2), Math.max(p1, p2)];
  if(!Number.isNaN(p1)) return [p1, p1];
  if(!Number.isNaN(p2)) return [p2, p2];
  return fichaYearsFromHitos(f.hitos);
}

function fichaMatchesEvent(ev, f){
  const parts = personNamesFromField(ev.per);
  const name = norm(f.nombre);
  if(parts.includes(name)) return true;
  if(f.alt){
    return f.alt.split(';').some(a=>{
      a = norm(a.trim());
      return a && parts.includes(a);
    });
  }
  return false;
}

function parsePeNames(pe){
  if(!pe.n) return [];
  if(!pe.n.includes(',')) return [pe.n.trim()];
  return pe.n.split(',').map(s=>{
    s = s.trim().replace(/^y\s+/i, '').replace(/\s+y su hija$/i, '').trim();
    return s;
  }).filter(s=>s.length > 2);
}

function isCompositeFicha(f){
  return (f.nombre.match(/,/g) || []).length >= 2;
}

function fichasForPeriod(pe){
  const F = window.LT_FICHAS;
  if(!F || !F.length || pe.inicio == null || pe.fin == null) return [];
  const y0 = pe.inicio;
  const y1 = pe.fin;
  const peNameFull = norm(pe.n);
  const peNames = parsePeNames(pe).map(norm);
  const composite = peNames.length > 1;
  const linkedEvs = eventsForPersonDrawer(pe);
  const seen = new Set();
  const out = [];

  for(const f of F){
    if(seen.has(f.id) || isCompositeFicha(f)) continue;
    const fName = norm(f.nombre);
    if(fName === peNameFull) continue;

    let include = composite && peNames.includes(fName);
    const range = fichaYearRange(f);
    if(!include && range && overlaps(range[0], range[1], y0, y1)) include = true;
    if(!include){
      include = D.eventos.some(ev=>{
        if(ev.fa == null || ev.tipo === 'reinado') return false;
        const y = chartYear(ev) ?? ev.fa;
        if(y < y0 || y > y1) return false;
        return fichaMatchesEvent(ev, f);
      });
    }
    if(!include){
      include = linkedEvs.some(ev=> fichaMatchesEvent(ev, f));
    }
    if(include){
      seen.add(f.id);
      out.push(f);
    }
  }

  return out.sort((a, b)=>{
    const ra = fichaYearRange(a);
    const rb = fichaYearRange(b);
    const ya = ra ? ra[0] : (a.primera ? parseInt(a.primera, 10) : 9999);
    const yb = rb ? rb[0] : (b.primera ? parseInt(b.primera, 10) : 9999);
    return ya - yb || a.nombre.localeCompare(b.nombre, 'es');
  });
}

function renderFichaChips(fichas){
  if(!fichas.length){
    return '<span class="ph">Sin fichas registradas para este periodo.</span>';
  }
  return '<div class="char-cards">' + fichas.map(f=>{
    const prof = [f.profesion, f.profesion_2].filter(Boolean).join(' · ');
    const href = 'fichas.html?id=' + encodeURIComponent(f.id);
    return '<a class="char-card" href="'+href+'" title="Ver ficha de '+esc(f.nombre)+'">'+
      '<span class="char-card__name">'+esc(f.nombre)+'</span>'+
      (prof ? '<span class="char-card__prof">'+esc(prof)+'</span>' : '')+
      '</a>';
  }).join('') + '</div>';
}

function orbRadius(pe){
  if(pe.isEvent) return 5;
  const dur = Math.max(0, (pe.fin ?? pe.inicio) - (pe.inicio ?? pe.fin));
  if(dur <= 0.05) return 6;
  return Math.min(16, Math.max(7, 7 + Math.sqrt(dur) * 0.75));
}

function rowsForLanes(laneNames){
  const out = [];
  for(const ln of laneNames){
    const meta = LANE_META[ln];
    if(!meta) continue;
    const people = D.personajes
      .filter(p=>p.grupo===ln && p.inicio != null && p.fin != null)
      .sort((a,b)=>(a.inicio-b.inicio)||a.n.localeCompare(b.n,'es'));
    out.push({ lane: ln, meta, people });
  }
  return out;
}

function buildMinisterioBlocks(){
  const blocks = [];
  for(const fase of (D.ministerio_fases || [])){
    const events = fase.eventos
      .map(id=>D.eventos.find(e=>e.id===id))
      .filter(e=>e && chartYear(e)!=null)
      .sort((a,b)=>(chartYear(a)-chartYear(b))||a.n.localeCompare(b.n,'es'));
    if(!events.length) continue;
    blocks.push({
      lane: fase.codigo,
      meta: { key:'jes', color:'var(--lane-jes)', label: fase.codigo + ' · ' + fase.titulo },
      people: events.map(ev=>evToRow(ev, 'jes')),
    });
  }
  return blocks;
}

function buildUltimaSemanaBlocks(){
  const blocks = [];
  for(const dia of (D.ultima_semana_dias || [])){
    const events = dia.eventos
      .map(id=>D.eventos.find(e=>e.id===id))
      .filter(e=>e && chartYear(e)!=null);
    if(!events.length) continue;
    blocks.push({
      lane: dia.titulo,
      meta: { key:'sem', color:'var(--lane-sem)', label: dia.titulo },
      people: events.map(ev=>evToRow(ev, 'sem')),
    });
  }
  return blocks;
}

function buildThemeBlocks(tema, laneId){
  const meta = THEME_LANE_META[tema];
  if(!meta) return [];
  const events = D.eventos
    .filter(e=>(e.t||[]).includes(tema) && chartYear(e)!=null && e.tipo !== 'reinado')
    .sort((a,b)=>(chartYear(a)-chartYear(b))||a.n.localeCompare(b.n,'es'));
  if(!events.length) return [];
  return [{
    lane: meta.label,
    meta: { key: laneId, color: meta.color, label: meta.label },
    people: events.map(ev=>evToRow(ev, laneId)),
  }];
}

/** ¿Esta fila aportaría contenido visible con la configuración actual? */
function laneFilterHasContent(f){
  if(f.mode === 'personaje'){
    return D.personajes.some(p=>p.grupo === f.grupo && p.inicio != null && p.fin != null);
  }
  if(f.mode === 'ministerio') return buildMinisterioBlocks().length > 0;
  if(f.mode === 'ultima_semana') return buildUltimaSemanaBlocks().length > 0;
  if(f.mode === 'tema'){
    if(showMarkers && f.tema !== 'NT-ESCRITURA') return false;
    return buildThemeBlocks(f.tema, f.id).length > 0;
  }
  return false;
}

function availableLaneFilters(){
  return laneFiltersSorted().filter(laneFilterHasContent);
}

function pruneSelLanes(){
  const avail = new Set(availableLaneFilters().map(f=>f.id));
  for(const id of [...selLanes]){
    if(!avail.has(id)) selLanes.delete(id);
  }
  try{ localStorage.setItem('lt-par-lanes', JSON.stringify([...selLanes])); }catch(e){}
}

function buildAllLaneData(){
  const out = [];
  for(const id of LANE_ORDER){
    if(!selLanes.has(id)) continue;
    const f = LANE_FILTERS.find(x=>x.id===id);
    if(f.mode === 'personaje') out.push(...rowsForLanes([f.grupo]));
    else if(f.mode === 'ministerio') out.push(...buildMinisterioBlocks());
    else if(f.mode === 'ultima_semana') out.push(...buildUltimaSemanaBlocks());
    else if(f.mode === 'tema'){
      // Con marcadores activos, los sucesos temáticos van sobre personajes — salvo Escritura NT
      if(showMarkers && f.tema !== 'NT-ESCRITURA') continue;
      out.push(...buildThemeBlocks(f.tema, f.id));
    }
  }
  return out;
}

function yearToX(y, yMin, yMax, width){
  return ((y - yMin) / (yMax - yMin)) * width;
}

function tickStep(span2, yMin, yMax){
  if(yMin >= 32 && yMax <= 34 && span2 < 2) return 0.05;
  const steps = [1, 2, 5, 10, 25, 50, 100, 200, 500];
  for(const step of steps){
    if(span2 / step <= 14) return step;
  }
  return 100;
}

function isRedaccionTipo(tipo){
  const t = norm(tipo || '');
  return t.includes('redaccion');
}

/** Quién lleva marcador en la fila del personaje (evita duplicar cartas en autor y destinatario). */
function eventMarkerPeople(ev){
  const parts = personNamesFromField(ev.per);
  if(!parts.length) return parts;
  if(isRedaccionTipo(ev.tipo) && parts.length >= 2){
    return parts.slice(1);
  }
  return parts;
}

function peNormParts(pe){
  if(!pe || !pe.n) return [];
  return pe.n.includes(',') ? personNamesFromField(pe.n) : [norm(pe.n.trim())];
}

function eventMatchesPerson(ev, pe){
  const markers = eventMarkerPeople(ev);
  if(!markers.length || !pe.n) return false;
  const peParts = peNormParts(pe);
  return peParts.some(pn=> pn && markers.includes(pn));
}

function personajeFieldMatches(pe, qPerRaw){
  const peParts = peNormParts(pe);
  if(!peParts.length) return false;
  const qNorm = norm(qPerRaw || '');
  if(!qNorm) return false;
  const qParts = personNamesFromField(qPerRaw);
  if(qParts.length){
    return peParts.some(pn=> qParts.includes(pn));
  }
  return peParts.some(pn=> qNorm.includes(pn) || pn.includes(qNorm));
}

function questionMatchesPerson(q, pe, ev){
  const qPer = (q.per || '').trim();
  if(qPer) return personajeFieldMatches(pe, qPer);
  if(ev && isRedaccionTipo(ev.tipo)){
    const markers = eventMarkerPeople(ev);
    const peParts = peNormParts(pe);
    return peParts.some(pn=> markers.includes(pn));
  }
  return true;
}

function questionsForPerson(pe, evs){
  const seen = new Set();
  const out = [];
  for(const ev of evs){
    for(const p of (D.preguntas || [])){
      if(p.hid !== ev.id || seen.has(p.id)) continue;
      if(!questionMatchesPerson(p, pe, ev)) continue;
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

function eventsForPerson(pe, yMin, yMax){
  if(pe.isEvent) return [];
  return D.eventos.filter(ev=>{
    if(ev.tipo === 'reinado') return false;
    const fa = ev.fa;
    if(fa == null || fa < yMin || fa > yMax) return false;
    return eventMatchesPerson(ev, pe);
  });
}

function eventsForPersonDrawer(pe){
  if(pe.isEvent) return [];
  return D.eventos.filter(ev=>{
    if(ev.tipo === 'reinado') return false;
    if(ev.fa == null) return false;
    return eventMatchesPerson(ev, pe);
  }).sort((a,b)=>(a.fa-b.fa)||a.n.localeCompare(b.n,'es'));
}

function scrollToYear(year, yMin, yMax, chartW){
  const x = yearToX(year, yMin, yMax, chartW);
  chartScroll.scrollLeft = Math.max(0, x - chartScroll.clientWidth * 0.38);
}

function laneFiltersSorted(){
  return [...LANE_FILTERS].sort((a, b)=>a.cron - b.cron);
}

function buildLaneFilters(){
  pruneSelLanes();
  const sl = laneFiltersEl.scrollLeft;
  laneFiltersEl.innerHTML = availableLaneFilters().map(f=>{
    const on = selLanes.has(f.id);
    return `<label class="lane-check${on?' on':''}">`+
      `<input type="checkbox" data-id="${f.id}"${on?' checked':''} />`+
      `<span class="filter-dot" style="background:${f.color}"></span>`+
      `<span>${f.label}</span></label>`;
  }).join('');
  laneFiltersEl.scrollLeft = sl;
  laneFiltersEl.querySelectorAll('input[type=checkbox]').forEach(box=>{
    box.addEventListener('change', ()=>{
      const id = box.dataset.id;
      if(box.checked) selLanes.add(id); else selLanes.delete(id);
      localStorage.setItem('lt-par-lanes', JSON.stringify([...selLanes]));
      syncHash();
      render._scrolled = false;
      buildLaneFilters();
      render();
    });
  });
}

function buildPotChips(){
  potChipsEl.innerHTML = POTENCIAS.map(p=>
    `<button type="button" class="pot-chip${selPots.has(p.id)?' on':' off'}" data-id="${p.id}">${p.icon} ${p.label}</button>`
  ).join('');
  potChipsEl.querySelectorAll('.pot-chip').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const id = btn.dataset.id;
      if(selPots.has(id)) selPots.delete(id); else selPots.add(id);
      localStorage.setItem('lt-par-pots', JSON.stringify([...selPots]));
      buildPotChips();
      render();
    });
  });
}

function showTipHtml(html, ev){
  tooltip.style.display = 'block';
  tooltip.innerHTML = html;
  moveTip(ev);
}
function showPeTip(ev, pe){
  const est = (pe.ie||pe.fe) ? '<div class="t-est">Fechas estimadas (lámina JW)</div>' : '';
  showTipHtml(
    `<div class="t-name">${esc(pe.n)}</div><div class="t-dates">${fmtRange(pe.inicio, pe.fin)}</div>`+
    (pe.nota ? `<div class="t-note">${esc(pe.nota)}</div>` : '') + est, ev);
}
function showEvTip(ev, e){
  const when = e.mcuando ? `<div class="t-note">${esc(e.mcuando)}</div>` : '';
  let dates = fmtYear(chartYear(e) ?? e.fa);
  if(e.fa_fin != null && e.fa_fin !== e.fa){
    dates += ' – ' + (e.ft_fin || fmtYear(e.fa_fin));
  }
  const est = (e.fest || e.ini_est || e.fin_est) ? '<div class="t-est">Fechas estimadas</div>' : '';
  showTipHtml(
    `<div class="t-name">${esc(e.n)}</div><div class="t-dates">${dates} · ${esc(e.tipo||'')}</div>`+
    (e.d ? `<div class="t-note">${esc(e.d)}</div>` : '') + when + est, ev);
}
function moveTip(ev){
  const pad = 14;
  let x = ev.clientX + pad, y = ev.clientY + pad;
  const r = tooltip.getBoundingClientRect();
  if(x + r.width > innerWidth - 8) x = ev.clientX - r.width - pad;
  if(y + r.height > innerHeight - 8) y = ev.clientY - r.height - pad;
  tooltip.style.left = x + 'px';
  tooltip.style.top = y + 'px';
}
function hideTip(){ tooltip.style.display = 'none'; }

// ---------- drawer (detalle de suceso) ----------
const drawer = document.getElementById('drawer');
const overlay = document.getElementById('overlay');
let openDrawerId = null;

const DRAWER_THEMES = [
  ['GENESIS','Génesis'],['EXODO','Éxodo'],['CONQUISTA','Conquista'],['JUECES','Jueces'],
  ['REYES','Reyes'],['PROFETAS','Profetas'],['EXILIO','Exilio'],['RESTAURACION','Restauración'],
  ['SIGLO-PRIMERO','Siglo primero'],['HECHOS','Hechos de los apóstoles'],
  ['NT-ESCRITURA','Escritura del NT'],
];
const DRAWER_ERAS = [
  {id:'pre', color:'var(--c-pre)', keys:['PREHISTORIA / GÉNESIS','DILUVIO']},
  {id:'pat', color:'var(--c-pat)', keys:['POSTDILUVIANO','PATRIARCAS']},
  {id:'egi', color:'var(--c-egi)', keys:['EGIPTO']},
  {id:'jue', color:'var(--c-jue)', keys:['CONQUISTA','JUECES']},
  {id:'mon', color:'var(--c-mon)', keys:['MONARQUÍA']},
  {id:'div', color:'var(--c-div)', keys:['REINO DIVIDIDO']},
  {id:'exi', color:'var(--c-exi)', keys:['EXILIO']},
  {id:'res', color:'var(--c-res)', keys:['RESTAURACIÓN']},
  {id:'ec', color:'var(--c-ec)', keys:['E.C.']},
];
const drawerEraCol = {};
DRAWER_ERAS.forEach(c=>c.keys.forEach(k=>{ drawerEraCol[k]=c; }));
const DRAWER_POTS = [
  ['EGIPTO','Egipto','🏛️',-1600,-874],['ASIRIA','Asiria','🐂',-874,-625],['BABILONIA','Babilonia','🦁',-625,-539],
  ['MEDOPERSIA','Medopersia','🐻',-539,-332],['GRECIA','Grecia','🐆',-332,-63],['ROMA','Roma','🦅',-63,100],
];
const DRAWER_RELS = D.relaciones || [];
const DRAWER_REL_LABEL = {causa:'Causa', paralelo:'Paralelo'};
const DRAWER_TIPO_ICON = {
  batalla:'⚔️', milagro:'✨', 'resurrección':'🌟', 'profecía':'🔮', 'enseñanza':'📖',
  juicio:'⚖️', bautismo:'💧', nacimiento:'👶', muerte:'⚰️', liberación:'🕊️', reunión:'🏛️', otro:'📜',
};

function drawerEraKey(e){
  if(!e) return 'E.C.';
  if(e.indexOf('PREHISTORIA')>=0) return 'PREHISTORIA / GÉNESIS';
  if(e.indexOf('POSTDILUVIANO')>=0 || e.indexOf('PATRIARCA')>=0) return 'PATRIARCAS';
  if(e.indexOf('DILUVIO')>=0) return 'DILUVIO';
  if(e.indexOf('GENEALOG')>=0) return 'PREHISTORIA / GÉNESIS';
  if(e.indexOf('EGIPTO')>=0 || e.indexOf('EXODO')>=0 || e.indexOf('DESIERTO')>=0 || e.indexOf('LEY')>=0) return 'EGIPTO';
  if(e.indexOf('CONQUISTA')>=0) return 'CONQUISTA';
  if(e.indexOf('JUECES')>=0) return 'JUECES';
  if(e.indexOf('MONARQUÍA')>=0 || e.indexOf('JUEZ/MONARQUÍA')>=0) return 'MONARQUÍA';
  if(e.indexOf('REINO DIVIDIDO')>=0) return 'REINO DIVIDIDO';
  if(e.indexOf('EXILIO')>=0) return 'EXILIO';
  if(e.indexOf('RESTAURACIÓN')>=0) return 'RESTAURACIÓN';
  return 'E.C.';
}
function drawerTipoBucket(t){
  const s = (t||'').toLowerCase();
  if(s.includes('batall')) return 'batalla';
  if(s.includes('milagr')) return 'milagro';
  if(s.includes('resurrecc')) return 'resurrección';
  if(s.includes('profec') || s.includes('visi')) return 'profecía';
  if(s.includes('predic') || s.includes('discurs') || s.includes('enseñ')) return 'enseñanza';
  if(s.includes('juic')) return 'juicio';
  if(s.includes('bautis')) return 'bautismo';
  if(s.includes('naci')) return 'nacimiento';
  if(s.includes('muert') || s.includes('marti') || s.includes('arrest')) return 'muerte';
  if(s.includes('lib') || s.includes('salv')) return 'liberación';
  if(s.includes('ador') || s.includes('reuni') || s.includes('entrada') || s.includes('institu')) return 'reunión';
  return 'otro';
}
function drawerPotenciaOf(fa){
  if(fa == null) return null;
  return DRAWER_POTS.find(x=>fa >= x[3] && fa <= x[4]) || null;
}
function drawerRelacionesDe(id){
  return DRAWER_RELS.filter(r=>r.a === id || r.b === id).map(r=>{
    const otro = r.a === id ? r.b : r.a;
    const dir = r.a === id ? '→' : '←';
    return { otro, dir, tipo:r.tipo, nota:r.nota };
  });
}
function drawerRelNombre(id){
  const e = D.eventos.find(x=>x.id === id);
  return e ? e.n : ('#' + id);
}
function drawerColOf(ev){
  return drawerEraCol[drawerEraKey(ev.era)] || DRAWER_ERAS[DRAWER_ERAS.length - 1];
}
function fmtFechaDrawer(fa){ return fmtYear(fa); }

function answerText(q){
  const raw = q.a ?? q.respuesta ?? '';
  return String(raw).trim();
}
function questionAnswerHtml(q){
  const ans = answerText(q);
  return ans
    ? '<small>'+esc(ans)+'</small>'
    : '<small class="ph">Respuesta no disponible</small>';
}
function renderQuestionList(qs, limit){
  const slice = limit ? qs.slice(0, limit) : qs;
  return slice.map(q=>'<div class="q">'+esc(q.q)+questionAnswerHtml(q)+'</div>').join('');
}

function formatPersonRef(ref){
  if(!ref) return '';
  return ref.split('\n\n').map(block=>{
    const lines = block.split('\n');
    if(lines.length >= 2 && lines.every(l=>l.includes(' | '))){
      const [h1, h2] = lines[0].split(' | ').map(s=>s.trim());
      const rows = lines.slice(1).map(l=>l.split(' | ').map(s=>s.trim()));
      return '<table class="ref-table"><thead><tr><th>'+esc(h1)+'</th><th>'+esc(h2)+'</th></tr></thead><tbody>'+
        rows.map(r=>'<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1]||'')+'</td></tr>').join('')+
        '</tbody></table>';
    }
    if(block.startsWith('JUECES')){
      return '<p><strong>JUECES</strong>'+esc(block.slice(6))+'</p>';
    }
    if(block.startsWith('"') || block.startsWith('“')){
      return '<p class="ref-note">'+esc(block)+'</p>';
    }
    return '<p>'+esc(block)+'</p>';
  }).join('');
}

function openDrawer(ev){
  if(!ev || !drawer) return;
  hideTip();
  const col = drawerColOf(ev);
  document.getElementById('d-badge').textContent = drawerEraKey(ev.era);
  document.getElementById('d-badge').style.background = col.color;
  document.getElementById('d-title').textContent = ev.n;
  let dateLine = ev.ft || fmtFechaDrawer(ev.fa);
  if(ev.fa_fin != null && ev.fa_fin !== ev.fa){
    dateLine += ' – ' + (ev.ft_fin || fmtFechaDrawer(ev.fa_fin));
  }
  document.getElementById('d-date').textContent = dateLine + (ev.lug ? ' · ' + ev.lug : '');
  const refEl = document.getElementById('d-ref');
  refEl.textContent = ev.ref ? ('“' + ev.ref + '”') : 'Sin referencia registrada.';
  refEl.className = '';
  const descEl = document.getElementById('d-desc');
  const desc = ev.d || 'Sin descripción.';
  if(desc.includes('\n\n')){
    descEl.innerHTML = desc.split('\n\n').map(p=>'<p>'+esc(p.trim())+'</p>').join('');
  } else {
    descEl.textContent = desc;
  }
  document.getElementById('d-char').innerHTML = (ev.per || '—').split(/[,/]/).filter(Boolean)
    .map(c=>'<span class="chip">'+esc(c.trim())+'</span>').join('');
  document.getElementById('d-meta').innerHTML =
    '<span class="k">Año</span><span>'+fmtFechaDrawer(ev.fa)+'</span>'+
    '<span class="k">Lugar</span><span>'+esc(ev.lug||'—')+(ev.lat!=null?' <small style="color:var(--mut)">('+ev.lat+', '+ev.lon+')</small>':'')+'</span>'+
    '<span class="k">Tipo</span><span>'+(DRAWER_TIPO_ICON[drawerTipoBucket(ev.tipo)]||'')+' '+esc(ev.tipo||'—')+'</span>'+
    '<span class="k">Era</span><span>'+esc(drawerEraKey(ev.era))+'</span>';
  document.getElementById('d-temas').innerHTML = (ev.t || []).map(t=>{
    const tm = DRAWER_THEMES.find(x=>x[0]===t);
    return '<span class="chip t">'+esc(tm ? tm[1] : t)+'</span>';
  }).join('') || '<span class="ph">—</span>';
  const rels = drawerRelacionesDe(ev.id);
  const relSec = document.getElementById('d-rel-sec');
  const relEl = document.getElementById('d-rel');
  relSec.querySelector('h3').textContent = 'Relaciones con otros sucesos';
  if(rels.length){
    relSec.style.display = 'block';
    relEl.innerHTML = rels.map(r=>`
      <div class="rel-edge rt-${r.tipo}" data-jump="${r.otro}">
        <span class="rt">${DRAWER_REL_LABEL[r.tipo]||r.tipo} ${r.dir}</span>
        <div><span class="rn">${esc(drawerRelNombre(r.otro))}</span>${r.nota?'<div class="rnota">'+esc(r.nota)+'</div>':''}</div>
      </div>`.replace(/\s+/g,' ')).join('');
    relEl.querySelectorAll('.rel-edge').forEach(el=>{
      el.onclick = ()=>{
        const ev2 = D.eventos.find(x=>x.id === parseInt(el.dataset.jump, 10));
        if(ev2) openDrawer(ev2);
      };
    });
  } else {
    relSec.style.display = 'none';
    relEl.innerHTML = '';
  }
  const pot = drawerPotenciaOf(ev.fa);
  document.getElementById('d-par').innerHTML = pot
    ? '<span class="pw">Potencia mundial: '+pot[2]+' '+pot[1]+'</span> <span style="color:var(--mut)">('+fmtFechaDrawer(pot[3])+' a '+fmtFechaDrawer(pot[4])+')</span>'
    : '<span style="color:var(--mut)">Antes de las potencias mundiales de la cronología JW (Egipto desde 1600 a. E. C.).</span>';
  const qs = (D.preguntas || []).filter(p=>p.hid === ev.id);
  const listEl = document.getElementById('d-qlist');
  const moreEl = document.getElementById('d-more');
  document.getElementById('d-qcount').textContent = 'Preguntas vinculadas: ' + qs.length;
  listEl.innerHTML = renderQuestionList(qs, 8) ||
    '<span class="ph">Este suceso aún no tiene preguntas vinculadas.</span>';
  moreEl.style.display = qs.length > 8 ? 'block' : 'none';
  moreEl.onclick = ()=>{
    listEl.innerHTML = renderQuestionList(qs);
    moreEl.style.display = 'none';
  };
  const linkApp = document.getElementById('link-app');
  if(linkApp) linkApp.style.display = 'none';
  drawer.classList.add('on');
  overlay.classList.add('on');
  openDrawerId = 'e' + ev.id;
}

function openPersonDrawer(pe){
  if(!pe || pe.isEvent || !drawer) return;
  hideTip();
  const est = (pe.ie||pe.fe) ? ' · fechas estimadas (lámina JW)' : '';
  document.getElementById('d-badge').textContent = pe.grupo || pe.seccion || 'Personaje';
  document.getElementById('d-badge').style.background = 'var(--acc)';
  document.getElementById('d-title').textContent = pe.n;
  document.getElementById('d-date').textContent = fmtRange(pe.inicio, pe.fin) + est;
  const refEl = document.getElementById('d-ref');
  if(pe.ref){
    refEl.innerHTML = formatPersonRef(pe.ref);
    refEl.className = 'ref-long';
  } else {
    refEl.textContent = pe.nota ? ('“' + pe.nota + '”') : 'Sin referencia registrada.';
    refEl.className = '';
  }
  document.getElementById('d-desc').textContent = pe.nota || 'Personaje en la línea de tiempo bíblica.';
  document.getElementById('d-char').innerHTML = renderFichaChips(fichasForPeriod(pe));
  document.getElementById('d-meta').innerHTML =
    '<span class="k">Inicio</span><span>'+fmtYear(pe.inicio)+'</span>'+
    '<span class="k">Fin</span><span>'+fmtYear(pe.fin)+'</span>'+
    '<span class="k">Grupo</span><span>'+esc(pe.grupo||'—')+'</span>'+
    '<span class="k">Sección</span><span>'+esc(pe.seccion||'—')+'</span>';
  document.getElementById('d-temas').innerHTML = '<span class="ph">—</span>';
  const evs = eventsForPersonDrawer(pe);
  const relSec = document.getElementById('d-rel-sec');
  const relEl = document.getElementById('d-rel');
  relSec.querySelector('h3').textContent = 'Sucesos vinculados';
  if(evs.length){
    relSec.style.display = 'block';
    relEl.innerHTML = evs.map(ev=>`
      <div class="rel-edge rt-paralelo" data-jump="${ev.id}">
        <span class="rt">${fmtYear(chartYear(ev) ?? ev.fa)}</span>
        <div><span class="rn">${esc(ev.n)}</span>${ev.d?'<div class="rnota">'+esc(ev.d)+'</div>':''}</div>
      </div>`.replace(/\s+/g,' ')).join('');
    relEl.querySelectorAll('.rel-edge').forEach(el=>{
      el.onclick = ()=>{
        const ev2 = D.eventos.find(x=>x.id === parseInt(el.dataset.jump, 10));
        if(ev2) openDrawer(ev2);
      };
    });
  } else {
    relSec.style.display = 'block';
    relEl.innerHTML = '<span class="ph">No hay sucesos vinculados registrados.</span>';
  }
  const pot = drawerPotenciaOf(pe.inicio);
  document.getElementById('d-par').innerHTML = pot
    ? '<span class="pw">Potencia mundial al inicio: '+pot[2]+' '+pot[1]+'</span>'
    : '<span style="color:var(--mut)">Contexto histórico según la cronología bíblica.</span>';
  const qs = questionsForPerson(pe, evs);
  const listEl = document.getElementById('d-qlist');
  const moreEl = document.getElementById('d-more');
  document.getElementById('d-qcount').textContent = 'Preguntas vinculadas: ' + qs.length;
  listEl.innerHTML = renderQuestionList(qs, 8) ||
    '<span class="ph">Sin preguntas vinculadas a los sucesos de este personaje.</span>';
  moreEl.style.display = qs.length > 8 ? 'block' : 'none';
  moreEl.onclick = ()=>{
    listEl.innerHTML = renderQuestionList(qs);
    moreEl.style.display = 'none';
  };
  drawer.classList.add('on');
  overlay.classList.add('on');
  openDrawerId = 'p' + pe.id;
}
function closeDrawer(){
  if(!drawer) return;
  drawer.classList.remove('on');
  overlay.classList.remove('on');
  openDrawerId = null;
}
function openDrawerFromClick(ev, e){
  if(e) e.stopPropagation();
  openDrawer(ev);
}
function openPersonFromClick(pe, e){
  if(e) e.stopPropagation();
  openPersonDrawer(pe);
}

function bindDrawerTargets(root){
  root.querySelectorAll('.bar').forEach(bar=>{
    if(bar.dataset.ev){
      const ev = D.eventos.find(e=>String(e.id)===bar.dataset.ev);
      bar.addEventListener('mouseenter', e=> showEvTip(e, ev));
      bar.addEventListener('mousemove', moveTip);
      bar.addEventListener('mouseleave', hideTip);
      bar.addEventListener('click', e=> openDrawerFromClick(ev, e));
      bar.addEventListener('keydown', e=>{
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openDrawerFromClick(ev, e); }
      });
      return;
    }
    const pe = D.personajes.find(p=>peKey(p)===bar.dataset.pe);
    if(!pe) return;
    if(bar.classList.contains('bar-compact-narrow')){
      bar.addEventListener('click', e=> openPersonFromClick(pe, e));
      bar.addEventListener('keydown', e=>{
        if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openPersonFromClick(pe, e); }
      });
      return;
    }
    bar.addEventListener('mouseenter', e=> showPeTip(e, pe));
    bar.addEventListener('mousemove', moveTip);
    bar.addEventListener('mouseleave', hideTip);
    bar.addEventListener('focus', e=> showPeTip(e, pe));
    bar.addEventListener('blur', hideTip);
    bar.addEventListener('click', e=> openPersonFromClick(pe, e));
    bar.addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openPersonFromClick(pe, e); }
    });
  });
  root.querySelectorAll('.row-label__entry[data-ev]').forEach(el=>{
    const ev = D.eventos.find(e=>String(e.id)===el.dataset.ev);
    if(!ev) return;
    el.addEventListener('click', e=>{
      if(e.target.closest('.row-label__pick')) return;
      openDrawerFromClick(ev, e);
    });
  });
  root.querySelectorAll('.row-label__entry[data-pe]').forEach(el=>{
    if(el.dataset.ev) return;
    const pe = D.personajes.find(p=>peKey(p)===el.dataset.pe);
    if(!pe) return;
    el.addEventListener('click', e=>{
      if(e.target.closest('.row-label__pick')) return;
      openPersonFromClick(pe, e);
    });
  });
}

if(drawer){
  document.getElementById('d-close').onclick = closeDrawer;
  overlay.onclick = closeDrawer;
  document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeDrawer(); });
}

function bindPePickers(){
  if(rowLayout === 'compact') return;
  document.querySelectorAll('.pe-pick').forEach(box=>{
    box.addEventListener('change', ()=>{
      const key = box.dataset.peKey;
      if(box.checked) hiddenPeople.delete(key);
      else hiddenPeople.add(key);
      saveHiddenPeople();
      render._scrolled = true;
      render();
    });
    box.addEventListener('click', e=> e.stopPropagation());
  });
}

function bindRowHover(){
  let active = null;
  function peIdFromEl(el){ return el.dataset.pe; }
  function setHover(peId, on){
    if(!peId) return;
    labelsCol.querySelectorAll(`[data-pe="${peId}"]`).forEach(el=>el.classList.toggle('is-hovered', on));
    chartCanvas.querySelectorAll(`.bar[data-pe="${peId}"]`).forEach(el=>el.classList.toggle('is-hovered', on));
  }
  function enter(el){
    const id = peIdFromEl(el);
    if(active && active !== id) setHover(active, false);
    active = id;
    setHover(id, true);
  }
  function leave(el){
    const id = peIdFromEl(el);
    setHover(id, false);
    if(active === id) active = null;
  }
  labelsCol.querySelectorAll('[data-pe]').forEach(el=>{
    el.addEventListener('mouseenter', ()=>enter(el));
    el.addEventListener('mouseleave', ()=>leave(el));
  });
  chartCanvas.querySelectorAll('.bar[data-pe], .bar-compact-narrow[data-pe]').forEach(el=>{
    el.addEventListener('mouseenter', ()=>enter(el));
    el.addEventListener('mouseleave', ()=>leave(el));
  });
}

function buildPhaseAxis(chartW, yMin, yMax, laneData, effectivePx){
  if(vizStyle !== 'waterfall' || effectivePx < 0.35) return '';
  const x0 = yearToX(yMin, yMin, yMax, chartW);
  const x1 = yearToX(yMax, yMin, yMax, chartW);
  let html = `<div class="phase-axis" style="width:${chartW}px">`;
  html += `<div class="phase-axis__line" style="left:${x0}px;width:${Math.max(4,x1-x0)}px"></div>`;
  html += `<div class="phase-axis__dot" style="left:${x0}px"></div>`;
  html += `<div class="phase-axis__dot" style="left:${x1}px"></div>`;
  let slot = 0;
  for(const block of laneData){
    const years = block.people.flatMap(p=>[p.inicio, p.fin].filter(v=>v!=null));
    if(!years.length) continue;
    const bMin = Math.min(...years), bMax = Math.max(...years);
    const cx = yearToX((bMin + bMax) / 2, yMin, yMax, chartW);
    const blockW = yearToX(bMax, yMin, yMax, chartW) - yearToX(bMin, yMin, yMax, chartW);
    if(blockW < 48 && laneData.length > 2) continue;
    const short = block.meta.label.length > 28 ? block.meta.label.slice(0, 26) + '…' : block.meta.label;
    const top = slot % 2;
    html += `<div class="phase-axis__label" style="left:${cx}px;top:${top?14:0}px">${esc(short.toUpperCase())}</div>`;
    slot++;
  }
  return html + `</div>`;
}

function renderPointEventBar(block, pe, x, w, dataAttr, ini, fin, layoutOpts){
  const cls = ['bar','bar--'+block.meta.key,'bar-compact-narrow','bar-point-event', ...estBarClasses(pe)];
  const cx = x + Math.max(4, w) / 2;
  const boxW = Math.max(minBarWidthForPe(pe), 28);
  const left = cx - boxW / 2;
  const laneColor = BAR_COLORS[block.meta.key] || block.meta.color || 'var(--acc)';
  const mkColor = pe.ev ? markerColorFor(pe.ev) : laneColor;
  const peAttr = ` data-pe="${esc(peKey(pe))}"`;
  let nameStyle = '';
  if(layoutOpts?.compactLayout && layoutOpts.yMin != null){
    const inset = markerNameInset(pe, left, layoutOpts.yMin, layoutOpts.yMax, layoutOpts.chartW);
    if(inset) nameStyle = ` style="margin-left:${inset}px"`;
  }
  return `<div class="${cls.join(' ')}" style="left:${left}px;width:${boxW}px" tabindex="0" role="button" aria-label="${esc(pe.n)}, ${fmtRange(ini,fin)}" ${dataAttr}${peAttr}>`+
    `<span class="bar-caption__name"${nameStyle}>${esc(pe.n)}</span>`+
    `<div class="bar-point-event__pin" style="--mk-color:${mkColor};--lane-color:${laneColor}"></div>`+
    `<span class="bar-caption__dates">${esc(fmtRange(ini, fin))}</span>`+
    `</div>`;
}

function renderCompactNarrowBar(block, pe, x, w, dataAttr, ini, fin, laneColor, layoutOpts){
  const cls = ['bar','bar--'+block.meta.key,'bar-compact-narrow', ...estBarClasses(pe)];
  const peAttr = ` data-pe="${esc(peKey(pe))}"`;
  const lineW = Math.max(4, w);
  const barBg = estBarBg(laneColor, pe);
  let nameStyle = '';
  if(layoutOpts?.compactLayout && layoutOpts.yMin != null){
    const inset = markerNameInset(pe, x, layoutOpts.yMin, layoutOpts.yMax, layoutOpts.chartW);
    if(inset) nameStyle = ` style="margin-left:${inset}px"`;
  }
  return `<div class="${cls.join(' ')}" style="left:${x}px;width:${lineW}px" tabindex="0" role="button" aria-label="${esc(pe.n)}, ${fmtRange(ini,fin)}" ${dataAttr}${peAttr}>`+
    `<span class="bar-caption__name"${nameStyle}>${esc(pe.n)}</span>`+
    `<div class="span-line span-line--${block.meta.key} bar-compact-narrow__line ${estBarClasses(pe).join(' ')}" style="width:100%;background:${barBg}"></div>`+
    `<span class="bar-caption__dates">${esc(fmtRange(ini, fin))}</span>`+
    `</div>`;
}

function renderPeriodBar(block, pe, x, w, dataAttr, ini, fin, layoutOpts){
  const laneColor = BAR_COLORS[block.meta.key] || block.meta.color || 'var(--acc)';
  return renderCompactNarrowBar(block, pe, x, w, dataAttr, ini, fin, laneColor, layoutOpts);
}

function renderPersonBar(block, pe, draw, x, w, dataAttr, ini, fin, layoutOpts){
  if(!draw) return '';
  const cls = ['bar','bar--'+block.meta.key, ...estBarClasses(pe)];
  const peAttr = ` data-pe="${esc(peKey(pe))}"`;
  const laneColor = BAR_COLORS[block.meta.key] || block.meta.color || 'var(--acc)';
  const barBg = estBarBg(laneColor, pe);
  const compact = layoutOpts.compactLayout;

  if(pe.isEvent && !eventHasRange(pe)){
    return renderPointEventBar(block, pe, x, w, dataAttr, ini, fin, layoutOpts);
  }

  if(eventHasRange(pe) || (!pe.isEvent && (compact || vizStyle === 'waterfall'))){
    return renderPeriodBar(block, pe, x, w, dataAttr, ini, fin, layoutOpts);
  }

  if(vizStyle === 'waterfall'){
    const pillCls = w < 56 ? cls.concat('pill-narrow') : cls;
    const inner = w >= 56 ? `<span class="bar-label">${esc(pe.n)}</span>` : '';
    let html = `<div class="${pillCls.join(' ')}" style="left:${x}px;width:${w}px;background:${barBg}" tabindex="0" role="img" aria-label="${esc(pe.n)}, ${fmtRange(ini,fin)}" ${dataAttr}${peAttr}>${inner}</div>`;
    if(w < 56 && layoutOpts.showChartTags) html += `<span class="bar-tag" style="left:${x + w + 6}px">${esc(pe.n)}</span>`;
    return html;
  }

  const cx = x + w / 2;
  const r = orbRadius(pe);
  let html = '';
  if(!pe.isEvent && w >= 4){
    const spanCls = ['span-line', `span-line--${block.meta.key}`, ...estBarClasses(pe)].join(' ');
    html += `<div class="${spanCls}" style="left:${x}px;width:${w}px;background:${barBg}"></div>`;
  }
  html += `<div class="orb-stem" style="left:${cx}px"></div>`;
  html += `<div class="${cls.join(' ')}" style="--orb-r:${r};left:${cx}px" tabindex="0" role="img" aria-label="${esc(pe.n)}, ${fmtRange(ini,fin)}" ${dataAttr}${peAttr}></div>`;
  return html;
}

function renderTrackCanvas(block, track, q, yMin, yMax, chartW, layoutOpts, rowMap, yOff, trackH){
  let html = `<div class="row" style="width:${chartW}px;height:${trackH}px">`;
  if(vizStyle !== 'waterfall') html += `<div class="row-rail"></div>`;

  for(const pe of track.people){
    const match = !q || norm(pe.n).includes(q);
    const draw = match && (layoutOpts.compactLayout || isPeSelected(pe));
    const ini = pe.inicio, fin = pe.fin;
    let x = yearToX(ini, yMin, yMax, chartW);
    const x2 = yearToX(fin, yMin, yMax, chartW);
    let w = Math.max(4, x2 - x);
    if(w < 6 && ini === fin){ x -= 2; w = 6; }
    const dataAttr = pe.isEvent ? `data-ev="${pe.ev.id}"` : '';

    if(draw){
      rowMap.set(pe.id, { pe, laneKey: block.meta.key, yCenter: yOff + trackH / 2, isEvent: !!pe.isEvent });
    }
    html += renderPersonBar(block, pe, draw, x, w, dataAttr, ini, fin, layoutOpts);
    if(draw && layoutOpts.compactLayout){
      html += renderRowEventMarkers(pe, yMin, yMax, chartW, q);
    }
  }
  html += `</div>`;
  return html;
}

function labelEntryHtml(pe, match, rowId, barW, layoutOpts){
  const highlight = match && !!query;
  const tagCls = vizStyle === 'waterfall' && match && (barW < 56 || !layoutOpts.showChartTags) ? ' row-label--tag' : '';
  const dataAttr = pe.isEvent ? ` data-ev="${pe.ev.id}"` : '';
  const peAttr = ` data-pe="${esc(peKey(pe))}"`;
  return `<div class="row-label__entry${match?'':' dim'}${highlight?' match':''}${tagCls} row-label--click" data-row="${rowId}"${peAttr}${dataAttr} title="${esc(pe.n)}">`+
    `<label class="row-label__pick" title="Ocultar de la línea">`+
    `<input type="checkbox" class="pe-pick" data-pe-key="${esc(peKey(pe))}" checked aria-label="Mostrar ${esc(pe.n)}" />`+
    `</label>`+
    `<span class="row-label__body row-label__body--click">`+
    `<span class="row-label__name">${esc(pe.n)}</span>`+
    `<span class="row-label__dates">${fmtRange(pe.inicio, pe.fin)}</span></span></div>`;
}

function labelCompactPickHtml(pe, match, rowId){
  const dataAttr = pe.isEvent ? ` data-ev="${pe.ev.id}"` : '';
  const peAttr = ` data-pe="${esc(peKey(pe))}"`;
  return `<label class="compact-pick${match?'':' dim'}" data-row="${rowId}"${peAttr}${dataAttr} title="${esc(pe.n)} · ${esc(fmtRange(pe.inicio, pe.fin))}">`+
    `<input type="checkbox" class="pe-pick" data-pe-key="${esc(peKey(pe))}" checked aria-label="Mostrar ${esc(pe.n)}" />`+
    `</label>`;
}

function labelTrackHtml(track, block, q, yMin, yMax, chartW, layoutOpts, L){
  const h = trackRowHeight(L, track.people.length);

  if(rowLayout === 'compact'){
    const picks = track.people.map(pe=>{
      const match = !q || norm(pe.n).includes(q);
      const rowId = block.meta.key + '-' + pe.id;
      return labelCompactPickHtml(pe, match, rowId);
    }).join('');
    return `<div class="row-label row-label--compact-picks" style="height:${h}px;min-height:${h}px"><div class="compact-picks">${picks}</div></div>`;
  }

  const entries = track.people.map(pe=>{
    const match = !q || norm(pe.n).includes(q);
    const rowId = block.meta.key + '-' + pe.id;
    let barW = 4;
    if(pe.inicio != null && pe.fin != null){
      barW = Math.max(4, yearToX(pe.fin, yMin, yMax, chartW) - yearToX(pe.inicio, yMin, yMax, chartW));
    }
    return labelEntryHtml(pe, match, rowId, barW, layoutOpts);
  }).join('');
  return `<div class="row-label" style="height:${h}px;min-height:${h}px">${entries}</div>`;
}

function buildConnections(rowMap, yMin, yMax, chartW, totalH){
  if(!showConnections) return '';
  const prophets = [...rowMap.values()].filter(r=>r.laneKey==='pro' && !r.isEvent);
  const kings = [...rowMap.values()].filter(r=>(r.laneKey==='jud' || r.laneKey==='isr') && !r.isEvent);
  let paths = '';
  for(const pr of prophets){
    for(const kr of kings){
      if(!overlaps(pr.pe.inicio, pr.pe.fin, kr.pe.inicio, kr.pe.fin)) continue;
      const oStart = Math.max(pr.pe.inicio, kr.pe.inicio);
      const oEnd = Math.min(pr.pe.fin, kr.pe.fin);
      if(oEnd - oStart < 3) continue;
      const x = yearToX((oStart + oEnd) / 2, yMin, yMax, chartW);
      const y1 = pr.yCenter, y2 = kr.yCenter;
      const cy = (y1 + y2) / 2;
      paths += `<path d="M ${x} ${y1} Q ${x + 28} ${cy} ${x} ${y2}" fill="none" stroke="${BAR_COLORS.pro}" stroke-width="1" stroke-opacity="0.2" stroke-dasharray="3 4"/>`;
    }
  }
  return paths ? `<svg class="conn-layer" width="${chartW}" height="${totalH}" aria-hidden="true">${paths}</svg>` : '';
}

function render(){
  const L = layoutMetrics();
  const rawLaneData = buildAllLaneData();
  const hiddenList = collectHiddenInView(rawLaneData, query);
  const q = norm(query);
  const potOffset = showPotencias ? L.potStrip : 0;
  const topOffset = L.phaseH + potOffset;

  if(!rawLaneData.some(b=>b.people.length) && !hiddenList.length){
    labelsCol.innerHTML = '';
    const emptyMsg = !selLanes.size
      ? 'Ninguna fila activa. Marcá una o más filas arriba para ver la cronología.'
      : 'Marca al menos una fila para ver la comparación.';
    chartCanvas.innerHTML = '<div class="empty-msg" style="padding:24px;color:var(--mut)">'+emptyMsg+'</div>';
    axisArea.innerHTML = '';
    renderHiddenDock([]);
    resultCount.textContent = '0 personajes';
    return;
  }

  let [dataMin, dataMax] = computeRangeFromLaneData(laneDataForBounds(rawLaneData));
  if(dataMin > dataMax) [dataMin, dataMax] = [dataMax, dataMin];
  if(viewWindow){
    if(viewWindow.min >= dataMax || viewWindow.max <= dataMin){
      viewWindow = null;
      saveViewWindow();
    } else {
      viewWindow = {
        min: Math.max(dataMin, viewWindow.min),
        max: Math.min(dataMax, viewWindow.max),
      };
      if(viewWindow.max - viewWindow.min < MIN_FOCUS_SPAN){
        viewWindow = null;
        saveViewWindow();
      }
    }
  }
  let yMin = viewWindow ? viewWindow.min : dataMin;
  let yMax = viewWindow ? viewWindow.max : dataMax;
  const fullSpan = dataMax - dataMin;
  const span = yMax - yMin;
  const padY = Math.max(span * 0.02, span < 2 ? 0.02 : 0);
  yMin -= padY; yMax += padY;
  const span2 = yMax - yMin;
  const chartW = computeChartWidth(viewWindow ? span2 : fullSpan, span2);
  const effectivePx = updateZoomUi(span2, chartW);
  updateFocusUi(dataMin, dataMax);
  const chartLayout = { yMin, yMax, chartW };
  const laneData = enrichLaneData(rawLaneData, query, chartLayout);
  if(!laneData.some(b=>b.tracks.length) && !hiddenList.length){
    labelsCol.innerHTML = '';
    const emptyMsg = !selLanes.size
      ? 'Ninguna fila activa. Marcá una o más filas arriba para ver la cronología.'
      : 'Marca al menos una fila para ver la comparación.';
    chartCanvas.innerHTML = '<div class="empty-msg" style="padding:24px;color:var(--mut)">'+emptyMsg+'</div>';
    axisArea.innerHTML = '';
    renderHiddenDock([]);
    resultCount.textContent = '0 personajes';
    return;
  }
  const layoutOpts = {
    effectivePx,
    showChartTags: effectivePx >= 0.55 && chartScroll.clientWidth >= 680,
    compactLayout: rowLayout === 'compact',
    yMin,
    yMax,
    chartW,
  };
  const focusRange = computeRangeFromLaneData(laneData);

  const rowMap = new Map();
  let labelsHtml = showPotencias
    ? `<div class="lane-hdr" style="height:${L.potStrip}px;opacity:.7"><span class="dot" style="background:var(--acc)"></span>Imperios</div>`
    : '';
  if(L.phaseH) labelsHtml += `<div class="lane-hdr" style="height:${L.phaseH}px;opacity:0;border:none"></div>`;
  let totalRows = 0, visibleRows = 0, selectedRows = 0, totalTracks = 0;

  for(const block of laneData){
    if(!block.tracks.length) continue;
    if(rowLayout !== 'compact'){
      labelsHtml += `<div class="lane-hdr"><span class="dot" style="background:${block.meta.color}"></span>${block.meta.label}</div>`;
    }
    totalTracks += block.tracks.length;
    for(const track of block.tracks){
      for(const pe of track.people){
        totalRows++;
        visibleRows++;
        selectedRows++;
      }
      if(rowLayout !== 'compact'){
        labelsHtml += labelTrackHtml(track, block, q, yMin, yMax, chartW, layoutOpts, L);
      }
    }
  }
  if(rowLayout === 'compact'){
    labelsCol.innerHTML = '';
    labelsCol.hidden = true;
    renderHiddenDock([]);
  } else {
    labelsCol.hidden = false;
    labelsCol.innerHTML = labelsHtml;
    renderHiddenDock(hiddenList);
  }

  let yOff = topOffset;
  let canvasHtml = buildPhaseAxis(chartW, yMin, yMax, laneData, effectivePx);
  const bandEls = BANDS.filter(b=>b.end >= yMin && b.start <= yMax);
  const potBands = showPotencias ? POTENCIAS.filter(p=>selPots.has(p.id) && p.end >= yMin && p.start <= yMax) : [];
  let bandLabelSlot = 0;

  if(showPotencias){
    canvasHtml += `<div class="pot-strip" style="width:${chartW}px"><span class="pot-strip__label">Potencias mundiales</span>`;
    for(const p of potBands){
      const x1 = yearToX(Math.max(p.start, yMin), yMin, yMax, chartW);
      const x2 = yearToX(Math.min(p.end, yMax), yMin, yMax, chartW);
      const bw = Math.max(2, x2 - x1);
      canvasHtml += `<div class="band ${p.cls}" style="left:${x1}px;width:${bw}px;top:0;height:${L.potStrip}px">${potBandLabel(p, bw)}</div>`;
    }
    canvasHtml += `</div>`;
  }

  for(const block of laneData){
    if(!block.tracks.length) continue;
    const blockH = L.laneHdr + block.tracks.reduce((h, t)=> h + trackRowHeight(L, t.people.length), 0);
    canvasHtml += `<div class="lane-block" style="min-height:${blockH}px;width:${chartW}px">`;

    for(const b of bandEls){
      const x1 = yearToX(Math.max(b.start, yMin), yMin, yMax, chartW);
      const x2 = yearToX(Math.min(b.end, yMax), yMin, yMax, chartW);
      const bw = Math.max(2, x2 - x1);
      canvasHtml += `<div class="band ${b.cls}" style="left:${x1}px;width:${bw}px;top:0;height:${blockH}px" title="${esc(b.label)}">${bandLabelHtml(b.label, bw, bandLabelSlot++)}</div>`;
    }
    for(const p of potBands){
      const x1 = yearToX(Math.max(p.start, yMin), yMin, yMax, chartW);
      const x2 = yearToX(Math.min(p.end, yMax), yMin, yMax, chartW);
      canvasHtml += `<div class="band ${p.cls}" style="left:${x1}px;width:${Math.max(2,x2-x1)}px;top:0;height:${blockH}px;opacity:.55"></div>`;
    }

    canvasHtml += `<div class="lane-hdr" style="width:${chartW}px">${vizStyle === 'waterfall' ? block.meta.label.toUpperCase() : block.meta.label}</div>`;
    yOff += L.laneHdr;

    for(const track of block.tracks){
      const trackH = trackRowHeight(L, track.people.length);
      canvasHtml += renderTrackCanvas(block, track, q, yMin, yMax, chartW, layoutOpts, rowMap, yOff, trackH);
      yOff += trackH;
    }
    canvasHtml += `</div>`;
    yOff += L.laneGap;
  }

  const totalH = yOff;
  let markersHtml = '';
  let markerCount = 0;
  if(showMarkers && rowLayout !== 'compact'){
    const seen = new Set();
    for(const [, row] of rowMap){
      if(row.isEvent) continue;
      if(q && !norm(row.pe.n).includes(q)) continue;
      if(!isPeSelected(row.pe)) continue;
      for(const ev of eventsForPerson(row.pe, yMin, yMax)){
        const key = ev.id + '-' + row.pe.id;
        if(seen.has(key)) continue;
        seen.add(key);
        markerCount++;
        const mx = yearToX(chartYear(ev) ?? ev.fa, yMin, yMax, chartW);
        const tipoCls = 'evt-marker--' + (ev.tipo||'otro').replace(/\s+/g,'-');
        markersHtml += `<div class="evt-marker ${tipoCls}" style="left:${mx}px;top:${row.yCenter}px" data-ev="${ev.id}" tabindex="0" role="img" aria-label="${esc(ev.n)}"></div>`;
      }
    }
  }

  const step = tickStep(span2, yMin, yMax);
  const startTick = Math.ceil(yMin / step) * step;
  let gridLines = '', axisLabels = '';
  let tickN = 0;
  for(let y = startTick; y <= yMax; y += step){
    const x = yearToX(y, yMin, yMax, chartW);
    const major = y % (step * 2) === 0 || step >= 50;
    const showLabel = major || effectivePx >= 0.35;
    gridLines += `<div class="grid-line${major?' major':''}" style="left:${x}px;height:${totalH}px"></div>`;
    if(showLabel || tickN % 2 === 0){
      axisLabels += `<div class="grid-label" style="left:${x}px">${fmtYear(y)}</div>`;
    }
    tickN++;
  }

  const connSvg = buildConnections(rowMap, yMin, yMax, chartW, totalH);
  chartCanvas.style.width = chartW + 'px';
  chartCanvas.style.height = totalH + 'px';
  chartCanvas.innerHTML = gridLines + connSvg + canvasHtml + markersHtml +
    (vizStyle === 'editorial' ? `<div class="axis-line" style="width:${chartW}px"></div>` : '');
  if(showMarkers && rowLayout === 'compact'){
    markerCount = chartCanvas.querySelectorAll('.evt-marker--in-row, .bar-event-pin').length;
  }
  axisArea.style.width = chartW + 'px';
  axisArea.innerHTML = axisLabels;
  labelsCol.style.paddingBottom = L.axisH + 'px';

  lastLayout = { viewLabel: viewLabel(), laneData, dataMin, dataMax, yMin, yMax, chartW, totalH, potOffset: topOffset, rowMap, markerCount, markers: [], effectivePx: span2 / chartW, metrics: L, vizStyle, rowLayout };
  chartCanvas.querySelectorAll('.evt-marker, .bar-event-pin').forEach(m=>{
    const row = m.closest('.row');
    const ev = D.eventos.find(e=>String(e.id)===m.dataset.ev);
    let y = parseFloat(m.style.top);
    if(row && m.classList.contains('evt-marker--in-row')){
      y = row.offsetTop + 6 + 7;
    } else if(!Number.isFinite(y)){
      y = 0;
    }
    lastLayout.markers.push({
      x: parseFloat(m.style.left),
      y,
      color: ev ? markerColorFor(ev) : '#3d6b7a',
      evId: m.dataset.ev,
    });
  });

  const hiddenNote = hiddenList.length ? ` · ${hiddenList.length} ocultos` : '';
  const trackNote = rowLayout === 'compact' ? ` · ${totalTracks} pistas` : '';
  resultCount.textContent = q
    ? `${selectedRows} visibles${trackNote}${hiddenNote}${markerCount ? ' · '+markerCount+' marcadores' : ''}`
    : `${selectedRows} personajes${trackNote}${hiddenNote}${markerCount ? ' · '+markerCount+' marcadores' : ''}`;

  chartCanvas.querySelectorAll('.evt-marker, .bar-event-pin').forEach(m=>{
    const ev = D.eventos.find(e=>String(e.id)===m.dataset.ev);
    m.addEventListener('mouseenter', e=> showEvTip(e, ev));
    m.addEventListener('mousemove', moveTip);
    m.addEventListener('mouseleave', hideTip);
    m.addEventListener('click', e=> openDrawerFromClick(ev, e));
    m.addEventListener('keydown', e=>{
      if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); openDrawerFromClick(ev, e); }
    });
  });

  bindPePickers();
  bindRowHover();
  bindDrawerTargets(chartCanvas);
  bindDrawerTargets(labelsCol);

  if(!didInitialScroll){
    const focusYear = Math.min(yMax, Math.max(yMin, DEFAULT_FOCUS_YEAR));
    scrollToYear(focusYear, yMin, yMax, chartW);
    didInitialScroll = true;
  } else if(!autoFit && !render._scrolled){
    const cx = yearToX((focusRange[0]+focusRange[1])/2, yMin, yMax, chartW);
    chartScroll.scrollLeft = Math.max(0, cx - chartScroll.clientWidth/2);
    render._scrolled = true;
  } else if(autoFit && !render._scrolled){
    chartScroll.scrollLeft = 0;
  }
}
render._scrolled = false;

function exportPng(){
  if(!lastLayout) return;
  const L = lastLayout;
  const M = L.metrics || layoutMetrics();
  const wf = L.vizStyle === 'waterfall';
  const bg = wf ? '#ffffff' : (document.documentElement.getAttribute('data-theme') === 'dark' ? '#1a1814' : '#f5f2e8');
  const txt = wf ? '#2d2d2d' : (document.documentElement.getAttribute('data-theme') === 'dark' ? '#ece6dc' : '#2c2824');
  const mut = wf ? '#8a8a8a' : (document.documentElement.getAttribute('data-theme') === 'dark' ? '#9a9288' : '#7a7468');
  const orbCore = document.documentElement.getAttribute('data-theme') === 'dark' ? '#3a3530' : '#ebe4d6';
  const orbEdge = document.documentElement.getAttribute('data-theme') === 'dark' ? '#6a6258' : '#b8a992';
  const acc = wf ? '#e84545' : mut;
  const headH = 36;
  let svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${L.chartW}" height="${L.totalH + headH + 8}" viewBox="0 0 ${L.chartW} ${L.totalH + headH + 8}">`;
  svg += `<rect width="100%" height="100%" fill="${bg}"/>`;
  svg += `<text x="12" y="16" fill="${txt}" font-family="${wf?'Inter,Segoe UI,sans-serif':'Libre Baskerville,Georgia,serif'}" font-size="13" font-weight="700">${esc(L.viewLabel)}</text>`;
  svg += `<text x="12" y="30" fill="${mut}" font-family="Karla,Segoe UI,sans-serif" font-size="10">${fmtYear(L.yMin)} – ${fmtYear(L.yMax)} · ${L.effectivePx.toFixed(2)} px/año</text>`;
  if(!wf) svg += `<defs><radialGradient id="orbGrad" cx="32%" cy="28%"><stop offset="0%" stop-color="${orbCore}"/><stop offset="88%" stop-color="${orbEdge}"/></radialGradient></defs>`;
  svg += `<g transform="translate(0,${headH})">`;

  if(wf){
    const x0 = yearToX(L.yMin, L.yMin, L.yMax, L.chartW);
    const x1 = yearToX(L.yMax, L.yMin, L.yMax, L.chartW);
    svg += `<line x1="${x0}" y1="18" x2="${x1}" y2="18" stroke="${acc}" stroke-width="2"/>`;
    svg += `<circle cx="${x0}" cy="18" r="5" fill="${acc}"/>`;
    svg += `<circle cx="${x1}" cy="18" r="5" fill="${acc}"/>`;
  }

  if(showPotencias){
    for(const p of POTENCIAS.filter(x=>selPots.has(x.id) && x.end >= L.yMin && x.start <= L.yMax)){
      const x1 = yearToX(Math.max(p.start, L.yMin), L.yMin, L.yMax, L.chartW);
      const x2 = yearToX(Math.min(p.end, L.yMax), L.yMin, L.yMax, L.chartW);
      svg += `<rect x="${x1}" y="0" width="${Math.max(2,x2-x1)}" height="${L.totalH}" fill="${p.fill}" opacity="0.07"/>`;
    }
  }
  for(const b of BANDS.filter(x=>x.end >= L.yMin && x.start <= L.yMax)){
    const x1 = yearToX(Math.max(b.start, L.yMin), L.yMin, L.yMax, L.chartW);
    const x2 = yearToX(Math.min(b.end, L.yMax), L.yMin, L.yMax, L.chartW);
    svg += `<rect x="${x1}" y="0" width="${Math.max(2,x2-x1)}" height="${L.totalH}" fill="${wf?'#e84545':'#ff6b6b'}" opacity="0.05"/>`;
  }
  if(showConnections){
    const prophets = [...L.rowMap.values()].filter(r=>r.laneKey==='pro');
    const kings = [...L.rowMap.values()].filter(r=>r.laneKey==='jud'||r.laneKey==='isr');
    for(const pr of prophets){
      for(const kr of kings){
        if(!overlaps(pr.pe.inicio, pr.pe.fin, kr.pe.inicio, kr.pe.fin)) continue;
        const oStart = Math.max(pr.pe.inicio, kr.pe.inicio);
        const oEnd = Math.min(pr.pe.fin, kr.pe.fin);
        if(oEnd - oStart < 3) continue;
        const x = yearToX((oStart+oEnd)/2, L.yMin, L.yMax, L.chartW);
        svg += `<path d="M ${x} ${pr.yCenter} Q ${x+28} ${(pr.yCenter+kr.yCenter)/2} ${x} ${kr.yCenter}" fill="none" stroke="${BAR_COLORS.pro}" stroke-width="1" opacity="0.3" stroke-dasharray="4 3"/>`;
      }
    }
  }

  let yOff = L.potOffset;
  for(const block of L.laneData){
    if(!block.tracks.length) continue;
    yOff += M.laneHdr;
    for(const track of block.tracks){
      const trackH = trackRowHeight(M, track.people.length);
      for(const pe of track.people){
        const x = yearToX(pe.inicio, L.yMin, L.yMax, L.chartW);
        const x2 = yearToX(pe.fin, L.yMin, L.yMax, L.chartW);
        const w = Math.max(4, x2 - x);
        const cx = x + w / 2;
        const r = orbRadius(pe);
        const pill = BAR_COLORS[block.meta.key];
        if((wf || L.rowLayout === 'compact') && !pe.isEvent){
          svg += `<text x="${x}" y="${yOff + trackH/2 - 14}" fill="${txt}" font-family="${wf?'Inter,Segoe UI,sans-serif':'Libre Baskerville,Georgia,serif'}" font-size="10" font-weight="600">${esc(pe.n.length>22?pe.n.slice(0,20)+'…':pe.n)}</text>`;
          svg += `<line x1="${x}" y1="${yOff + trackH/2 + 2}" x2="${x + w}" y2="${yOff + trackH/2 + 2}" stroke="${pill}" stroke-width="6" stroke-linecap="round" opacity="0.88"/>`;
          svg += `<text x="${x}" y="${yOff + trackH/2 + 16}" fill="${mut}" font-family="${wf?'Inter,Segoe UI,sans-serif':'Karla,Segoe UI,sans-serif'}" font-size="8">${esc(fmtRange(pe.inicio, pe.fin))}</text>`;
        } else {
          if(!pe.isEvent && w >= 4){
            svg += `<line x1="${x}" y1="${yOff + trackH/2}" x2="${x + w}" y2="${yOff + trackH/2}" stroke="${pill}" stroke-width="5" stroke-linecap="round" opacity="0.72"/>`;
          }
          svg += `<line x1="${cx}" y1="${yOff + 6}" x2="${cx}" y2="${yOff + trackH - 6}" stroke="${mut}" stroke-width="1" opacity="0.25"/>`;
          svg += `<circle cx="${cx}" cy="${yOff + trackH/2}" r="${r}" fill="url(#orbGrad)" stroke="${orbEdge}" stroke-width="1" opacity="0.95"/>`;
          const tagX = pe.isEvent ? cx + r + 6 : Math.max(cx + r + 6, x + w + 5);
          svg += `<text x="${tagX}" y="${yOff + trackH/2 + 4}" fill="${txt}" font-family="Libre Baskerville,Georgia,serif" font-size="11">${esc(pe.n)}</text>`;
        }
      }
      yOff += trackH;
    }
    yOff += M.laneGap;
  }
  for(const m of L.markers){
    svg += `<circle cx="${m.x}" cy="${m.y}" r="4" fill="${m.color}" stroke="${bg}" stroke-width="1"/>`;
  }
  if(!wf) svg += `<line x1="0" y1="${L.totalH - M.axisH}" x2="${L.chartW}" y2="${L.totalH - M.axisH}" stroke="${mut}" opacity="0.35"/>`;
  svg += `</g></svg>`;

  const img = new Image();
  const blob = new Blob([svg], { type:'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  img.onload = ()=>{
    const scale = 2;
    const c = document.createElement('canvas');
    c.width = L.chartW * scale;
    c.height = (L.totalH + headH + 8) * scale;
    const ctx = c.getContext('2d');
    ctx.scale(scale, scale);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, L.chartW, L.totalH + headH + 8);
    ctx.drawImage(img, 0, 0);
    c.toBlob(b=>{
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = 'linea-paralela-' + [...selLanes].join('-') + '.png';
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  img.onerror = ()=> URL.revokeObjectURL(url);
  img.src = url;
}

let drag = false, sx = 0, sl = 0;
chartScroll.addEventListener('mousedown', e=>{
  if(e.target.closest('.bar,.evt-marker,.bar-event-pin')) return;
  if(e.button !== 0) return;
  if((rectZoomMode || e.shiftKey) && lastLayout){
    const x0 = chartXFromClient(e.clientX);
    focusMarquee = { x0, x1: x0, active: true };
    updateFocusMarqueeDom(x0, x0);
    e.preventDefault();
    return;
  }
  drag = true; sx = e.clientX; sl = chartScroll.scrollLeft;
  chartScroll.classList.add('dragging');
});
window.addEventListener('mousemove', e=>{
  if(focusMarquee?.active){
    focusMarquee.x1 = chartXFromClient(e.clientX);
    updateFocusMarqueeDom(focusMarquee.x0, focusMarquee.x1);
    return;
  }
  if(drag) chartScroll.scrollLeft = sl - (e.clientX - sx);
});
window.addEventListener('mouseup', ()=>{
  if(focusMarquee?.active){
    const xMin = Math.min(focusMarquee.x0, focusMarquee.x1);
    const xMax = Math.max(focusMarquee.x0, focusMarquee.x1);
    hideFocusMarquee();
    if(Math.abs(xMax - xMin) > 24 && lastLayout){
      const y1 = xToYear(xMin, lastLayout.yMin, lastLayout.yMax, lastLayout.chartW);
      const y2 = xToYear(xMax, lastLayout.yMin, lastLayout.yMax, lastLayout.chartW);
      applyFocusZoom(Math.min(y1, y2), Math.max(y1, y2), lastLayout.dataMin, lastLayout.dataMax);
    }
    return;
  }
  drag = false;
  chartScroll.classList.remove('dragging');
});
chartScroll.addEventListener('wheel', e=>{
  if(!lastLayout) return;
  e.preventDefault();
  const year = xToYear(chartXFromClient(e.clientX), lastLayout.yMin, lastLayout.yMax, lastLayout.chartW);
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
  zoomFocusAt(year, factor, lastLayout.dataMin, lastLayout.dataMax);
}, { passive: false });

chartScroll.addEventListener('scroll', ()=>{ labelsCol.scrollTop = chartScroll.scrollTop; });
labelsCol.addEventListener('scroll', ()=>{ chartScroll.scrollTop = labelsCol.scrollTop; });

searchEl.addEventListener('input', ()=>{ query = searchEl.value.trim(); render(); });
optMarkers.addEventListener('change', ()=>{
  showMarkers = optMarkers.checked;
  localStorage.setItem('lt-par-markers', showMarkers?'1':'0');
  buildLaneFilters();
  render();
});
optConnections.addEventListener('change', ()=>{ showConnections = optConnections.checked; localStorage.setItem('lt-par-conn', showConnections?'1':'0'); render(); });
optPotencias.addEventListener('change', ()=>{ showPotencias = optPotencias.checked; localStorage.setItem('lt-par-pot', showPotencias?'1':'0'); render(); });
zoomEl.addEventListener('input', ()=>{
  autoFit = false;
  localStorage.setItem('lt-par-autofit', '0');
  pxPerYear = parseFloat(zoomEl.value);
  localStorage.setItem('lt-par-zoom', String(pxPerYear));
  render._scrolled = false;
  render();
});
fitBtn.addEventListener('click', ()=>{
  autoFit = true;
  localStorage.setItem('lt-par-autofit', '1');
  render._scrolled = false;
  render();
});
if(focusResetBtn){
  focusResetBtn.addEventListener('click', resetFocusZoom);
}
if(focusRectBtn){
  focusRectBtn.addEventListener('click', ()=> setRectZoomMode(!rectZoomMode));
}
if(fontScaleEl){
  fontScaleEl.addEventListener('change', ()=>{
    const v = parseFloat(fontScaleEl.value);
    fontScale = FONT_SCALE_OPTIONS.includes(v) ? v : 1;
    saveFontScale();
    applyFontScale();
    render._scrolled = true;
    render();
  });
}
exportBtn.addEventListener('click', exportPng);
const peShowAllBtn = document.getElementById('pe-show-all');
const peHideAllBtn = document.getElementById('pe-hide-all');
if(peShowAllBtn){
  peShowAllBtn.addEventListener('click', ()=>{
    peKeysInView(enrichLaneData(buildAllLaneData(), query)).forEach(k=> hiddenPeople.delete(k));
    saveHiddenPeople();
    render._scrolled = true;
    render();
  });
}
if(peHideAllBtn){
  peHideAllBtn.addEventListener('click', ()=>{
    peKeysInView(enrichLaneData(buildAllLaneData(), query)).forEach(k=> hiddenPeople.add(k));
    saveHiddenPeople();
    render._scrolled = true;
    render();
  });
}
if(vizStyleEl){
  vizStyleEl.addEventListener('change', ()=>{
    vizStyle = vizStyleEl.value;
    localStorage.setItem('lt-par-viz', vizStyle);
    applyVizStyle();
    render._scrolled = false;
    render();
  });
}
if(rowLayoutEl){
  rowLayoutEl.value = rowLayout;
  rowLayoutEl.addEventListener('change', ()=>{
    rowLayout = ROW_LAYOUTS.includes(rowLayoutEl.value) ? rowLayoutEl.value : 'expanded';
    localStorage.setItem('lt-par-row-layout', rowLayout);
    applyRowLayout();
    if(peShowAllBtn) peShowAllBtn.hidden = rowLayout === 'compact';
    if(peHideAllBtn) peHideAllBtn.hidden = rowLayout === 'compact';
    render._scrolled = false;
    render();
  });
}
if(peShowAllBtn) peShowAllBtn.hidden = rowLayout === 'compact';
if(peHideAllBtn) peHideAllBtn.hidden = rowLayout === 'compact';

const themeBtn = document.getElementById('theme-btn');
const savedTheme = localStorage.getItem('lt-theme');
if(savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
themeBtn.addEventListener('click', ()=>{
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if(isDark){
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('lt-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('lt-theme', 'dark');
  }
});

const fromHash = parseHash(location.hash.replace('#',''));
if(fromHash) selLanes = fromHash;
const qs = new URLSearchParams(location.search);
if(qs.get('q')){ query = qs.get('q'); searchEl.value = query; }
const deepEvId = qs.get('ev');

buildLaneFilters();
buildPotChips();
syncHash();

const esMovil = typeof matchMedia === 'function' && matchMedia('(max-width: 760px)').matches;
if (esMovil) {
  if (!localStorage.getItem('lt-par-row-layout')) {
    rowLayout = 'compact';
    rowLayoutEl.value = 'compact';
    applyRowLayout();
  }
  if (!localStorage.getItem('lt-par-autofit')) {
    autoFit = false;
    pxPerYear = Math.max(pxPerYear, 0.8);
    zoomEl.value = pxPerYear;
    fitBtn.classList.remove('on');
    fitBtn.setAttribute('aria-pressed', 'false');
    localStorage.setItem('lt-par-autofit', '0');
    localStorage.setItem('lt-par-zoom', String(pxPerYear));
  }
}
if (isTouchLayout() && !localStorage.getItem('lt-par-font-scale')) {
  fontScale = 1.2;
  applyFontScale();
  saveFontScale();
}

if(!(D.preguntas || []).some(p => answerText(p))){
  console.warn('[linea-paralela] Datos sin respuestas en preguntas.a — recarga con Ctrl+F5 (linea-tiempo-datos.js?v=3)');
}
render();
if(deepEvId){
  const deepEv = D.eventos.find(e=>String(e.id)===deepEvId);
  if(deepEv) openDrawer(deepEv);
}
window.addEventListener('resize', ()=>{ if(autoFit) render._scrolled = false; render(); });

// ---------- onboarding tour (MVP) ----------
(function initOnboarding(){
  const STORAGE_KEY = 'lt-onboarding-v1';
  const root = document.getElementById('onboard-root');
  const backdrop = document.getElementById('onboard-backdrop');
  const hole = document.getElementById('onboard-hole');
  const pop = document.getElementById('onboard-pop');
  const stepLabel = document.getElementById('onboard-step-label');
  const titleEl = document.getElementById('onboard-title');
  const bodyEl = document.getElementById('onboard-body');
  const btnPrev = document.getElementById('onboard-prev');
  const btnNext = document.getElementById('onboard-next');
  const btnSkip = document.getElementById('onboard-skip');
  const dontEl = document.getElementById('onboard-dont');
  const helpBtn = document.getElementById('onboard-help-btn');
  if(!root || !pop) return;

  const STEPS = [
    {
      target: '.chart-wrap',
      center: true,
      title: 'Cronología en filas paralelas',
      body: 'Cada fila agrupa un periodo o tema (reyes, profetas, ministerio de Jesús…). Las barras muestran vidas o reinados; los puntos, sucesos puntuales. Arrastrá con un dedo; pellizcá con dos sobre el gráfico para ampliar.',
    },
    {
      target: '#lane-filters',
      title: 'Filtrar filas',
      body: 'Activá solo las épocas que te interesan: Génesis, Reyes, Hechos, Escritura del NT, etc. Los colores de la leyenda indican Judá, Israel, profetas y más.',
    },
    {
      target: '#search',
      title: 'Buscar personajes',
      body: 'Escribí un nombre para resaltar coincidencias. Podés ocultar personajes con el checkbox junto a cada fila; los ocultos aparecen abajo para restaurarlos.',
    },
    {
      target: '#opt-markers',
      title: 'Capas del gráfico',
      body: 'Sucesos muestra marcadores en el eje; Conexiones une profetas y reyes contemporáneos; Imperios pinta bandas de potencias mundiales. Debajo podés filtrar Egipto, Babilonia, Roma…',
    },
    {
      target: '#viz-style',
      title: 'Estilo y zoom',
      body: 'Cambiá entre vista editorial y waterfall, tema claro/oscuro (◐), disposición compacta o expandida, y el ancho del eje. Usá ▭ o Shift+arrastrar para enfocar un tramo.',
    },
    {
      target: '#export-btn',
      title: 'Detalle y más',
      body: 'Hacé clic en una barra o suceso para abrir el panel con referencias y preguntas. Exportá PNG para compartir. En Personajes encontrás fichas ampliadas.',
    },
  ];

  let stepIdx = 0;
  let active = false;

  function isDone(){
    try{ return localStorage.getItem(STORAGE_KEY) === 'done'; }catch(e){ return false; }
  }
  function markDone(){
    if(dontEl && dontEl.checked){
      try{ localStorage.setItem(STORAGE_KEY, 'done'); }catch(e){}
    }
  }
  function padRect(r, px){
    return {
      top: Math.max(8, r.top - px),
      left: Math.max(8, r.left - px),
      width: r.width + px * 2,
      height: r.height + px * 2,
    };
  }
  function placePopover(rect, center){
    const margin = 12;
    const popW = pop.offsetWidth || 320;
    const popH = pop.offsetHeight || 180;
    let top, left;
    if(center || !rect){
      top = Math.max(margin, (window.innerHeight - popH) / 2);
      left = Math.max(margin, (window.innerWidth - popW) / 2);
    } else {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if(spaceBelow >= popH + margin * 2 || spaceBelow >= spaceAbove){
        top = rect.bottom + margin;
      } else {
        top = rect.top - popH - margin;
      }
      left = rect.left + rect.width / 2 - popW / 2;
      left = Math.max(margin, Math.min(left, window.innerWidth - popW - margin));
      top = Math.max(margin, Math.min(top, window.innerHeight - popH - margin));
    }
    pop.style.top = top + 'px';
    pop.style.left = left + 'px';
  }
  function showStep(idx){
    stepIdx = idx;
    const step = STEPS[idx];
    stepLabel.textContent = 'Paso ' + (idx + 1) + ' de ' + STEPS.length;
    titleEl.textContent = step.title;
    bodyEl.textContent = step.body;
    btnPrev.hidden = idx === 0;
    btnNext.textContent = idx === STEPS.length - 1 ? 'Listo' : 'Siguiente';

    const el = step.target ? document.querySelector(step.target) : null;
    if(el && !step.center){
      if(backdrop) backdrop.style.opacity = '0';
      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      requestAnimationFrame(()=>{
        requestAnimationFrame(()=>{
          const r = padRect(el.getBoundingClientRect(), 8);
          hole.hidden = false;
          hole.style.top = r.top + 'px';
          hole.style.left = r.left + 'px';
          hole.style.width = r.width + 'px';
          hole.style.height = r.height + 'px';
          placePopover(r, false);
        });
      });
    } else {
      hole.hidden = true;
      if(backdrop) backdrop.style.opacity = '';
      placePopover(null, true);
    }
  }
  function openTour(fromUser){
    if(active) return;
    active = true;
    root.hidden = false;
    root.classList.add('is-active');
    root.setAttribute('aria-hidden', 'false');
    pop.hidden = false;
    if(dontEl) dontEl.checked = !fromUser;
    showStep(0);
    btnNext.focus();
  }
  function closeTour(){
    if(!active) return;
    markDone();
    active = false;
    root.classList.remove('is-active');
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    pop.hidden = true;
    hole.hidden = true;
  }
  function nextStep(){
    if(stepIdx >= STEPS.length - 1){ closeTour(); return; }
    showStep(stepIdx + 1);
  }
  function prevStep(){
    if(stepIdx > 0) showStep(stepIdx - 1);
  }

  btnNext.addEventListener('click', nextStep);
  btnPrev.addEventListener('click', prevStep);
  btnSkip.addEventListener('click', closeTour);
  if(helpBtn) helpBtn.addEventListener('click', ()=> openTour(true));
  root.addEventListener('click', e=>{
    if(e.target === document.getElementById('onboard-backdrop')) closeTour();
  });
  document.addEventListener('keydown', e=>{
    if(!active) return;
    if(e.key === 'Escape'){ e.preventDefault(); closeTour(); }
    else if(e.key === 'ArrowRight'){ e.preventDefault(); nextStep(); }
    else if(e.key === 'ArrowLeft' && stepIdx > 0){ e.preventDefault(); prevStep(); }
  });
  window.addEventListener('resize', ()=>{ if(active) showStep(stepIdx); });

  const skipAuto = deepEvId || qs.get('q') || qs.get('onboard') === '0';
  if(!isDone() && !skipAuto){
    setTimeout(()=> openTour(false), 600);
  }
})();

/* ---------- Sheet de filtros (móvil) ---------- */
const sheet = document.getElementById('filtros-sheet');
const sheetBackdrop = document.getElementById('filtros-backdrop');
const sheetBtn = document.getElementById('filtros-btn');
const sheetClose = document.getElementById('filtros-close');
let sheetOpener = null;

function setSheet(on) {
  sheet?.classList.toggle('on', on);
  sheetBackdrop?.classList.toggle('on', on);
  sheetBtn?.setAttribute('aria-expanded', String(on));
  if (on) {
    sheetOpener = document.activeElement;
    sheetClose?.focus();
  } else {
    sheetOpener?.focus?.();
  }
}

sheetBtn?.setAttribute('aria-expanded', 'false');
sheetBtn?.addEventListener('click', () => setSheet(!sheet.classList.contains('on')));
sheetBackdrop?.addEventListener('click', () => setSheet(false));
sheetClose?.addEventListener('click', () => setSheet(false));

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sheet?.classList.contains('on')) setSheet(false);
});

/* ---------- Breakpoint móvil ↔ desktop (rotación / resize) ---------- */
const mqMobile = typeof matchMedia === 'function' ? matchMedia('(max-width: 760px)') : null;
mqMobile?.addEventListener('change', e => {
  if (!e.matches) setSheet(false);
});

})();
