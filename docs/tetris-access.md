# Tetris — accesos y configuración

Actualizado: 2026-10-17

Este documento contiene únicamente identificadores y claves públicas necesarias para operar el frontend. No contiene contraseñas, tokens privados, secretos OAuth ni claves `service_role`.

## Supabase

- Proyecto: `tetris-leaderboard`
- Project ref: `piztcrckudupfljkizfa`
- Dashboard: <https://supabase.com/dashboard/project/piztcrckudupfljkizfa>
- API URL: `https://piztcrckudupfljkizfa.supabase.co`
- Publishable key: `sb_publishable_2xqKzsTQws4w_wCxtYTYGQ_FKdSe5IA`
- Auth callback para Google: `https://piztcrckudupfljkizfa.supabase.co/auth/v1/callback`

Variables locales:

```env
VITE_SUPABASE_URL=https://piztcrckudupfljkizfa.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_2xqKzsTQws4w_wCxtYTYGQ_FKdSe5IA
```

La publishable key está diseñada para estar en el navegador. Nunca reemplazarla por una clave `service_role`/secret.

## Google Cloud OAuth

- Proyecto: `double-willow-511907-q7`
- Consola de credenciales: <https://console.cloud.google.com/apis/credentials?project=double-willow-511907-q7>
- OAuth Client ID: `269284133725-cmenk8neuoe2dhji3f91p16o87bnp21l.apps.googleusercontent.com`
- Redirect URI configurada: `https://piztcrckudupfljkizfa.supabase.co/auth/v1/callback`
- Authorized JavaScript origin: `https://tetris2mk.netlify.app`

El Client Secret de Google no se guarda en el repositorio ni en este archivo. Se administra exclusivamente en Supabase Authentication > Providers > Google y Google Cloud.

## Netlify

- Equipo: `dani-carnevale2013`
- Proyecto: `tetris2mk`
- Dashboard: <https://app.netlify.com/projects/tetris2mk>
- Producción: <https://tetris2mk.netlify.app/>
- Repositorio: <https://github.com/DaniCarnevale/tetris>
- Rama de deploy: `develop`
- Publicación: automática desde `develop`

Netlify tokens, contraseñas y credenciales de cuenta no se guardan en archivos del proyecto.

## Secretos que no deben copiarse

- Supabase `service_role` o secret key.
- Google OAuth Client Secret.
- Netlify Personal Access Token.
- Contraseñas, cookies o tokens de sesión.

Si alguno se expone, revocarlo y regenerarlo desde el panel correspondiente.
