# Paso 7 — Rendimiento, documentación y entrega

Fecha: 2026-09-07  
Rama: `codex/mejora-exploracion-timeline`  
Entrada principal: `linea-paralela.html` (+ `fichas.html`)

## Conteos reales

| Recurso | Cantidad |
|---|---|
| Sucesos (`linea-tiempo-datos.js`) | 433 |
| Personajes temporales | 99 |
| Fichas de personajes | 233 |
| Preguntas (detalle diferido) | 12 675 |
| `_detailDeferred` | true |

## Rendimiento (Node, sin DOM)

Entorno: ver `docs/mejora-exploracion/PASO7-PERF.json`.

| Escala | Eventos | Índices | Select 29–34 | Densificar | Search «david» |
|---|---:|---:|---:|---:|---:|
| 1× | 433 | ~0.1 ms | ~0.7 ms | ~0.5 ms | ~0.1 ms |
| 5× | 2 165 | ~0.5 ms | ~3.4 ms | ~2.4 ms | ~0.2 ms |
| 10× | 4 330 | ~0.8 ms | ~6.6 ms | ~11 ms | ~0.4 ms |

Cobertura de densidad OK en las tres escalas. **No se virtualizó la lista**: con
433 sucesos y agregados en Comparar, paginación accesible no fue necesaria.
Re-medir si el corpus supera ~5 000 sucesos visibles a la vez.

### Optimizaciones aplicadas

- Caché `_n` / `_nref` en índices.
- Delegación única de clic/teclado/hover en marcadores y eje (`ensureChartInteractionDelegation`).
- Lookups por `eventById` en lugar de `Array.find` en el hot path.

## Fuentes

Google Fonts (Libre Baskerville, Karla, Inter) se cargan de forma **no bloqueante**
(`media="print" onload`). Offline / fallo de red: Georgia y Segoe UI / system-ui.
Documentado en el README; la app no requiere CDN para funcionar.

## Pipeline

`scripts/split_timeline_bundle.mjs` **aborta** si el paquete ya tiene
`_detailDeferred: true` (exit 2), salvo `--force`. No ejecutar el splitter sobre
los archivos actuales del repo.

## Cómo validar

```powershell
python -m http.server 8000 --bind 127.0.0.1
# http://127.0.0.1:8000/linea-paralela.html
node scripts/run_tests.js
node scripts/bench_timeline_perf.js
```

## Limitaciones conocidas

- No hay suite e2e de navegador en CI (Playwright puede estar en `node_modules/`
  local no versionado; no es requisito del proyecto).
- `index.html` / vis-timeline siguen como legado; la UX auditada es `linea-paralela.html`.
- Fuentes tipográficas remotas siguen siendo una dependencia *opcional* online.
- No se midió UX con usuarios reales (criterio del §8 de la auditoría).

## Commits de la mejora (Pasos 1–7)

Ver historial de la rama `codex/mejora-exploracion-timeline`.
