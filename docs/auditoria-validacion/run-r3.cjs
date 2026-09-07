/* R3: los agregados se abren cuando hay lugar, zona por zona.
   R9: nunca dos controles en la misma posición compitiendo por el mismo gesto. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const src = fs.readFileSync(path.join(__dirname, '../../linea-paralela.js'), 'utf8');
const i = src.lastIndexOf('})();');
const body = src.slice(0, i) +
  '\nwindow.__audit={layout:()=>lastLayout,render:safeRender,loose:layoutLooseEventLanes,' +
  'expanded:layoutLooseExpanded,slots:looseSlotsForBudget,comps:looseComponents};\n' +
  src.slice(i);

const SALIDA = path.join(__dirname, 'r3.json');

async function abrir(nav, w, h, filas){
  const p = await nav.newPage({ viewport: { width: w, height: h } });
  await p.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
  await p.route('**/linea-paralela.js*', r =>
    r.fulfill({ body, contentType: 'application/javascript' }));
  await p.goto('http://127.0.0.1:8000/linea-paralela.html#vista=comparar&filas=' + filas);
  await p.waitForFunction(() => window.__audit && window.__audit.layout());
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(450);
  return p;
}

/* Controles de la zona que se pisan entre sí. Es lo que R9 prohíbe: dos
   objetivos disputando el mismo clic. */
const colisiones = (p) => p.evaluate(() => {
  const ctrl = [...document.querySelectorAll('.evt-marker--zone')]
    .map(el => { const r = el.getBoundingClientRect();
                 return { et: el.getAttribute('aria-label') || '', r }; })
    .filter(c => c.r.width > 0 && c.r.height > 0);
  const choques = [];
  for(let a = 0; a < ctrl.length; a++){
    for(let b = a + 1; b < ctrl.length; b++){
      const A = ctrl[a].r, B = ctrl[b].r;
      const dx = Math.min(A.right, B.right) - Math.max(A.left, B.left);
      const dy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
      if(dx > 1 && dy > 1) choques.push({ a: ctrl[a].et, b: ctrl[b].et,
                                          dx: +dx.toFixed(1), dy: +dy.toFixed(1) });
    }
  }
  return choques;
});

const estado = (p) => p.evaluate(() => {
  const L = window.__audit.layout();
  const agsFila = L.laneData.flatMap(b => b.tracks.flatMap(t =>
    t.people.filter(x => x.isEventGroup).map(x => (x.groupEvents || []).length)));
  const zona = [...document.querySelectorAll('.evt-marker--zone')];
  return {
    free: L.freeBelow, modo: L.looseMode,
    agregadosDeFila: agsFila,
    /* En la zona: cuántos controles son agregados y cuántos títulos sueltos. */
    zonaAgregados: zona.filter(e => e.dataset.aggIds).length,
    zonaSueltos: zona.filter(e => e.dataset.ev).length,
    contador: (document.getElementById('result-count') || {}).textContent || '',
  };
});

(async () => {
  const nav = await chromium.launch();
  const salida = {};
  let fallos = 0;

  /* ── 1. Decisión por zona: al dar más alto se abren más títulos ───────── */
  console.log('--- mas alto deberia revelar mas titulos ---');
  const serie = [];
  for(const h of [500, 700, 900, 1200, 1600]){
    const p = await abrir(nav, 1920, h, 'sem');
    const e = await estado(p);
    const c = await colisiones(p);
    serie.push({ h, ...e, colisiones: c.length });
    console.log(`  alto=${String(h).padStart(4)}  free=${String(e.free).padStart(4)}  ` +
                `modo=${String(e.modo).padEnd(10)} ` +
                `sueltos=${String(e.zonaSueltos).padStart(3)} ` +
                `agregados=${String(e.zonaAgregados).padStart(2)} ` +
                `colisiones=${c.length}`);
    if(c.length) fallos++;
    await p.close();
  }
  salida.serieAlto = serie;

  /* Monótono: más alto nunca debería mostrar menos títulos sueltos. */
  let monotono = true;
  for(let k = 1; k < serie.length; k++){
    if(serie[k].zonaSueltos < serie[k - 1].zonaSueltos) monotono = false;
  }
  console.log(`  ${monotono ? 'ok   ' : 'FALLA'} mas alto no muestra menos titulos`);
  if(!monotono) fallos++;

  /* Ninguna zona debe quedar agrupada habiendo alto libre para abrirla. */
  const agrupadoConLugar = serie.filter(s => s.zonaAgregados > 0 && s.free > 200);
  console.log(`  ${agrupadoConLugar.length ? 'FALLA' : 'ok   '} ` +
              'ninguna zona queda agrupada teniendo alto libre de sobra');
  if(agrupadoConLugar.length) fallos++;

  /* PENDIENTE declarado: los agregados que viven en las filas de arriba
     (densifyPointPeople) todavía no reciben presupuesto de alto, así que no se
     abren aunque haya lugar. Es el resto de R3 y de la Entrega B punto 3. */
  const agsFila = serie[serie.length - 1].agregadosDeFila || [];
  if(agsFila.length){
    console.log(`  PEND. quedan ${agsFila.length} agregado(s) en las filas ` +
                `(de ${agsFila.join(', ')} sucesos) que aun no reciben presupuesto de alto`);
  }

  /* ── 2. Una zona densa no impide desplegar otra ───────────────────────── */
  console.log('\n--- una zona densa no debe impedir desplegar otra ---');
  const p2 = await abrir(nav, 1440, 900, 'jes');
  const mix = await p2.evaluate(() => {
    /* Dos racimos: uno imposible (20 sucesos en la misma fecha) y otro muy
       separado. El separado tiene que quedar desplegado. */
    const evs = [];
    for(let k = 0; k < 20; k++) evs.push({ id: 90000 + k, n: 'Denso ' + k, fa: 10 });
    evs.push({ id: 91000, n: 'Lejano A', fa: 100 });
    evs.push({ id: 91001, n: 'Lejano B', fa: 190 });
    const r = window.__audit.loose(evs, 0, 200, 1200, 300);
    return { modo: r.mode,
             sueltos: r.items.filter(x => !x.isAggregate).map(x => x.ev && x.ev.n),
             agregados: r.items.filter(x => x.isAggregate).map(x => x.events.length) };
  });
  const abrioLejanos = (mix.sueltos || []).includes('Lejano A') &&
                       (mix.sueltos || []).includes('Lejano B');
  console.log(`  modo=${mix.modo}  sueltos=[${mix.sueltos}]  agregados=[${mix.agregados}]`);
  console.log(`  ${abrioLejanos ? 'ok   ' : 'FALLA'} los sucesos separados se desplegaron ` +
              'aunque el racimo denso no cabe');
  if(!abrioLejanos) fallos++;
  salida.mixto = mix;

  /* ── 3. R9: estrés de coincidentes, sin dos en la misma posición ───────── */
  console.log('\n--- R9: estres de sucesos coincidentes ---');
  const estres = [];
  for(const n of [1, 50, 51, 350, 351]){
    const r = await p2.evaluate((cant) => {
      const evs = Array.from({ length: cant }, (_, k) =>
        ({ id: 10000 + k, n: 'Suceso largo de prueba ' + k, fa: 10 }));
      const res = window.__audit.loose(evs, 0, 20, 1000, 0);
      const slots = new Map();
      for(const x of res.items){
        const k = x.x + ':' + x.level;
        slots.set(k, (slots.get(k) || 0) + 1);
      }
      return { nodos: res.items.length,
               maxCoincidentes: Math.max(...slots.values()),
               cobertura: new Set(res.items.flatMap(x => x.events.map(e => e.id))).size,
               niveles: res.items.map(x => x.level) };
    }, n);
    const mal = r.maxCoincidentes > 1 || r.cobertura !== n;
    if(mal) fallos++;
    estres.push({ n, ...r });
    console.log(`  ${mal ? 'FALLA' : 'ok   '} n=${String(n).padStart(3)} ` +
                `nodos=${String(r.nodos).padStart(3)} ` +
                `maxCoincidentes=${r.maxCoincidentes} ` +
                `cobertura=${r.cobertura}/${n}`);
    if(mal) console.log(`        niveles: [${r.niveles.join(',')}]`);
  }
  salida.estres = estres;

  /* Varias concentraciones separadas, como pide la auditoría. */
  const varias = await p2.evaluate(() => {
    const evs = [];
    for(const base of [10, 60, 110]){
      for(let k = 0; k < 30; k++) evs.push({ id: base * 1000 + k, n: 'C' + base + '-' + k, fa: base });
    }
    const res = window.__audit.loose(evs, 0, 120, 1200, 0);
    const slots = new Map();
    for(const x of res.items){
      const k = x.x + ':' + x.level;
      slots.set(k, (slots.get(k) || 0) + 1);
    }
    return { nodos: res.items.length, maxCoincidentes: Math.max(...slots.values()),
             cobertura: new Set(res.items.flatMap(x => x.events.map(e => e.id))).size };
  });
  const malV = varias.maxCoincidentes > 1 || varias.cobertura !== 90;
  if(malV) fallos++;
  console.log(`  ${malV ? 'FALLA' : 'ok   '} 3 concentraciones de 30 ` +
              `maxCoincidentes=${varias.maxCoincidentes} cobertura=${varias.cobertura}/90`);
  salida.variasConcentraciones = varias;

  await p2.close();
  await nav.close();
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`\n${fallos ? fallos + ' comprobacion(es) fallaron' : 'R3 y R9 en orden'}`);
  process.exit(fallos ? 1 : 0);
})();
