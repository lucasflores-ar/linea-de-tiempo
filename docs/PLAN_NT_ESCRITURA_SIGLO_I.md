# Plan de acción: Escritura del NT + sucesos del siglo I

**Fecha:** 2026-09-01  
**Objetivo:** Añadir a la línea de tiempo (1) el período en que se escribieron los libros del Nuevo Testamento —con inicio, fin y fade en fechas estimadas— y (2) los sucesos importantes del siglo I que aún no están cubiertos.

**Fuente principal prevista:** PDFs de los libros (publicaciones JW) para extraer fechas, rangos y contexto.

---

## 1. Resumen ejecutivo

| Área | Estado | Prioridad |
|------|--------|-----------|
| Ministerio de Jesús (29–33 E.C.) | ✅ Muy completo | Mantener |
| Hechos narrativos + viajes de Pablo | ✅ Bueno | Ampliar detalle menor |
| Cartas NT como **punto** único (año de redacción) | ⚠️ Parcial | Evolucionar a **barras de período** |
| Evangelios como **período de escritura** | ❌ No existe | Alta |
| Apocalipsis / Hechos como libro escrito | ⚠️ Punto o narrativa, no barra de escritura | Alta |
| Fechas estimadas con fade en escritura NT | ❌ No cableado | Alta |
| Sucesos post-ascensión (iglesia primitiva) | ⚠️ Huecos | Media–alta |
| Filas dedicadas “Libros del NT” en vista paralela | ❌ No existe | Media (tras datos) |

**Conclusión:** Tenemos una base sólida para el **contenido narrativo** del siglo I; lo que falta es una **capa de datos y UI para la escritura canónica del NT** (barras de duración + estimaciones) y **curar más sucesos** entre Pentecostés y fin de siglo.

---

## 2. Inventario: qué tenemos hoy

### 2.1 Datos compilados (`linea-tiempo-datos.js`)

| Recurso | Cantidad aprox. | Notas |
|---------|-----------------|-------|
| Sucesos totales | **311** | CSV curado + generados |
| Personajes | **93** | Barras de vida |
| Tema `SIGLO-PRIMERO` | **~81** | Narrativa de evangelios (ministerio, milagros, enseñanza) |
| Tema `HECHOS` | **~41** | Hechos narrativos + cartas NT + Apocalipsis |
| Sucesos `redacción/epístola` | **~22** | 21 cartas NT + 1 OT (`CANTAR`) |
| Personajes `grupo: Siglo primero` | **9** | Juan Bautista, Jesús, Pedro, Pablo, Esteban, Marcos, Felipe, Timoteo, Juan apóstol |

**Los temas `SIGLO-PRIMERO` y `HECHOS` no se solapan:** un suceso de Mateo con era `E.C.` va a SIGLO-PRIMERO; cartas y Hechos van a HECHOS (`scripts/gen_timeline.py` → `temas_de()`).

### 2.2 Personajes del siglo I (`scripts/gen_personajes.py`, sección S3)

| Personaje | Vida (aprox.) | Notas |
|-----------|---------------|-------|
| Juan el Bautista | −2 – 32 | |
| Jesús | −2 – 33 | |
| Pedro | −1 – 64 | |
| Pablo | 1 – 65 | |
| Esteban | 1 – 33 | mártir |
| Marcos | 5 – 65 | “escritor de evangelio” |
| Felipe el evangelizador | 1 – 60 | |
| Timoteo | 30 – 97 | |
| Juan apóstol | 1 – 100 | |

**Gap:** No hay filas para “Evangelio según Mateo”, “Carta a los Romanos”, etc. Solo personas.

### 2.3 Grupos curados (`curacion/grupos.json`)

| Grupo | Sucesos | Cobertura |
|-------|---------|-----------|
| `ministerio-jesus` | ~57 | Muy completo (J1–J4) |
| `ultima-semana-jesus` | 21 | Muy completo (B12) |
| `pasion-resurreccion` | 4 | Básico |
| `pablo-misionero` | 10 | Viajes + episodios clave |
| `difusion-cristianismo` | **1** (Pentecostés) | **Muy escaso** |

**Gap claro:** persecuciones, concilio de Jerusalén, muerte de Jacobo, expansión a gentiles, destrucción de Jerusalén (70), etc. están dispersos o ausentes como grupo narrativo.

### 2.4 Cartas y libros: generación actual

**Script:** `scripts/gen_hechos_libros.py`  
- Crea **un suceso por libro** que no tenga ningún hecho en `hechos_biblicos.csv` (ids ≥ 160).  
- Usa `scripts/periods.py` para fecha **puntual** (`fecha_anio` = año medio del bloque).  
- **No escribe** `fecha_fin` / `fecha_fin_texto`.  
- **No marca** `fecha_estimada` aunque el texto diga “c. 56 E.C.”.

**Cobertura por libro NT (27):**

| Libro | ¿Suceso de redacción? | ¿Rango inicio–fin? | Tema actual |
|-------|----------------------|-------------------|-------------|
| Mateo, Marcos, Lucas, Juan | ❌ (solo narrativa ministerio) | ❌ | SIGLO-PRIMERO |
| Hechos | ⚠️ Narrativa por capítulos | ❌ como “libro escrito” | HECHOS |
| Romanos … Judas (21 cartas) | ✅ Punto único | ❌ | HECHOS |
| Apocalipsis | ⚠️ Genérico o punto | ❌ | HECHOS |

**`periods.py` ya tiene fechas de redacción** para epístolas (líneas 153–175), pero:
- Son **un solo año** por libro (`fecha_anio`), no ventana de composición.
- Los evangelios en `periods.py` son **capítulos del ministerio**, no fechas de escritura.

### 2.5 Fechas estimadas (fade lateral)

| Capa | Campo CSV | Campo JS | UI |
|------|-----------|----------|-----|
| Personajes | `ini_est`, `fin_est` | `ie`, `fe` | ✅ `estBarBg()` en barras |
| Sucesos | `fecha_estimada` | `fest` | ✅ Marcadores; ⚠️ `evToRow` pone `ie=fe=fest` pero **sin rango** |
| Cartas NT generadas | — | — | ❌ Sin `fecha_estimada` |

**Gap crítico de UI:** `evToRow()` en `linea-paralela.js` fuerza `fin = inicio` (punto). El pipeline ya soporta `fa_fin` en JSON, pero **la vista paralela no lo usa**.

### 2.6 Vista paralela: filas disponibles

| Id fila | Modo | Contenido |
|---------|------|-----------|
| `sig` | personaje | 9 vidas del siglo I |
| `tsig` | tema | Sucesos SIGLO-PRIMERO |
| `hec` | tema | Sucesos HECHOS |
| `jes` | ministerio | Fases J1–J4 |
| `sem` | ultima_semana | Días de nisán |

**No hay** fila `NT-ESCRITURA` ni `Libros del NT`.

### 2.7 JSON JW (`curacion/jw_*.json`)

| Archivo | Útil para |
|---------|-----------|
| `jw_ministerio_jesus.json` | Ministerio (ya integrado) |
| `jw_ultima_semana.json` | Última semana (ya integrado) |
| `jw_viajes_pablo.json` | Viajes P1–P4 (ya integrado) |
| `jw_lineas_tiempo.json` | Láminas B2–B13 |

**No existe** `jw_escritura_nt.json` ni equivalente con ventanas de composición por libro.

---

## 3. Qué falta (gaps priorizados)

### A. Datos de escritura del NT (alta prioridad)

1. **Tabla de composición** por libro canónico (27 entradas):
   - `libro`, `autor_atribuido`, `inicio_anio`, `fin_anio`, `fecha_texto`, `fecha_fin_texto`
   - `ini_est`, `fin_est` (o `fecha_estimada` global) según precisión de la fuente
   - `lugar`, `nota`, `referencia` (p. ej. apéndice “Cuándo se escribieron las Escrituras”)
2. **Evangelios:** fechas de **redacción** distintas de fechas del **ministerio** (p. ej. Mateo c. 41–50, Marcos c. 60–65, etc. — según PDF).
3. **Hechos y Apocalipsis** como entradas de escritura, no solo narrativa.
4. **Separar** en el modelo:
   - sucesos **narrativos** (lo que pasó en la historia)
   - sucesos **de redacción** (cuándo se escribió el libro)

### B. Pipeline (alta prioridad)

1. Nuevo archivo fuente: `curacion/nt_escritura.json` (o CSV `nt_escritura.csv` en DATABASE).
2. Nuevo script: `scripts/gen_nt_escritura.py` (o extender `gen_hechos_libros.py`):
   - Emite/actualiza hechos con `tipo_suceso = redacción/evangelio | redacción/epístola | redacción`
   - Rellena `fecha_anio`, `fecha_fin`, `fecha_texto`, `fecha_fin_texto`, `fecha_estimada`
   - Tema nuevo propuesto: **`NT-ESCRITURA`** (ver §4)
3. Integrar en `scripts/run_pipeline.py` **antes** de `enrich.py` / `gen_timeline.py`.
4. Actualizar `temas_de()` en `gen_timeline.py` para el nuevo tema.

### C. UI / vista paralela (media prioridad, tras datos)

1. **`evToRow()`:** si `ev.fa_fin` existe, usar `fin = fa_fin` (barra de duración).
2. **Fade estimado:** `ie`/`fe` desde flags separados (`ini_est`/`fin_est` en CSV) o parseo de “c.” en texto.
3. **Nueva fila** en `LANE_FILTERS`:
   ```js
   { id:'ntesc', cron:36, mode:'tema', tema:'NT-ESCRITURA',
     label:'Escritura del NT', color:'var(--c-ec)' }
   ```
4. Opcional: fila `personaje` con `grupo: Libros del NT` si se prefiere paralelizar con Pablo/Juan.

### D. Sucesos del siglo I (media–alta prioridad)

**Ya cubierto bien:**
- Ministerio, última semana, pasión, viajes de Pablo, parte de Hechos.

**Candidatos a añadir o agrupar** (validar contra PDFs):

| Suceso / arco | Época aprox. | Estado |
|---------------|--------------|--------|
| Pentecostés | 33 | ✅ (grupo difusión) |
| Persecución bajo Herodes Agripa I | 44 | ⚠️ Verificar |
| Concilio de Jerusalén | 49 | ⚠️ Parcial en Hechos 15 |
| Muerte de Jacobo (hijo de Zebedeo) | 44 | ❓ |
| Primera estancia de Pablo en Corinto | 50–52 | ⚠️ En viajes |
| Incendio de Roma / persecución de Nerón | 64 | ❓ |
| Asedio y caída de Jerusalén | 70 | ❌ Importante para contexto |
| Destierro de Juan a Patmos | c. 96 | ⚠️ Ligado a Apocalipsis |
| Muerte de Pablo / Pedro | c. 64–65 | ⚠️ Solo en notas de personajes |

**Acción:** ampliar `difusion-cristianismo` o crear `iglesia-primitiva` en `grupos.json` con 15–25 sucesos ancla.

---

## 4. Diseño propuesto: dos capas en el siglo I

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA NARRATIVA (ya existe)                                  │
│  SIGLO-PRIMERO · HECHOS · ministerio · última semana         │
│  → qué pasó: milagros, viajes, Pentecostés, juicios…         │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│  CAPA ESCRITURA (nueva)                                      │
│  NT-ESCRITURA → barras: inicio composición ── fin composición │
│  → cuándo se escribió cada libro canónico                   │
└─────────────────────────────────────────────────────────────┘
```

**Ventaja:** no mezclar “Jesús enseña en el Sermón del Monte (31)” con “Mateo escribe su evangelio (c. 41–50)”.

**Tema `NT-ESCRITURA`:** asignar solo a hechos `tipo` que empiece por `redacción` y libro ∈ lista NT. Las cartas actuales en HECHOS pueden:
- **Opción A (recomendada):** migrar a NT-ESCRITURA y dejar HECHOS solo narrativo.
- **Opción B:** duplicar vista (mismo id, dos temas) — no recomendado.

---

## 5. Esquema de datos propuesto

### 5.1 `curacion/nt_escritura.json` (borrador)

```json
{
  "version": 1,
  "fuente": "Cuándo se escribieron las Escrituras Cristianas (PDF) + corroboración bíblica",
  "libros": [
    {
      "libro": "MATEO",
      "nombre": "Evangelio según Mateo",
      "autor": "Mateo",
      "inicio": 41,
      "fin": 50,
      "fecha_texto": "c. 41 E.C.",
      "fecha_fin_texto": "c. 50 E.C.",
      "ini_est": true,
      "fin_est": true,
      "lugar": "Palestina",
      "nota": "Fechas según [página del PDF]",
      "referencia": "Mateo 1:1"
    }
  ]
}
```

> **Importante:** Los años del ejemplo son ilustrativos. **Todas las fechas deben salir de tus PDFs**, no de este documento.

### 5.2 Columnas CSV (`hechos_biblicos.csv`)

Para cada hecho de escritura:

| Columna | Ejemplo |
|---------|---------|
| `tipo_suceso` | `redacción/evangelio` |
| `fecha_anio` | `41` |
| `fecha_fin` | `50` |
| `fecha_texto` | `c. 41 E.C.` |
| `fecha_fin_texto` | `c. 50 E.C.` |
| `fecha_estimada` | `1` si cualquier extremo es estimado |
| `libro` | `MATEO` |
| `personajes` | `Mateo` |

**Flags finos (opcional, fase 2):** `ini_est` / `fin_est` en CSV si el pipeline y la UI los soportan para sucesos (hoy solo personajes).

---

## 6. Plan de acción por fases

### Fase 0 — Preparación (1–2 sesiones)

- [ ] Reunir PDFs (libro por libro o apéndice cronológico común).
- [ ] Por cada uno de los **27 libros NT**, completar la **ficha de extracción** (§12).
- [ ] Listar **sucesos narrativos** del siglo I que quieras añadir (checklist §3.D).
- [ ] Auditar preguntas existentes por libro (`capitulo` / `referencia_biblica`) antes de proponer nuevas (§13.3).
- [ ] Volcar en borrador: `curacion/nt_escritura.json` (no tocar pipeline hasta revisión).

**Entregable:** 27 fichas completas + lista de huecos de preguntas (solo datos que el banco aún no cubre).

---

### Fase 1 — Datos de escritura (core)

- [ ] Crear `curacion/nt_escritura.json` desde las fichas validadas.
- [ ] Implementar `scripts/gen_nt_escritura.py`:
  - **Upsert** por `libro` + `tipo_suceso` redacción (reutilizar id existente, p. ej. Tito = **192**)
  - Rellenar `fecha_fin`, `fecha_estimada`, `ini_est`/`fin_est` en CSV
  - Ampliar `descripcion` con `datos_interesantes` resumidos (no duplicar párrafos enteros del PDF)
  - No duplicar narrativa de evangelios existente
- [ ] Ajustar `enrich.py`: preguntas de **redacción** → hecho escritura; preguntas **narrativas** del libro → hechos narrativos o `PERIODO` (§13.4)
- [ ] Añadir tema `NT-ESCRITURA` en `gen_timeline.py`.
- [ ] Registrar script en `run_pipeline.py`.
- [ ] Opcional: `scripts/add_nt_escritura_preguntas.py` solo para huecos detectados en §13.3.
- [ ] Ejecutar pipeline → verificar `linea-tiempo-datos.js`.

**Criterio de éxito:** 27 entradas con `fa` + `fa_fin`; Tito pasa de `c. 61` puntual a `c. 61–64` con fade; preguntas de metadata nuevas sin duplicar texto existente.

---

### Fase 2 — UI: barras de período + fade

- [ ] Actualizar `evToRow()` para usar `ev.fa_fin` cuando exista.
- [ ] Mapear `fest` / futuros `ini_est`/`fin_est` de sucesos a `ie`/`fe` en la barra.
- [ ] Añadir fila `ntesc` en `linea-paralela.js` (+ leyenda si hace falta).
- [ ] Probar en compacto y expandido; verificar que no rompe layout con `--tl-font-scale` 1.4.
- [ ] Actualizar `scripts/tests/test_par.js` (conteo mínimo de barras / nuevo filtro).

**Criterio de éxito:** “Evangelio según Mateo” se ve como barra 41–50 con fade si es estimado.

---

### Fase 3 — Sucesos del siglo I

- [ ] Auditar `hechos_biblicos.csv`: qué ids 133–159 cubren Hechos post-Pentecostés.
- [ ] Añadir sucesos faltantes (CSV manual o `merge_jw_slides.py` si hay lámina JW).
- [ ] Expandir `difusion-cristianismo` o crear `iglesia-primitiva` en `grupos.json`.
- [ ] Considerar suceso ancla **70 E.C.** (Jerusalén) si el PDF lo respalda.
- [ ] Re-enlazar preguntas en `enrich.py` donde existan en el banco.

**Criterio de éxito:** grupo narrativo post-33 con ≥15 sucesos; sin regresiones en filtros `hec` / `tsig`.

---

### Fase 4 — Pulido y documentación

- [ ] Actualizar `README.md` (conteos, nuevo tema, nuevo script).
- [ ] Fichas de personajes: notas cruzadas (Marcos ↔ Evangelio de Marcos, etc.).
- [ ] Export PNG: verificar que barras NT-ESCRITURA aparecen en `exportPng()`.
- [ ] Revisión de accesibilidad (nombres de barras, tooltips con rango completo).

---

## 7. Extracción desde tus PDFs (workflow sugerido)

> **Nota:** La guía detallada con plantilla, ejemplo Tito y reglas del banco de preguntas está en **§12 y §13**. Esta sección resume el flujo.

1. **Por libro NT:** usar la **ficha de extracción** (§12) — no solo fechas.
2. Completar `curacion/nt_escritura.json` (un objeto por libro canónico).
3. **Regla de estimación:** si el PDF dice “c.”, “aprox.”, “posiblemente”, “(?)” → marcar `ini_est` / `fin_est` / `lugar_incerto`.
4. **Evangelios:** no confundir fecha del **hecho narrado** con fecha de **redacción del evangelio**.
5. **Preguntas:** aplicar reglas de §13 — enriquecer hecho existente, no duplicar preguntas que ya cubren el mismo dato.
6. **Validación cruzada:** comparar con `periods.py` y hecho auto-generado (`gen_hechos_libros.py`); documentar discrepancias en `nota`.

---

## 8. Archivos del repo que tocarás

| Archivo | Rol |
|---------|-----|
| `curacion/nt_escritura.json` | **Nuevo** — ficha unificada por libro (§12) |
| `scripts/gen_nt_escritura.py` | **Nuevo** — upsert hechos redacción |
| `scripts/add_nt_escritura_preguntas.py` | **Nuevo** — solo huecos, con dedup |
| `scripts/enrich.py` | Mejorar enlace redacción vs narrativa |
| `scripts/run_pipeline.py` | Registrar paso |
| `scripts/gen_timeline.py` | Tema `NT-ESCRITURA` |
| `DATABASE_preguntas/hechos_biblicos.csv` | Sucesos escritura + narrativa siglo I |
| `curacion/grupos.json` | Grupos iglesia primitiva |
| `linea-paralela.js` | `evToRow`, fila `ntesc` |
| `linea-paralela.html` | Leyenda opcional |
| `scripts/tests/test_par.js` | Smoke test |

**No tocar en fase 1:** `periods.py` (sigue siendo fallback por capítulo); la escritura NT vive en JSON dedicado.

---

## 9. Riesgos y decisiones abiertas

| Tema | Opciones | Recomendación |
|------|----------|---------------|
| Cartas en HECHOS vs NT-ESCRITURA | Migrar tema / mantener dual | Migrar a NT-ESCRITURA |
| Hechos como libro | Solo narrativa vs barra de escritura | Ambos: narrativa en `hec`, escritura en `ntesc` |
| Autoría de Hebreos | Pablo vs anónimo | Seguir PDF; `personajes` flexible |
| Fecha única vs ventana | Punto vs barra mínima 1 año | Barra aunque sea 1 año si hay `fa_fin` |
| Destrucción de Jerusalén 70 | Suceso histórico en timeline bíblica | Sí, como contexto (tema HECHOS o nuevo) |

---

## 10. Checklist rápido para empezar mañana

1. Abrir PDF de **Tito** → completar ficha §12 (ya tienes casi todo en las capturas).
2. Repetir con **Romanos** y **Mateo** (carta + evangelio = dos tipos de fecha distintos).
3. Por libro: ejecutar auditoría de preguntas existentes (§13.3).
4. Marcar libros con **solo una fecha** vs **rango** (decidir barra mínima).
5. Cuando las 3 fichas piloto estén validadas → implementar Fase 1 en el pipeline.

---

## 12. Guía de extracción desde PDFs — qué recoger por libro

Cada libro del NT debe documentarse con **una ficha única** que alimenta **tres destinos**:

| Destino | Qué toma de la ficha |
|---------|----------------------|
| **Línea de tiempo** | Fechas inicio/fin, fade, barra de redacción |
| **Hecho en CSV** | `nombre`, `descripcion`, `personajes`, `referencia`, `lugar` |
| **Banco de preguntas** | Hechos atómicos convertibles en preguntas **solo si no existen ya** |

### 12.1 Campos obligatorios (timeline + hecho)

| Campo JSON | Origen típico en PDF | Uso |
|------------|----------------------|-----|
| `libro` | — | Clave canónica: `TITO`, `MATEO`, … |
| `nombre` | Título del libro | Barra en timeline: “Carta a Tito” |
| `escritor` | “Escritor:” | `personajes` en CSV (**autor primero**; ver §13.7) |
| `personajes` | Autor + destinatario(s) | `Pablo, Timoteo` — orden fijo para marcadores |
| `lugar_escritura` | “Dónde se escribió:” | `lugar_antiguo` |
| `lugar_incerto` | “(?)” en el PDF | `true` si hay duda |
| `inicio` / `fin` | “Cuándo se completó” o rango | `fecha_anio` / `fecha_fin` |
| `fecha_texto` / `fecha_fin_texto` | Texto literal del PDF | Etiquetas en UI |
| `ini_est` / `fin_est` | “c.”, “aprox.”, rangos amplios | Fade lateral en barra |
| `referencia` | Primera cita o intro | `referencia` en CSV |
| `fuente_pdf` | Título + página | Trazabilidad (no sale a UI) |

### 12.2 Campos de contexto (metadata rica)

| Campo JSON | Origen en PDF | Uso |
|------------|---------------|-----|
| `datos_interesantes` | Sección “Datos interesantes” | `descripcion` del hecho + drawer/tooltip |
| `proposito` | Por qué se escribió la carta/libro | Párrafo en `descripcion` o bullet en ficha |
| `contexto_historico` | Cuándo en la vida de Pablo / iglesia | Enlaza con sucesos narrativos existentes |
| `temas_clave` | Lista corta | Filtros futuros, fichas |
| `relacion_libros` | “Tiene mucho en común con 1 Timoteo…” | Enlaces cruzados (no duplicar texto) |
| `referencias_biblicas` | Citas en el PDF | Validar preguntas existentes; **no** copiar como preguntas nuevas si ya hay equivalente |
| `evidencia_manuscrita` | Muratori, P32, Codex… | Solo para preguntas nuevas tipo canonicidad / testimonio externo |
| `hecho_id_existente` | Auditoría pipeline | Si ya hay suceso auto-generado (Tito = **192**), reutilizar id |

### 12.3 Confianza y estimación (mismo criterio que personajes)

| Señal en PDF | Acción |
|--------------|--------|
| Fecha exacta sin “c.” | `ini_est: false`, `fin_est: false` |
| “c. 61–64 e.c.” | `ini_est: true`, `fin_est: true` |
| “Macedonia (?)” | `lugar_incerto: true`; lugar sigue siendo “Macedonia” |
| Solo “cuándo se completó” (un extremo) | `fin` = esa fecha; `inicio` = igual o inicio inferido del PDF |
| Rango de composición explícito | `inicio` y `fin` distintos → barra en timeline |

### 12.4 Ejemplo completo: Carta a Tito

Basado en el PDF (capturas de referencia):

```json
{
  "libro": "TITO",
  "nombre": "Carta a Tito",
  "hecho_id_existente": 192,
  "escritor": "Pablo",
  "lugar_escritura": "Macedonia",
  "lugar_incerto": true,
  "inicio": 61,
  "fin": 64,
  "fecha_texto": "c. 61 e.c.",
  "fecha_fin_texto": "c. 64 e.c.",
  "ini_est": true,
  "fin_est": true,
  "tipo_suceso": "redacción/epístola",
  "referencia": "Tito 1:1",
  "fuente_pdf": "Tito (libro bíblico), sección introductoria, p. ___",

  "proposito": "Instrucciones a Tito para cuidar las congregaciones en Creta y apoyarlo en su labor.",
  "contexto_historico": "Escrita probablemente entre el primer y el segundo encarcelamiento de Pablo en Roma; Pablo visitó Creta con Tito (Tit 1:5) y escribió desde Macedonia (cf. 1Ti 1:3).",
  "datos_interesantes": [
    "Tito debía nombrar ancianos y refutar judaizantes, fábulas judías y mandamientos de hombres (Tit 1:10-14; 3:9-11).",
    "Animaba a distintos grupos (jóvenes, mayores, hombres, mujeres, esclavos) a ser ejemplo de buenas obras (Tit 2:1-12).",
    "Carta pastoral junto con 1 Timoteo y 2 Timoteo; Pablo instruye a pastores de congregación.",
    "Testimonio externo: Fragmento Muratorio (s. II), Ireneo, Orígenes; manuscritos Sinaiticus y Alexandrinus; P32 (Tito 1:11-15; 2:3-8, c. 200 d.C., Manchester)."
  ],
  "relacion_libros": ["1 TIMOTEO", "2 TIMOTEO"],
  "referencias_biblicas": [
    "Tito 1:5", "1Ti 1:3", "Tit 1:10-14", "Tit 1:13", "Tit 3:9-11",
    "Tit 1:12", "Tit 3:2", "Tit 2:1-12", "1Ti 3:1-7", "Tit 1:6-9"
  ],

  "preguntas_sugeridas": [
    {
      "tema": "escritura",
      "pregunta": "¿Quién escribió la carta a Tito?",
      "respuesta": "Pablo",
      "referencia_biblica": "Tito 1:1",
      "prioridad": "baja",
      "motivo": "Probablemente ya cubierta en el banco"
    },
    {
      "tema": "escritura",
      "pregunta": "¿Durante qué período aproximado se completó la carta a Tito?",
      "respuesta": "c. 61-64 e.c.",
      "referencia_biblica": "Tito (introducción)",
      "prioridad": "alta",
      "motivo": "Hueco de metadata cronológica"
    },
    {
      "tema": "escritura",
      "pregunta": "¿Desde qué lugar escribió Pablo la carta a Tito?",
      "respuesta": "Macedonia",
      "referencia_biblica": "Tito 1:5; 1 Timoteo 1:3",
      "prioridad": "media",
      "motivo": "Verificar si ya existe pregunta equivalente"
    }
  ]
}
```

> Los años del ejemplo salen del PDF; el pipeline **no** debe hardcodearlos — solo leer `nt_escritura.json`.

### 12.5 Plantilla en blanco (copiar por libro)

```markdown
## [LIBRO CANÓNICO]

### Identificación
- libro:
- hecho_id_existente: (buscar en hechos_biblicos.csv o dejar null)
- nombre en timeline:

### Cronología de escritura
- escritor:
- lugar_escritura: / lugar_incerto: sí|no
- inicio: / fin:
- fecha_texto: / fecha_fin_texto:
- ini_est: / fin_est:
- fuente_pdf (título, página):

### Contenido (del PDF)
- proposito (1-2 frases):
- contexto_historico (1 párrafo):
- datos_interesantes (viñetas, 3-8):
- relacion_libros: []
- referencias_biblicas: []
- personajes en CSV: Autor, Destinatario (§13.7)

### Auditoría preguntas (rellenar antes de crear nuevas)
- preguntas en banco con este libro: ___
- ya cubren escritor/lugar/fecha: sí|no|parcial
- huecos detectados (lista):
```

---

## 13. Integración con el banco de preguntas

### 13.1 Cómo funciona hoy

```
preguntas_unificadas.csv
        │
        ▼ enrich.py (cascada: HECHO → PERIODO → PERSONAJE → TEXTO)
        ▼
preguntas_unificadas_enriquecidas.csv  ──► gen_timeline.py (nq por hecho)
        ▲
hechos_biblicos.csv ◄── gen_hechos_libros.py (1 suceso/libro sin hechos)
```

**Columnas de pregunta:** `id, pregunta, opcion_a…d, respuesta_correcta, categoria, dificultad, capitulo, personaje, referencia_biblica`  
**Columnas añadidas por enrich:** `hecho_id, hecho_nombre, fecha_suceso, fecha_anio, era_suceso, lugar_suceso, …, fuente_dato`

No hay hoy una columna `metadata_libro` separada: la metadata **viaja** vía el **hecho enlazado** y la **descripción** del suceso.

### 13.2 Estado actual — ejemplo Tito

| Recurso | Estado |
|---------|--------|
| Hecho redacción | id **192** — “Carta a Tito”, `c. 61–64 e.c.`, Macedonia `(?)`, fade estimado |
| `nt_escritura.json` | Piloto curado; descripción = 2 primeros bullets de `datos_interesantes` |
| Preguntas con “Tito” en texto | **~58** en `preguntas_unificadas.csv` |
| Enlazadas a hecho 192 | **~47** (muchas son **narrativas** del contenido de Tito, no de su escritura) |
| Marcador en fila Pablo | **No** (regla §13.7 — destinatario Tito) |
| Marcador en fila Tito (personaje) | Solo si existe barra de personaje “Tito” distinta del libro |
| Ficha personaje Tito | id 202 en `fichas_personajes` — distinto del **libro** |
| `enrich.py` | Pendiente: separar preguntas narrativas vs redacción en el mismo `libro` |

**Problema pendiente en enrich:** un solo hecho “redacción” absorbe preguntas narrativas del libro porque `enrich.py` hace match por `(libro=TITO, capítulo)` → hecho único. Los marcadores y el drawer ya no duplican autor/destinatario (§13.7).

### 13.3 Reglas: no duplicar, sí enriquecer

#### A. Hechos (CSV)

| Regla | Detalle |
|-------|---------|
| **Un hecho de redacción por libro** | Upsert por `libro` + `tipo_suceso` ∈ `redacción/*`; conservar `id` si existe (Tito → 192) |
| **No segundo hecho “Pablo escribe a Tito”** | Actualizar descripción y fechas del existente |
| **Narrativa ≠ redacción** | Preguntas sobre Tit 1:5, ancianos, Creta → hechos narrativos o `fuente_dato=PERIODO`, no el hecho 192 |
| **Evangelios** | Hecho redacción **nuevo**; no tocar decenas de hechos de ministerio |

#### B. Preguntas (CSV)

| Regla | Detalle |
|-------|---------|
| **Idempotencia** | Mismo patrón que `add_sem_preguntas.py`: `norm_q(pregunta)` — si ya existe, **no insertar** |
| **Enriquecer antes de crear** | Buscar en banco: `capitulo`, `referencia_biblica`, tokens de `pregunta` |
| **Solo huecos** | Crear preguntas nuevas para: fecha de composición, lugar de escritura, evidencia manuscrita, relación con otros libros — **si** no hay equivalente |
| **Categoría sugerida** | `ESCRITURA` o `CONTEXTO` para metadata; mantener `SUCESO`/`NOMBRE` para narrativa |
| **capitulo** | Usar etiqueta fija p. ej. `ESCRITURA · TITO` para preguntas de metadata (facilita auditoría) |
| **hecho_id explícito** | En script `add_nt_escritura_preguntas.py`, fijar `hecho_id` del suceso de redacción |

#### C. Flujo de decisión por dato del PDF

```
¿El dato es cronológico/geográfico de ESCRITURA?
  ├─ Sí → va a nt_escritura.json → hecho redacción (fechas, lugar, descripcion)
  └─ No → ¿es hecho narrativo del siglo I?
        ├─ Sí → hecho narrativo separado o grupo iglesia-primitiva
        └─ No → ¿es buen candidato a pregunta?
              ├─ ¿Ya existe pregunta similar? → marcar "cubierta", opcionalmente mejorar enriquecimiento
              └─ No existe → candidata en preguntas_sugeridas → add_nt_escritura_preguntas.py
```

### 13.4 Ajustes de pipeline

| Paso | Estado | Detalle |
|------|--------|---------|
| `gen_nt_escritura.py` | ✅ Piloto Tito | upsert hecho redacción + `fecha_fin` + `fecha_estimada` + descripción (2 bullets) |
| `gen_timeline.py` → `per` en preguntas | ✅ | Campo `personaje` exportado como `per` en `LT_DATA.preguntas` |
| Atribución marcadores (`linea-paralela.js`) | ✅ | §13.7 — `eventMarkerPeople()` |
| Drawer personaje filtrado | ✅ | §13.7 — `questionsForPerson()` |
| `enrich.py` redacción vs narrativa | ⏳ Pendiente | Preguntas de contenido bíblico no deben ir solo al hecho `redacción/*` |
| `add_nt_escritura_preguntas.py` | ⏳ Pendiente | Solo huecos con dedup |

### 13.5 Qué metadata del PDF suele ser pregunta vs solo contexto

| Dato (ej. Tito) | ¿Pregunta típica? | Acción |
|-----------------|-------------------|--------|
| Escritor: Pablo | A menudo sí | Auditar; crear solo si falta |
| Dónde: Macedonia (?) | Sí | Alta prioridad si no existe |
| Cuándo: c. 61–64 | Sí | Alta prioridad; alimenta timeline |
| Propósito (Creta, ancianos) | Parcial | Muchas ya en banco (Tit 1:5…) |
| Cartas pastorales / término “pastoral” | Sí | Media prioridad |
| Muratori, P32, Ireneo | Sí (nivel difícil) | Crear si quieres cobertura canónica |
| Problemas en Creta (detalle) | Sí | **Ya cubierto** — no duplicar |

### 13.6 Entregables de metadata unificada

| Archivo | Contenido |
|---------|-----------|
| `curacion/nt_escritura.json` | Fuente curada por libro (ficha §12) |
| `hechos_biblicos.csv` | Hechos redacción actualizados (27) + narrativa nueva |
| `preguntas_unificadas.csv` | Solo filas **nuevas** tras dedup |
| `preguntas_unificadas_enriquecidas.csv` | Regenerado; mejor `hecho_id` / fechas |
| `linea-tiempo-datos.js` | Timeline + `nq` actualizado |

### 13.7 Atribución de marcadores y drawer (sin duplicar autor / destinatario)

**Problema:** sucesos con `personajes: "Pablo, Timoteo"` (cartas pastorales) generaban el mismo marcador en **Pablo** y **Timoteo**, y el drawer de Pablo listaba todas las preguntas del hecho (p. ej. 69 de 1 Timoteo, muchas sobre Timoteo).

**Implementado en** `linea-paralela.js` (vista paralela, `?v=20260901h`).

#### Convención de datos (`personajes` en CSV / `per` en JSON)

| Tipo de suceso | Formato `personajes` | Quién lleva marcador |
|----------------|----------------------|----------------------|
| `redacción/epístola` (cartas) | `Autor, Destinatario` | **Solo destinatario(s)** — todo después de la primera coma |
| `redacción/epístola` (sin destinatario) | `Pablo` | El autor (único nombre) |
| `redacción/epístola` (varios destinatarios) | `Pablo, Filemón, Onésimo` | Filemón y Onésimo (no Pablo) |
| Narrativa (viajes, milagros…) | `Pablo, Silas, Timoteo` | **Todos** los listados |

Ejemplos reales tras la regla:

| Hecho | `per` | Marcador en Pablo | Marcador en Timoteo |
|-------|-------|-------------------|---------------------|
| Segundo viaje misionero (144) | Pablo, Silas, Timoteo | ✅ | ✅ |
| Pablo escribe 1 Timoteo (164) | Pablo, Timoteo | ❌ | ✅ |
| Pablo escribe 2 Timoteo (169) | Pablo, Timoteo | ❌ | ✅ |
| Carta a Tito (192) | Pablo, Tito | ❌ | ✅ (si hay fila personaje) |
| Pablo escribe a los Romanos (160) | Pablo | ✅ | ❌ |

**Al curar `nt_escritura.json` y `gen_hechos_libros.py`:** mantener siempre **autor primero, destinatario después**. No invertir el orden.

#### Funciones en código

| Función | Rol |
|---------|-----|
| `eventMarkerPeople(ev)` | Devuelve la lista de nombres que reciben marcador en la fila |
| `eventMatchesPerson(ev, pe)` | Usa `eventMarkerPeople` (no todo `ev.per`) |
| `questionMatchesPerson(q, pe, ev)` | Filtra preguntas del drawer por campo `per` (personaje del banco) |
| `questionsForPerson(pe, evs)` | Lista deduplicada de preguntas para el drawer del personaje |

#### Preguntas en el drawer del personaje

1. Si la pregunta tiene `personaje` en el CSV → debe coincidir con el personaje abierto (incluye `1 TIMOTEO` / `2 TIMOTEO` → **Timoteo**).
2. Si la pregunta **no** tiene `personaje` y el suceso es `redacción/*` → se atribuye al **destinatario** del hecho (misma regla que el marcador).
3. Si la pregunta no tiene `personaje` y el suceso es narrativo → se muestra en cualquier personaje vinculado al suceso.

**Nota:** al hacer clic en el **suceso** (marcador o barra de tema), el drawer del suceso sigue mostrando **todas** las preguntas con ese `hecho_id` — es el comportamiento correcto para estudiar el libro completo.

#### Caso excepcional futuro: `marcador_en`

Si un libro no encaja en “autor, destinatario” (p. ej. Hebreos, autor discutido), se puede añadir en `nt_escritura.json`:

```json
"marcador_en": ["Pablo"]
```

o `"marcador_en": ["ninguno"]` para mostrar solo en fila tema `NT-ESCRITURA`. **No implementado aún** — la convención de orden en `personajes` cubre las 21 cartas con destinatario claro.

#### Checklist al añadir un libro en `nt_escritura.json`

- [ ] `personajes`: `"Pablo, Destinatario"` (autor primero)
- [ ] Verificar que el marcador no aparece duplicado en la fila del autor
- [ ] Auditar preguntas del `hecho_id` por campo `personaje` antes de crear nuevas
- [ ] `capitulo` de preguntas de metadata: `ESCRITURA · ROMANOS` (opcional, para enrich futuro)

---

## 14. Referencias internas

- Pipeline: `scripts/run_pipeline.py`
- Generador cartas actual: `scripts/gen_hechos_libros.py`
- Patrón preguntas idempotentes: `scripts/add_sem_preguntas.py`
- Enriquecimiento preguntas: `scripts/enrich.py`
- Escritura NT curada: `curacion/nt_escritura.json` + `scripts/gen_nt_escritura.py`
- Marcadores / drawer sin duplicar: `linea-paralela.js` → `eventMarkerPeople()`, `questionsForPerson()`, `questionMatchesPerson()`
- Campo `per` en preguntas: `scripts/gen_timeline.py` (columna `personaje` del CSV)
- Fechas por capítulo (no escritura): `scripts/periods.py` líneas 85–175
- Personajes siglo I: `scripts/gen_personajes.py` líneas 156–165
- Fade UI personajes: `linea-paralela.js` → `estBarBg()`, `estBarClasses()`
- Temas: `scripts/gen_timeline.py` → `temas_de()`
- Filtros filas: `linea-paralela.js` → `LANE_FILTERS`, `THEME_LANE_META`

---

*Documento vivo: actualizar al cerrar cada fase con fechas reales del PDF y decisiones tomadas.*
