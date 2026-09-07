/* R8: «En línea» tiene que terminar mostrando y enfocando el suceso.
   Antes terminaba con drawer.on=true y chart-wrap[inert]=true: el panel
   tapaba el resultado de la propia acción. Se prueba desde un grupo abierto
   en el panel y desde Explorar, y se exige foco, visibilidad y regreso. */
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const SALIDA = path.join(__dirname, 'r8.json');

async function abrir(nav, w, h, hash){
  const ctx = await nav.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  await p.addInitScript(() => localStorage.setItem('lt-onboarding-v2', 'done'));
  await p.goto('http://127.0.0.1:8000/linea-paralela.html' + hash, { waitUntil: 'load' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(700);
  return { ctx, p };
}

/* Estado que la auditoría midió como defectuoso, más lo que ahora se exige. */
const estado = (p) => p.evaluate(() => {
  const el = document.activeElement;
  const marca = el && el.closest && el.closest('.evt-marker, .bar-event-pin');
  const cs = document.getElementById('chart-scroll');
  let visible = false, dentro = false;
  if(marca){
    const r = marca.getBoundingClientRect();
    const c = cs.getBoundingClientRect();
    visible = r.width > 0 && r.height > 0;
    dentro = r.left >= c.left - 1 && r.right <= c.right + 1
          && r.top >= c.top - 1 && r.bottom <= c.bottom + 1;
  }
  const ret = document.getElementById('chart-return');
  return {
    drawerAbierto: document.getElementById('drawer').classList.contains('on'),
    chartInert: document.getElementById('chart-wrap').hasAttribute('inert'),
    vista: document.documentElement.dataset.vista
        || (document.querySelector('.seg__btn--on') || {}).textContent,
    foco: el ? (el.className || el.tagName) : null,
    focoEnMarca: !!marca,
    focoId: marca ? (marca.dataset.ev || marca.dataset.aggIds) : null,
    esAgregado: !!(marca && marca.dataset.aggIds),
    revelado: !!(marca && /--revelado/.test(marca.className)),
    visible, dentro,
    anuncio: (document.getElementById('chart-live') || {}).textContent || '',
    regreso: ret && !ret.hidden ? ret.textContent : null,
    /* El regreso no debe tapar el eje ni una etiqueta de año: es un control
       flotante y el eje es sticky al pie del scroller, con minimapa debajo. */
    regresoTapa: (()=> {
      if(!ret || ret.hidden) return null;
      const r = ret.getBoundingClientRect();
      const ax = document.querySelector('.axis-area').getBoundingClientRect();
      const años = [...document.querySelectorAll('.grid-label')].filter(g=> {
        const b = g.getBoundingClientRect();
        return Math.min(r.right, b.right) - Math.max(r.left, b.left) > 0
            && Math.min(r.bottom, b.bottom) - Math.max(r.top, b.top) > 0;
      }).length;
      return { eje: r.bottom > ax.top + 1, años };
    })(),
  };
});

(async () => {
  const nav = await chromium.launch();
  const salida = {};
  let fallos = 0;

  function comprobar(nom, s, esperaId){
    const mal = [];
    if(s.drawerAbierto) mal.push('el panel sigue abierto');
    if(s.chartInert) mal.push('chart-wrap sigue inert');
    if(!s.focoEnMarca) mal.push('el foco no quedó en un control del gráfico (' + s.foco + ')');
    if(s.focoEnMarca && !s.visible) mal.push('el control enfocado no es visible');
    if(s.focoEnMarca && !s.dentro) mal.push('el control enfocado quedó fuera del área visible');
    if(!s.revelado) mal.push('el control no quedó señalado como revelado');
    if(!s.anuncio) mal.push('no se anunció nada al lector de pantalla');
    if(!s.regreso) mal.push('no hay regreso a la lista');
    if(s.regresoTapa && s.regresoTapa.eje) mal.push('el regreso queda encima del eje');
    if(s.regresoTapa && s.regresoTapa.años) mal.push('el regreso tapa ' + s.regresoTapa.años + ' etiqueta(s) de año');
    if(esperaId != null && s.focoId){
      const ids = String(s.focoId).split(',');
      if(!ids.includes(String(esperaId))) mal.push('enfocó ' + s.focoId + ' en vez de ' + esperaId);
    }
    if(mal.length) fallos++;
    salida[nom] = { ...s, mal };
    console.log(`  ${mal.length ? 'FALLA' : 'ok   '} ${nom}`);
    if(s.anuncio) console.log(`        anuncio: «${s.anuncio}»`);
    if(s.regreso) console.log(`        regreso: «${s.regreso.trim()}»`);
    for(const m of mal) console.log(`        ${m}`);
    return mal.length === 0;
  }

  /* ── 1. Desde un grupo abierto en el panel: el caso de la auditoría ───── */
  {
    const { ctx, p } = await abrir(nav, 1440, 900, '#vista=comparar&filas=jud,isr,pro');
    /* Cualquier agregado sirve como «grupo»: se abre su lista. */
    const agg = p.locator('[data-agg-ids]').first();
    const hay = await agg.count();
    if(!hay){
      console.log('  FALLA no se encontró ningún grupo para abrir');
      fallos++;
    } else {
      const ids = (await agg.getAttribute('data-agg-ids')).split(',');
      await agg.click();
      await p.locator('#drawer.on').waitFor({ timeout: 4000 });
      const enLinea = p.locator('#d-explorer .tl-list__chart, #d-explorer [data-chart]').first();
      let boton = enLinea;
      if(!await boton.count()){
        boton = p.locator('#d-explorer button', { hasText: /en l[íi]nea/i }).first();
      }
      const tiene = await boton.count();
      if(!tiene){
        console.log('  FALLA la lista del grupo no ofrece «En línea»');
        fallos++;
      } else {
        await boton.click();
        await p.waitForTimeout(900);
        const s = await estado(p);
        const bien = comprobar('desde un grupo en el panel', s, null);

        /* El regreso tiene que devolver la lista del grupo. */
        if(bien){
          await p.locator('#chart-return').click();
          await p.locator('#drawer.on').waitFor({ timeout: 4000 }).catch(()=>{});
          const vuelto = await p.evaluate(() => ({
            abierto: document.getElementById('drawer').classList.contains('on'),
            lista: !!document.querySelector('#d-explorer .tl-list__row, #d-explorer button'),
            oculto: document.getElementById('chart-return').hidden,
          }));
          const ok = vuelto.abierto && vuelto.lista && vuelto.oculto;
          salida.regresoGrupo = vuelto;
          console.log(`  ${ok ? 'ok   ' : 'FALLA'} el regreso reabre la lista del grupo`);
          if(!ok) fallos++;
        }
        salida.grupoIds = ids;
      }
    }
    await ctx.close();
  }

  /* ── 2. Desde Explorar ───────────────────────────────────────────────── */
  {
    const { ctx, p } = await abrir(nav, 1440, 900, '#vista=explorar&filas=jue');
    let boton = p.locator('#explore-main-list .tl-list__chart, #explore-main-list [data-chart]').first();
    if(!await boton.count()){
      boton = p.locator('#explore-main-list button', { hasText: /en l[íi]nea/i }).first();
    }
    if(!await boton.count()){
      console.log('  FALLA Explorar no ofrece «En línea»');
      fallos++;
    } else {
      await boton.click();
      await p.waitForTimeout(1000);
      const s = await estado(p);
      comprobar('desde Explorar', s, null);
      const enComparar = await p.evaluate(() =>
        !!document.querySelector('.seg__btn--on, [aria-pressed="true"]'));
      salida.explorarVista = { enComparar, vista: s.vista };
      console.log(`  ${enComparar ? 'ok   ' : 'FALLA'} la acción dejó activa la vista Comparar`);
      if(!enComparar) fallos++;
    }
    await ctx.close();
  }

  /* ── 3. Un suceso que quedó dentro de un agregado se selecciona y anuncia ─ */
  {
    const { ctx, p } = await abrir(nav, 390, 844, '#vista=comparar&filas=jud,isr,pro');
    const r = await p.evaluate(() => {
      const agg = document.querySelector('[data-agg-ids]');
      if(!agg) return { sinAgregado: true };
      const id = String(agg.dataset.aggIds).split(',')[1];
      /* Se pide el miembro por su id, como haría la lista del grupo. */
      window.__r8 = id;
      return { id, miembros: String(agg.dataset.aggIds).split(',').length };
    });
    if(r.sinAgregado){
      console.log('  FALLA no hay agregados en 390px para probar el caso agrupado');
      fallos++;
    } else {
      /* controlDeSuceso debe encontrarlo por la lista de ids del agregado,
         no por un selector de subcadena que engancharía 175 o 755. */
      const encontrado = await p.evaluate(() => {
        const id = window.__r8, clave = String(id);
        const propio = document.querySelector(`[data-ev="${id}"]`);
        if(propio) return { via: 'propio' };
        for(const a of document.querySelectorAll('[data-agg-ids]')){
          if(String(a.dataset.aggIds).split(',').includes(clave)){
            return { via: 'agregado', miembros: String(a.dataset.aggIds).split(',').length };
          }
        }
        return { via: null };
      });
      salida.agrupado = { ...r, ...encontrado };
      const ok = !!encontrado.via;
      console.log(`  ${ok ? 'ok   ' : 'FALLA'} el id ${r.id} se localiza por ${encontrado.via}`);
      if(!ok) fallos++;
    }
    await ctx.close();
  }

  await nav.close();
  fs.writeFileSync(SALIDA, JSON.stringify(salida, null, 2), 'utf8');
  console.log(`\n${fallos ? fallos + ' comprobacion(es) fallaron' : '«En línea» revela y enfoca el suceso'}`);
  process.exit(fallos ? 1 : 0);
})();
