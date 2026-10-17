# Perfil Guest bloqueado — evidencia TDD

## User journeys

- Como jugador invitado, quiero jugar y aparecer como `Guest` sin poder editar nickname ni avatar.
- Como jugador invitado, quiero que el bloqueo no impida iniciar una partida.
- Como jugador con Google vinculado, quiero recuperar la edición de nickname y avatar.

## Evidencia RED/GREEN

1. Se agregaron casos a `test/account-service.test.js` para limitar la edición a cuentas Google y evitar persistir perfiles personalizados para usuarios anónimos.
2. Se agregó un caso a `test/avatar-service.test.js` que verifica que Storage no se llama para un usuario anónimo.
3. La ejecución RED falló porque `canEditProfile` no existía.
4. La implementación GREEN agregó el estado de edición de perfil, el nickname fijo `Guest`, controles deshabilitados en la UI y defensas en los servicios de perfil/avatar.

## Garantías verificadas

| Garantía | Prueba | Resultado |
|---|---|---|
| Guest no puede editar nickname ni avatar | `test/account-service.test.js` | PASS |
| Un perfil anónimo personalizado no se persiste en `player_profiles` | `test/account-service.test.js` | PASS |
| Guest no puede subir avatar a Storage | `test/avatar-service.test.js` | PASS |
| Guest puede iniciar una partida | browser QA | PASS |
| La UI muestra `Guest` y deshabilita nickname/avatar | browser QA | PASS |

## Validación

- `npm test`: 51/51 PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- Browser QA local: estado guest, controles bloqueados e inicio de partida verificados.

## Comportamiento esperado

La cuenta guest conserva el juego y el ranking, pero no tiene perfil personalizable. Al volver del OAuth de Google, `canEditProfile` habilita los controles y el perfil remoto puede cargarse o guardarse.

