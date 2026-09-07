/* R4: cada id aparece individualmente o dentro de un agregado, nunca en ambos.
   Y la cobertura no puede caer: esconder la copia no vale como arreglo, hay
   que seguir mostrando todos los sucesos del alcance. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const src = fs.readFileSync(path.join(__dirname, '../../linea-paralela.js'), 'utf8');
const i = src.lastIndexOf('})();');
const body = src.slice(0, i) +
  '\nwindow.__audit={layout:()=>lastLayout,render:safeRender};\n' + src.slice(i);

const SALIDA = path.join(__dirname, 'r4.json');

const inspeccionar = (p) => p.evaluate(() => {
  const L = window.__audit.layout();

  /* Ids dentro de agregados o grupos curados, y en filas de suceso propias. */
  const enAgregados = new Map();   // id -> nombre del agregado
  const enFilaPropia = new Set();
  for(const b of L.laneData){
    for(const t of b.tracks){
      for(const pe of t.people){
        for(const ev of pe.groupEvents || []) enAgregados.set(ev.id, pe.n);
        if(pe.isEvent && !pe.isEventGroup && pe.ev) enFilaPropia.add(pe.ev.id);
      }
    }
  }

  /* Ids en la zona suelta de abajo, leídos del DOM: es lo que de verdad se ve.
     Cuentan tanto los marcadores individuales como los miembros que lleva
     dentro un agregado de la zona. */
  const enZona = new Set();
  for(const el of document.querySelectorAll('.evt-marker--zone')){
    if(el.dataset.ev) enZona.add(+el.dataset.ev);
    for(const id of (el.dataset.aggIds || '').split(',')){
      if(id !== '') enZona.add(+id);
    }
  }

  const repetidos = [...enZona].filter(id => enAgregados.has(id) || enFilaPropia.has(id));

  /* Marcadores sobre barras de personaje: un suceso puede repetirse sobre
     varias personas, y eso es una relación intencional del modo Comparar, no
     una duplicación. Se cuenta aparte para no confundir los dos casos. */
  const enBarras = new Set();
  for(const el of document.querySelectorAll('.evt-marker--in-row:not(.evt-marker--zone)[data-ev]')){
    enBarras.add(+el.dataset.ev);
  }

  /* Cobertura: todo suceso del alcance visible tiene alguna representación. */
  const agregados = L.laneData.flatMap(b => b.tracks.flatMap(t =>
    t.people.filter(p => p.isEventGroup).map(p => ({
      n: p.n, ids: (p.groupEvents || []).map(e => e.id) }))));

  return {
    free: L.freeBelow,
    modo: L.looseMode,
    agregados,
    enZona: enZona.size,
    enAgregados: enAgregados.size,
    enFilaPropia: enFilaPropia.size,
    repetidos,
    enBarras: enBarras.size,
    /* Total de ids con representación, sin contar dos veces. */
    cobertura: new Set([...enZona, ...enAgregados.keys(), ...enFilaPropia,
                        ...enBarras]).size,
    looseEligible: (L.looseEligible || []).length,
  };
});

(async () => {
  const nav = await chromium.launch();
  const casos = [
    { nom: 'semana 1920x1080', w: 1920, h: 1080, filas: 'sem' },
    { nom: 'semana 1440x900',  w: 1440, h: 900,  filas: 'sem' },
    { nom: 'ministerio 1920',  w: 1920, h: 1080, filas: 'jes' },
    { nom: 'ministerio 390',   w: 390,  h: 844,  filas: 'jes' },
    { nom: 'reyes 1920',       w: 1920, h: 1080, filas: 'jud,isr,pro' },
  ];

  const salida = {};
  let fallos = 0;
  for(const c of casos){
    const p = await nav.newPage({ viewport: { width: c.w, height: c.h } });
    await p.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
    await p.route('**/linea-paralela.js*', r =>
      r.fulfill({ body, contentType: 'application/javascript' }));
    await p.goto('http://127.0.0.1:8000/linea-paralela.html#vista=comparar&filas=' + c.filas);
    await p.waitForFunction(() => window.__audit && window.__audit.layout());
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(450);

    const r = await inspeccionar(p);
    salida[c.nom] = r;
    const mal = r.repetidos.length;
    if(mal) fallos++;
    console.log(`${mal ? 'FALLA' : 'ok   '} ${c.nom.padEnd(18)} ` +
                `repetidos=${String(mal).padStart(3)}  ` +
                `zona=${String(r.enZona).padStart(3)} ` +
                `agregados=${String(r.enAgregados).padStart(3)} ` +
                `filaPropia=${String(r.enFilaPropia).padStart(3)} ` +
                `cobertura=${r.cobertura} modo=${r.modo}`);
    if(mal) console.log('        ids: ' + r.repetidos.slice(0, 12).join(', '));
    await p.close();
  }
  await nav.close();
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`\n${fallos ? fallos + ' caso(s) con duplicación' : 'sin duplicación en ningún caso'}`);
  process.exit(fallos ? 1 : 0);
})();
