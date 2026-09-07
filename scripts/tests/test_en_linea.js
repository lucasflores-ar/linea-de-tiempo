// «En línea» tiene que dejar el gráfico visible y el suceso enfocado (R8).
// Antes terminaba con el panel abierto y chart-wrap[inert], así que el usuario
// no veía el resultado de su propia acción; y buscaba [data-ev] sin contemplar
// que el suceso podía estar dentro de un agregado.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO = path.resolve(__dirname, '../..');
const JS = fs.readFileSync(path.join(REPO, 'linea-paralela.js'), 'utf-8');
const HTML = fs.readFileSync(path.join(REPO, 'linea-paralela.html'), 'utf-8');

const fails = [];
function ok(cond, msg){ if(!cond) fails.push(msg); }

const cuerpo = (nom)=> {
  const re = new RegExp('function ' + nom + '\\([^)]*\\)\\{[\\s\\S]*?\\n\\}');
  const m = JS.match(re);
  ok(!!m, 'no se encontró la función ' + nom);
  return m ? m[0] : '';
};

/* ── El andamiaje en el HTML ── */
ok(/id="chart-return"/.test(HTML), 'falta el control de regreso a la lista');
ok(/id="chart-live"[^>]*aria-live="polite"/.test(HTML),
  'falta la región aria-live que anuncia qué se reveló');
ok(/\.chart-return\{[^}]*position:fixed/.test(HTML),
  'el regreso debería flotar sobre el gráfico, no quedar dentro del scroller');
ok(/@media \(prefers-reduced-motion: reduce\)[\s\S]{0,200}--revelado[\s\S]{0,120}animation:none/.test(HTML)
  || /--revelado[\s\S]{0,400}prefers-reduced-motion[\s\S]{0,200}animation:none/.test(HTML),
  'el halo de revelado debería respetar prefers-reduced-motion');

/* ── El flujo ── */
const flujo = cuerpo('showEventOnChart');
ok(/setChartReturn\(o\.volverA\)/.test(flujo),
  'showEventOnChart debería guardar el regreso antes de cerrar el panel');
ok(/closeDrawer\(\)/.test(flujo),
  'showEventOnChart debería cerrar el panel: si no, tapa el resultado');
ok(/lastDrawerTrigger = null/.test(flujo),
  'el foco debe ir al control revelado, no volver al disparador del panel');
ok(/applyAppVista\('comparar'/.test(flujo),
  'showEventOnChart debería activar Comparar, que es la vista que dibuja filas');
ok(/applyFocusZoom/.test(flujo), 'showEventOnChart debería enfocar el rango');
ok(/cuandoLayoutQuieto/.test(flujo),
  'showEventOnChart debería esperar el layout definitivo antes de revelar');
/* El orden importa: guardar el regreso antes de cerrar, o se pierde. */
ok(flujo.indexOf('setChartReturn') < flujo.indexOf('closeDrawer'),
  'el regreso se guarda antes de cerrar el panel');

/* ── Esperar el layout definitivo ── */
ok(/let renderSeq = 0/.test(JS), 'falta el contador renderSeq');
ok(/renderSeq\+\+/.test(JS), 'render() debería incrementar renderSeq al terminar');
ok(JS.indexOf('let renderSeq = 0') < JS.indexOf('\nfunction render(){'),
  'renderSeq debe declararse antes de render() para no quedar en zona muerta');
const quieto = cuerpo('cuandoLayoutQuieto');
ok(/renderSeq !== ultimo/.test(quieto),
  'cuandoLayoutQuieto debería detectar renders nuevos, no contar frames a ciegas');
ok(/maxFrames/.test(quieto), 'cuandoLayoutQuieto necesita un techo para no esperar para siempre');

/* ── Localizar el control, incluso dentro de un agregado ── */
const ini = JS.indexOf('function controlDeSuceso');
const fin = JS.indexOf('function esperarFrames');
ok(ini >= 0 && fin > ini, 'no se encontró controlDeSuceso en linea-paralela.js');
if(ini >= 0 && fin > ini){
  const ctx = vm.createContext({});
  vm.runInContext(
    'let chartCanvas = null;\n' + JS.slice(ini, fin) +
    '\nthis.controlDeSuceso = controlDeSuceso;\n' +
    'this.setCanvas = (c)=>{ chartCanvas = c; };', ctx);

  /* Canvas de mentira: un agregado con 74 y 355, y un marcador propio 12. */
  const nodo = (attrs)=> ({ dataset: attrs });
  const canvas = {
    nodos: [nodo({ aggIds: '74,355' }), nodo({ aggIds: '175,755' }), nodo({ ev: '12' })],
    querySelector(sel){
      const m = /\[data-ev="(\d+)"\]/.exec(sel);
      return m ? this.nodos.find(n=> n.dataset.ev === m[1]) || null : null;
    },
    querySelectorAll(){ return this.nodos.filter(n=> n.dataset.aggIds); },
  };
  ctx.setCanvas(canvas);
  const find = ctx.controlDeSuceso;

  let r = find(12);
  ok(r && !r.agregado, 'un suceso con su propio marcador se localiza directo');

  r = find(355);
  ok(r && r.agregado === true, 'un suceso dentro de un agregado debería localizarse');
  ok(r && r.miembros === 2,
    'debería informar cuántos miembros tiene el agregado: ' + (r && r.miembros));

  /* El bug que se quiere evitar: un selector *="75" engancha 175 y 755. */
  ok(find(75) === null, 'el id 75 no existe y no debería confundirse con 175 ni con 755');
  ok(find(5) === null, 'el id 5 no debería engancharse con 355 ni con 755');
}

/* ── Los dos puntos que ofrecen «En línea» pasan el regreso ── */
ok(/onShowOnChart:[\s\S]{0,400}?volverA:[\s\S]{0,200}?level:/.test(JS),
  'la lista de un grupo debería pasar su propio nivel como regreso');
ok(/onShowOnChart:[\s\S]{0,300}?volverA:[\s\S]{0,120}?vista: 'explorar'/.test(JS),
  'Explorar debería pasar su vista como regreso');

/* ── Con un panel abierto, el regreso flotante se esconde ── */
const abrir = cuerpo('afterDrawerOpen');
ok(/setChartReturn\(null\)/.test(abrir),
  'al abrir un panel debería esconderse el regreso flotante');
ok(/hideTip\(\)/.test(abrir), 'al abrir un panel debería esconderse el tip flotante');

if(fails.length){
  console.error('FAIL scripts/tests/test_en_linea.js');
  fails.forEach(f=> console.error('  - ' + f));
  process.exit(1);
}
console.log('PASS scripts/tests/test_en_linea.js');
