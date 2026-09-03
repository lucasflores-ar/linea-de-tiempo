// Smoke test para linea-paralela.html + linea-paralela.js
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '../..');
const DATA = JSON.parse(fs.readFileSync(path.join(REPO, 'linea-tiempo-datos.js'), 'utf-8').split('=')[1].trim().replace(/;$/, ''));
const JS = fs.readFileSync(path.join(REPO, 'linea-paralela.js'), 'utf-8');

function makeEl(tag){
  return {
    tagName:tag, children:[], style:{}, dataset:{}, className:'', textContent:'', innerHTML:'', id:'',
    clientWidth:900, scrollLeft:0, scrollTop:0, listeners:{},
    classList:{_s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, contains(c){return this._s.has(c);}},
    appendChild(c){this.children.push(c);},
    querySelector(sel){
      if(sel==='.bar') return null;
      return makeEl('div');
    },
    querySelectorAll(sel){
      const html = this.innerHTML || '';
      if(sel==='input[type=checkbox]') return (html.match(/type="checkbox"/g)||[]).map(()=>{ const el=makeEl('input'); el.type='checkbox'; el.checked=true; return el; });
      if(sel==='.evt-marker') return (html.match(/class="evt-marker/g)||[]).map(()=>makeEl('div'));
      if(sel==='.pot-chip') return (html.match(/class="pot-chip/g)||[]).map(()=>makeEl('button'));
      if(sel==='.conn-layer') return html.includes('conn-layer') ? [makeEl('svg')] : [];
      return { forEach(){}, length:0 };
    },
    addEventListener(evt,fn){ this.listeners[evt]=fn; },
    setAttribute(){},
    getAttribute(){ return null; },
  };
}
const byId={};
['labels-col','chart-scroll','chart-canvas','axis-area','lane-filters','search','result-count','theme-btn',
 'zoom','zoom-val','opt-markers','opt-connections','opt-potencias','pot-chips','export-btn','fit-btn',
 'focus-reset-btn','focus-rect-btn','focus-val','focus-marquee','font-scale',
 'viz-style','row-layout','hidden-dock'].forEach(id=>{
  const el = makeEl('div');
  if(id.startsWith('opt-')){ el.checked = true; el.type = 'checkbox'; }
  if(id==='zoom'){ el.value = '2.4'; el.type = 'range'; }
  if(id==='viz-style'){ el.value = 'editorial'; el.tagName = 'select'; }
  if(id==='row-layout'){ el.value = 'expanded'; el.tagName = 'select'; }
  if(id==='font-scale'){ el.value = '1'; el.tagName = 'select'; }
  if(id==='fit-btn' || id==='focus-rect-btn'){ el.classList = { _s:new Set(), toggle(){}, add(){}, remove(){}, contains(){return false;} }; el.setAttribute = ()=>{}; }
  if(id==='focus-reset-btn'){ el.disabled = true; }
  byId[id]=el;
});
byId['chart-scroll'].clientWidth=900;
byId['chart-scroll'].classList = { toggle(){}, add(){}, remove(){} };

const ctx={
  document:{
    getElementById(id){ return byId[id]||makeEl('div'); },
    documentElement:{ _t:'dark', style:{ setProperty(){} }, setAttribute(k,v){this._t=v;}, getAttribute(k){return this._t;} },
    querySelector(){ return makeEl('div'); },
    querySelectorAll(){ return []; },
    createElement(tag){
      const el = makeEl(tag);
      if(tag==='canvas') el.getContext = ()=>({
        scale(){}, fillRect(){}, drawImage(){},
        measureText(t){ return { width: String(t || '').length * 7 }; },
        font: '',
      });
      if(tag==='a') el.click = ()=>{};
      return el;
    },
    addEventListener(){},
  },
  innerWidth:1200, innerHeight:800, location:{hash:'',search:''},
  history:{ replaceState(){} },
  localStorage:{
    getItem(k){
      if(k === 'lt-par-init-v') return '2';
      if(k === 'lt-par-lanes') return JSON.stringify(['jud','isr','pro','jes']);
      return null;
    },
    setItem(){},
  },
  URLSearchParams: global.URLSearchParams,
  Image: class{ set src(v){ if(this.onload) setTimeout(()=>this.onload(),0); } },
  URL: global.URL,
  Blob: global.Blob,
  console, addEventListener(){},
};
ctx.window=ctx;

vm.createContext(ctx);
try{
  vm.runInContext('window.LT_DATA='+JSON.stringify(DATA)+';', ctx);
  vm.runInContext(fs.readFileSync(path.join(REPO, 'fichas-personajes.js'), 'utf-8'), ctx);
  vm.runInContext(JS, ctx, {timeout:8000});
  console.log('RUN OK');
}catch(e){
  console.log('ERROR:', e.message);
  console.log(e.stack.split('\n').slice(0,5).join('\n'));
  process.exit(1);
}

const bars = (byId['chart-canvas'].innerHTML.match(/class="bar /g)||[]).length;
const markers = (byId['chart-canvas'].innerHTML.match(/class="evt-marker/g)||[]).length;
const conn = byId['chart-canvas'].innerHTML.includes('conn-layer');
const pots = (byId['pot-chips'].innerHTML.match(/class="pot-chip/g)||[]).length;
const filters = (byId['lane-filters'].innerHTML.match(/type="checkbox"/g)||[]).length;
console.log('barras:', bars, '| marcadores:', markers, '| conexiones:', conn, '| imperios:', pots, '| filtros:', filters);
const estFade = (byId['chart-canvas'].innerHTML.match(/linear-gradient\(90deg,transparent/g)||[]).length;
console.log('barras con fade estimado:', estFade, '(esperado >= 1)');
if(bars < 20 || markers < 5 || !conn || pots !== 6 || filters < 10 || estFade < 1){
  console.log('FAIL');
  process.exit(1);
}

// Fase 2: chips NT por categoría (Evangelios, Hechos, Cartas+Apoc)
const ntEsc = DATA.eventos.filter(e => (e.t || []).includes('NT-ESCRITURA'));
const ntEv = DATA.eventos.filter(e => (e.t || []).includes('NT-EVANGELIOS'));
const ntHec = DATA.eventos.filter(e => (e.t || []).includes('NT-HECHOS'));
const ntCar = DATA.eventos.filter(e => (e.t || []).includes('NT-CARTAS'));
const ntApo = DATA.eventos.filter(e => (e.t || []).includes('NT-APOCALIPSIS'));
const ntRanges = ntEsc.filter(e => e.fa_fin != null && e.fa_fin !== e.fa);
console.log('NT-ESCRITURA:', ntEsc.length, '| Evangelios:', ntEv.length, '| Hechos:', ntHec.length, '| Cartas:', ntCar.length, '| Apoc:', ntApo.length, '| rango:', ntRanges.length);
if(ntEsc.length < 27 || ntEv.length < 4 || ntCar.length < 10 || ntHec.length < 1 || ntApo.length < 1){
  console.log('FAIL nt data');
  process.exit(1);
}

const byIdNt = {};
['labels-col','chart-scroll','chart-canvas','axis-area','lane-filters','search','result-count','theme-btn',
 'zoom','zoom-val','opt-markers','opt-connections','opt-potencias','pot-chips','export-btn','fit-btn',
 'focus-reset-btn','focus-rect-btn','focus-val','focus-marquee','font-scale',
 'viz-style','row-layout','hidden-dock'].forEach(id=>{
  const el = makeEl('div');
  if(id.startsWith('opt-')){ el.checked = true; el.type = 'checkbox'; }
  if(id==='zoom'){ el.value = '2.4'; el.type = 'range'; }
  if(id==='viz-style'){ el.value = 'editorial'; el.tagName = 'select'; }
  if(id==='row-layout'){ el.value = 'expanded'; el.tagName = 'select'; }
  if(id==='font-scale'){ el.value = '1'; el.tagName = 'select'; }
  if(id==='fit-btn' || id==='focus-rect-btn'){ el.classList = { _s:new Set(), toggle(){}, add(){}, remove(){}, contains(){return false;} }; el.setAttribute = ()=>{}; }
  if(id==='focus-reset-btn'){ el.disabled = true; }
  byIdNt[id]=el;
});
byIdNt['chart-scroll'].clientWidth=900;
byIdNt['chart-scroll'].classList = { toggle(){}, add(){}, remove(){} };
const ctxNt={
  document:{
    getElementById(id){ return byIdNt[id]||makeEl('div'); },
    documentElement:{ _t:'dark', style:{ setProperty(){} }, setAttribute(k,v){this._t=v;}, getAttribute(k){return this._t;} },
    querySelector(){ return makeEl('div'); },
    querySelectorAll(){ return []; },
    createElement(tag){
      const el = makeEl(tag);
      if(tag==='canvas') el.getContext = ()=>({
        scale(){}, fillRect(){}, drawImage(){},
        measureText(t){ return { width: String(t || '').length * 7 }; },
        font: '',
      });
      if(tag==='a') el.click = ()=>{};
      return el;
    },
    addEventListener(){},
  },
  innerWidth:1200, innerHeight:800, location:{hash:'',search:''},
  history:{ replaceState(){} },
  localStorage:{
    getItem(k){
      if(k==='lt-par-init-v') return '2';
      if(k==='lt-par-lanes') return JSON.stringify(['nt-ev','nt-hec','nt-car']);
      return null;
    },
    setItem(){},
  },
  URLSearchParams: global.URLSearchParams,
  Image: class{ set src(v){ if(this.onload) setTimeout(()=>this.onload(),0); } },
  URL: global.URL,
  Blob: global.Blob,
  console, addEventListener(){},
};
ctxNt.window=ctxNt;
vm.createContext(ctxNt);
vm.runInContext('window.LT_DATA='+JSON.stringify(DATA)+';', ctxNt);
vm.runInContext(fs.readFileSync(path.join(REPO, 'fichas-personajes.js'), 'utf-8'), ctxNt);
vm.runInContext(JS, ctxNt, {timeout:8000});
const ntBars = (byIdNt['chart-canvas'].innerHTML.match(/class="bar /g)||[]).length;
const ntPeriodBars = (byIdNt['chart-canvas'].innerHTML.match(/bar-compact-narrow/g)||[]).length;
const ntSections = (byIdNt['lane-filters'].innerHTML.match(/Evangelios|Hechos \(NT\)|Cartas/g)||[]).length;
const ntFade = (byIdNt['chart-canvas'].innerHTML.match(/linear-gradient\(90deg,transparent/g)||[]).length;
const ntFilterEv = byIdNt['lane-filters'].innerHTML.includes('Evangelios');
const ntFilterCar = byIdNt['lane-filters'].innerHTML.includes('Cartas');
console.log('nt barras:', ntBars, '| periodo:', ntPeriodBars, '| filtros NT:', ntSections, '| fade:', ntFade, '| ev:', ntFilterEv, '| car:', ntFilterCar);
if(ntBars < 27 || ntPeriodBars < 10 || ntSections < 3 || ntFade < 10 || !ntFilterEv || !ntFilterCar){
  console.log('FAIL nt lanes');
  process.exit(1);
}

// Modo compacto NT Cartas: pistas apiladas cuando las etiquetas se solapan
const byIdNtCompact = {};
['labels-col','chart-scroll','chart-canvas','axis-area','lane-filters','search','result-count','theme-btn',
 'zoom','zoom-val','opt-markers','opt-connections','opt-potencias','pot-chips','export-btn','fit-btn',
 'focus-reset-btn','focus-rect-btn','focus-val','focus-marquee','font-scale',
 'viz-style','row-layout','hidden-dock'].forEach(id=>{
  const el = makeEl('div');
  if(id.startsWith('opt-')){ el.checked = true; el.type = 'checkbox'; }
  if(id==='zoom'){ el.value = '2.4'; el.type = 'range'; }
  if(id==='viz-style'){ el.value = 'editorial'; el.tagName = 'select'; }
  if(id==='row-layout'){ el.value = 'compact'; el.tagName = 'select'; }
  if(id==='font-scale'){ el.value = '1'; el.tagName = 'select'; }
  if(id==='fit-btn' || id==='focus-rect-btn'){ el.classList = { _s:new Set(), toggle(){}, add(){}, remove(){}, contains(){return false;} }; el.setAttribute = ()=>{}; }
  if(id==='focus-reset-btn'){ el.disabled = true; }
  byIdNtCompact[id]=el;
});
byIdNtCompact['chart-scroll'].clientWidth=900;
byIdNtCompact['chart-scroll'].classList = { toggle(){}, add(){}, remove(){} };
const ctxNtCompact={
  document:{
    getElementById(id){ return byIdNtCompact[id]||makeEl('div'); },
    documentElement:{ _t:'dark', style:{ setProperty(){} }, setAttribute(k,v){this._t=v;}, getAttribute(k){return this._t;} },
    querySelector(){ return makeEl('div'); },
    querySelectorAll(){ return []; },
    createElement(tag){
      const el = makeEl(tag);
      if(tag==='canvas') el.getContext = ()=>({
        scale(){}, fillRect(){}, drawImage(){},
        measureText(t){ return { width: String(t || '').length * 7 }; },
        font: '',
      });
      if(tag==='a') el.click = ()=>{};
      return el;
    },
    addEventListener(){},
  },
  innerWidth:1200, innerHeight:800, location:{hash:'',search:''},
  history:{ replaceState(){} },
  localStorage:{
    getItem(k){
      if(k==='lt-par-init-v') return '2';
      if(k==='lt-par-lanes') return JSON.stringify(['nt-car']);
      if(k==='lt-par-row-layout') return 'compact';
      return null;
    },
    setItem(){},
  },
  URLSearchParams: global.URLSearchParams,
  Image: class{ set src(v){ if(this.onload) setTimeout(()=>this.onload(),0); } },
  URL: global.URL,
  Blob: global.Blob,
  console, addEventListener(){},
};
ctxNtCompact.window=ctxNtCompact;
vm.createContext(ctxNtCompact);
vm.runInContext('window.LT_DATA='+JSON.stringify(DATA)+';', ctxNtCompact);
vm.runInContext(fs.readFileSync(path.join(REPO, 'fichas-personajes.js'), 'utf-8'), ctxNtCompact);
vm.runInContext(JS, ctxNtCompact, {timeout:8000});
const ntRows = (byIdNtCompact['chart-canvas'].innerHTML.match(/class="row"/g)||[]).length;
console.log('nt-car compact pistas:', ntRows, '(esperado > 1)');
if(ntRows < 2){
  console.log('FAIL nt stacking');
  process.exit(1);
}

// Default sin localStorage: solo chip "Antes del Diluvio"
const byIdPre = {};
['labels-col','chart-scroll','chart-canvas','axis-area','lane-filters','search','result-count',
 'zoom','zoom-val','opt-markers','opt-connections','opt-potencias','pot-chips','export-btn','fit-btn',
 'focus-reset-btn','focus-rect-btn','focus-val','focus-marquee','font-scale',
 'viz-style','row-layout','hidden-dock'].forEach(id=>{
  const el = makeEl('div');
  if(id.startsWith('opt-')){ el.checked = true; el.type = 'checkbox'; }
  if(id==='zoom'){ el.value = '2.4'; el.type = 'range'; }
  if(id==='viz-style'){ el.value = 'editorial'; el.tagName = 'select'; }
  if(id==='row-layout'){ el.value = 'expanded'; el.tagName = 'select'; }
  if(id==='fit-btn' || id==='focus-rect-btn'){ el.classList = { _s:new Set(), toggle(){}, add(){}, remove(){}, contains(){return false;} }; el.setAttribute = ()=>{}; }
  if(id==='focus-reset-btn'){ el.disabled = true; }
  byIdPre[id]=el;
});
byIdPre['chart-scroll'].clientWidth=900;
byIdPre['chart-scroll'].classList = { toggle(){}, add(){}, remove(){} };
byIdPre['lane-filters'].parentElement = { classList: { contains(c){ return c === 'quick-scroll'; } } };
const ctxPre={
  document:{
    getElementById(id){ return byIdPre[id]||makeEl('div'); },
    documentElement:{ style:{ setProperty(){} }, setAttribute(){}, getAttribute(){ return null; } },
    querySelector(){ return makeEl('div'); },
    querySelectorAll(){ return []; },
    createElement(tag){
      const el = makeEl(tag);
      if(tag==='canvas') el.getContext = ()=>({
        scale(){}, fillRect(){}, drawImage(){},
        measureText(t){ return { width: String(t || '').length * 7 }; },
        font: '',
      });
      return el;
    },
    addEventListener(){},
  },
  innerWidth:360, innerHeight:640, location:{hash:'',search:''},
  history:{ replaceState(){} },
  localStorage:{ _store:{}, getItem(){ return null; }, setItem(k,v){ this._store[k]=v; } },
  matchMedia(q){ return { matches: q.includes('760'), addEventListener(){} }; },
  URLSearchParams: global.URLSearchParams,
  Image: class{ set src(v){ if(this.onload) setTimeout(()=>this.onload(),0); } },
  URL: global.URL, Blob: global.Blob, console, addEventListener(){},
};
ctxPre.window=ctxPre;
vm.createContext(ctxPre);
vm.runInContext('window.LT_DATA='+JSON.stringify(DATA)+';', ctxPre);
vm.runInContext(fs.readFileSync(path.join(REPO, 'fichas-personajes.js'), 'utf-8'), ctxPre);
vm.runInContext(JS, ctxPre, {timeout:8000});
const preBars = (byIdPre['chart-canvas'].innerHTML.match(/class="bar /g)||[]).length;
const preEmpty = byIdPre['chart-canvas'].innerHTML.includes('empty-msg');
const preLaneStore = ctxPre.localStorage._store?.['lt-par-lanes'];
console.log('default pre barras:', preBars, '| vacío:', preEmpty, '| lanes guardadas:', preLaneStore);
if(preBars < 3 || preEmpty || preLaneStore !== JSON.stringify(['pre'])){
  console.log('FAIL default pre');
  process.exit(1);
}

// Un solo reino: tabla curada con fila fusionada Abigaíl y Natán
const unSoloReino = DATA.personajes.filter(p => p.grupo === 'Un solo reino');
const usrNames = unSoloReino.map(p => p.n);
const samuel = unSoloReino.find(p => p.n === 'Samuel');
const jonatan = unSoloReino.find(p => p.n === 'Jonatán');
const david = unSoloReino.find(p => p.n === 'David');
const abigailNathan = unSoloReino.find(p => p.n === 'Abigaíl y Natán');
const mefiboset = unSoloReino.find(p => p.n === 'Mefibóset');
console.log('un solo reino:', usrNames.join(' | '));
if(
  !samuel || samuel.inicio !== -1180 || samuel.fin !== -1080 ||
  !jonatan || jonatan.inicio !== -1138 || jonatan.fin !== -1078 ||
  !david || david.inicio !== -1107 || david.fin !== -1037 ||
  !abigailNathan || abigailNathan.inicio !== -1100 || abigailNathan.fin !== -1000 ||
  !mefiboset || mefiboset.inicio !== -1083 || mefiboset.fin !== -1000 ||
  usrNames.includes('Abigaíl') || usrNames.includes('Natán')
){
  console.log('FAIL un solo reino');
  process.exit(1);
}

console.log('PASS');
