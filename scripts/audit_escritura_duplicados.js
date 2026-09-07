#!/usr/bin/env node
/**
 * Detecta sucesos de escritura/redacción que describen el mismo libro bíblico
 * (duplicados) y descripciones que no corresponden al libro del título.
 * Solo lee; no modifica datos.
 *
 * Uso: node scripts/audit_escritura_duplicados.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(
  fs.readFileSync(path.join(root, 'linea-tiempo-datos.js'), 'utf8')
    .split('=').slice(1).join('=').trim().replace(/;\s*$/, '')
);
const detalle = JSON.parse(fs.readFileSync(path.join(root, 'linea-tiempo-detalle.json'), 'utf8'));
const detById = new Map((detalle.eventosDetail || []).map(d => [d.id, d]));

const sinAcentos = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();

/**
 * Libro cuya redacción describe el título, tomado solo de los patrones que
 * nombran al libro redactado. Evita contar el libro de una cita ("los 450 años
 * de Hechos 13:17-20") o al escritor ("Lucas completa el libro de Hechos").
 */
function libroRedactado(nombre){
  const n = String(nombre || '');
  const patrones = [
    /Evangelio según ([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)/,
    /Evangelio llamado '([^']+)'/,
    /completa el libro de ([A-ZÁÉÍÓÚÑ][\wáéíóúñ]*)/,
    /escribe el libro de ([A-ZÁÉÍÓÚÑ][\wáéíóúñ]*)/,
    /completa el libro ([A-ZÁÉÍÓÚÑ][\wáéíóúñ]*)/,
    /escribe ([A-ZÁÉÍÓÚÑ][\wáéíóúñ]*)$/,
  ];
  for (const re of patrones) {
    const m = re.exec(n);
    if (m) return sinAcentos(m[1]);
  }
  return null;
}

/** Rasgos que identifican de qué evangelio habla una descripción. */
const HUELLAS = {
  MATEO: [/para los jud[ií]os/i, /genealog[ií]a desde Abrah[aá]n/i, /Escrituras Hebreas/i],
  MARCOS: [/lectores romanos/i, /t[eé]rminos latinos/i, /m[aá]s breve/i],
  LUCAS: [/t[eé]rminos m[eé]dicos/i, /m[eé]dico/i, /m[aá]s largo/i],
  JUAN: [/la Palabra/i, /suplementaria/i],
};

function libroSegunDescripcion(d){
  const texto = String((d && d.d) || '');
  if (texto.length < 60) return null; // el título repetido no es una descripción
  const puntajes = Object.entries(HUELLAS)
    .map(([li, res]) => [li, res.filter(re => re.test(texto)).length])
    .filter(([, p]) => p > 0)
    .sort((a, b) => b[1] - a[1]);
  return puntajes.length ? puntajes[0][0] : null;
}

const escritura = data.eventos
  .map(ev => ({ ev, libro: libroRedactado(ev.n) }))
  .filter(x => x.libro);

console.log('Sucesos de redacción con libro identificado:', escritura.length, '\n');

function describe(ev){
  const d = detById.get(ev.id) || {};
  const serie = ev.jw ? 'jw=' + ev.jw : 'sin jw';
  const rica = String(d.d || '').length > 60 && d.d !== ev.n;
  return [
    '   id ' + String(ev.id).padStart(4) + ' | ' + String(ev.ft || ev.fa).padEnd(14) +
      ' | ' + serie.padEnd(8) + ' | preguntas: ' + String(ev.nq ?? 0).padStart(3) +
      ' | lugar: ' + (d.lug || '-'),
    '        título: ' + ev.n,
    '        ref: ' + (d.ref || '-') + ' | descripción: ' + (rica ? 'perfil propio' : 'repite el título'),
  ].join('\n');
}

const porLibro = new Map();
for (const { ev, libro } of escritura) {
  if (!porLibro.has(libro)) porLibro.set(libro, []);
  porLibro.get(libro).push(ev);
}

const dups = [...porLibro.entries()].filter(([, evs]) => evs.length > 1);
console.log('=== Libros con más de un suceso de redacción: ' + dups.length + ' ===\n');
for (const [li, evs] of dups.sort((a, b) => a[0].localeCompare(b[0]))) {
  console.log('## ' + li);
  evs.sort((a, b) => (a.fa ?? 0) - (b.fa ?? 0)).forEach(ev => console.log(describe(ev)));
  console.log('');
}

console.log('=== Descripciones que no corresponden al libro del título ===\n');
let cruzadas = 0;
for (const { ev, libro } of escritura) {
  const segunD = libroSegunDescripcion(detById.get(ev.id));
  if (!segunD || segunD === libro) continue;
  cruzadas++;
  console.log('## título dice ' + libro + ', descripción describe ' + segunD);
  console.log(describe(ev));
  console.log('        texto: ' + String(detById.get(ev.id).d).replace(/\n+/g, ' ').slice(0, 160) + '…\n');
}
if (!cruzadas) console.log('(ninguna)\n');

console.log('=== Libros con un solo suceso de redacción: ' +
  [...porLibro.entries()].filter(([, e]) => e.length === 1).length + ' ===');
console.log([...porLibro.entries()].filter(([, e]) => e.length === 1).map(([li]) => li).sort().join(', '));
