const fs=require('fs'),path=require('path'),{chromium}=require('playwright');
const src=fs.readFileSync(path.join(__dirname,'../../linea-paralela.js'),'utf8');const i=src.lastIndexOf('})();');
const body=src.slice(0,i)+'\nwindow.__audit={layout:()=>lastLayout,render:safeRender,loose:layoutLooseEventLanes,expanded:layoutLooseExpanded,project:yearToX,chartYear,build:buildAllLaneData,tracks:layoutBlockTracks};\n'+src.slice(i);
(async()=>{let b=await chromium.launch({headless:true});const out={};
async function page(width,height,lane){let p=await b.newPage({viewport:{width,height}});await p.addInitScript(()=>localStorage.setItem('lt-onboarding-v2','done'));await p.route('**/linea-paralela.js*',r=>r.fulfill({body,contentType:'application/javascript'}));await p.goto('http://127.0.0.1:8000/linea-paralela.html#vista=comparar&filas='+lane);await p.waitForFunction(()=>window.__audit?.layout());await p.evaluate(()=>document.fonts.ready);return p;}
let p=await page(1920,1080,'jud,isr,pro');
/* Intención original: el control que ocupa la posición del suceso 75 tiene que
   llevar al 75, no al 354. Ya no hay un `data-ev="75"` suelto: como los dos se
   pisaban, ahora comparten un control agregado. La comprobación sigue siendo la
   misma, pero busca el control que *contiene* al 75. */
const ctrl=await p.evaluate(()=>{const tiene=el=>(el.dataset.aggIds||'').split(',').includes('75');
  const el=document.querySelector('.evt-marker[data-ev="75"]')||[...document.querySelectorAll('.evt-marker[data-agg-ids]')].find(tiene);
  if(!el)return null;const b=el.getBoundingClientRect();
  return{label:el.getAttribute('aria-label'),agregado:!!el.dataset.aggIds,ids:el.dataset.aggIds||el.dataset.ev,rect:{x:b.x,y:b.y,width:b.width,height:b.height}}});
out.markerClick={control:ctrl};
if(ctrl){await p.mouse.click(ctrl.rect.x+ctrl.rect.width/2,ctrl.rect.y+ctrl.rect.height/2);await p.locator('#drawer.on').waitFor();
  out.markerClick.titulo=await p.locator('#d-title').innerText();
  /* Desde lo que se abrió, ¿se llega al suceso 75? */
  out.markerClick.llegaAl75=await p.evaluate(()=>{const d=document.querySelector('#drawer');
    if(!d)return false;if(d.querySelector('[data-ev-id="75"]'))return true;
    const t=document.querySelector('#d-title')?.innerText||'';return /Ezequías/i.test(t)});
  await p.screenshot({path:path.join(__dirname,'wrong-marker.png')})}
await p.close();
p=await page(1440,1080,'jue');out.relayout=await p.evaluate(()=>{const snap=()=>({free:__audit.layout().freeBelow,h:__audit.layout().totalH,view:document.querySelector('#chart-scroll').clientHeight});let before=snap();__audit.render();return{before,after:snap()}});await p.close();
p=await page(1920,1080,'sem');out.duplicates=await p.evaluate(()=>{let L=__audit.layout();const grouped=new Set(L.laneData.flatMap(b=>b.tracks.flatMap(t=>t.people.flatMap(p=>p.groupEvents?.map(e=>e.id)||[]))));const loose=L.looseEligible;return{free:L.freeBelow,groups:L.laneData.flatMap(b=>b.tracks.flatMap(t=>t.people.filter(p=>p.isEventGroup).map(p=>({n:p.n,ids:p.groupEvents.map(e=>e.id)})))),repeated:loose.filter(id=>grouped.has(id))}});out.synthetic=await p.evaluate(()=>{let evs=Array.from({length:351},(_,i)=>({id:10000+i,n:'Suceso largo de prueba '+i,fa:10}));let r=__audit.loose(evs,0,20,1000,0);let slots=new Map();for(const x of r.items){let k=x.x+':'+x.level;slots.set(k,(slots.get(k)||0)+1)}return{nodes:r.items.length,levels:r.items.map(x=>x.level),maxCoincident:Math.max(...slots.values()),coverage:new Set(r.items.flatMap(x=>x.events.map(e=>e.id))).size,needH:r.needH}});await p.close();
/* El tip ya no cuelga del marcador (lo recortaba `.lane-block`): ahora es el
   `#tooltip` flotante. Se comprueba lo mismo — que al enfocar aparezca, que se
   lea entero y que nada lo corte — contra el área visible y el eje. */
p=await page(1440,900,'jue');out.tooltips=[];
const sel='.evt-marker--in-row:not(.evt-marker--zone)';
for(let j=0;j<await p.locator(sel).count();j++){let el=p.locator(sel).nth(j);await el.focus();await p.waitForTimeout(160);
  let r=await el.evaluate(e=>{const t=document.querySelector('#tooltip');
    if(!t||getComputedStyle(t).display==='none')return{label:e.getAttribute('aria-label'),visible:false};
    const b=t.getBoundingClientRect();const ax=document.querySelector('.axis-area')?.getBoundingClientRect();
    const fuera=[];
    if(b.left<0||b.top<0||b.right>innerWidth||b.bottom>innerHeight)fuera.push('viewport');
    if(ax&&b.bottom>ax.top+1)fuera.push('eje');
    return{label:e.getAttribute('aria-label'),visible:true,tip:t.innerText,rect:b.toJSON(),
      truncated:t.scrollHeight>t.clientHeight+1,clips:fuera}});
  out.tooltips.push(r)}
await p.screenshot({path:path.join(__dirname,'tooltip-focus.png')});await p.close();
fs.writeFileSync(path.join(__dirname,'targeted.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));await b.close()})().catch(e=>{console.error(e);process.exit(1)});
