# Avatar upload — evidencia TDD

## User journeys

- Como jugador, quiero seleccionar una imagen pequeña para identificarme en el ranking.
- Como jugador, quiero que una nueva imagen reemplace la anterior sin acumular archivos.
- Como dueño del juego, quiero limitar tamaño, formato y frecuencia de carga para evitar abuso.

## Evidencia RED/GREEN

1. Se agregó `test/avatar-service.test.js` con validaciones de formato/tamaño, ruta única por usuario, reemplazo, persistencia del cooldown y bloqueo de cargas repetidas.
2. La ejecución RED falló porque `avatarService.js` todavía no existía y porque el modelo/servicio aún no propagaban `avatarPath`.
3. La implementación GREEN agregó el servicio de avatar, el preview de UI, la integración con scores y la migración de Storage.

## Garantías verificadas

| Garantía | Prueba | Resultado |
|---|---|---|
| Acepta JPG, PNG y WebP hasta 2 MB | `test/avatar-service.test.js` | PASS |
| Rechaza archivos vacíos, inválidos o mayores al límite | `test/avatar-service.test.js` | PASS |
| Cada jugador usa una única ruta `user_id/avatar.webp` | `test/avatar-service.test.js` | PASS |
| Una nueva carga limpia la ruta anterior y guarda el cooldown | `test/avatar-service.test.js` | PASS |
| Una segunda carga dentro de 30 segundos no llama a Storage | `test/avatar-service.test.js` | PASS |
| El score conserva la ruta del avatar | `test/leaderboard-service.test.js` | PASS |

## Validación

- `npm test`: 45/45 PASS.
- `npm test -- --experimental-test-coverage`: 45/45 PASS; 88.47% de líneas, 83.04% de ramas y 89.53% de funciones.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `git diff --check`: PASS.

## Límites y configuración pendiente

La migración `supabase/migrations/002_avatar_storage.sql` debe ejecutarse después de `001_leaderboard.sql`. El límite cliente de 30 segundos mejora la experiencia, pero la protección efectiva está también en la política de Storage y el trigger SQL; además, el bucket queda limitado a 2 MB y a una única ruta por jugador.
