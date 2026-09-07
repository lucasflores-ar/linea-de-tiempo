#!/usr/bin/env node
/**
 * Regresión de merge_libros_biblia.py.
 *
 * El merge fusiona una tabla de los libros de la Biblia contra la base externa
 * hechos_biblicos.csv. Confiaba en los `match_id` del catálogo sin verificar
 * nada, y esos ids están corridos: convertía «Nace Jesús en Belén» en
 * «Evangelio según Marcos completado» y «Sana a un paralítico» en «Éxodo
 * completado». Además filtraba ORPHAN_IDS antes de guardar, así que una corrida
 * sin --check borraba 20 sucesos reales del CSV en silencio.
 *
 * Lo que se fija acá:
 *   1. el guard existe y exige las dos condiciones (redacción + mismo libro)
 *   2. correr el merge no cambia nada: el pipeline converge
 *   3. por defecto no borra filas ni inventa filas nuevas
 *   4. ninguna clave de libro queda duplicada en etiqueta_jw
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..', '..');
const MERGE = path.join(root, 'scripts', 'merge_libros_biblia.py');

let fallos = 0;
function ok(cond, msg){
  if(cond) console.log('ok  ' + msg);
  else { console.log('ERROR: ' + msg); fallos++; }
}

// ------------------------------------------------------------------ 1. wiring
const src = fs.readFileSync(MERGE, 'utf8');

ok(/def destino_valido\(row, book\)/.test(src),
   'existe destino_valido(), el guard de la fila destino');
ok(/startswith\('redacc'\)/.test(src),
   'el guard exige que la fila destino sea un suceso de redacción');
ok(/es redacción pero de otro libro/.test(src),
   'el guard además exige que la fila hable del mismo libro');
ok(/def find_primary\(rows, book, by_id, claimed, rechazos=None\)/.test(src),
   'find_primary acepta y reporta los rechazos');

// El orden importa: una fila ya etiquetada le gana a un match_id corrido. Con
// el orden inverso el libro lucas_evangelio se iba al 196 y le escribía la
// etiqueta que la 194 ya tenía, y el deduplicador se comía la fila curada.
const posEtiqueta = src.indexOf("return r, 'etiqueta_jw'");
const posMatchId = src.indexOf("return row, 'match_id'");
ok(posEtiqueta > 0 && posMatchId > 0 && posEtiqueta < posMatchId,
   'find_primary busca por etiqueta canónica antes que por match_id');

ok(/duenio_etiqueta/.test(src) && /apply_book\(primary, book, duenio_etiqueta\)/.test(src),
   'apply_book no escribe una etiqueta que otra fila ya tiene');

// Nada de borrar ni crear sin pedirlo.
ok(/if borrar_huerfanos:\s*\n\s*rows = \[r for r in rows if r\.get\('id'\) not in ORPHAN_IDS\]/.test(src),
   'ORPHAN_IDS solo se borra con --borrar-huerfanos');
ok(/if not crear_faltantes:/.test(src),
   'las filas faltantes solo se crean con --crear-faltantes');

// El CSV manda para nombre y referencia; la tabla solo rellena vacíos.
ok(/if valor and not \(row\.get\(campo\) or ''\)\.strip\(\):/.test(src),
   'nombre/referencia/era/personajes solo se rellenan si están vacíos');
ok(/if curada and campo == 'referencia':/.test(src),
   'la referencia de las filas curadas no se toca (Mateo 377 va vacía)');
ok(/ya_tiene_fecha = bool\(\(row\.get\('fecha_anio'\) or ''\)\.strip\(\)\)/.test(src),
   'las fechas curadas del CSV no se pisan');

// lugar_antiguo es la excepción: manda la tabla, salvo que el CSV sea más específico.
ok(/if lugar and _norm\(lugar\) not in _norm\(actual\):/.test(src),
   'lugar_antiguo respeta el valor del CSV cuando ya es más específico');

// ------------------------------------------------- 2/3. el merge ya convergió
const r = spawnSync('python', [MERGE, '--check'], {
  cwd: root, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
});
const salida = (r.stdout || '') + (r.stderr || '');

if(r.error || !/\[check\]/.test(salida)){
  console.log('SKIP  no pude correr el --check (¿python o base externa ausente?)');
} else {
  const m = salida.match(
    /(\d+) cambio\(s\), (\d+) nuevo\(s\), (\d+) a eliminar, (\d+) sin destino válido, (\d+) sin fila/);
  ok(!!m, 'el --check reporta el resumen completo, con rechazos y faltantes');
  if(m){
    ok(m[1] === '0', 'correr el merge no cambiaría nada: converge (cambios=' + m[1] + ')');
    ok(m[2] === '0', 'no crearía filas nuevas (nuevos=' + m[2] + ')');
    ok(m[3] === '0', 'no eliminaría filas (a eliminar=' + m[3] + ')');
    // Los 8 rechazos son match_id corridos que quedan pendientes de arreglar a
    // mano; lo que importa es que se reporten y no que se apliquen.
    ok(Number(m[4]) > 0,
       'sigue reportando los match_id corridos en vez de aplicarlos (' + m[4] + ')');
  }
  ok(/ORPHAN_IDS: \d+ fila\(s\) que existen y hoy NO se borran/.test(salida),
     'el --check avisa de las filas de ORPHAN_IDS que sobreviven');
  ok(!/Nace Jesús en Belén/.test(salida) && !/Sana a un paralítico/.test(salida),
     'ya no propone pisar sucesos de la vida de Jesús');
}

// -------------------------------------- 4. sin claves de libro duplicadas
const catPath = path.join(root, 'curacion', 'libros_biblia.json');
if(fs.existsSync(catPath)){
  const claves = new Set(
    (JSON.parse(fs.readFileSync(catPath, 'utf8')).libros || []).map(b => b.clave));
  const rd = spawnSync('python', ['-c',
    "import csv,io,sys;sys.path.insert(0,'scripts');from paths import db;" +
    "print('\\n'.join((r.get('etiqueta_jw') or '').strip() for r in " +
    "csv.DictReader(io.StringIO(open(db('hechos_biblicos.csv'),encoding='utf-8-sig').read(),newline=''))))",
  ], { cwd: root, encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });

  if(rd.status === 0){
    const cuenta = new Map();
    for(const e of (rd.stdout || '').split(/\r?\n/)){
      if(e && claves.has(e)) cuenta.set(e, (cuenta.get(e) || 0) + 1);
    }
    const dup = [...cuenta].filter(([, n]) => n > 1);
    ok(dup.length === 0,
       'ninguna clave de libro se repite en etiqueta_jw' +
       (dup.length ? ' (repetidas: ' + dup.map(([k, n]) => k + '×' + n).join(', ') + ')' : ''));
  } else {
    console.log('SKIP  no pude leer etiqueta_jw de la base externa');
  }
}

if(fallos){
  console.log('\n' + fallos + ' fallo(s)');
  process.exit(1);
}
console.log('\ntest_merge_libros OK');
