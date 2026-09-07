/**
 * Formato temporal de la cronología (Paso 6).
 * API: window.LTDates
 *
 * Semántica interna:
 * - Años negativos = a.E.C.; positivos = E.C.
 * - El valor 0 puede existir en proyección matemática, pero NUNCA se muestra al lector
 *   (no hay «año cero» histórico: de 1 a.E.C. se pasa a 1 E.C.).
 * - Fracciones dentro del año 33 (p. ej. 33.05) representan días de nisán vía NISAN_DAYS;
 *   son coordenadas de gráfico, no fechas civiles modernas.
 * - Precisión original: preferir `ft` / `mcuando` cuando existan; marcar estimado con
 *   fest / ini_est / fin_est (sucesos) o ie / fe (personajes).
 */
(function(global){
'use strict';

const NISAN_DAYS = [
  '8 de nisán (sábado)', '9 de nisán', '10 de nisán', '11 de nisán', '12 de nisán',
  '13 de nisán', '14 de nisán', '15 de nisán (sábado)', '16 de nisán',
];

function isFiniteNum(y){
  return y != null && y !== '' && Number.isFinite(Number(y));
}

/** Redondeo de visualización; el 0 se considera no mostrable. */
function roundYear(y){
  return Math.round(Number(y));
}

function isDisplayableYear(y){
  if(!isFiniteNum(y)) return false;
  return roundYear(y) !== 0;
}

/**
 * Etiqueta para el lector. Devuelve '' si no hay fecha o si cae en año 0.
 * opts.compact: 'a.e.c.' / 'e.c.' en minúsculas (legado UI densa).
 */
function fmtYear(y, opts){
  const o = opts || {};
  if(!isFiniteNum(y)) return o.empty != null ? o.empty : '—';
  const n = Number(y);
  if(n >= 33 && n < 34 && n % 1 > 0.001){
    const idx = Math.round((n - 33) * 20);
    if(NISAN_DAYS[idx]) return NISAN_DAYS[idx];
  }
  const r = roundYear(n);
  if(r === 0){
    /* Nunca «0» al lector; en eje se omite la etiqueta vía shouldSkipAxisTick. */
    return o.zeroLabel != null ? o.zeroLabel : (o.empty != null ? o.empty : '—');
  }
  if(o.compact){
    if(r < 0) return Math.abs(r) + ' a.e.c.';
    return r + ' e.c.';
  }
  if(r < 0) return Math.abs(r) + ' a.E.C.';
  return r + ' E.C.';
}

function fmtRange(ini, fin, opts){
  const empty = (opts && opts.empty != null) ? opts.empty : '—';
  const a = isDisplayableYear(ini) ? fmtYear(ini, opts) : '';
  const b = isDisplayableYear(fin) ? fmtYear(fin, opts) : '';
  if(!a && !b) return empty;
  if(!a) return b;
  if(!b || a === b) return a;
  return a + ' – ' + b;
}

function eventIsEstimated(ev){
  if(!ev) return false;
  return !!(ev.fest || ev.ini_est || ev.fin_est);
}

function personIsEstimated(pe){
  if(!pe) return false;
  return !!(pe.ie || pe.fe);
}

/* Los dos extremos de un suceso, siempre del más antiguo al más reciente.
   En los libros bíblicos `fa` es cuándo se completó y `fa_fin` el otro extremo
   del período que el libro abarca, que suele ser anterior: leerlos en el orden
   de los campos imprimiría «c. 591 a. E. C. – 613 a. E. C.». */
function eventDateEnds(ev, opts){
  const ini = { anio: ev.fa, texto: ev.ft || fmtYear(ev.fa, opts) };
  if(ev.fa_fin == null || ev.fa_fin === ev.fa) return [ini];
  const fin = { anio: ev.fa_fin, texto: ev.ft_fin || fmtYear(ev.fa_fin, opts) };
  if(isFiniteNum(ini.anio) && isFiniteNum(fin.anio) && fin.anio < ini.anio) return [fin, ini];
  return [ini, fin];
}

/** Línea de fecha para drawer/lista: texto original + estimado. */
function fmtEventDateLine(ev, opts){
  if(!ev) return '—';
  let line = eventDateEnds(ev, opts).map(e=> e.texto).join(' – ');
  if(eventIsEstimated(ev)) line += (line ? ' · ' : '') + 'fecha estimada';
  return line || '—';
}

/** ¿Saltar esta marca de eje? (año 0 o etiqueta vacía). */
function shouldSkipAxisTick(y){
  if(!isFiniteNum(y)) return true;
  if(roundYear(y) === 0) return true;
  const label = fmtYear(y, { empty: '' });
  return !label;
}

/**
 * Avanza ticks evitando etiquetar el 0: si el paso cae en 0, omite la etiqueta
 * pero conserva la línea de rejilla opcional vía callback.
 */
function forEachAxisTick(yMin, yMax, step, fn){
  if(!Number.isFinite(step) || step <= 0) return;
  const start = Math.ceil(yMin / step) * step;
  let i = 0;
  for(let y = start; y <= yMax + step * 0.001; y += step){
    fn({
      y,
      index: i,
      skipLabel: shouldSkipAxisTick(y),
      label: shouldSkipAxisTick(y) ? '' : fmtYear(y),
    });
    i++;
  }
}

global.LTDates = {
  NISAN_DAYS,
  isFiniteNum,
  isDisplayableYear,
  fmtYear,
  fmtRange,
  eventIsEstimated,
  personIsEstimated,
  eventDateEnds,
  fmtEventDateLine,
  shouldSkipAxisTick,
  forEachAxisTick,
  roundYear,
};
})(typeof window !== 'undefined' ? window : globalThis);
