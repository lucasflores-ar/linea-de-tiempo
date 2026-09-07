/* R2: cada suceso mostrado individualmente tiene una zona exclusiva.
   Se comprueba con elementFromPoint real —no dispatchEvent ni clic forzado— y
   se valida la identidad del suceso que abre el panel, no que el panel exista. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SALIDA = path.join(__dirname, 'r2.json');

async function abrir(nav, w, h, filas, touch){
  const ctx = await nav.newContext({ viewport: { width: w, height: h },
                                     hasTouch: !!touch });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
  await p.goto('http://127.0.0.1:8000/linea-paralela.html#vista=comparar&filas=' + filas,
               { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  return { ctx, p };
}

/* ¿El centro de cada marcador individual lo recibe ese mismo marcador? */
const zonasExclusivas = (p) => p.evaluate(() => {
  const malos = [];
  const marcas = [...document.querySelectorAll('.evt-marker--in-row[data-ev]')];
  for(const m of marcas){
    const r = m.getBoundingClientRect();
    if(r.width <= 0) continue;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const top = document.elementFromPoint(cx, cy);
    if(!top) continue;
    const dueño = top.closest && top.closest('.evt-marker, .bar-event-pin');
    /* Si el centro lo recibe otro marcador con otro id, el clic miente. */
    if(dueño && dueño !== m && dueño.dataset.ev && dueño.dataset.ev !== m.dataset.ev){
      malos.push({ pedido: m.dataset.ev, pedidoEt: m.getAttribute('aria-label'),
                   recibe: dueño.dataset.ev, recibeEt: dueño.getAttribute('aria-label') });
    }
  }
  return { total: marcas.length, malos };
});

/* Marcadores individuales que se solapan geométricamente entre sí. */
const solapes = (p) => p.evaluate(() => {
  const m = [...document.querySelectorAll('.evt-marker--in-row[data-ev]')]
    .map(el => ({ id: el.dataset.ev, et: el.getAttribute('aria-label'),
                  fila: el.closest('.row'), r: el.getBoundingClientRect() }))
    .filter(x => x.r.width > 0);
  const ch = [];
  for(let a = 0; a < m.length; a++){
    for(let b = a + 1; b < m.length; b++){
      if(m[a].fila !== m[b].fila) continue;   // filas distintas no compiten
      const A = m[a].r, B = m[b].r;
      const dx = Math.min(A.right, B.right) - Math.max(A.left, B.left);
      const dy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
      if(dx > 1 && dy > 1) ch.push({ a: m[a].et, b: m[b].et, dx: +dx.toFixed(1) });
    }
  }
  return ch;
});

(async () => {
  const nav = await chromium.launch();
  const salida = {};
  let fallos = 0;

  /* ── 1. El caso exacto de la auditoría: id 75 no debe abrir el 354 ────── */
  {
    const { ctx, p } = await abrir(nav, 1920, 1080, 'jud,isr,pro');
    const objetivo = p.locator('.evt-marker[data-ev="75"]').first();
    const existe = await objetivo.count();
    let r = { existe };
    if(existe){
      const et = await objetivo.getAttribute('aria-label');
      const caja = await objetivo.boundingBox();
      /* Clic real en el centro, dejando que el navegador resuelva quién lo recibe. */
      await p.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
      await p.locator('#drawer.on').waitFor({ timeout: 4000 }).catch(()=>{});
      const abierto = await p.locator('#d-title').innerText().catch(()=> '');
      r = { existe, esperado: et, abierto, coincide: abierto === et };
      console.log(`  ${r.coincide ? 'ok   ' : 'FALLA'} apuntar a «${et}» abre «${abierto}»`);
      if(!r.coincide) fallos++;
    } else {
      /* Si el 75 quedó dentro de un agregado, el clic tiene que abrir la lista
         y ese agregado debe identificarse como tal: también satisface R2. */
      const agg = p.locator('.evt-marker--in-row[data-agg-ids*="75"]').first();
      const hayAgg = await agg.count();
      r.enAgregado = !!hayAgg;
      if(hayAgg){
        const et = await agg.getAttribute('aria-label');
        console.log(`  ok    el id 75 quedó en un agregado identificado: «${et}»`);
      } else {
        console.log('  FALLA el id 75 no aparece ni suelto ni en un agregado');
        fallos++;
      }
    }
    salida.id75 = r;
    await ctx.close();
  }

  /* ── 2. Barrido: ningún marcador individual cede su centro a otro ─────── */
  console.log('\n--- zonas exclusivas (elementFromPoint real) ---');
  const casos = [
    { nom: 'reyes 1920 raton',  w: 1920, h: 1080, filas: 'jud,isr,pro', touch: false },
    { nom: 'reyes 1440 raton',  w: 1440, h: 900,  filas: 'jud,isr,pro', touch: false },
    { nom: 'reyes 390 tactil',  w: 390,  h: 844,  filas: 'jud,isr,pro', touch: true },
    { nom: 'jueces 1440 raton', w: 1440, h: 900,  filas: 'jue',         touch: false },
    { nom: 'jueces 390 tactil', w: 390,  h: 844,  filas: 'jue',         touch: true },
    { nom: 'ministerio 1920',   w: 1920, h: 1080, filas: 'jes',         touch: false },
  ];
  for(const c of casos){
    const { ctx, p } = await abrir(nav, c.w, c.h, c.filas, c.touch);
    const z = await zonasExclusivas(p);
    const s = await solapes(p);
    const mal = z.malos.length + s.length;
    if(mal) fallos++;
    salida[c.nom] = { ...z, solapes: s };
    console.log(`  ${mal ? 'FALLA' : 'ok   '} ${c.nom.padEnd(18)} ` +
                `marcadores=${String(z.total).padStart(3)} ` +
                `roban-centro=${String(z.malos.length).padStart(2)} ` +
                `solapes=${String(s.length).padStart(3)}`);
    for(const x of z.malos.slice(0, 3)){
      console.log(`        «${x.pedidoEt}» -> abre «${x.recibeEt}»`);
    }
    for(const x of s.slice(0, 3)){
      console.log(`        se pisan «${x.a}» y «${x.b}» (${x.dx}px)`);
    }
    await ctx.close();
  }

  await nav.close();
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`\n${fallos ? fallos + ' comprobacion(es) fallaron' : 'cada suceso individual tiene su zona'}`);
  process.exit(fallos ? 1 : 0);
})();
