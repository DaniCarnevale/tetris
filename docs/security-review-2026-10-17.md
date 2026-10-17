# Revisión de seguridad — Tetris

Fecha: 2026-10-17
Rama revisada: `security/anti-cheat-leaderboard`
Integración verificada: `da32d60` + funciones Edge desplegadas en `piztcrckudupfljkizfa`

## Resultado

**PASS CON HARDENING APLICADO — LEADERBOARD SERVER-AUTHORITATIVE**

La aplicación no contiene secretos privados trackeados. La publishable key de Supabase y el Client ID de Google son datos públicos esperables en un frontend. No se encontraron `service_role` keys, OAuth secrets, tokens Netlify ni claves privadas.

## Controles ejecutados

| Control | Resultado |
|---|---|
| Build | PASS — `npm run build` |
| Lint | PASS — `npm run lint` |
| Tests | PASS — 102/102 con `--experimental-test-isolation=none` |
| Cobertura | PASS — 94.75% líneas, 82.10% branches, 93.90% funciones |
| Dependencias de producción | PASS — `npm audit --omit=dev`: 0 vulnerabilidades |
| Secretos trackeados | PASS — 0 rutas sensibles y 0 valores privados detectados |
| Historial Git | PASS — sin `.env`, certificados, claves privadas ni tokens reales |
| Sinks peligrosos en `src` | PASS — sin `innerHTML`, `eval`, `new Function` ni `console.log` |
| RLS / Storage | PASS — verificado en el proyecto Supabase `piztcrckudupfljkizfa` |
| Auth / emails | PASS — `anon` y `authenticated` no tienen privilegios sobre `auth.users` ni `auth.identities` |
| API pública de scores | PASS — el ranking responde sólo con campos públicos; `player_id` devuelve `permission denied` |
| Headers en producción | PASS — `HEAD https://tetris2mk.netlify.app/` respondió 200 con los headers esperados |
| Replay server-authoritative | PASS — `run-security.test.js` 10/10; funciones `start-run` y `submit-score` activas |

## Hardening aplicado

- Los usuarios anónimos pueden seguir enviando puntuaciones, pero ya no pueden crear o modificar perfiles personales mediante la API directa.
- Los usuarios anónimos ya no pueden subir, reemplazar o borrar avatares aunque intenten saltarse la interfaz.
- Las funciones `security definer` de Storage usan `search_path = ''` y referencias calificadas para reducir riesgos de resolución de objetos.
- Se eliminó la función SQL antigua `can_upload_avatar()` que ya no era necesaria.
- La tabla pública `scores` aplica privilegios por columna: no expone `player_id`, `id` ni `start_level`; `avatar_upload_limits` no es consultable por roles públicos.
- Storage permite el `upsert` del avatar con una política `SELECT` adicional, limitada al propio archivo del usuario; esto corrige el error `new row violates row-level security policy` sin habilitar lectura de avatares ajenos mediante la API.
- El trigger de rate limit convierte explícitamente `storage.objects.owner_id` (`text`) a `uuid` antes de guardarlo en `avatar_upload_limits`; esto corrige el `42804 datatype mismatch` detectado al subir.
- La interfaz sólo muestra `Google conectado`; el email no se muestra en el ranking ni en la UI pública.
- Netlify incorpora `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS y CSP en modo report-only mediante `netlify.toml`; se verificó directamente en producción.
- `scores` ya no acepta `insert`, `update` ni `delete` desde `anon`/`authenticated`; sólo la función SQL de finalización ejecutada por `service_role` puede insertar un resultado.
- Cada partida obtiene una semilla y un `run_id` del servidor, expira a los 45 minutos, se limita a 20 inicios por hora y sólo puede finalizarse una vez.
- `submit-score` ignora score, nivel y líneas enviados por el navegador: reproduce la partida desde la semilla y la lista acotada de acciones, exige game over y persiste únicamente el resultado calculado.

Migraciones: `supabase/migrations/005_security_hardening.sql`, `supabase/migrations/006_privacy_hardening.sql`, `supabase/migrations/007_fix_avatar_upsert_rls.sql`, `supabase/migrations/008_fix_avatar_rate_limit_types.sql`
Aplicadas y verificadas en Supabase mediante `pg_policies`, `pg_proc`, privilegios de columnas y llamadas REST públicas.

## Riesgos residuales / decisiones de producto

1. El bucket `avatars` es público porque las imágenes se muestran en el ranking y durante la partida. Cualquiera con la URL puede leerlas; no se almacenan documentos privados allí.
2. La validación evita falsificar score/nivel/líneas mediante un insert o payload directo. No pretende detectar automatización de teclado, bots que jueguen partidas válidas o manipulación del cliente antes del envío; para eso haría falta telemetría/attestation adicional.
3. La CSP está en `Report-Only` para observar compatibilidad con el badge de Netlify antes de pasarla a enforcement.
4. El ranking es público por diseño y sólo expone nickname, score, nivel, líneas, stage, avatar público y fecha; no expone emails ni UUIDs internos.

## Recomendaciones operativas

- Activar 2FA en Google Cloud, Supabase, Netlify y GitHub.
- No pegar secretos en issues, commits, chats ni archivos `.md` del repositorio.
- Regenerar cualquier secreto si se sospecha una exposición.
- Revisar periódicamente `npm audit` y los Security Advisories de GitHub.
