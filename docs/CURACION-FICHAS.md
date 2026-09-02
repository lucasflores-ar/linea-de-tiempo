# Curación manual de fichas de personajes

Las 151 fichas se generan con `gen_fichas.py` a partir de CSV, eventos y preguntas.
Doce campos narrativos **no se pueden inferir** de forma fiable y se completan a mano.

## Campos a curar

| Campo | Ejemplo |
|-------|---------|
| `genero` | `M` / `F` |
| `tribu` | `Judá`, `Leví`, `Benjamín` |
| `profesion` / `profesion_2` | Solo si falta la detección automática |
| `versiculo_clave` | `Hechos 13:22` |
| `opinion_jehova` | Resumen breve (no cita larga) |
| `opinion_ref` | Referencia de la opinión |
| `opinion_cita` | Cita textual corta (opcional) |
| `cualidades` | Lista separada por `;` |
| `cualidades_refs` | Referencias separadas por `;` |
| `defectos` | Lista separada por `;` (vacío si no aplica) |
| `defectos_refs` | Referencias separadas por `;` |
| `leccion` | Una frase aplicable hoy |

## Dónde editar

**No editar solo `fichas_personajes.csv`** — se pierde al volver a ejecutar `gen_fichas.py`.

Editar **`curacion/manual.json`**, clave = `nombre` exacto de la ficha (como en el CSV).

```json
{
  "version": 1,
  "entries": {
    "David": {
      "genero": "M",
      "tribu": "Judá",
      "versiculo_clave": "Hechos 13:22",
      "opinion_jehova": "Un hombre conforme al corazón de Jehová",
      "opinion_ref": "Hechos 13:22",
      "cualidades": "Valiente; leal; arrepentido; adorador",
      "cualidades_refs": "1 Samuel 17; Salmos",
      "defectos": "Adulto con Betsabé; ordenó la muerte de Urías",
      "defectos_refs": "2 Samuel 11",
      "leccion": "La fidelidad no elimina la necesidad de humildad y obediencia"
    }
  }
}
```

## Regenerar salidas

```powershell
cd J:\AI\WEB-opencode\hospedaje\linea-de-tiempo
python gen_fichas.py
```

Actualiza `fichas_personajes.csv` y `fichas-personajes.js`. La columna `fuente` incluye
`curacion_manual` cuando hay parche aplicado.

## Prioridad sugerida

1. Personajes con más preguntas vinculadas (`num_preguntas` alto).
2. Personajes con badge **⚠ por completar** en `fichas.html` (falta profesión, cualidades u opinión).
3. Reyes y profetas del AT con biografía en los XLSX de `DATABASE_preguntas/fichas/`.

## Estado

| Lote | Personajes | Estado |
|------|------------|--------|
| Piloto 1 | David, Abrahán, Moisés, José, Daniel, Job, Pablo, Pedro, Jesús, Juan el apóstol, Juan el Bautista, María | Hecho |
| Piloto 2 | Nehemías, Esteban, Zacarías, Eliás, Santiago, Jeremías, Timoteo, Josué, Ester, Jacob, Noé, Saúl, Salomón, Marcos, Felipe, Samuel, Nabucodonosor, Ezequiel, Jonás, Gedeón | Hecho |
| Piloto 3 | Adán, Eva, Enoc, Isaac, Rebeca, Sara, Lot, Caleb, Rahab, Rut, Eliseo, Esdras, Isaías, Bernabé, Sansón, Jefté, Jonatán, Ezequiás, Josiás, Ana, Cornelio, María Magdalena, Abigaíl, Judas | Hecho |
| Piloto 4 | Pilato, Tito, Jehoiadá, Naamán, Jezabel, Jeroboán, Sedequías, Caifás, Jehosafat, Asá, Herodes, Manasés, Natán, Aarón, Elí, Mardoqueo, Débora, Acab, Caín, Abel, Esaú, Melquisedec, Booz, Noemí, Andrés, Silas, Nicodemo, Lázaro, Faraón, Hamán, Barac, Jael | Hecho |
| Piloto 5 | 63 fichas restantes (100 % del catálogo) | **Hecho** |

Curación **completa**: 151/151 fichas. Regenerar con `python gen_fichas.py` tras editar `curacion/manual.json`.

Ver estadísticas tras regenerar:

```powershell
python -c "import csv; r=list(csv.DictReader(open('fichas_personajes.csv',encoding='utf-8-sig'))); m=['genero','cualidades','opinion_jehova']; print({k:sum(1 for x in r if x[k].strip()) for k in m})"
```
