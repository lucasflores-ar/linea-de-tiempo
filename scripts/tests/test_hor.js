// Mock DOM para probar linea-horizontal.html sin navegador
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '../..');
const DATA = JSON.parse(fs.readFileSync(path.join(REPO, 'linea-tiempo-datos.js'), 'utf-8').split('=')[1].trim().replace(/;$/, ''));
const HTML = fs.readFileSync(path.join(REPO, 'linea-horizontal.html'), 'utf-8');
const inline = HTML.match(/<script>\s*\r?\n([\s\S]*?)\r?\n<\/script>/)[1];

function makeEl(tag){
  return {
    tagName:tag, children:[], style:{}, dataset:{}, className:'', textContent:'', innerHTML:'', id:'',
    clientWidth:1200, scrollLeft:0, scrollWidth:0, listeners:{},
    classList:{_s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,v){v?this._s.add(c):this._s.delete(c);}, contains(c){return this._s.has(c);}},
    appendChild(c){this.children.push(c);},
    insertAdjacentHTML(p,h){ this.innerHTML += h; },
    querySelector(){ return makeEl('div'); },
    querySelectorAll(){ return { forEach(){}, }; },
    addEventListener(evt,fn){ this.listeners[evt]=fn; },
    getBoundingClientRect(){ return {left:0,top:0,width:340,height:500}; },
    scrollIntoView(){},
    scrollBy(){},
    remove(){},
    set onclick(f){ this._onclick=f; },
  };
}
const byId={};
const ids=['brand-sub','f-tema','f-era','f-tipo','f-pot','search','reset','theme-btn','era-nav','sc-l','sc-r','track','scroll-area','overlay','drawer','d-close','d-badge','d-title','d-date','d-ref','d-desc','d-char','d-meta','d-temas','d-par','d-qcount','d-qlist','d-more','link-app','m-columns','m-accordion','m-cascade','group-nav','group-view','axis-line','d-rel-sec','d-rel'];
ids.forEach(id=>byId[id]=makeEl('div'));
byId['scroll-area'].clientWidth=1200;

const docEl={_t:'dark', setAttribute(k,v){this._t=v;}, getAttribute(k){return this._t;} };
const ctx={ document:{ getElementById(id){ return byId[id]||makeEl('div'); },
  documentElement:docEl,
  querySelector(){ return makeEl('div'); },
  querySelectorAll(){ return []; },
  createElement(){ return makeEl('div'); },
  addEventListener(){},
}, innerWidth:1920, innerHeight:1080, console, addEventListener(){}, localStorage:{getItem(){return null;}, setItem(){}}, };

ctx.window=ctx;
vm.createContext(ctx);
try{
  vm.runInContext('window.LT_DATA='+JSON.stringify(DATA)+';', ctx);
  vm.runInContext(inline, ctx, {timeout:5000});
  console.log('RUN OK');
}catch(e){
  console.log('ERROR:', e.message);
  console.log(e.stack.split('\n').slice(0,4).join('\n'));
}

// ---- validaciones ----
const trackHtml = byId.track.innerHTML;
const cols = (trackHtml.match(/era-col/g)||[]).length;
console.log('columnas de época renderizadas:', cols, '(esperado 9)');
console.log('todas con era-body:', (trackHtml.match(/era-body/g)||[]).length, '=== 9?');
const navHtml = byId['era-nav'].innerHTML;
console.log('botones de navegación:', (navHtml.match(/jump-btn/g)||[]).length, '(esperado 9)');
console.log('selects poblados: tema=', byId['f-tema'].innerHTML.split('<option').length-1,
  '| era=', byId['f-era'].innerHTML.split('<option').length-1,
  '| tipo=', byId['f-tipo'].innerHTML.split('<option').length-1,
  '| pot=', byId['f-pot'].innerHTML.split('<option').length-1);

// total de tarjetas en modo cascada (default)
const cards = (trackHtml.match(/class="card /g)||[]).length + (trackHtml.match(/class="card s-card/g)||[]).length;
console.log('tarjetas renderizadas (cascada default):', cards);

// ---- test: abrir drawer de un suceso ----
try{
  const ev = DATA.eventos.find(e=>e.id===1);
  ctx.openDrawer(ev);
  console.log('drawer: título=', byId['d-title'].textContent, '| badge era=', byId['d-badge'].textContent);
  console.log('drawer: personajes chips=', byId['d-char'].innerHTML.split('chip').length-1,
    '| potencia presente=', byId['d-par'].innerHTML.indexOf('Potencia mundial')>=0);
  ctx.closeDrawer();
}catch(e){ console.log('test drawer ERROR:', e.message); }

// ---- test: drawer con potencia (un suceso asirio) ----
try{
  const ev = DATA.eventos.find(e=>e.fa>=-874 && e.fa<=-625);
  ctx.openDrawer(ev);
  console.log('drawer+potencia:', ev.n, '| fa=', ev.fa, '| contiene "Asiria"=', byId['d-par'].innerHTML.indexOf('Asiria')>=0);
  ctx.closeDrawer();
}catch(e){ console.log('test drawer+potencia ERROR:', e.message); }

// ---- test: filtro por potencia ROMA (via listener real) ----
try{
  const sel=byId['f-pot']; sel.value='ROMA';
  sel.listeners.change && sel.listeners.change({target:sel});
  const list=ctx.filtered();
  const fuera=list.filter(e=>{ const y=e.fa; return !(y>=-63 && y<=100); });
  console.log('filtro ROMA: eventos=', list.length, '| fuera de rango=', fuera.length, '(esperado 0)');
  byId.reset._onclick();
}catch(e){ console.log('test potencia ERROR:', e.message); }

// ---- test: filtro por tema ----
try{
  const sel=byId['f-tema']; sel.value='REYES';
  sel.listeners.change && sel.listeners.change({target:sel});
  const list=ctx.filtered();
  const sinTema=list.filter(e=>!e.t.includes('REYES'));
  console.log('filtro tema REYES: eventos=', list.length, '| sin tema=', sinTema.length, '(esperado 0)');
  byId.reset._onclick();
}catch(e){ console.log('test tema ERROR:', e.message); }

// ---- test: búsqueda ----
try{
  byId.search.value='David';
  byId.search.listeners.input && byId.search.listeners.input({target:byId.search});
  const list=ctx.filtered();
  console.log('búsqueda "David": eventos=', list.length);
  byId.reset._onclick();
}catch(e){ console.log('test búsqueda ERROR:', e.message); }

// ---- test: navegación/filtro por clic en botón de época ----
try{
  const nav=byId['era-nav'];
  const evt={target:{closest:(sel)=> sel==='.jump-btn'? {dataset:{target:'ec'}} : null}};
  nav._onclick(evt);
const totalEC = DATA.eventos.filter(e=>ctx.eraKey(e.era)==='E.C.').length;
console.log('nav clic "Siglo primero": selEra=', byId['f-era'].value,
  '| filtrado=', ctx.filtered().length, '| E.C. totales=', totalEC, '(deben coincidir)');
  // segundo clic = quitar filtro
  nav._onclick(evt);
  console.log('nav 2º clic (toggle off): selEra=', JSON.stringify(byId['f-era'].value),
    '| total=', ctx.filtered().length, '(esperado 193)');
}catch(e){ console.log('test nav ERROR:', e.message); }

// ---- test: tema claro/oscuro ----
try{
  console.log('tema inicial:', docEl._t, '(esperado dark por defecto)');
  byId['theme-btn']._onclick();
  console.log('tema tras clic:', docEl._t, '(esperado light)');
  byId['theme-btn']._onclick();
  console.log('tema tras 2º clic:', docEl._t, '(esperado dark)');
}catch(e){ console.log('test tema ERROR:', e.message); }

// ---- test: grupos anidados (jerarquía) ----
try{
  const G = DATA.grupos;
  console.log('grupos anidados en datos:', (G||[]).length, '(esperado 8)');
  const conG = DATA.eventos.filter(e=>e.g).length;
  console.log('eventos con grupo g:', conG, '(esperado 52)');

  // badge de grupo presente en tarjetas de eventos agrupados
  byId['m-cascade']._onclick && byId['m-cascade']._onclick();
  console.log('badges de grupo en tarjetas:', (byId.track.innerHTML.match(/g-badge/g)||[]).length, '>= 1');

  // abrir un grupo -> vista anidada
  ctx.openGroupView('pablo-misionero');
  const gv = byId['group-view'] || byId.track;
  console.log('vista grupo: track oculto=', byId.track.style.display==='none',
    '| group-view tiene breadcrumb=', (gv.innerHTML.indexOf('g-back')>=0 || byId['group-view'] && byId['group-view'].innerHTML.indexOf('Todas las épocas')>=0));
  // render de comparación (sin excepción) si se activa compare
  ctx.renderGroupView();
  console.log('renderGroupView OK (sin excepción)');
  ctx.closeGroupView();
  console.log('tras cerrar: track visible=', byId.track.style.display!=='none');
}catch(e){ console.log('test grupos ERROR:', e.message); }

// ---- test: syncUrl incluye g/cmp (via history) ----
try{
  ctx.openGroup='jose-egipto'; ctx.compareGroup=null; ctx.syncUrl();
  console.log('syncUrl con grupo OK (sin excepción)');
}catch(e){ console.log('test syncUrl ERROR:', e.message); }

// ---- test: relaciones entre hechos ----
try{
  const R = DATA.relaciones;
  console.log('relaciones en datos:', (R||[]).length, '(esperado 17)');
  // abrir un suceso que tenga relación (id 2 -> 3 causa)
  const ev2 = DATA.eventos.find(e=>e.id===2);
  ctx.openDrawer(ev2);
  const relHtml = byId['d-rel'].innerHTML;
  console.log('drawer relaciones (id 2):', relHtml.indexOf('rel-edge')>=0 ? 'presentes' : 'sin relaciones');
  ctx.closeDrawer();
}catch(e){ console.log('test relaciones ERROR:', e.message); }