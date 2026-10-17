# Google SSO y perfil — evidencia TDD

## User journeys

- Como jugador invitado, quiero vincular Google sin perder mi ranking, nickname ni avatar.
- Como jugador autenticado, quiero recuperar mi nickname y avatar en otra sesión.
- Como jugador, quiero seguir jugando sin cuenta si Supabase todavía no está configurado.

## Evidencia RED/GREEN

1. Se agregó `test/account-service.test.js` para cubrir el enlace de Google sobre una sesión anónima, el estado de cuenta y la persistencia remota del perfil.
2. La ejecución RED falló porque `accountService.js` todavía no existía.
3. La implementación GREEN agregó el servicio de cuenta, helpers compartidos de Supabase, la UI de estado de cuenta y la migración `003_google_profiles.sql`.

## Garantías verificadas

| Garantía | Prueba | Resultado |
|---|---|---|
| Google se vincula a la sesión invitada existente | `test/account-service.test.js` | PASS |
| El estado distingue modo local, invitado y Google conectado | `test/account-service.test.js` | PASS |
| Nickname y avatar se guardan en `player_profiles` | `test/account-service.test.js` | PASS |
| El modo guest sigue funcionando sin Supabase con perfil fijo | `test/leaderboard-service.test.js`, browser QA | PASS |
| El botón informa configuración faltante sin romper el juego | browser QA | PASS |

## Validación

- `npm test`: 48/48 PASS.
- `npm test -- --experimental-test-coverage`: 48/48 PASS; 89.39% de líneas, 80.82% de ramas y 90.23% de funciones.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- Browser QA local: pantalla inicial, selector de nivel/stage, perfil y fallback offline verificados.

## Configuración pendiente

La migración `supabase/migrations/003_google_profiles.sql` debe ejecutarse después de `001_leaderboard.sql` y `002_avatar_storage.sql`. En Supabase hay que habilitar Anonymous Sign-Ins, el linking manual de identidades y el proveedor Google; además, Google Cloud debe tener configurado el callback de Supabase. Hasta completar esas variables, el juego opera correctamente en modo local/invitado.

