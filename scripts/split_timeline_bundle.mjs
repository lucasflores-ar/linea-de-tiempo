#!/usr/bin/env node
/**
 * Divide linea-tiempo-datos.js en carga inicial (slim) + linea-tiempo-detalle.json
 *
 * PELIGRO: si se ejecuta sobre un paquete YA dividido (`_detailDeferred: true`),
 * sobrescribe el slim y vacía las preguntas del detalle. Por eso este script
 * se niega a correr en ese caso salvo `--force` (o LT_SPLIT_FORCE=1).
 *
 * Uso normal (paquete completo, con preguntas embebidas):
 *   node scripts/split_timeline_bundle.mjs
 *
 * Forzar (no recomendado sobre datos actuales):
 *   node scripts/split_timeline_bundle.mjs --force
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(__dirname, '..');
const DATOS = path.join(repo, 'linea-tiempo-datos.js');
const DETALLE = path.join(repo, 'linea-tiempo-detalle.json');

const force = process.argv.includes('--force') || process.env.LT_SPLIT_FORCE === '1';

const raw = fs.readFileSync(DATOS, 'utf8');
const data = JSON.parse(raw.split('=')[1].trim().replace(/;$/, ''));

if(data._detailDeferred && !force){
  console.error([
    'ABORTADO: linea-tiempo-datos.js ya tiene _detailDeferred: true.',
    'Volver a dividir destruiría el detalle (preguntas vacías en el slim).',
    'Si realmente necesitás forzar: node scripts/split_timeline_bundle.mjs --force',
    'Preferí regenerar el paquete completo con scripts/gen_timeline.py y luego dividir una sola vez.',
  ].join('\n'));
  process.exit(2);
}

const DETAIL_EVT_KEYS = ['d', 'ref', 'lug', 'lat', 'lon'];
const eventosDetail = data.eventos.map(e => {
  const row = { id: e.id };
  for (const k of DETAIL_EVT_KEYS) if (e[k] != null && e[k] !== '') row[k] = e[k];
  return row;
});

const slimEventos = data.eventos.map(e => {
  const o = { ...e };
  for (const k of DETAIL_EVT_KEYS) delete o[k];
  return o;
});

const slim = {
  ...data,
  eventos: slimEventos,
  preguntas: [],
  _detailDeferred: true,
};

const detail = { eventosDetail, preguntas: data.preguntas || [] };

const js = '/* GENERADO — carga inicial (sin preguntas ni descripciones largas) */\n'
  + 'window.LT_DATA = ' + JSON.stringify(slim) + ';\n';

fs.writeFileSync(DATOS, js, 'utf8');
fs.writeFileSync(DETALLE, JSON.stringify(detail), 'utf8');

const full = raw.length;
console.log('linea-tiempo-datos.js:', (js.length / 1024 / 1024).toFixed(2), 'MB (was', (full / 1024 / 1024).toFixed(2), 'MB)');
console.log('linea-tiempo-detalle.json:', (JSON.stringify(detail).length / 1024 / 1024).toFixed(2), 'MB');
console.log('eventos detail rows:', eventosDetail.length, '| preguntas:', detail.preguntas.length);
