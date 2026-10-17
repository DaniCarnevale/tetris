# Coverage hardening

## Objetivo

Cubrir las rutas defensivas que explicaban la cobertura de 94,75%, sin modificar la lógica de juego ni la validación server-authoritative del leaderboard.

## Garantías agregadas

| Área | Casos cubiertos |
| --- | --- |
| Audio | Web Audio ausente, fallback webkit, contexto suspendido, timers, muteo, volumen y feedback de partida |
| Supabase/Auth | sesiones existentes, sesión invitada, errores de OAuth, logout, RPC, perfiles y settings |
| Storage/Avatar | validación de archivos, WebP, límites, cooldown, RLS, reemplazo, eliminación y fallos de Storage |
| Leaderboard | filtros online, fallbacks locales, Realtime, respuestas inválidas y persistencia no disponible |
| Juego | movimiento horizontal, hold, niveles inválidos, boards vacíos, filas completas y animación |
| Seguridad | seeds, comandos inválidos, seeds/niveles/stages inválidos y replay hasta game over |

## Verificación

Comando ejecutado:

```text
npm run test:coverage
```

Resultado actual:

- 141 tests ejecutados.
- 141 tests aprobados.
- Líneas de `src/`: 100%.
- Funciones de `src/`: 100%.
- Ramas de `src/`: 95,47%.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm audit --omit=dev`: 0 vulnerabilidades.

## Cobertura de ramas pendiente

El porcentaje de ramas no es 100% porque quedan alternativas defensivas que no son alcanzables mediante las APIs públicas actuales, principalmente guardas imposibles de audio y normalizaciones que siempre reciben un valor reparado antes de llegar a la rama. La cobertura de líneas y funciones sí está forzada a 100% en `npm run test:coverage`.

El entrypoint `src/js/main.js` continúa validándose con smoke/browser QA; no se importa en el runner unitario porque depende directamente del DOM real y del ciclo de vida del navegador.
