// Mock DOM para probar fichas.html sin navegador
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const REPO=path.resolve(__dirname,'../..');
const _w={}; global.window=_w;
eval(fs.readFileSync(path.join(REPO,'fichas-personajes.js'),'utf-8'));
const FICHAS=_w.LT_FICHAS;
const HTML=fs.readFileSync(path.join(REPO,'fichas.html'),'utf-8');
const inline=HTML.match(/<script>\s*\r?\n([\s\S]*?)\r?\n<\/script>/)[1];

function makeEl(tag){
  return {
    tagName:tag, children:[], style:{}, dataset:{}, className:'', textContent:'', innerHTML:'', id:'',
    value:'', checked:false, listeners:{}, clientWidth:1200,
    classList:{_s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,v){v?this._s.add(c):this._s.delete(c);}, contains(c){return this._s.has(c);}},
    appendChild(c){this.children.push(c);},
    insertAdjacentHTML(p,h){ this.innerHTML+=h; },
    querySelector(){ return makeEl('div'); },
    querySelectorAll(){ return { forEach(){}, }; },
    addEventListener(evt,fn){ this.listeners[evt]=fn; },
    getBoundingClientRect(){ return {left:0,top:0,width:300,height:300}; },
    scrollIntoView(){}, scrollBy(){}, remove(){},
    set onclick(f){ this._onclick=f; },
  };
}
const byId={};
const ids=['brand-sub','search','f-era','f-sec','f-prof','sort','t-vida','t-hitos','t-preg','reset','theme-btn','link-linea','link-app','st-total','st-visible','st-vida','st-prof','st-hitos','st-preg','st-incom','grid','empty','overlay','drawer','d-close','d-era','d-title','d-alt','d-profs','d-meta','d-lugares','d-hcount','d-hitos','d-hmore','d-rel','d-cual','d-def','d-op','d-vers','d-lec','d-nq','d-nh','d-fuente','d-open-linea','d-open-app'];
ids.forEach(id=>byId[id]=makeEl('div'));
const docEl={_t:'dark', setAttribute(k,v){this._t=v;}, getAttribute(k){return this._t;} };
const ctx={ document:{ getElementById(id){ return byId[id]||makeEl('div'); },
  documentElement:docEl, querySelector(){ return makeEl('div'); },
  querySelectorAll(){ return []; }, createElement(){ return makeEl('div'); }, addEventListener(){},
}, innerWidth:1920, innerHeight:1080, console, addEventListener(){}, localStorage:{getItem(){return null;},setItem(){}}, location:{search:''} };
ctx.window=ctx;
vm.createContext(ctx);
try{
  vm.runInContext('window.LT_FICHAS='+JSON.stringify(FICHAS)+';',ctx);
  vm.runInContext(inline,ctx,{timeout:5000});
  console.log('RUN OK');
}catch(e){ console.log('ERROR:',e.message); console.log(e.stack.split('\n').slice(0,5).join('\n')); }

// ---- validaciones ----
const grid=byId.grid.innerHTML;
console.log('fichas renderizadas:',(grid.match(/class="ficha"/g)||[]).length,'(esperado',FICHAS.length+')');
console.log('selects: era=',byId['f-era'].innerHTML.split('<option').length-1,'| seccion=',byId['f-sec'].innerHTML.split('<option').length-1,'| prof=',byId['f-prof'].innerHTML.split('<option').length-1);
console.log('statbar total:',byId['st-total'].textContent,'| con vida:',byId['st-vida'].textContent,'| con prof:',byId['st-prof'].textContent);

// ---- test: filtro de búsqueda ----
try{
  const s=byId.search; s.value='david';
  s.listeners.input({target:s});
  const cards=(byId.grid.innerHTML.match(/class="ficha"/g)||[]).length;
  console.log('busqueda "david": visibles=',cards,'| stat visibles=',byId['st-visible'].textContent);
  byId.reset._onclick();
}catch(e){ console.log('test busqueda ERROR:',e.message); }

// ---- test: filtro por época E.C. ----
try{
  const sel=byId['f-era']; sel.value='ec';
  sel.listeners.change({target:sel});
  const cards=(byId.grid.innerHTML.match(/class="ficha"/g)||[]).length;
  console.log('era=ec: visibles=',cards,'| total E.C.=',FICHAS.filter(f=>f.era==='ec').length);
  byId.reset._onclick();
}catch(e){ console.log('test era ERROR:',e.message); }

// ---- test: filtro profesión Rey ----
try{
  const sel=byId['f-prof']; sel.value='Rey';
  sel.listeners.change({target:sel});
  const cards=(byId.grid.innerHTML.match(/class="ficha"/g)||[]).length;
  console.log('profesion=Rey: visibles=',cards,'| total Reyes=',FICHAS.filter(f=>f.profesion==='Rey').length);
  byId.reset._onclick();
}catch(e){ console.log('test prof ERROR:',e.message); }

// ---- test: checkbox "con preguntas" ----
try{
  const c=byId['t-preg']; c.checked=true;
  c.listeners.change({target:c});
  const cards=(byId.grid.innerHTML.match(/class="ficha"/g)||[]).length;
  const tot=FICHAS.filter(f=>parseInt(f.nq||0)>0).length;
  console.log('solo con preguntas: visibles=',cards,'| esperado',tot);
  byId.reset._onclick();
}catch(e){ console.log('test checkbox ERROR:',e.message); }

// ---- test: drawer de David ----
try{
  const d=FICHAS.find(f=>f.nombre==='David');
  ctx.openDrawer(d);
  console.log('drawer David:', byId['d-title'].textContent,'| era=',byId['d-era'].textContent,
    '| hitos mostrados=',(byId['d-hitos'].innerHTML.match(/class="hito"/g)||[]).length,'de',d.hitos.length,
    '| nq=',byId['d-nq'].textContent);
  console.log('  cualidades placeholder:', byId['d-cual'].innerHTML.indexOf('por completar')>=0);
  ctx.closeDrawer();
}catch(e){ console.log('test drawer ERROR:',e.message); }

// ---- test: tema ----
try{
  console.log('tema inicial:',docEl._t);
  byId['theme-btn']._onclick();
  console.log('tras clic:',docEl._t);
  byId['theme-btn']._onclick();
  console.log('2º clic:',docEl._t);
}catch(e){ console.log('test tema ERROR:',e.message); }