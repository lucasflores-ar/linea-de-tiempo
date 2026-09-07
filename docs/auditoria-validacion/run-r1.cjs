/* R1: comprobar que nombre/contador/fecha de filas distintas no se intersectan.
   Reproduce el caso que midió la auditoría (390x844, ministerio, escala táctil
   1,2) y además barre escalas y estilos, porque el fallo aparecía en escritorio
   con texto grande. */
'use strict';
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const BASE = 'http://127.0.0.1:8000/linea-paralela.html';
const SALIDA = path.join(__dirname, 'r1.json');

/* Cajas de texto que no deben cruzarse entre filas distintas. */
const SEL_TEXTO = '.bar-caption__name, .bar-caption__dates';

async function medir(page, { w, h, escala, estilo, filas, touch }){
  await page.setViewportSize({ width: w, height: h });
  await page.addInitScript(([esc, est]) => {
    localStorage.setItem('lt-onboarding-v2', 'done');
    localStorage.setItem('lt-par-font-scale', String(esc));
    localStorage.setItem('lt-par-viz', est);
  }, [escala, estilo]);
  await page.goto(BASE + '#vista=comparar&filas=' + filas, { waitUntil: 'load' });
  await page.waitForTimeout(700);

  return await page.evaluate((sel) => {
    const filas = [...document.querySelectorAll('.chart-canvas .row')];
    const cajas = [];
    filas.forEach((fila, i) => {
      const r = fila.getBoundingClientRect();
      for(const t of fila.querySelectorAll(sel)){
        const tr = t.getBoundingClientRect();
        if(tr.width <= 0 || tr.height <= 0) continue;
        cajas.push({
          fila: i, filaTop: r.top, filaBottom: r.bottom, filaH: r.height,
          top: tr.top, bottom: tr.bottom, left: tr.left, right: tr.right,
          txt: (t.textContent || '').trim().slice(0, 28),
        });
      }
    });

    /* Cruces entre cajas de filas distintas que además se solapan en X. */
    const cruces = [];
    for(let i = 0; i < cajas.length; i++){
      for(let j = i + 1; j < cajas.length; j++){
        const a = cajas[i], b = cajas[j];
        if(a.fila === b.fila) continue;
        const dy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        const dx = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        if(dy > 0.5 && dx > 0.5){
          cruces.push({ a: a.txt, b: b.txt, filaA: a.fila, filaB: b.fila,
                        solapeY: +dy.toFixed(2), solapeX: +dx.toFixed(2) });
        }
      }
    }

    /* Texto recortado por el carril: lane-block tiene overflow hidden. */
    const recortes = [];
    for(const bloque of document.querySelectorAll('.lane-block')){
      const lb = bloque.getBoundingClientRect();
      for(const t of bloque.querySelectorAll(sel)){
        const tr = t.getBoundingClientRect();
        if(tr.height <= 0) continue;
        const fuera = Math.max(lb.top - tr.top, tr.bottom - lb.bottom);
        if(fuera > 0.5){
          recortes.push({ txt: (t.textContent || '').trim().slice(0, 28),
                          fuera: +fuera.toFixed(2) });
        }
      }
    }

    const alturas = [...new Set([...document.querySelectorAll('.chart-canvas .row')]
      .map(r => +r.getBoundingClientRect().height.toFixed(1)))];

    return { cajas: cajas.length, cruces, recortes, alturas,
             escalaEfectiva: getComputedStyle(document.documentElement)
               .getPropertyValue('--tl-font-scale').trim() };
  }, SEL_TEXTO);
}

(async () => {
  const navegador = await chromium.launch();
  const casos = [
    // El caso exacto de la auditoría: táctil aplica 1,2 si no hay preferencia.
    { nom: 'ministerio movil 1.2', w: 390, h: 844, escala: 1.2, estilo: 'editorial', filas: 'jes' },
    { nom: 'ministerio movil 1',   w: 390, h: 844, escala: 1,   estilo: 'editorial', filas: 'jes' },
    { nom: 'ministerio movil 2',   w: 390, h: 844, escala: 2,   estilo: 'editorial', filas: 'jes' },
    { nom: 'ultima semana 1440 1.4', w: 1440, h: 1080, escala: 1.4, estilo: 'editorial', filas: 'sem' },
    { nom: 'ultima semana 1440 2',   w: 1440, h: 1080, escala: 2,   estilo: 'editorial', filas: 'sem' },
    { nom: 'reyes 1920 1.4',       w: 1920, h: 1080, escala: 1.4, estilo: 'editorial', filas: 'jud,isr,pro' },
    { nom: 'jueces 1440 2 waterfall', w: 1440, h: 1080, escala: 2, estilo: 'waterfall', filas: 'jue' },
    { nom: 'ministerio 1024 1.4',  w: 1024, h: 844, escala: 1.4, estilo: 'editorial', filas: 'jes' },
  ];

  const salida = {};
  let fallos = 0;
  for(const c of casos){
    const ctx = await navegador.newContext({ hasTouch: true });
    const page = await ctx.newPage();
    const r = await medir(page, c);
    salida[c.nom] = r;
    const mal = r.cruces.length + r.recortes.length;
    if(mal) fallos++;
    console.log(`${mal ? 'FALLA' : 'ok   '} ${c.nom.padEnd(26)} ` +
                `cruces=${String(r.cruces.length).padStart(3)} ` +
                `recortes=${String(r.recortes.length).padStart(3)} ` +
                `alturas=[${r.alturas.join(', ')}] escala=${r.escalaEfectiva}`);
    if(r.cruces.length){
      for(const x of r.cruces.slice(0, 3)){
        console.log(`        «${x.a}» x «${x.b}»  solapeY=${x.solapeY}px`);
      }
    }
    if(r.recortes.length){
      for(const x of r.recortes.slice(0, 3)){
        console.log(`        recorta «${x.txt}» por ${x.fuera}px`);
      }
    }
    await ctx.close();
  }
  await navegador.close();
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`\n${fallos ? fallos + ' caso(s) con problemas' : 'todos los casos limpios'}`);
  process.exit(fallos ? 1 : 0);
})();
