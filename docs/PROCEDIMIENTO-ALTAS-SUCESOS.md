# Procedimiento seguro para agregar sucesos

Este procedimiento existe para que una alta de contenido no regenere ni
modifique datos históricos que no forman parte de la solicitud.

## Regla principal

No ejecutar `scripts/run_pipeline.py` para una adición puntual. Ese pipeline
lee la base externa completa y puede traer cambios ajenos en sucesos, libros,
fichas, grupos, preguntas y rangos históricos.

## Flujo recomendado

1. Crear una rama de trabajo y registrar el commit base.
2. Añadir los registros a un archivo curado versionado, por ejemplo
   `curacion/altas-sucesos.tsv`, con estas columnas:

   `clave`, `prefijo`, `anio`, `nombre`, `referencia`, `era`, `tipo`,
   `personajes`, `match_id`.

3. Antes de fusionar, comprobar:

   - que cada `clave` sea nueva o tenga un `match_id` explícito;
   - que ningún `match_id` apunte a un suceso distinto;
   - que `era`, `tipo` y fecha pertenezcan al vocabulario controlado;
   - que los sucesos estén en el carril esperado (`SIGLO-PRIMERO`, `HECHOS`,
     u otro) y no aparezcan en carriles incompatibles;
   - que referencias, nombres y fechas no dupliquen un registro existente.

4. Trabajar contra una copia congelada de la base de datos, nunca contra la
   base externa viva. Guardar un hash o copia de esa entrada para poder
   reproducir el resultado.
5. Ejecutar un importador acotado que solo pueda:

   - crear los nuevos IDs;
   - completar los campos de esos nuevos IDs;
   - crear sus preguntas asociadas;
   - actualizar el sello de caché.

   El importador debe abortar si detecta cualquier diferencia en un ID que no
   esté en la lista explícita de la solicitud.

6. Regenerar los archivos derivados desde esa copia congelada y comparar los
   JSON semánticamente, no línea por línea. La comparación debe permitir solo:

   - los nuevos sucesos;
   - las nuevas preguntas vinculadas a ellos;
   - los grupos o relaciones declarados expresamente;
   - el nuevo sello de caché.

7. Ejecutar, como mínimo:

   ```text
   node scripts/run_tests.js
   node docs/auditoria-tercera/run-browser.cjs
   node docs/auditoria-tercera/run-interactions.cjs
   ```

8. Revisar el diff de `linea-tiempo-datos.js`, `linea-tiempo-detalle.json`,
   `fichas-personajes.js`, `curacion/grupos.json` y los reportes. Si aparecen
   cambios fuera del conjunto permitido, descartar la regeneración y corregir
   el importador antes de publicar.

## Diseño de implementación futura

El importador aislado está implementado en `scripts/import_sucesos_aislados.py`.
Acepta tres modos:

- `--check`: valida el TSV y muestra el diff permitido sin escribir;
- `--apply`: aplica solo altas y genera los artefactos derivados desde un
  snapshot local;
- `--verify`: comprueba que no cambió ningún registro fuera de la lista.

El script debe recibir explícitamente la ruta del snapshot mediante
`LT_DATABASE_DIR`, exigir una lista de IDs autorizados y escribir un manifiesto
con el commit base, el hash del snapshot, las claves importadas y los archivos
modificados. La publicación queda bloqueada si `--verify` informa cambios
externos.

Para reconstruir los artefactos sin perder correcciones de la versión estable,
`scripts/merge_isolated_artifacts.js` toma la versión de `HEAD` como base y
añade solamente los IDs nuevos autorizados. No debe sustituirse por una
regeneración completa cuando el CSV externo no sea exactamente el mismo
snapshot que produjo la versión publicada.

Para corregir un suceso existente, la curación debe declararse por ID y clave
en `curacion/descripciones_sucesos.json` y aplicarse con un script aislado
como `scripts/update_asa_aislado.py`. Ese script debe comprobar que encontró
exactamente el registro esperado y limitarse a los campos solicitados; nunca
debe usar el pipeline completo para una corrección puntual.

Ejemplo de una alta puntual:

```text
python scripts/build_fechas_historicas_tsv.py
python scripts/import_sucesos_aislados.py --check --min-year 1 --max-year 100
python scripts/import_sucesos_aislados.py --apply --min-year 1 --max-year 100 --db-dir <snapshot>
python scripts/gen_timeline.py
node scripts/merge_isolated_artifacts.js
node scripts/run_tests.js
```

## Estado de la incorporación de la imagen del siglo I

La incorporación anterior fue revertida porque el pipeline completo sincronizó
cambios ajenos a esos sucesos y rompió regresiones existentes. Las futuras
altas deben pasar por este flujo aislado antes de tocar la línea de tiempo.
