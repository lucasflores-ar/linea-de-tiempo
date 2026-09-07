#!/usr/bin/env node
/**
 * Mueve el perfil del Evangelio de Mateo del suceso equivocado al correcto.
 *
 * El suceso 194 se titula "Lucas escribe el Evangelio llamado 'Lucas'" pero su
 * descripción y su lugar de escritura son los de Mateo (audiencia judía,
 * genealogía desde Abrahán, 42 % de contenido exclusivo, Palestina). El perfil
 * real de Lucas está en el suceso 196 (Cesarea, términos médicos, el más largo).
 * El suceso 377, que sí es el de Mateo, no tenía descripción propia.
 *
 * Parche quirúrgico e idempotente: reescribe solo los dos objetos afectados de
 * linea-tiempo-detalle.json, conservando el formato del archivo generado. El
 * dato de origen está en hechos_biblicos.csv de la base externa; ver
 * docs/mejora-exploracion/PASO8-EPOCAS.md.
 *
 * Uso:
 *   node scripts/fix_mateo_perfil.js --check
 *   node scripts/fix_mateo_perfil.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const DETALLE = path.join(root, 'linea-tiempo-detalle.json');
const checkOnly = process.argv.includes('--check');

const ID_LUCAS = 194;
const ID_MATEO = 377;
const TITULO_194 = "Lucas escribe el Evangelio llamado 'Lucas'";
const HUELLA_MATEO = /genealog[ií]a desde Abrah[aá]n/;

const raw = fs.readFileSync(DETALLE, 'utf8');
const antes = JSON.parse(raw);
const detOf = doc => id => (doc.eventosDetail || []).find(e => e.id === id);

const lucas = detOf(antes)(ID_LUCAS);
const mateo = detOf(antes)(ID_MATEO);
if (!lucas) throw new Error('No existe el detalle del suceso ' + ID_LUCAS);
if (!mateo) throw new Error('No existe el detalle del suceso ' + ID_MATEO);

if (HUELLA_MATEO.test(String(mateo.d || '')) && !HUELLA_MATEO.test(String(lucas.d || ''))) {
  console.log('Sin cambios: el perfil de Mateo ya está en el suceso ' + ID_MATEO + '.');
  process.exit(0);
}
if (!HUELLA_MATEO.test(String(lucas.d || ''))) {
  throw new Error('El suceso ' + ID_LUCAS + ' no contiene el perfil de Mateo; revisar a mano.');
}

/** Serializa como json.dumps de Python, que es lo que generó el archivo. */
function dumps(obj){
  return '{' + Object.entries(obj)
    .map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v))
    .join(', ') + '}';
}

/** Devuelve [inicio, fin) del objeto que empieza en `{"id": <id>,`. */
function rangoObjeto(texto, id){
  const m = new RegExp('\\{"id": ' + id + '[,}]').exec(texto);
  if (!m) throw new Error('No se encontró el objeto del suceso ' + id);
  let depth = 0;
  for (let k = m.index; k < texto.length; k++) {
    if (texto[k] === '{') depth++;
    else if (texto[k] === '}') { depth--; if (!depth) return [m.index, k + 1]; }
    else if (texto[k] === '"') { // saltar cadenas para no contar llaves internas
      k++;
      while (k < texto.length && texto[k] !== '"') { if (texto[k] === '\\') k++; k++; }
    }
  }
  throw new Error('Objeto del suceso ' + id + ' sin cierre');
}

/** Reemplaza en el texto el objeto de `id` por `obj`. */
function reemplazar(texto, id, obj){
  const [ini, fin] = rangoObjeto(texto, id);
  return texto.slice(0, ini) + dumps(obj) + texto.slice(fin);
}

const perfil = lucas.d;
const lugar = lucas.lug;

/* Mateo hereda el perfil; Lucas queda como los demás de su serie (título por
   descripción) y sin lugar, porque "Palestina" era el de Mateo. */
const nuevoMateo = { ...mateo, d: perfil };
if (lugar) nuevoMateo.lug = lugar;
const nuevoLucas = { ...lucas, d: TITULO_194 };
delete nuevoLucas.lug;

console.log((checkOnly ? 'PENDIENTE' : 'APLICADO') + ':');
console.log('  suceso ' + ID_MATEO + " — Mateo escribe el Evangelio llamado 'Mateo'");
console.log('      descripción: "' + String(mateo.d).slice(0, 46) + '…"');
console.log('                →  "' + String(perfil).replace(/\n+/g, ' ').slice(0, 46) + '…"');
console.log('      lugar: ' + JSON.stringify(mateo.lug ?? null) + ' → ' + JSON.stringify(nuevoMateo.lug ?? null));
console.log('  suceso ' + ID_LUCAS + ' — Lucas escribe el Evangelio (serie con código JW B10)');
console.log('      descripción: pasa a repetir su título, como los demás de esa serie');
console.log('      lugar: ' + JSON.stringify(lugar ?? null) + ' → null');
console.log('      (el lugar de Lucas es Cesarea, ya registrado en el suceso 196)');

if (checkOnly) process.exit(1);

let texto = reemplazar(raw, ID_MATEO, nuevoMateo);
texto = reemplazar(texto, ID_LUCAS, nuevoLucas);

/* Verificación: solo deben haber cambiado esos dos sucesos. */
const despues = JSON.parse(texto);
if ((despues.eventosDetail || []).length !== (antes.eventosDetail || []).length) {
  throw new Error('Cambió la cantidad de detalles; abortado.');
}
if (JSON.stringify(despues.preguntas) !== JSON.stringify(antes.preguntas)) {
  throw new Error('Cambiaron las preguntas; abortado.');
}
for (let i = 0; i < antes.eventosDetail.length; i++) {
  const a = antes.eventosDetail[i], b = despues.eventosDetail[i];
  if (a.id !== b.id) throw new Error('Cambió el orden de los detalles; abortado.');
  if (a.id === ID_LUCAS || a.id === ID_MATEO) continue;
  if (JSON.stringify(a) !== JSON.stringify(b)) {
    throw new Error('Cambió el suceso ' + a.id + ', que no estaba en el parche; abortado.');
  }
}
const conPerfil = despues.eventosDetail.filter(e => HUELLA_MATEO.test(String(e.d || ''))).map(e => e.id);
if (conPerfil.length !== 1 || conPerfil[0] !== ID_MATEO) {
  throw new Error('El perfil de Mateo quedó en ' + JSON.stringify(conPerfil) + '; abortado.');
}

fs.writeFileSync(DETALLE, texto, 'utf8');
console.log('\nEscrito ' + path.relative(root, DETALLE));
