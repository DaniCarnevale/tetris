# Inicio de partida y latencia de Supabase

## Alcance

La mejora reduce la espera visible al comenzar una partida sin omitir la creación del `game_run` autoritativo.

## Garantías

| Garantía | Evidencia | Resultado |
|---|---|---|
| La sesión guest se prepara mientras se muestra el inicio | `leaderboard-service.test.js`: warmup concurrente | PASS |
| El warmup se reutiliza y se invalida al cerrar/cambiar sesión | `leaderboard-service.test.js`: invalidación por `SIGNED_OUT` | PASS |
| Un error transitorio de autenticación permite reintentar | `leaderboard-service.test.js`: retry del warmup | PASS |
| El botón comunica que la partida segura está preparando | `main.js` + estado `is-loading` | PASS en build |
| El rate limit y la creación del run ocurren en una operación SQL transaccional | `012_atomic_start_game_run.sql` + `start-run` RPC | Aplicado en Supabase |

## Verificación

- `npm test`: 148/148 PASS.
- `npm run test:coverage`: 100% líneas, 100% funciones, 95,32% branches.
- `npm run lint`: PASS.
- `npm run build`: PASS.
