# Ranking histórico

La app funciona como **Guest** y permite jugar sin cuenta. El guest usa el nickname fijo `Guest` y no puede cargar avatar; para personalizar el perfil hay que continuar con Google. Si Supabase no está configurado, el ranking se guarda localmente. Para habilitar el ranking histórico online:

1. Crear un proyecto nuevo en Supabase.
2. En Authentication, habilitar **Anonymous Sign-Ins**.
3. Ejecutar en orden `supabase/migrations/001_leaderboard.sql` a `009_profile_score_identity_sync.sql` desde el SQL Editor.
4. Copiar `.env.example` a `.env.local`.
5. Completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (la clave publicable/anon, nunca `service_role`).
6. Reiniciar Vite con `npm run dev`.

La app crea una sesión anónima para cada jugador y asocia sus puntuaciones al usuario guest. El botón de Google inicia una sesión OAuth permanente; esto permite entrar tanto a cuentas existentes como nuevas y evita conflictos cuando una identidad ya está asociada a otro usuario. Después del login se habilitan nickname y avatar personalizados.

Los avatares de cuentas Google se guardan en el bucket `avatars`. Cada jugador puede tener un único archivo WebP de hasta 2,5 MB en una ruta fija. El bucket acepta JPG, PNG y WebP; la política de Storage y el trigger de rate limit restringen la ruta, el tamaño y una carga cada 30 segundos. Una nueva imagen reemplaza el archivo anterior.

## Google SSO

Para convertir la sesión invitada en una cuenta persistente:

1. En Supabase, habilitar Anonymous Sign-Ins.
2. En Authentication > Providers > Google, configurar el OAuth Client ID y Client Secret de Google Cloud.
3. Agregar la URL de callback de Supabase (`https://<project-ref>.supabase.co/auth/v1/callback`) en Google Cloud.
4. Agregar `http://127.0.0.1:5173/` y la URL de producción en Authentication > URL Configuration.

El botón de Google usa `signInWithOAuth`, por lo que funciona con identidades Google ya existentes y con cuentas nuevas. La sesión guest y la sesión Google son identidades distintas; los perfiles personalizados sólo se permiten a usuarios permanentes. [Google Auth en Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google) · [Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)

El ranking usa Supabase Realtime cuando el proyecto está configurado: la tabla se suscribe a nuevos inserts por WebSocket mientras está abierta y cierra el canal al salir, sin mantener conexiones innecesarias durante la partida.

Los rankings quedan separados por stage y nivel inicial. La pantalla permite elegir un stage y un nivel concreto, o consultar todos los niveles dentro de ese stage. Las preferencias de controles, feedback, música y volumen se guardan en `player_settings` para cuentas Google; los invitados conservan un fallback local. Al guardar nickname o avatar, la función protegida `sync_profile_score_identity` actualiza los snapshots históricos de esa cuenta para que el ranking no conserve datos visuales viejos.
