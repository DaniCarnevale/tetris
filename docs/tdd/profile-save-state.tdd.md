# TDD: guardado explícito del perfil

## User journey

- Como jugador autenticado, quiero que al cambiar mi nickname o avatar aparezca un botón de guardado, para saber cuándo hay cambios pendientes y poder persistirlos explícitamente.

## Evidencia RED/GREEN

| Comportamiento | Test | RED | GREEN |
| --- | --- | --- | --- |
| El editor detecta cambios reales de nickname o avatar, ignorando espacios equivalentes | `test/profile-presentation.test.js` | Falló porque `hasProfileChanges` no existía | `node --test test/profile-presentation.test.js` · 4/4 PASS |

## Implementación

- Se agregó el botón `Guardar cambios` al panel de perfil, oculto mientras el formulario coincide con el perfil persistido.
- El nickname se compara normalizado contra el último perfil sincronizado, por lo que el botón aparece al editarlo y desaparece después de guardar correctamente.
- Guardar muestra estado de progreso y confirmación; si falla la sincronización con Supabase, conserva el cambio pendiente para poder reintentarlo.
- El inicio de partida ya no guarda silenciosamente un nickname editado: el perfil se persiste mediante la acción explícita.
- Avatar cargado o eliminado también actualiza el perfil remoto y mantiene el botón visible si esa sincronización falla.

## Validación final

- `node --test test/profile-presentation.test.js` — 4/4 PASS
- `npm test` — 69/69 PASS
- `npm run lint` — PASS
- `npm run build` — PASS; Vite transformó 78 módulos
- `node --test --experimental-test-coverage` — 69/69 PASS; 91,71% líneas, 82,35% ramas, 93,45% funciones
- Preview local — acceso guest verificado; botón oculto cuando no hay permisos de edición y panel sin regresiones visuales.

## Checkpoints

- RED: `7b2a610` — `test: reproduce unsaved profile changes`
- GREEN: `489cebb` — `fix: add explicit profile save action`
