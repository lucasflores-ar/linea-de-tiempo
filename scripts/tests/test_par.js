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
 'zoom','zoom-val','opt-markers','opt-connections','opt-potencias','pot-chips','export-btn','fit-btn','viz-style','row-layout','hidden-dock'].forEach(id=>{
  const el = makeEl('div');
  if(id.startsWith('opt-')){ el.checked = true; el.type = 'checkbox'; }
  if(id==='zoom'){ el.value = '2.4'; el.type = 'range'; }
  if(id==='viz-style'){ el.value = 'editorial'; el.tagName = 'select'; }
  if(id==='row-layout'){ el.value = 'expanded'; el.tagName = 'select'; }
  if(id==='fit-btn'){ el.classList = { toggle(){}, setAttribute(){} }; }
  byId[id]=el;
});
byId['chart-scroll'].clientWidth=900;
byId['chart-scroll'].classList = { toggle(){}, add(){}, remove(){} };

const ctx={
  document:{
    getElementById(id){ return byId[id]||makeEl('div'); },
    documentElement:{ _t:'dark', setAttribute(k,v){this._t=v;}, getAttribute(k){return this._t;} },
    querySelector(){ return makeEl('div'); },
    querySelectorAll(){ return []; },
    createElement(tag){
      const el = makeEl(tag);
      if(tag==='canvas') el.getContext = ()=>({ scale(){}, fillRect(){}, drawImage(){} });
      if(tag==='a') el.click = ()=>{};
      return el;
    },
    addEventListener(){},
  },
  innerWidth:1200, innerHeight:800, location:{hash:'',search:''},
  history:{ replaceState(){} },
  localStorage:{getItem(){return null;},setItem(){}},
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
if(bars < 20 || markers < 5 || !conn || pots !== 6 || filters < 15){
  console.log('FAIL');
  process.exit(1);
}
console.log('PASS');
