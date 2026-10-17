# Evidencia TDD: leaderboard invitado y Realtime

## Alcance

Journeys derivados durante la implementación:

- Como jugador invitado, quiero elegir un nickname para que mis puntuaciones se identifiquen en el ranking.
- Como jugador, quiero ver un ranking histórico aunque Supabase todavía no esté configurado.
- Como jugador, quiero guardar una puntuación al terminar una partida.
- Como jugador, quiero que el ranking online se actualice en vivo cuando entra una nueva puntuación.

## Evidencia RED/GREEN

| Comportamiento | RED | GREEN |
|---|---|---|
| Normalización y orden del ranking | `34386ee` · módulo inexistente | `06021cf` · `npm test -- test/leaderboard-model.test.js` |
| Perfil invitado persistente | `e1dbc75` · módulo inexistente | `7aab42a` · `npm test -- test/player-profile.test.js` |
| Persistencia local/Supabase con fallback | `96b5da5` · módulo inexistente | `1ccc735` · `npm test -- test/leaderboard-service.test.js` |
| Contador de líneas para puntuaciones | `179cbc5` · `game.lines` inexistente | `518b69e` · `npm test -- test/game-engine.test.js` |
| Suscripción Supabase Realtime | `5ff59cd` · método inexistente | `85c1b01` · `npm test -- test/leaderboard-service.test.js` |

## Verificación final

- `npm test`: 38/38 tests PASS.
- `npm test -- --experimental-test-coverage`: 86.43% líneas, 85.55% branches, 92.57% funciones.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- Security grep: no se encontraron claves privadas hardcodeadas.
- Navegador: nickname, inicio de partida, Game Over, guardado local y apertura del ranking verificados en `http://127.0.0.1:5173/`.

## Gaps conocidos

- La prueba online real queda pendiente de crear el proyecto Supabase, ejecutar la migración y configurar `.env.local`.
- La suscripción WebSocket está cubierta con un cliente falso y queda habilitada automáticamente cuando existen las variables de entorno.
