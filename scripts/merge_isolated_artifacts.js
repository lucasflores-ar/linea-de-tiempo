/* Conserva los artefactos versionados y añade únicamente IDs autorizados. */
const fs = require('fs');
const cp = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const base = (file) => cp.execFileSync('git', ['show', `HEAD:${file}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const parseJs = (text) => JSON.parse(text.replace(/^[\s\S]*?window\.LT_DATA\s*=\s*/, '').replace(/;\s*$/, ''));
const readCurrent = (file) => parseJs(fs.readFileSync(path.join(root, file), 'utf8'));
const readBase = (file) => file.endsWith('.js') ? parseJs(base(file)) : JSON.parse(base(file));

const current = readCurrent('linea-tiempo-datos.js');
const stable = readBase('linea-tiempo-datos.js');
const added = current.eventos.filter((event) => event.id >= 440);
const stableIds = new Set(stable.eventos.map((event) => event.id));
if (added.some((event) => stableIds.has(event.id))) throw new Error('colisión de ID en artefactos');
stable.eventos = [...stable.eventos, ...added];
fs.writeFileSync(path.join(root, 'linea-tiempo-datos.js'), `window.LT_DATA = ${JSON.stringify(stable)};\n`, 'utf8');

const currentDetail = JSON.parse(fs.readFileSync(path.join(root, 'linea-tiempo-detalle.json'), 'utf8'));
const stableDetail = readBase('linea-tiempo-detalle.json');
const detailById = new Set((stableDetail.eventosDetail || []).map((event) => event.id));
const addedDetail = (currentDetail.eventosDetail || []).filter((event) => event.id >= 440);
if (addedDetail.some((event) => detailById.has(event.id))) throw new Error('colisión de ID en detalle');
stableDetail.eventosDetail = [...(stableDetail.eventosDetail || []), ...addedDetail];
fs.writeFileSync(path.join(root, 'linea-tiempo-detalle.json'), `${JSON.stringify(stableDetail)}\n`, 'utf8');
console.log(`OK — conservados ${stable.eventos.length - added.length} eventos estables; añadidos ${added.length} nuevos`);
