// Verificación en production: franja de imperios con alto real, sin solape con
// la primera fila, y todo control con zona de clic en el caso jes/390.
const { chromium } = require('playwright');
const BASE = 'https://linea-de-tiempo-seven.vercel.app/linea-paralela.html';

(async () => {
  const browser = await chromium.launch({ headless: true });

  const p1 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await p1.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
  await p1.goto(BASE + '#vista=comparar&filas=jud,isr,pro');
  await p1.waitForSelector('.bar-caption__name');
  await p1.evaluate(() => document.fonts.ready);
  const franja = await p1.evaluate(() => {
    const s = document.querySelector('.pot-strip');
    const b = s && s.querySelector('.band');
    const f = document.querySelector('#chart-canvas .row');
    if (!s || !b || !f) return { error: 'faltan nodos' };
    const rb = b.getBoundingClientRect(), rf = f.getBoundingClientRect();
    return {
      altoFranja: s.getBoundingClientRect().height,
      solapa: rb.bottom > rf.top + 0.5,
    };
  });
  console.log('franja de imperios: ' + JSON.stringify(franja));
  await p1.close();

  const p2 = await browser.newPage({
    viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true,
  });
  await p2.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
  await p2.goto(BASE + '#vista=comparar&filas=jes');
  await p2.waitForSelector('.bar-caption__name');
  await p2.evaluate(() => document.fonts.ready);
  const alcance = await p2.evaluate(async () => {
    const sc = document.querySelector('#chart-scroll');
    const v = sc.getBoundingClientRect();
    const ok = el => {
      const b = el.getBoundingClientRect();
      for (let fy = 0.1; fy <= 0.9; fy += 0.1) {
        for (let fx = 0.05; fx <= 0.95; fx += 0.05) {
          const x = b.x + b.width * fx, y = b.y + b.height * fy;
          if (x < v.left + 1 || x > v.right - 1 || y < v.top + 1 || y > v.bottom - 1) continue;
          const e = document.elementFromPoint(x, y);
          if (e && (e === el || el.contains(e))) return true;
        }
      }
      return false;
    };
    /* Mismo criterio que run-alcance.cjs: solo cuenta como fallo si sigue
       inalcanzable después de traerlo a la vista. */
    const porEtiqueta = lab => [...document.querySelectorAll('#chart-canvas .bar')]
      .find(el => el.getAttribute('aria-label') === lab);
    const etiquetas = [...document.querySelectorAll('#chart-canvas .bar')]
      .map(el => el.getAttribute('aria-label'));
    const malas = [];
    for (const lab of etiquetas) {
      let bar = porEtiqueta(lab);
      if (!bar || ok(bar)) continue;
      bar.scrollIntoView({ block: 'center' });
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      bar = porEtiqueta(lab);
      if (!bar || ok(bar)) continue;
      malas.push(lab);
    }
    return { total: etiquetas.length, malas };
  });
  console.log('alcance jes/390: ' + JSON.stringify(alcance));
  await p2.screenshot({ path: 'docs/auditoria-tercera/prod-jes-390.png' });
  await browser.close();
})();
