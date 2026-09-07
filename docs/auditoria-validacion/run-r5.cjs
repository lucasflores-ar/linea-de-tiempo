/* R5: dos layouts consecutivos sin entradas nuevas dan el mismo resultado, y
   nada de lo que se presenta como visible queda interceptado por el eje. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const src = fs.readFileSync(path.join(__dirname, '../../linea-paralela.js'), 'utf8');
const i = src.lastIndexOf('})();');
const body = src.slice(0, i) +
  '\nwindow.__audit={layout:()=>lastLayout,render:safeRender};\n' + src.slice(i);

const SALIDA = path.join(__dirname, 'r5.json');

async function abrir(nav, w, h, filas){
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
  await p.route('**/linea-paralela.js*', r =>
    r.fulfill({ body, contentType: 'application/javascript' }));
  await p.goto('http://127.0.0.1:8000/linea-paralela.html#vista=comparar&filas=' + filas);
  await p.waitForFunction(() => window.__audit && window.__audit.layout());
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(450);   // dejar que el ResizeObserver converja
  return p;
}

const foto = (p) => p.evaluate(() => {
  const L = window.__audit.layout();
  return { free: L.freeBelow, totalH: L.totalH, chartW: L.chartW,
           view: document.getElementById('chart-scroll').clientHeight };
});

/* Controles que el eje intercepta y que NO se pueden despejar scrolleando.
   Con un eje sticky sobre un lienzo más alto que la ventana, a cualquier
   altura de scroll algo queda debajo: eso es normal y no es el defecto. El
   defecto sería que un control no se pueda revelar nunca, porque el lienzo no
   reserva lugar bajo su última fila. */
const tapados = (p) => p.evaluate(async () => {
  const eje = document.querySelector('.axis-area');
  const scroll = document.getElementById('chart-scroll');
  if(!eje || !scroll) return [];

  const bajoElEje = (el) => {
    const er = eje.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if(r.width <= 0 || r.height <= 0) return false;
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return cy >= er.top && cy <= er.bottom && cx >= er.left && cx <= er.right;
  };

  const candidatos = [...document.querySelectorAll(
    '.evt-marker, .bar-event-pin, .bar-point-event, .loose-evt-zone')]
    .filter(bajoElEje);

  const malos = [];
  const y0 = scroll.scrollTop;
  for(const el of candidatos){
    el.scrollIntoView({ block: 'center' });
    await new Promise(r => requestAnimationFrame(()=>requestAnimationFrame(r)));
    if(bajoElEje(el)){
      const r = el.getBoundingClientRect();
      malos.push({ et: el.getAttribute('aria-label') || el.className,
                   cy: +(r.top + r.height / 2).toFixed(1),
                   ejeTop: +eje.getBoundingClientRect().top.toFixed(1) });
    }
  }
  scroll.scrollTop = y0;
  return malos;
});

(async () => {
  const nav = await chromium.launch();
  const casos = [
    { nom: 'jueces 1440x1080',   w: 1440, h: 1080, filas: 'jue' },
    { nom: 'ministerio 390x844', w: 390,  h: 844,  filas: 'jes' },
    { nom: 'semana 1920x1080',   w: 1920, h: 1080, filas: 'sem' },
    { nom: 'reyes 1024x844',     w: 1024, h: 844,  filas: 'jud,isr,pro' },
  ];

  const salida = {};
  let fallos = 0;
  for(const c of casos){
    const p = await abrir(nav, c.w, c.h, c.filas);
    const antes = await foto(p);
    await p.evaluate(() => window.__audit.render());
    await p.waitForTimeout(250);
    const despues = await foto(p);
    const tap = await tapados(p);

    const estable = antes.free === despues.free &&
                    antes.totalH === despues.totalH &&
                    antes.chartW === despues.chartW;
    salida[c.nom] = { antes, despues, estable, tapados: tap };
    const mal = (!estable ? 1 : 0) + (tap.length ? 1 : 0);
    if(mal) fallos++;
    console.log(`${mal ? 'FALLA' : 'ok   '} ${c.nom.padEnd(22)} ` +
                `free ${antes.free}->${despues.free}  ` +
                `totalH ${antes.totalH}->${despues.totalH}  ` +
                `tapados=${tap.length}`);
    if(tap.length) for(const t of tap.slice(0, 3)) console.log(`        «${t.et}» centro ${t.cy} eje ${t.ejeTop}`);
    await p.close();
  }
  await nav.close();
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`\n${fallos ? fallos + ' caso(s) con problemas' : 'layout idempotente y nada tapado por el eje'}`);
  process.exit(fallos ? 1 : 0);
})();
