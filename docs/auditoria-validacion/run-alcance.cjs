// Invariante de alcance: todo personaje dibujado tiene que poder abrirse con el
// puntero, no solo con el teclado.
//
// Salió de una regresión de R2. Al fundir los marcadores que se pisaban en un
// solo agregado, el control quedó más ancho (28px en vez de 15px) y centrado en
// la barra. En puntero grueso cada marcador arrastra además un halo táctil
// invisible de 18px por lado, así que sobre una barra angosta el conjunto tapaba
// hasta el nombre: Josías (32px de barra) tenía role="button", recibía foco de
// teclado y no había un solo punto donde el clic le llegara.
//
// El eje es pegajoso, así que tapar algo en una posición intermedia de scroll es
// transitorio: solo cuenta como fallo si sigue inalcanzable después de traerlo
// a la vista.
const path = require('path');
const { chromium } = require('playwright');

const CASOS = [
  { w: 1920, h: 1080, lane: 'jud,isr,pro' },
  { w: 1440, h: 900, lane: 'jud,isr,pro' },
  { w: 1024, h: 844, lane: 'jud,isr,pro' },
  { w: 760, h: 844, lane: 'jud,isr,pro' },
  { w: 390, h: 844, lane: 'jud,isr,pro' },
  { w: 1440, h: 900, lane: 'sem' },
  { w: 390, h: 844, lane: 'jes' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  let fallos = 0;
  for (const c of CASOS) {
    const p = await browser.newPage({
      viewport: { width: c.w, height: c.h },
      hasTouch: c.w <= 1024, isMobile: c.w <= 760,
    });
    await p.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
    await p.goto('http://127.0.0.1:8000/linea-paralela.html#vista=comparar&filas=' + c.lane);
    await p.waitForSelector('.bar-caption__name');
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(async () => {
      const sc = document.querySelector('#chart-scroll');
      /* ¿Algún punto de la caja del control recibe el clic? */
      const alcanzable = el => {
        const b = el.getBoundingClientRect();
        const v = sc.getBoundingClientRect();
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
      /* Desplazar puede disparar un re-render que reemplaza el nodo, así que se
         vuelve a buscar por su etiqueta en vez de reusar la referencia vieja. */
      const porEtiqueta = lab => [...document.querySelectorAll('#chart-canvas .bar')]
        .find(el => el.getAttribute('aria-label') === lab);

      const etiquetas = [];
      for (const bar of document.querySelectorAll('#chart-canvas .bar')) {
        const b = bar.getBoundingClientRect();
        if (b.width > 0 && b.height > 0) etiquetas.push(bar.getAttribute('aria-label') || '?');
      }

      const malas = [];
      for (const lab of etiquetas) {
        let bar = porEtiqueta(lab);
        if (!bar || alcanzable(bar)) continue;
        bar.scrollIntoView({ block: 'center' });
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        bar = porEtiqueta(lab);
        if (!bar || alcanzable(bar)) continue;
        const bb = bar.getBoundingClientRect();
        const tapa = document.elementFromPoint(bb.x + bb.width / 2, bb.y + bb.height / 2);
        malas.push({
          quien: lab,
          ancho: Math.round(bb.width),
          tapa: tapa ? (tapa.className || tapa.tagName) : 'nada',
        });
      }
      return { total: etiquetas.length, malas };
    });
    const etiqueta = (c.lane + ' ' + c.w).padEnd(18);
    if (r.malas.length) {
      fallos += r.malas.length;
      console.log('  FALLA ' + etiqueta + 'barras=' + String(r.total).padStart(3) + ' inalcanzables=' + r.malas.length);
      for (const m of r.malas) console.log('        ' + m.quien + '  (barra de ' + m.ancho + 'px, la tapa: ' + m.tapa + ')');
    } else {
      console.log('  ok    ' + etiqueta + 'barras=' + String(r.total).padStart(3) + ' inalcanzables=  0');
    }
    await p.close();
  }
  await browser.close();
  console.log(fallos ? '\n' + fallos + ' control(es) sin zona de clic' : '\ntodo personaje dibujado se puede abrir con el puntero');
  process.exit(fallos ? 1 : 0);
})();
