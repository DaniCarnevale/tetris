# TDD — foco, música, configuración persistente y rankings segmentados

## Alcance

- Pausar automáticamente una partida activa cuando la pestaña pierde foco.
- Incorporar una melodía original en Web Audio, con mute y volumen configurables.
- Guardar controles y preferencias de audio en `player_settings` para cuentas Google.
- Mantener un fallback local para invitados.
- Separar el ranking por stage y nivel inicial, con opción de consultar todos los niveles de un stage.

## Ciclo RED

Commit: `fd252a0 test: define focus music settings and ranking behavior`

Se agregaron pruebas para el comportamiento esperado antes de implementar:

- `shouldAutoPause` sólo pausa una partida activa.
- Normalización, serialización y defaults de configuración.
- Filtro por `stageId` y `startLevel`.
- Secuencia musical reutilizable para todos los niveles.
- Carga y guardado de settings en el servicio de cuenta.

Resultado RED: las pruebas fallaban porque todavía no existían los módulos, filtros y operaciones de persistencia.

## Ciclo GREEN

Implementación:

- `src/js/game/focusPause.js` centraliza la regla de pausa por pérdida de foco.
- `src/js/audio/soundManager.js` agrega la melodía original, reproducción en loop, mute y volumen.
- `src/js/settings/settingsModel.js` normaliza y serializa las preferencias.
- `accountService` carga y guarda settings únicamente para cuentas autenticadas no anónimas.
- `leaderboardService` consulta y guarda `start_level`, y filtra por stage/nivel.
- `main.js` conecta los eventos de foco, settings y filtros del ranking.
- `007_player_settings_and_rankings.sql` agrega la tabla protegida por RLS y expone sólo `start_level` como metadata pública del ranking.

## Verificación

Ejecutado en la rama `feature/focus-music-settings-rankings`:

```text
npm test                         77/77 passed
npm run lint                     passed
npm run build                    passed
node --test --experimental-test-coverage
  line coverage                  90.76%
  branch coverage                81.91%
  function coverage              94.03%
```

QA visual local con `browser-qa`:

- Configuración visible con feedback, mute y slider de volumen.
- Ranking con selectores de stage y nivel inicial.
- Revisión en 375, 768 y 1440 px sin bloquear la navegación principal.
- Screenshot de escritorio revisado; sin errores de consola observados en la sesión local.

## Pendiente de infraestructura

La migración debe ejecutarse en el proyecto Supabase configurado antes de publicar esta versión para que funcionen la persistencia remota de settings y el filtro público por `start_level`. Está preparada en `supabase/migrations/007_player_settings_and_rankings.sql` y debe aplicarse después de las migraciones 001–006.
