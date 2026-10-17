# Revisión de seguridad — Tetris

Fecha: 2026-10-17
Rama revisada: `develop`
Integración verificada: `c18ed17`

## Resultado

**PASS CON HARDENING APLICADO**

La aplicación no contiene secretos privados trackeados. La publishable key de Supabase y el Client ID de Google son datos públicos esperables en un frontend. No se encontraron `service_role` keys, OAuth secrets, tokens Netlify ni claves privadas.

## Controles ejecutados

| Control | Resultado |
|---|---|
| Build | PASS — `npm run build` |
| Lint | PASS — `npm run lint` |
| Tests | PASS — 57/57 |
| Cobertura | PASS — 90.42% líneas, 81.07% branches, 92.12% funciones |
| Dependencias de producción | PASS — `npm audit --omit=dev`: 0 vulnerabilidades |
| Secretos trackeados | PASS — 0 rutas sensibles y 0 valores privados detectados |
| Historial Git | PASS — sin `.env`, certificados, claves privadas ni tokens reales |
| Sinks peligrosos en `src` | PASS — sin `innerHTML`, `eval`, `new Function` ni `console.log` |
| RLS / Storage | PASS — verificado en el proyecto Supabase `piztcrckudupfljkizfa` |
| Headers en producción | PASS — `HEAD https://tetris2mk.netlify.app/` respondió 200 con los headers esperados |

## Hardening aplicado

- Los usuarios anónimos pueden seguir enviando puntuaciones, pero ya no pueden crear o modificar perfiles personales mediante la API directa.
- Los usuarios anónimos ya no pueden subir, reemplazar o borrar avatares aunque intenten saltarse la interfaz.
- Las funciones `security definer` de Storage usan `search_path = ''` y referencias calificadas para reducir riesgos de resolución de objetos.
- Se eliminó la función SQL antigua `can_upload_avatar()` que ya no era necesaria.
- Netlify incorpora `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS y CSP en modo report-only mediante `netlify.toml`; se verificó directamente en producción.

Migración: `supabase/migrations/005_security_hardening.sql`
Aplicada y verificada en Supabase mediante `pg_policies` y `pg_proc`.

## Riesgos residuales / decisiones de producto

1. El bucket `avatars` es público porque las imágenes se muestran en el ranking y durante la partida. Cualquiera con la URL puede leerlas; no se almacenan documentos privados allí.
2. Las puntuaciones se generan en el cliente. Un usuario técnicamente avanzado puede falsificar un score; para anti-cheat real hace falta un backend o validación server-side.
3. La CSP está en `Report-Only` para observar compatibilidad con el badge de Netlify antes de pasarla a enforcement.
4. El ranking es público por diseño y sólo expone nickname, score, nivel, líneas, stage, avatar público y fecha; no expone emails.

## Recomendaciones operativas

- Activar 2FA en Google Cloud, Supabase, Netlify y GitHub.
- No pegar secretos en issues, commits, chats ni archivos `.md` del repositorio.
- Regenerar cualquier secreto si se sospecha una exposición.
- Revisar periódicamente `npm audit` y los Security Advisories de GitHub.
