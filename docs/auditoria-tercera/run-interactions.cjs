const fs=require('fs'),path=require('path');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({headless:true});const out=[];
 for(const width of [320,390,520,521,760,761,1024,1440,1920]){
  for(const vista of ['comparar','explorar']){
   const p=await browser.newPage({viewport:{width,height:844},hasTouch:width<=1024,isMobile:width<=760});
   p.setDefaultTimeout(3000);const row={width,vista,errors:[]};p.on('pageerror',e=>row.errors.push(e.message));
   await p.addInitScript(()=>localStorage.setItem('lt-onboarding-v2','done'));
   try{
    await p.goto('http://127.0.0.1:8000/linea-paralela.html#vista='+vista+'&filas=jes');
    await p.evaluate(()=>document.fonts.ready);
    const opener=vista==='comparar'?p.locator('.bar').filter({hasText:'32 E.C.'}).first():p.locator('#explore-panel .tl-list__open').first();
    await opener.waitFor({state:'visible'});
    row.opener=await opener.getAttribute('aria-label')||await opener.innerText();
    if(width<=1024)await opener.tap();else await opener.click();
    await p.locator('#drawer.on').waitFor();
    await p.locator('#d-title').waitFor({state:'visible'});
    row.openedTitle=await p.locator('#d-title').innerText();
    if(vista==='comparar'){
      const first=p.locator('#d-explorer .tl-list__open').first();await first.waitFor();
      row.expectedEvent=await first.locator('.tl-list__name').innerText();
      await first.click();await p.waitForFunction(t=>document.querySelector('#d-title').textContent===t,row.expectedEvent);
      row.detailCorrect=true;
      await p.locator('#d-back').click();await p.waitForFunction(()=>document.querySelector('#drawer').dataset.mode==='list');
      row.backTitle=await p.locator('#d-title').innerText();
    }
    row.drawer=await p.locator('#drawer').evaluate(el=>({rect:el.getBoundingClientRect().toJSON(),overflow:el.scrollWidth>el.clientWidth,focus:document.activeElement?.id}));
    await p.locator('#d-close').click();await p.waitForFunction(()=>!document.querySelector('#drawer').classList.contains('on'));
    row.closed=true;
    await p.locator('#filtros-btn').click();await p.locator('#filtros-close').waitFor({state:'visible'});
    row.filtersOpen=await p.locator('#filtros-btn').getAttribute('aria-expanded');
    await p.keyboard.press('Escape');row.filtersClosed=await p.locator('#filtros-btn').getAttribute('aria-expanded');
   }catch(e){row.failure=e.message;await p.screenshot({path:path.join(__dirname,`interaction-failure-${width}-${vista}.png`)});}
   out.push(row);await p.close();
  }
 }
 fs.writeFileSync(path.join(__dirname,'interactions.json'),JSON.stringify(out,null,2));console.log(JSON.stringify(out,null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
