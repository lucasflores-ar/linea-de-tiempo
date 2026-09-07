/* R6: los tips ya no los recorta nada.
   Antes eran un hijo del marcador y .lane-block{overflow:hidden} los cortaba.
   Se comprueba con hover real y con foco de teclado, en tres viewports:
   que el tip entre completo en pantalla, que no lo recorte ningún ancestro,
   que no quede debajo del eje, y que el título se lea entero. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SALIDA = path.join(__dirname, 'r6.json');

async function abrir(nav, w, h, filas, escala){
  const ctx = await nav.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
  const hash = '#vista=comparar&filas=' + filas + (escala ? '&fuente=' + escala : '');
  await p.goto('http://127.0.0.1:8000/linea-paralela.html' + hash, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  return { ctx, p };
}

/* Estado del tip visible: caja, recorte por ancestros, eje y texto completo. */
const estadoTip = (p) => p.evaluate(() => {
  /* Se acepta la capa flotante o, para poder medir la línea base, el tip que
     antes colgaba dentro del marcador. Así el mismo script compara las dos
     arquitecturas en vez de dar por bueno el rediseño. */
  let t = document.getElementById('tooltip');
  if(!t || t.style.display === 'none' || !t.getBoundingClientRect().width){
    t = [...document.querySelectorAll('.evt-marker__tip')]
      .find(el => el.getBoundingClientRect().width > 0) || null;
  }
  if(!t) return { visible: false };
  const r = t.getBoundingClientRect();
  if(!r.width || !r.height) return { visible: false };

  /* Intersección con todos los ancestros que recortan: el defecto original
     era exactamente esto, un ancestro con overflow:hidden. */
  let recorte = null;
  for(let el = t.parentElement; el && el !== document.documentElement; el = el.parentElement){
    const ov = getComputedStyle(el);
    if(ov.overflow === 'visible' && ov.overflowX === 'visible' && ov.overflowY === 'visible') continue;
    const c = el.getBoundingClientRect();
    const dx = Math.min(r.right, c.right) - Math.max(r.left, c.left);
    const dy = Math.min(r.bottom, c.bottom) - Math.max(r.top, c.top);
    const perdido = Math.round(r.width * r.height - Math.max(0, dx) * Math.max(0, dy));
    if(perdido > 1) recorte = { por: el.className || el.tagName, perdido };
  }

  const ax = document.querySelector('.axis-area');
  const axr = ax && ax.getBoundingClientRect();
  return {
    visible: true,
    texto: ((t.querySelector && t.querySelector('.t-name')) || t).textContent || '',
    fueraPantalla: Math.round(Math.max(0, -r.left) + Math.max(0, r.right - innerWidth)
                            + Math.max(0, -r.top) + Math.max(0, r.bottom - innerHeight)),
    recorte,
    /* ¿Se metió abajo del eje sticky, tapando los años? */
    sobreEje: !!(axr && axr.height > 0 && axr.top > 0 && r.bottom > axr.top + 1),
    /* Con max-height y overflow:hidden, si el contenido no entra se pierde texto. */
    textoCortado: t.scrollHeight > t.clientHeight + 1,
    nombreCortado: (()=> {
      const n = (t.querySelector && t.querySelector('.t-name')) || t;
      return n.scrollWidth > n.clientWidth + 1;
    })(),
  };
});

/* Recorre marcadores por hover y por foco, y junta los problemas. */
async function barrer(p, modo, limite){
  const marcas = await p.locator('.evt-marker--in-row, .bar-event-pin').all();
  const problemas = [];
  let probados = 0, mostrados = 0;
  for(const m of marcas.slice(0, limite)){
    const caja = await m.boundingBox();
    if(!caja || !caja.width) continue;
    probados++;
    if(modo === 'hover'){
      await m.hover({ force: true }).catch(()=>{});
    } else {
      await m.evaluate(el => el.focus());
    }
    await p.waitForTimeout(30);
    const s = await estadoTip(p);
    if(!s.visible){
      problemas.push({ modo, motivo: 'sin tip', et: await m.getAttribute('aria-label') });
      continue;
    }
    mostrados++;
    const mal = [];
    if(s.fueraPantalla > 1) mal.push('fuera de pantalla ' + s.fueraPantalla + 'px²');
    if(s.recorte) mal.push('recortado por ' + s.recorte.por);
    if(s.sobreEje) mal.push('encima del eje');
    if(s.textoCortado) mal.push('texto cortado');
    if(s.nombreCortado) mal.push('título con ellipsis');
    if(mal.length) problemas.push({ modo, et: s.texto, mal });
    if(modo === 'hover') await p.mouse.move(2, 2);
    else await m.evaluate(el => el.blur());
    await p.waitForTimeout(20);
  }
  return { probados, mostrados, problemas };
}

(async () => {
  const nav = await chromium.launch();
  const salida = {};
  let fallos = 0;

  const casos = [
    { nom: 'jueces 1440x900',  w: 1440, h: 900,  filas: 'jue' },
    { nom: 'reyes 1920x1080',  w: 1920, h: 1080, filas: 'jud,isr,pro' },
    { nom: 'reyes 390x844',    w: 390,  h: 844,  filas: 'jud,isr,pro' },
    { nom: 'jueces 1440 f200', w: 1440, h: 900,  filas: 'jue', escala: '2' },
  ];

  for(const c of casos){
    const { ctx, p } = await abrir(nav, c.w, c.h, c.filas, c.escala);
    const h = await barrer(p, 'hover', 26);
    const f = await barrer(p, 'foco', 26);
    const mal = h.problemas.length + f.problemas.length;
    if(mal) fallos++;
    salida[c.nom] = { hover: h, foco: f };
    console.log(`  ${mal ? 'FALLA' : 'ok   '} ${c.nom.padEnd(17)} ` +
                `hover=${h.mostrados}/${h.probados} foco=${f.mostrados}/${f.probados} ` +
                `problemas=${mal}`);
    for(const x of [...h.problemas, ...f.problemas].slice(0, 4)){
      console.log(`        [${x.modo}] «${(x.et || '').slice(0, 42)}» ${(x.mal || [x.motivo]).join(', ')}`);
    }
    await ctx.close();
  }

  /* Hover y foco tienen que mostrar el mismo contenido. */
  {
    const { ctx, p } = await abrir(nav, 1440, 900, 'jue');
    const m = p.locator('.evt-marker--in-row[data-ev]').first();
    await m.hover({ force: true });
    await p.waitForTimeout(60);
    const conHover = (await estadoTip(p)).texto;
    await p.mouse.move(2, 2);
    await p.waitForTimeout(60);
    await m.evaluate(el => el.focus());
    await p.waitForTimeout(60);
    const conFoco = (await estadoTip(p)).texto;
    const igual = conHover && conHover === conFoco;
    salida.paridad = { conHover, conFoco, igual };
    console.log(`  ${igual ? 'ok   ' : 'FALLA'} hover y foco muestran lo mismo: ` +
                `«${conHover}» / «${conFoco}»`);
    if(!igual) fallos++;

    /* Al hacer scroll, el tip anclado se reubica o se esconde: nunca queda
       flotando lejos del marcador que lo abrió. */
    await m.evaluate(el => el.focus());
    await p.waitForTimeout(60);
    const antes = await p.evaluate(() => {
      const t = document.getElementById('tooltip').getBoundingClientRect();
      return { top: Math.round(t.top) };
    });
    await p.evaluate(() => document.getElementById('chart-scroll').scrollBy(0, 120));
    await p.waitForTimeout(120);
    const desp = await p.evaluate(() => {
      const t = document.getElementById('tooltip');
      if(t.style.display === 'none') return { oculto: true };
      const r = t.getBoundingClientRect();
      const m = document.querySelector('.evt-marker--in-row[data-ev]:focus')
             || document.querySelector('.evt-marker--in-row[data-ev]');
      const mr = m.getBoundingClientRect();
      return { oculto: false, top: Math.round(r.top),
               distancia: Math.round(Math.abs(mr.top - r.bottom)) };
    });
    const sigue = desp.oculto || desp.distancia < 40;
    salida.scroll = { antes, desp, sigue };
    console.log(`  ${sigue ? 'ok   ' : 'FALLA'} tras el scroll el tip ` +
                (desp.oculto ? 'se ocultó' : 'sigue pegado al marcador (' + desp.distancia + 'px)'));
    if(!sigue) fallos++;
    await ctx.close();
  }

  await nav.close();
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`\n${fallos ? fallos + ' comprobacion(es) fallaron' : 'ningún tip recortado; hover y foco coinciden'}`);
  process.exit(fallos ? 1 : 0);
})();
