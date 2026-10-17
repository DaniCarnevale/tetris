# Leaderboard server-authoritative — evidencia TDD

## User journeys

- Como dueño del juego, quiero que el navegador no pueda insertar un score arbitrario en `scores`.
- Como jugador, quiero que una partida legítima se valide sin exponer secretos privados en el frontend.
- Como dueño del juego, quiero que cada run quede vinculado al usuario, expire y no pueda finalizarse dos veces.

## Evidencia RED/GREEN

1. RED: se agregaron casos para replay determinista, acciones inválidas, límite de acciones y envío online exclusivamente mediante `submit-score`; fallaron antes de existir el flujo seguro.
2. GREEN: `runSecurity.js` reproduce el motor con semilla; `leaderboardService.js` dejó de insertar directamente en `scores`; `start-run` y `submit-score` validan y finalizan la partida en servidor.
3. La migración `010_secure_leaderboard_runs.sql` fue aplicada en Supabase y las dos Edge Functions quedaron desplegadas en el proyecto `tetris-leaderboard`.

## Garantías verificadas

| Garantía | Implementación | Resultado |
|---|---|---|
| El cliente no inserta scores directamente | Revocación de privilegios + service client sin `.insert()` | PASS |
| Run asociado a usuario autenticado | `start-run` usa el bearer token y `player_id` | PASS |
| Run con stage/nivel/semilla del servidor | `game_runs` y respuesta `runId`/`seed` | PASS |
| Score calculado, no confiado al payload | Replay determinista en `submit-score` | PASS |
| Sólo se aceptan acciones canónicas | `left`, `right`, `down`, `rotate`, `hold`; máximo 12.000 | PASS |
| Sólo se puede enviar al terminar y una vez | `gameOver` + lock/RPC + estados `open/submitted` | PASS |
| Rate limit de inicios | 20 runs por hora y usuario | PASS |
| Perfil y avatar salen del servidor | `player_profiles` consultado por la función | PASS |

## Validación ejecutada

- `node --test --experimental-test-isolation=none test/run-security.test.js test/leaderboard-service.test.js`: 10/10 PASS.
- `node --experimental-test-coverage --test --experimental-test-isolation=none`: 102/102 PASS; 94.75% líneas, 82.10% branches, 93.90% funciones.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.
- Revisión de sinks: no hay `.insert()` de `scores` en el cliente, no hay secretos privados ni `console.log` en `src`.

## Limitación explícita

Esto bloquea la falsificación del resultado mediante requests o payloads fabricados. No es un sistema anti-bot: un atacante que automatice acciones válidas podría producir una partida reproducible. Ese problema requiere controles adicionales de telemetría, detección de patrones o attestation y no se resuelve con RLS solamente.
