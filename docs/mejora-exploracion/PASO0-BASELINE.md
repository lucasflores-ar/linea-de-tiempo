# Paso 0 — Baseline (7 sep 2026)

Rama: `codex/mejora-exploracion-timeline`  
Servidor local: `http://127.0.0.1:8000/linea-paralela.html`  
Casos: `#filas=sem`, `#filas=jes`, `#filas=nt-car`, `#filas=jud,isr,pro`

## Pruebas (antes de Paso 1)

- `node scripts/tests/test_par.js` → PASS
- `node scripts/tests/test_vis.js` → PASS (skip redirect)
- `node scripts/tests/test_fichas.js` → PASS

No se regeneraron datos ni se ejecutó `split_timeline_bundle.mjs`.
