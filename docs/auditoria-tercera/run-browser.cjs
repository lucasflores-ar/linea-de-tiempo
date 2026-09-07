// Auditoría reproducible: servidor local en 8000; Playwright ya instalado.
// No modifica la aplicación. Expone métricas en la respuesta JS de la pestaña de prueba.
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'linea-paralela.js'), 'utf8');
const pos = source.lastIndexOf('})();');
const exposed = source.slice(0,pos) + '\nwindow.__audit={layout:()=>lastLayout,loose:layoutLooseEventLanes,expanded:layoutLooseExpanded,densify:densifyPointPeople,render:safeRender};\n' + source.slice(pos);
async function metric(page) {
  return page.evaluate(() => {
    const L=window.__audit.layout();
    const chart=document.querySelector('#chart-scroll');
    const r=chart.getBoundingClientRect();
    const labels=[...document.querySelectorAll('.bar-caption__name,.bar-caption__dates,.loose-evt-zone__title,.grid-label')].map(el=>{
      const b=el.getBoundingClientRect();
      return {text:el.textContent,cls:el.className,x:b.x,y:b.y,w:b.width,h:b.height,el};
    }).filter(b=>b.w>0&&b.h>0&&b.x<r.right&&b.x+b.w>r.left&&b.y<r.bottom&&b.y+b.h>r.top);
    const collisions=[];
    for(let i=0;i<labels.length;i++)for(let j=i+1;j<labels.length;j++){
      const a=labels[i],b=labels[j];
      if(a.el.contains(b.el)||b.el.contains(a.el))continue;
      const w=Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x);
      const h=Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y);
      if(w>3&&h>3)collisions.push({a:a.text,b:b.text,w,h});
    }
    const hitFails=[];
    for(const el of document.querySelectorAll('#chart-canvas .bar,#chart-canvas .evt-marker,#chart-canvas .bar-event-pin')){
      const b=el.getBoundingClientRect(), x=b.x+b.width/2,y=b.y+b.height/2;
      if(x<r.left+1||x>r.right-1||y<r.top+1||y>r.bottom-1)continue;
      const hit=document.elementFromPoint(x,y);
      if(!hit||!(hit===el||el.contains(hit)))hitFails.push({text:el.getAttribute('aria-label'),id:el.dataset.ev||el.dataset.pe,hit:hit?.outerHTML.slice(0,220),x,y});
    }
    return {count:document.querySelector('#result-count').textContent,viewport:[chart.clientWidth,chart.clientHeight],chart:[L?.chartW,L?.totalH],freeBelow:L?.freeBelow,looseMode:L?.looseMode,looseEligible:L?.looseEligible?.length,groups:L?.laneData.flatMap(b=>b.tracks.flatMap(t=>t.people.filter(p=>p.isEventGroup).map(p=>({name:p.n,n:p.groupEvents?.length,density:!!p.isDensityAggregate})))),collisions,hitFails,overflow:document.body.scrollWidth>innerWidth};
  });
}
(async()=>{
  const browser=await chromium.launch({headless:true});
  const rows=[];
  const widths=[320,390,520,521,760,761,1024,1440,1920];
  for(const width of widths){
    for(const lane of ['jue','sem','jes','jud,isr,pro']){
      const height=width>=1440?1080:844;
      const p=await browser.newPage({viewport:{width,height},hasTouch:width<=1024,isMobile:width<=760});
      await p.addInitScript(()=>localStorage.setItem('lt-onboarding-v2','done'));
      await p.route('**/linea-paralela.js*',r=>r.fulfill({body:exposed,contentType:'application/javascript'}));
      const errors=[];p.on('pageerror',e=>errors.push(e.message));
      await p.goto('http://127.0.0.1:8000/linea-paralela.html#vista=comparar&filas='+lane);
      await p.waitForFunction(()=>window.__audit?.layout());
      await p.evaluate(()=>document.fonts.ready);
      await p.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const m=await metric(p);rows.push({width,height,lane,...m,errors});
      if((width===390||width===1920)&&['jue','sem','jes'].includes(lane))await p.screenshot({path:path.join(__dirname,`${lane}-${width}.png`)});
      await p.close();
    }
  }
  fs.writeFileSync(path.join(__dirname,'browser-metrics.json'),JSON.stringify(rows,null,2));
  console.log(JSON.stringify(rows.map(({width,lane,freeBelow,looseMode,groups,collisions,hitFails,errors})=>({width,lane,freeBelow,looseMode,groups:groups?.length,collisions:collisions.length,hitFails:hitFails.length,errors})),null,2));
  await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
