# TDD: bases aleatorias y destrucción de líneas

## User journeys

- Como jugador, quiero que un stage con base tenga una variante aleatoria en cada partida, para que volver a jugarlo no se sienta idéntico.
- Como jugador, quiero ver cómo se destruyen los bloques al completar una línea, para que la acción tenga más feedback visual.

## Evidencia RED/GREEN

| Comportamiento | Test | RED | GREEN |
| --- | --- | --- | --- |
| La base cambia de posición, conserva el pozo central y es reproducible con la misma semilla | `test/stages.test.js` | Falló porque `createStageBoard` ignoraba el generador aleatorio | `node --test test/stages.test.js test/game-engine.test.js test/line-clear-animation.test.js` · 21/21 PASS |
| El motor conserva las filas eliminadas para animarlas | `test/game-engine.test.js` | Falló porque el evento no tenía `clearedRows` | Mismo comando · 21/21 PASS |
| La animación clona la fila, limita su progreso y expira | `test/line-clear-animation.test.js` | Falló por módulo de animación inexistente | Mismo comando · 21/21 PASS |

## Implementación

- Los stages con base mantienen su densidad y niveles de altura, pero redistribuyen sus bloques en columnas disponibles.
- Las dos columnas centrales quedan libres para conservar una entrada jugable.
- El generador recibe el mismo `random` de la partida, por lo que una semilla permite reproducir la variante.
- El motor conserva una copia de las filas completas antes de limpiarlas.
- El canvas muestra una reducción, desplazamiento, brillo y barrido horizontal durante 560 ms.
- Se añadió un pulso visual al tablero respetando `prefers-reduced-motion` para la animación CSS.

## Validación final

- `npm run lint` — PASS
- `npm test` — 63/63 PASS
- `node --test --experimental-test-coverage` — 63/63 PASS; 91,20% líneas, 81,22% ramas, 92,99% funciones
- `npm run build` — PASS; Vite transformó 76 módulos
- QA manual en preview local — stage con base inicia, pausa/reanudación funciona y no se detectaron errores de consola.

## Checkpoints

- RED: `9f5167c` — `test: define random stages and line clear animation`
- GREEN: `a261c3b` — `feat: randomize stage bases and animate line clears`
