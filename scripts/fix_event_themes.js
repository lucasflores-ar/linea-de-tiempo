#!/usr/bin/env node
/**
 * Corrige temas de época mal asignados en linea-tiempo-datos.js.
 *
 * Motivo: gen_timeline.py derivaba el tema de época del *libro que narra* el
 * suceso (y de coincidencias por subcadena en los personajes), no de la era del
 * suceso. Eso metía sucesos del siglo I en el carril Profetas y sucesos del AT
 * en temas del NT.
 *
 * Es un parche quirúrgico e idempotente: reescribe solo el array "t" de los
 * sucesos listados, conservando el formato del archivo generado. La corrección
 * de fondo está en scripts/gen_timeline.py (temas_de).
 *
 * Uso:
 *   node scripts/fix_event_themes.js --check   (no escribe; sale 1 si falta aplicar)
 *   node scripts/fix_event_themes.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const DATOS = path.join(root, 'linea-tiempo-datos.js');
const checkOnly = process.argv.includes('--check');

/** id → temas correctos. Ver docs/mejora-exploracion/PASO8-EPOCAS.md */
const FIXES = [
  // --- Fugas visibles: sucesos del siglo I dibujados en el carril Profetas ---
  { id: 140, temas: ['SIGLO-PRIMERO'], porque: '36 E.C.; EXILIO/PROFETAS venían del libro Daniel (profecía de las 70 semanas), no de su época' },
  { id: 209, temas: ['SIGLO-PRIMERO'], porque: '29 E.C.; PROFETAS venía de "Natanael" activando la regla de "Natán"' },

  // --- Fugas visibles: sucesos del AT que no son proféticos, en el carril Profetas ---
  { id: 51, temas: ['REYES'], porque: 'amistad de David y Jonatán (1063 a.E.C.); PROFETAS venía de "Jonatán" activando la regla de "Natán"' },
  { id: 53, temas: ['REYES'], porque: 'muerte de Saúl (1077 a.E.C.); PROFETAS venía de "Jonatán" activando la regla de "Natán"' },
  { id: 372, temas: ['OTROS'], porque: 'contexto de potencia mundial (Grecia, 332 a.E.C.); PROFETAS/EXILIO venían del libro Daniel que lo profetiza' },
  { id: 357, temas: ['REYES'], porque: 'contexto de potencia mundial (Babilonia); GENESIS venía de la regla que manda a Proverbios al Génesis si la era no es MONARQUÍA' },

  // --- Huérfanos: sucesos del siglo I sin tema, invisibles en todo carril ---
  { id: 377, temas: ['NT-ESCRITURA', 'NT-EVANGELIOS'], porque: 'redacción de Evangelio (41 E.C.) quedó en OTROS' },
  { id: 379, temas: ['NT-ESCRITURA', 'NT-EVANGELIOS'], porque: 'redacción de Evangelio (62 E.C.) quedó en OTROS' },

  // --- Coherencia: sucesos del AT con tema del NT por el libro que los cita ---
  { id: 4,   temas: ['GENESIS'], porque: 'Enoc (3039 a.E.C.); HECHOS venía de que Hechos lo cita' },
  { id: 7,   temas: ['GENESIS'], porque: 'Abrahán (1943 a.E.C.); HECHOS venía de que Hechos lo cita' },
  { id: 47,  temas: ['PROFETAS', 'REYES'], porque: 'Samuel unge a Saúl (1117 a.E.C.); HECHOS venía de que Hechos lo cita' },
  { id: 383, temas: ['EXODO'], porque: 'fin de los 430 años (1513 a.E.C.); HECHOS venía de que Hechos lo cita' },
  { id: 159, temas: ['OTROS'], porque: 'contexto de potencia mundial (Roma, 30 a.E.C.); no es un suceso del NT' },
  { id: 375, temas: ['OTROS'], porque: 'contexto de potencia mundial (Roma, 63 a.E.C.); no es un suceso del NT' },
];

const raw = fs.readFileSync(DATOS, 'utf8');
const before = JSON.parse(raw.split('=').slice(1).join('=').trim().replace(/;\s*$/, ''));

function temasActuales(id){
  const ev = before.eventos.find(e => e.id === id);
  if (!ev) throw new Error('No existe el suceso id ' + id);
  return ev.t || [];
}

function mismosTemas(a, b){
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/** Reemplaza el array "t" del objeto que empieza en `"id": <id>,`. */
function reemplazarTemas(texto, id, temas){
  const ancla = new RegExp('\\{"id": ' + id + ', "n": ');
  const m = ancla.exec(texto);
  if (!m) throw new Error('No se encontró el objeto del suceso id ' + id);
  const desdeObjeto = m.index;
  const tIdx = texto.indexOf('"t": [', desdeObjeto);
  if (tIdx < 0) throw new Error('No se encontró "t" para el suceso id ' + id);
  const cierre = texto.indexOf(']', tIdx);
  if (cierre < 0) throw new Error('Array "t" sin cierre para el suceso id ' + id);
  // Seguridad: el array "t" debe estar dentro del mismo objeto que el ancla.
  const siguienteObjeto = texto.indexOf('{"id": ', desdeObjeto + 1);
  if (siguienteObjeto >= 0 && tIdx > siguienteObjeto) {
    throw new Error('El "t" hallado pertenece a otro suceso (id ' + id + ')');
  }
  const nuevo = '"t": [' + temas.map(t => JSON.stringify(t)).join(', ') + ']';
  return texto.slice(0, tIdx) + nuevo + texto.slice(cierre + 1);
}

let texto = raw;
const aplicados = [];
const yaOk = [];

for (const fix of FIXES) {
  const actual = temasActuales(fix.id);
  if (mismosTemas(actual, fix.temas)) {
    yaOk.push(fix.id);
    continue;
  }
  texto = reemplazarTemas(texto, fix.id, fix.temas);
  aplicados.push({ ...fix, antes: actual });
}

if (!aplicados.length) {
  console.log('Sin cambios: los ' + FIXES.length + ' sucesos ya tienen los temas correctos.');
  process.exit(0);
}

// Verificación: el resultado debe parsear y contener exactamente los temas pedidos.
const after = JSON.parse(texto.split('=').slice(1).join('=').trim().replace(/;\s*$/, ''));
if (after.eventos.length !== before.eventos.length) {
  throw new Error('El parche cambió la cantidad de sucesos; abortado.');
}
for (const fix of FIXES) {
  const ev = after.eventos.find(e => e.id === fix.id);
  if (!mismosTemas(ev.t || [], fix.temas)) {
    throw new Error('Verificación fallida para el suceso id ' + fix.id);
  }
}
const idsAntes = JSON.stringify(before.eventos.map(e => e.id));
const idsDespues = JSON.stringify(after.eventos.map(e => e.id));
if (idsAntes !== idsDespues) throw new Error('Cambió el orden/los ids de sucesos; abortado.');

console.log((checkOnly ? 'PENDIENTE' : 'APLICADO') + ' — ' + aplicados.length + ' suceso(s):');
for (const a of aplicados) {
  console.log('  id ' + a.id + ': ' + JSON.stringify(a.antes) + ' → ' + JSON.stringify(a.temas));
  console.log('     ' + a.porque);
}
if (yaOk.length) console.log('  (ya correctos: ' + yaOk.join(', ') + ')');

if (checkOnly) process.exit(1);

fs.writeFileSync(DATOS, texto, 'utf8');
console.log('\nEscrito ' + path.relative(root, DATOS));
