# TDD — música jugable y sincronización del perfil en rankings

## User journeys

- Como jugador, quiero una música de fondo más suave y variada para poder continuar jugando sin que el loop resulte invasivo.
- Como usuario Google, quiero que al guardar mi nickname o avatar se actualicen también mis puntuaciones históricas para que el ranking represente mi perfil actual.

## RED

Commit: `75860dd test: reproduce music and profile ranking sync bugs`

Se agregaron dos garantías antes de modificar producción:

- La melodía debe tener una frase más larga, con notas no estridentes y duraciones suficientes para evitar un loop agotador.
- Guardar un perfil debe invocar `sync_profile_score_identity` con nickname y avatar normalizados.

Resultado RED: 11/13 tests dirigidos pasaron; fallaron la expectativa de la frase musical y la llamada de sincronización del perfil.

## GREEN

Commit: `ec770e5 fix: soften music and sync profile identity in rankings`

- La música usa 14 notas, una duración aproximada de cuatro segundos, registro limitado y oscilador `triangle` a volumen reducido.
- `accountService.saveProfile` sincroniza los scores históricos mediante una función RPC protegida.
- El perfil dispara una actualización inmediata si el panel de ranking está abierto.
- Avatar nuevo y avatar eliminado siguen el mismo flujo de sincronización.
- `009_profile_score_identity_sync.sql` limita la función a cuentas autenticadas no anónimas y sólo actualiza filas cuyo `player_id` coincide con `auth.uid()`.

## Verificación

```text
node --test test/stages.test.js test/account-service.test.js   13/13 passed
npm test                                                     77/77 passed
npm run lint                                                 passed
npm run build                                                passed
node --test --experimental-test-coverage                     90.85% lines / 81.90% branches / 94.08% functions
```

La migración `009` fue ejecutada con éxito en el proyecto Supabase `tetris-leaderboard` y devolvió `Success. No rows returned`.
