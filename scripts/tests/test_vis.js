// Mock mínimo de DOM para probar index.html sin navegador
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '../..');
const DATA = JSON.parse(fs.readFileSync(path.join(REPO, 'linea-tiempo-datos.js'), 'utf-8').split('=')[1].trim().replace(/;$/, ''));
const HTML = fs.readFileSync(path.join(REPO, 'index.html'), 'utf-8');
const inline = HTML.match(/<script>\s*\r?\n([\s\S]*?)\r?\n<\/script>/)[1];

// ---- DOM mock ----
function makeEl(tag){
  return {
    tagName: tag, children: [], style:{}, dataset:{}, className:'', textContent:'', innerHTML:'', title:'',
    _value:'', id:'', clientWidth:1200, scrollLeft:0, scrollWidth:0,
    classList:{ _s:new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);}, toggle(c,v){v?this._s.add(c):this._s.delete(c);}, contains(c){return this._s.has(c);} },
    appendChild(c){this.children.push(c);},
    querySelector(){ return makeEl('div'); },
    querySelectorAll(){ return { forEach(){}, }; },
    addEventListener(){},
    getContext(){ return { clearRect(){}, createLinearGradient(){ return {addColorStop(){}}; }, beginPath(){}, moveTo(){}, lineTo(){}, closePath(){}, fill(){}, stroke(){}, arc(){}, fillRect(){}, fillText(){}, set fillStyle(v){}, set strokeStyle(v){}, set lineWidth(v){}, set font(v){}, set textAlign(v){} }; },
    getBoundingClientRect(){ return {left:0, top:0, width:1200, height:600}; },
    remove(){},
    set onclick(f){ this._onclick=f; },
  };
}
const byId = {};
const ids = ['stats','filters','eraFilters','typeFilters','potFilters','zoom','outZoom','cent','outCent','counter','epochs','legend','scroll','track','bands','axis','tlRange','hist','map','mapTip','detail','search','sres','playBtn','stars','showRivers','vtl'];
ids.forEach(id=> byId[id] = makeEl('div'));
byId.zoom.value='4400'; byId.cent.value='-1963';
byId.zoom._value='4400'; byId.cent._value='-1963';
byId.map.width=1200; byId.map.height=744;
byId.stars.width=1920; byId.stars.height=1080;

// vis mock
let visSetItems=null, visSetGroups=null;
const vis = { Timeline: function(container, items, groups, opts){
    this.container=container; this.items=items; this.groups=groups; this.opts=opts;
    this.setItems=function(i){visSetItems=i;};
    this.setGroups=function(g){visSetGroups=g;};
    this.setWindow=function(){};
    this.on=function(){};
    container._vis=this;
} };

const ctx = { document: { getElementById(id){ return byId[id]||makeEl('div'); },
  querySelector(){ return makeEl('div'); },
  createElement(){ return makeEl('div'); },
  addEventListener(){},
}, vis, performance:{now:()=>0}, requestAnimationFrame(f){}, innerWidth:1920, innerHeight:1080, console, addEventListener(){}, setTimeout(f){}, clearTimeout(){}, };
ctx.window = ctx;

vm.createContext(ctx);
try{
  vm.runInContext('window.LT_DATA='+JSON.stringify(DATA)+';', ctx);
  vm.runInContext(inline, ctx, {timeout:5000});
  console.log('RUN OK');
}catch(e){
  console.log('ERROR:', e.message);
  console.log(e.stack.split('\n').slice(0,4).join('\n'));
}

// ---- validar items vis (solo personajes ahora) ----
const vtlMock = byId.vtl._vis;
const getItems = ()=> visSetItems || (vtlMock && vtlMock.items);
if(vtlMock){
  const initial = getItems();
  const ranges = initial.filter(i=>i.type==='range');
  const boxes = initial.filter(i=>i.type==='box');
  console.log('vis items: range(personajes)=',ranges.length,' box(sucesos)=',boxes.length,' (esperado 54 y 0)');
  const grupos = new Set(initial.map(i=>i.group));
  console.log('grupos usados:', [...grupos].join(' | '));
  const inv = ranges.filter(r=> r.start.getTime()> r.end.getTime());
  console.log('rangos invertidos:', inv.length);

  // ---- validar eje de sucesos: ancho del track + scroll + distribución en filas ----
try{
  const evts = byId.track.children.filter(c=>c.title); // .evt tienen title=nombre
  console.log('evt dibujados en #track:', evts.length, '(esperado ~158)');
  const rows = new Set(evts.map(e=>e.style.top));
  console.log('filas usadas (top):', [...rows].join(' '), '(esperado 16% 39% 61% 84%)');
  const lefts = evts.map(e=>parseFloat(e.style.left)).filter(n=>!isNaN(n));
  console.log('left min/max:', Math.min(...lefts), '/', Math.max(...lefts), '(esperado 0..12000)');
  console.log('scrollLeft tras render:', byId.scroll.scrollLeft, '(esperado ~5400 = centro)');
  console.log('track width inline:', byId.track.style.width, '(esperado 12000px)');
}catch(e){ console.log('test eje ERROR:', e.message); }

// ---- test filtro de TEMA: quitar JUECES vía el botón real ----
  try{
    const j = byId.filters.children.find(b=>b.dataset.k==='JUECES');
    j._onclick();
    const items2 = getItems();
    const juc = items2.filter(i=>i.group==='Época de los jueces');
    console.log('tras quitar JUECES: total items=', items2.length, '| grupo Jueces=', juc.length, '(esperado 0)');
    j._onclick(); // restaurar
  }catch(e){ console.log('test tema ERROR:', e.message); }

  // ---- test filtro de POTENCIA MUNDIAL: solo ASIRIA (-874 a -625) ----
  try{
    const btns = byId.potFilters.children; // [0]=Todo, [1..6]=potencias
    btns[0]._onclick();                       // Todo => limpia selPots (nada pasa)
    const as = btns.find(b=>b.dataset.k==='ASIRIA');
    as._onclick();                            // solo ASIRIA activa
    const ranges3 = getItems().filter(i=>i.type==='range');
    const perFuera = ranges3.filter(i=>{ const s=Math.round(i.start.getTime()/31557600000); const e=Math.round(i.end.getTime()/31557600000); return !(e>=-874 && s<=-625); });
    console.log('POTENCIA ASIRIA: personajes en solape=', ranges3.length, '| fuera=', perFuera.length, '(esperado 0)');
    if(perFuera.length){ console.log('  ejemplo:', perFuera[0].content); }
    // verificar helpers de rango de potencia directamente (function declarations accesibles)
    console.log('potenciaCubre(-800)=', ctx.potenciaCubre(-800), '(esperado true) | -3000=', ctx.potenciaCubre(-3000), '(esperado false)');
    console.log('potenciaCubreRango(-860,-830)=', ctx.potenciaCubreRango(-860,-830), '(esperado true) | (-2970,-2020)=', ctx.potenciaCubreRango(-2970,-2020), '(esperado false)');
    btns[0]._onclick(); // restaurar Todo
  }catch(e){ console.log('test potencia ERROR:', e.message); }
} else { console.log('vtl no creado'); }