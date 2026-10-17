# TDD: centro de perfil y distribución de fichas

## User journeys

- Como jugador invitado, quiero ver una entrada clara para iniciar sesión sin que el formulario de perfil ocupe la pantalla de nueva partida.
- Como jugador autenticado, quiero abrir mi perfil desde el avatar para modificar nickname, avatar y cerrar sesión.
- Como jugador, quiero consultar cuántas fichas de cada tipo coloqué durante la partida.

## Evidencia RED/GREEN

| Comportamiento | Test | RED | GREEN |
| --- | --- | --- | --- |
| El contador registra las siete piezas, ignora identificadores desconocidos y calcula barras relativas | `test/piece-stats.test.js` | Falló porque no existía `pieceStats.js` | `node --test test/piece-stats.test.js test/profile-view.test.js` · 5/5 PASS |
| El acceso al perfil diferencia correctamente invitado y cuenta autenticada | `test/profile-view.test.js` | Falló porque no existía `profileView.js` | Mismo comando · 5/5 PASS |

## Implementación

- El formulario de nickname/avatar salió del flujo de nueva partida y pasó a un panel de perfil accesible desde el chip superior.
- El estado invitado muestra “Iniciar sesión” y mantiene bloqueados nickname y avatar; una cuenta autenticada muestra su nombre, avatar, edición y cierre de sesión.
- El acceso al perfil está disponible en la pantalla inicial y durante la partida; configuración queda visible junto al acceso de cuenta.
- Cada tetromino tiene un identificador estable, etiqueta corta, etiqueta descriptiva y color para alimentar la visualización.
- El motor registra la ficha al bloquearla y la UI renderiza siete barras con conteo, total y proporción respecto de la ficha más usada.
- La estadística se reinicia al comenzar una partida nueva y no se mezcla con el ranking histórico.

## Validación final

- `npm run lint` — PASS
- `npm test` — 68/68 PASS
- `node --test --experimental-test-coverage` — 68/68 PASS; 91,65% líneas, 82,06% ramas, 93,40% funciones
- `npm run build` — PASS; Vite transformó 78 módulos
- QA manual en preview local — perfil desde inicio y partida, panel de perfil, siete barras y actualización de contadores verificados.
- Consola del navegador — sin errores de aplicación; solo mensajes de conexión de Vite.

## Checkpoints

- RED: `2568efe` — `test: define profile hub and piece stats behavior`
- GREEN: `96e80e0` — `feat: add profile hub and piece distribution`
