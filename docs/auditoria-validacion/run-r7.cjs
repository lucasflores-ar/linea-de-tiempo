/* R7: el ancho disponible se aprovecha antes de truncar.
   Se mide el área realmente pintada de cada título (después de todos los
   corrimientos CSS), no la distancia entre fechas: dos cajas de 108px con
   centros a 92px se pisaban 16px y una prueba de distancias no lo veía. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SALIDA = path.join(__dirname, 'r7.json');

async function abrir(nav, w, h, filas, escala){
  const ctx = await nav.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
  const hash = '#vista=comparar&filas=' + filas + (escala ? '&fuente=' + escala : '');
  await p.goto('http://127.0.0.1:8000/linea-paralela.html' + hash, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  if(escala){
    await p.selectOption('#font-scale', String(escala)).catch(()=>{});
    await p.waitForTimeout(500);
  }
  return { ctx, p };
}

/* Rectángulos pintados de los títulos de la zona suelta, con su nivel. */
const titulos = (p) => p.evaluate(() => {
  const zona = document.querySelector('.loose-evt-zone');
  if(!zona) return { sinZona: true, items: [] };
  const items = [];
  for(const t of zona.querySelectorAll('.loose-evt-zone__title')){
    const btn = t.closest('.evt-marker');
    const r = t.getBoundingClientRect();
    if(!r.width) continue;
    const cs = getComputedStyle(t);
    items.push({
      texto: t.textContent,
      completo: btn ? btn.getAttribute('aria-label') : t.textContent,
      agregado: !!(btn && btn.dataset.aggIds),
      /* Nivel: is-above / is-below más la fila vertical real del rectángulo. */
      banda: Math.round(r.top),
      izq: +r.left.toFixed(1), der: +r.right.toFixed(1),
      arriba: +r.top.toFixed(1), abajo: +r.bottom.toFixed(1),
      /* ¿Se recortó? scrollHeight/Width delatan el clamp. */
      recortado: t.scrollHeight > t.clientHeight + 1 || t.scrollWidth > t.clientWidth + 1,
      /* Un título con fondo y delante del obstáculo sigue siendo legible. */
      apoyado: t.classList.contains('loose-evt-zone__title--sobre-etiqueta')
            && cs.backgroundColor !== 'rgba(0, 0, 0, 0)',
      lineas: cs.webkitLineClamp || cs.lineClamp,
      fontSize: cs.fontSize,
      zonaAncho: Math.round(zona.getBoundingClientRect().width),
    });
  }
  /* Obstáculos fijos de la zona: la etiqueta «Sucesos» y los nombres de banda.
     Un título que los pise es igual de ilegible que uno que pise a un vecino. */
  const obstaculos = [];
  for(const o of zona.querySelectorAll('.loose-evt-zone__label, .band-label')){
    const r = o.getBoundingClientRect();
    /* visibility:hidden conserva el rectángulo: un obstáculo invisible no
       estorba, y ceder la leyenda de la zona es una resolución válida. */
    if(!r.width || getComputedStyle(o).visibility === 'hidden') continue;
    obstaculos.push({ texto: o.textContent.trim(), izq: +r.left.toFixed(1),
                      der: +r.right.toFixed(1), arriba: +r.top.toFixed(1),
                      abajo: +r.bottom.toFixed(1) });
  }
  return { items, obstaculos, ancho: Math.round(zona.getBoundingClientRect().width) };
});

/* Pares de títulos que comparten banda vertical y se pisan horizontalmente. */
function solapes(items){
  const ch = [];
  for(let a = 0; a < items.length; a++){
    for(let b = a + 1; b < items.length; b++){
      const A = items[a], B = items[b];
      const dy = Math.min(A.abajo, B.abajo) - Math.max(A.arriba, B.arriba);
      const dx = Math.min(A.der, B.der) - Math.max(A.izq, B.izq);
      if(dx > 1 && dy > 1){
        ch.push({ a: A.texto.slice(0, 26), b: B.texto.slice(0, 26), dx: +dx.toFixed(1) });
      }
    }
  }
  return ch;
}

/* Títulos que pisan una etiqueta fija de la zona. */
function choquesConObstaculos(titulos, obstaculos){
  const ch = [];
  for(const A of titulos){
    /* Con fondo propio y delante del obstáculo, el texto se lee igual: es la
       resolución elegida cuando encoger más despegaría el título del punto. */
    if(A.apoyado) continue;
    for(const o of obstaculos){
      const dy = Math.min(A.abajo, o.abajo) - Math.max(A.arriba, o.arriba);
      const dx = Math.min(A.der, o.der) - Math.max(A.izq, o.izq);
      if(dx > 1 && dy > 1){
        ch.push({ a: A.texto.slice(0, 26), b: o.texto.slice(0, 26), dx: +dx.toFixed(1) });
      }
    }
  }
  return ch;
}

(async () => {
  const nav = await chromium.launch();
  const salida = {};
  let fallos = 0;

  const casos = [
    { nom: 'jueces 1920', w: 1920, h: 1080, filas: 'jue' },
    { nom: 'jueces 1440', w: 1440, h: 900,  filas: 'jue' },
    { nom: 'jueces 390',  w: 390,  h: 844,  filas: 'jue' },
    { nom: 'reyes 1920',  w: 1920, h: 1080, filas: 'jud,isr,pro' },
    { nom: 'jue 1440 f2', w: 1440, h: 900,  filas: 'jue', escala: 2 },
  ];

  for(const c of casos){
    const { ctx, p } = await abrir(nav, c.w, c.h, c.filas, c.escala);
    const t = await titulos(p);
    const sol = solapes(t.items.filter(i=> !i.agregado));
    const sueltos = t.items.filter(i=> !i.agregado);
    const recortados = sueltos.filter(i=> i.recortado);
    /* Un título recortado solo se acepta si su hueco estaba realmente lleno:
       con la zona casi vacía, recortar es desaprovechar el ancho. */
    const holgura = sueltos.length ? Math.round(t.ancho / sueltos.length) : 0;
    const contraObst = choquesConObstaculos(sueltos, t.obstaculos || []);
    const mal = [];
    if(sol.length) mal.push(sol.length + ' títulos se pisan');
    if(contraObst.length) mal.push(contraObst.length + ' títulos pisan una etiqueta de la zona');
    /* La escala tiene que llegar al título: era 10px fijo. Se lee la escala
       real, porque en pantallas táctiles la app arranca en 1.2 sola. */
    const escalaReal = await p.evaluate(() => parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--tl-font-scale')) || 1);
    const esperado = 10 * escalaReal;
    const fs0 = sueltos[0] ? parseFloat(sueltos[0].fontSize) : esperado;
    if(Math.abs(fs0 - esperado) > 0.5){
      mal.push(`la fuente del título es ${fs0}px y debería ser ${esperado}px`);
    }
    if(mal.length) fallos++;
    salida[c.nom] = { ancho: t.ancho, sueltos: sueltos.length,
                      recortados: recortados.length, holgura, solapes: sol,
                      contraObst, mal,
                      fontSize: sueltos[0] && sueltos[0].fontSize };
    console.log(`  ${mal.length ? 'FALLA' : 'ok   '} ${c.nom.padEnd(12)} ` +
                `titulos=${String(sueltos.length).padStart(3)} ` +
                `recortados=${String(recortados.length).padStart(3)} ` +
                `solapes=${String(sol.length).padStart(3)} ` +
                `vs-etiquetas=${String(contraObst.length).padStart(2)} ` +
                `fuente=${sueltos[0] ? sueltos[0].fontSize : '-'}`);
    for(const s of [...sol, ...contraObst].slice(0, 4)){
      console.log(`        «${s.a}» y «${s.b}» (${s.dx}px)`);
    }
    for(const m of mal) console.log(`        ${m}`);
    for(const r of recortados.slice(0, 3)){
      console.log(`        recortado: «${r.texto.slice(0, 34)}» (hueco medio ${holgura}px)`);
    }
    await ctx.close();
  }

  /* Con lugar de sobra, un título largo no debería recortarse. */
  {
    const { ctx, p } = await abrir(nav, 1920, 1080, 'jue');
    const r = await p.evaluate(() => {
      const ts = [...document.querySelectorAll('.loose-evt-zone__title')]
        .filter(t => !t.closest('.evt-marker').dataset.aggIds);
      /* El título más largo de la zona, y cuánto ancho se le asignó. */
      let peor = null;
      for(const t of ts){
        const w = t.getBoundingClientRect().width;
        const cortado = t.scrollHeight > t.clientHeight + 1
                     || t.scrollWidth > t.clientWidth + 1;
        if(!peor || t.textContent.length > peor.chars){
          peor = { texto: t.textContent, chars: t.textContent.length,
                   ancho: Math.round(w), cortado,
                   lineas: getComputedStyle(t).webkitLineClamp };
        }
      }
      return peor;
    });
    salida.masLargo = r;
    /* Antes el tope era 108px para todos. */
    const aprovecha = r && (r.ancho > 108 || !r.cortado);
    console.log(`  ${aprovecha ? 'ok   ' : 'FALLA'} el título más largo ` +
                `(«${(r ? r.texto : '').slice(0, 30)}») recibió ${r ? r.ancho : 0}px ` +
                `y ${r && r.cortado ? 'se recortó' : 'entra completo'}`);
    if(!aprovecha) fallos++;
    await ctx.close();
  }

  await nav.close();
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`\n${fallos ? fallos + ' comprobacion(es) fallaron' : 'los títulos usan el ancho disponible y no se pisan'}`);
  process.exit(fallos ? 1 : 0);
})();
