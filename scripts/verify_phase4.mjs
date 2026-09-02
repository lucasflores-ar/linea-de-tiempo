import { chromium } from 'playwright';

const BASE = 'http://localhost:3456/linea-paralela.html?onboard=0';

async function measure(page) {
  return page.evaluate(() => {
    const header = document.querySelector('header');
    const quick = document.querySelector('.toolbar--quick');
    const optsVisible = [...document.querySelectorAll('.toolbar--opts')].some(el => {
      const r = el.getBoundingClientRect();
      return r.height > 0 && r.width > 0 && getComputedStyle(el).display !== 'none';
    });
    const optsInFlow = (() => {
      const sheet = document.getElementById('filtros-sheet');
      if (!sheet) return false;
      const cs = getComputedStyle(sheet);
      if (cs.display === 'contents') return false;
      if (cs.position === 'fixed' && (cs.opacity === '0' || cs.pointerEvents === 'none')) return false;
      const r = sheet.getBoundingClientRect();
      return r.top < window.innerHeight && r.height > 0 && cs.opacity !== '0';
    })();
    const legendItems = [...document.querySelectorAll('.legend__item')].filter(el => getComputedStyle(el).display !== 'none');
    const axisLabels = [...document.querySelectorAll('.axis-area .axis-label, .axis-area .ax-lbl, #axis-area *')].filter(el => {
      const t = (el.textContent || '').trim();
      return t.length > 0 && el.getBoundingClientRect().height > 0;
    });
    const quickScroll = document.querySelector('.quick-scroll');
    const potInQuick = !!quickScroll?.querySelector('#pot-chips');
    const potInOpts = !!document.querySelector('.toolbar--opts #pot-chips');
    return {
      chromePx: Math.round((header?.getBoundingClientRect().bottom || 0) + (quick?.getBoundingClientRect().height || 0)),
      headerBottom: Math.round(header?.getBoundingClientRect().bottom || 0),
      quickHeight: Math.round(quick?.getBoundingClientRect().height || 0),
      legendVisibleCount: legendItems.length,
      legendText: legendItems.map(el => el.textContent.trim()),
      filtrosBtnVisible: getComputedStyle(document.getElementById('filtros-btn')).display !== 'none',
      optsToolbarInFlow: optsInFlow,
      potInQuick,
      potInOpts,
      axisLabelCount: axisLabels.length,
      sheetDisplay: getComputedStyle(document.getElementById('filtros-sheet')).display,
    };
  });
}

async function testViewport(browser, name, width, height) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript(() => {
    localStorage.setItem('lt-onboarding-v1', 'done');
    localStorage.setItem('lt-par-row-layout', 'compact');
    localStorage.setItem('lt-par-autofit', '0');
    localStorage.setItem('lt-par-zoom', '0.8');
  });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);

  const before = await measure(page);

  // Sheet open
  await page.click('#filtros-btn');
  await page.waitForTimeout(300);
  const sheetOpen = await page.evaluate(() => ({
    on: document.getElementById('filtros-sheet').classList.contains('on'),
    backdropOn: document.getElementById('filtros-backdrop').classList.contains('on'),
    hasOptMarkers: !!document.querySelector('#opt-markers'),
    popoverTop: document.getElementById('filtros-sheet').style.top,
    popoverRight: document.getElementById('filtros-sheet').style.right,
  }));

  // Close with Listo
  await page.click('#filtros-close');
  await page.waitForTimeout(200);
  const afterClose = await page.evaluate(() => !document.getElementById('filtros-sheet').classList.contains('on'));

  // Scroll chip row test (mobile)
  const scrollTest = await page.evaluate(async () => {
    const sc = document.querySelector('.quick-scroll');
    if (!sc) return { hasScroller: false };
    const before = sc.scrollLeft;
    sc.scrollLeft = 120;
    await new Promise(r => setTimeout(r, 50));
    const mid = sc.scrollLeft;
    const box = document.querySelector('.lane-check input');
    if (box) {
      box.checked = !box.checked;
      box.dispatchEvent(new Event('change', { bubbles: true }));
    }
    await new Promise(r => setTimeout(r, 200));
    return { hasScroller: true, before, mid, afterRebuild: sc.scrollLeft };
  });

  // Touch target size (lane-check on mobile)
  const chipSize = await page.evaluate(() => {
    const el = document.querySelector('.lane-check');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });

  // Rotation closes sheet
  await page.click('#filtros-btn');
  await page.waitForTimeout(200);
  const isMobile = width <= 760;
  if (isMobile) {
    await page.setViewportSize({ width: height, height: width });
  } else {
    await page.setViewportSize({ width: 375, height: 667 });
  }
  await page.waitForTimeout(400);
  const rotationClosed = await page.evaluate(() => !document.getElementById('filtros-sheet').classList.contains('on'));

  await page.close();
  return { name, width, height, before, sheetOpen, afterClose, scrollTest, chipSize, rotationClosed };
}

const browser = await chromium.launch({ headless: true });
const results = [];
for (const [name, w, h] of [
  ['iPhone SE', 375, 667],
  ['Pixel 7', 412, 915],
  ['Desktop 1280', 1280, 900],
  ['Desktop 1440', 1440, 900],
  ['Desktop 1920', 1920, 1080],
]) {
  results.push(await testViewport(browser, name, w, h));
}
await browser.close();
console.log(JSON.stringify(results, null, 2));
