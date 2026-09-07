#!/usr/bin/env node
/**
 * Audita la coherencia entre la era de cada suceso y los temas de época que
 * tiene asignados, y detecta sucesos que se dibujarían en un carril al que no
 * pertenecen. Solo lee; no modifica datos.
 *
 * Reutilizado por scripts/tests/test_epocas.js como fuente de las reglas.
 *
 * Uso: node scripts/audit_event_themes.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const AT_THEMES = [
  'GENESIS', 'EXODO', 'CONQUISTA', 'JUECES', 'REYES', 'PROFETAS', 'EXILIO',
  'RESTAURACION', 'AT-PROF-MAYORES', 'AT-PROF-MENORES', 'AT-HISTORICOS',
  'AT-POETICOS', 'AT-PENTATEUCO',
];
const NT_THEMES = ['SIGLO-PRIMERO', 'HECHOS'];
const AT_LANES = ['pre', 'postd', 'jue', 'uni', 'jud', 'isr', 'pro', 'babil', 'rest'];

function loadData(){
  const raw = fs.readFileSync(path.join(root, 'linea-tiempo-datos.js'), 'utf8');
  return JSON.parse(raw.split('=').slice(1).join('=').trim().replace(/;\s*$/, ''));
}

/** Lee LANE_THEME_SCOPE / LANE_YEAR_SCOPE del propio linea-paralela.js. */
function loadLaneScopes(){
  const src = fs.readFileSync(path.join(root, 'linea-paralela.js'), 'utf8');
  const grab = name => {
    const i = src.indexOf('const ' + name + ' = {');
    if (i < 0) throw new Error('No se encontró ' + name + ' en linea-paralela.js');
    const open = src.indexOf('{', i);
    let depth = 0;
    for (let k = open; k < src.length; k++) {
      if (src[k] === '{') depth++;
      else if (src[k] === '}') { depth--; if (!depth) return src.slice(open, k + 1); }
    }
    throw new Error(name + ' sin cierre');
  };
  // eslint-disable-next-line no-new-func
  return {
    themes: new Function('return ' + grab('LANE_THEME_SCOPE'))(),
    years: new Function('return ' + grab('LANE_YEAR_SCOPE'))(),
  };
}

const isEc = ev => String(ev.era || '').toUpperCase().startsWith('E.C');

/** Carriles de época en los que caería el suceso (tema + ventana de años). */
function lanesFor(ev, scopes){
  const y = ev.fa;
  if (y == null || ev.tipo === 'reinado') return [];
  return Object.keys(scopes.themes).filter(id => {
    const r = scopes.years[id];
    if (!r || y < r.min || y > r.max) return false;
    return (ev.t || []).some(t => scopes.themes[id].includes(t));
  });
}

/** Sucesos de la era común dibujados en un carril del Antiguo Testamento. */
function findLaneLeaks(data, scopes){
  return data.eventos
    .filter(isEc)
    .map(ev => ({ ev, lanes: lanesFor(ev, scopes).filter(id => AT_LANES.includes(id)) }))
    .filter(x => x.lanes.length);
}

/** Sucesos de la era común que no aparecerían en ningún carril. */
function findOrphans(data, scopes){
  return data.eventos.filter(ev => {
    if (!isEc(ev) || ev.tipo === 'reinado' || ev.tipo === 'contexto') return false;
    if ((ev.t || []).some(t => String(t).startsWith('NT-'))) return false;
    if (ev.fa != null && ev.fa >= 29 && ev.fa <= 33) return false; // carril Ministerio
    return !lanesFor(ev, scopes).length;
  });
}

/** Sucesos de la era común con un tema del Antiguo Testamento. */
function findEcWithAtThemes(data){
  return data.eventos.filter(ev => isEc(ev) && (ev.t || []).some(t => AT_THEMES.includes(t)));
}

/** Sucesos del Antiguo Testamento con un tema del siglo I. */
function findAtWithNtThemes(data){
  return data.eventos.filter(ev => !isEc(ev) && (ev.t || []).some(t => NT_THEMES.includes(t)));
}

module.exports = {
  loadData, loadLaneScopes, lanesFor, isEc,
  findLaneLeaks, findOrphans, findEcWithAtThemes, findAtWithNtThemes,
  AT_THEMES, NT_THEMES, AT_LANES,
};

if (require.main === module) {
  const data = loadData();
  const scopes = loadLaneScopes();
  const line = ev => [
    'id ' + String(ev.id).padStart(4),
    String(ev.fa).padStart(6),
    String(ev.era || '').padEnd(14),
    JSON.stringify(ev.t || []),
    String(ev.n || '').slice(0, 55),
  ].join(' | ');

  console.log('Sucesos totales:', data.eventos.length);
  console.log('Ventana del carril Profetas:', JSON.stringify(scopes.years.pro));

  const leaks = findLaneLeaks(data, scopes);
  console.log('\n=== Era común dibujada en carriles del AT: ' + leaks.length);
  leaks.forEach(x => console.log(line(x.ev) + ' → carriles: ' + x.lanes.join(',')));

  const ecAt = findEcWithAtThemes(data);
  console.log('\n=== Era común con temas del AT: ' + ecAt.length);
  ecAt.forEach(ev => console.log(line(ev)));

  const atNt = findAtWithNtThemes(data);
  console.log('\n=== Antiguo Testamento con temas del siglo I: ' + atNt.length);
  atNt.forEach(ev => console.log(line(ev)));

  const orphans = findOrphans(data, scopes);
  console.log('\n=== Era común sin ningún carril: ' + orphans.length);
  orphans.forEach(ev => console.log(line(ev)));
}
