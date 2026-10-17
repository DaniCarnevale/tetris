# TDD — cockpit de juego compacto y control de audio inmediato

## Alcance

- Mantener la partida completa dentro del viewport, sin scroll de documento.
- Reordenar tablero, previews, marcador, controles y distribución de fichas para que la jerarquía sea clara.
- Convertir las estadísticas de piezas en barras verticales compactas y legibles.
- Cancelar inmediatamente las notas de música ya programadas al pausar, mutear o perder foco.
- Evitar que una reanudación deje dos loops musicales activos.

## RED

Commit: `842fa90 test: reproduce cockpit layout and music overlap bugs`

Se agregaron pruebas para:

- Clasificar los modos desktop, compact y mobile.
- Bloquear el scroll sólo cuando hay una partida activa.
- Modelar la distribución horizontal compacta de las estadísticas.
- Detectar que `stopMusic()` no cancelaba las notas ya programadas antes de reanudar.

Resultado RED: falló la exportación del modelo de estadísticas y el test de cancelación de notas; la implementación anterior dejaba sonar las notas programadas y permitía solaparlas al reanudar.

## GREEN

Commits:

- `dcb9714 fix: cancel scheduled music on pause and mute`
- `256ff65 refactor: organize game cockpit without scroll`

Implementación:

- `soundManager` conserva las notas activas de la melodía, invalida loops anteriores y fuerza el gain a silencio antes de detener cada oscilador.
- La vista de juego se convierte en un grid de dos filas: cockpit principal arriba y distribución de fichas abajo.
- El body bloquea el scroll durante la partida y cambia entre modos desktop, compact y mobile según el viewport.
- Las estadísticas muestran siete tarjetas compactas con barras verticales, color por tetromino y etiqueta corta; el nombre completo sigue disponible en `aria-label`.
- En pantallas pequeñas se reducen previews y controles secundarios, manteniendo tablero, marcador, pausa y estadísticas visibles.

## Verificación

```text
node --test test/game-layout.test.js test/sound-manager.test.js  7/7 passed
npm test                                                    84/84 passed
npm run lint                                                passed
npm run build                                               passed
node --test --experimental-test-coverage                    94.29% lines / 82.32% branches / 92.82% functions
```

QA visual local con `browser-qa`/Cua:

- Desktop amplio: 1440×900, sin scrollbar y con el tablero centrado.
- Tablet: 768×1024, sin scrollbar y con paneles laterales compactos.
- Mobile: 390×844, sin scrollbar; acciones superiores reducidas a iconos y estadísticas visibles en la franja inferior.
