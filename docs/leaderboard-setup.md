# Ranking histórico

La app funciona como invitado y guarda un ranking local si Supabase no está configurado. Para habilitar el ranking histórico online:

1. Crear un proyecto nuevo en Supabase.
2. En Authentication, habilitar **Anonymous Sign-Ins**.
3. Ejecutar `supabase/migrations/001_leaderboard.sql` desde el SQL Editor.
4. Copiar `.env.example` a `.env.local`.
5. Completar `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` (la clave publicable/anon, nunca `service_role`).
6. Reiniciar Vite con `npm run dev`.

La app crea una sesión anónima para cada jugador y asocia el nickname a sus puntuaciones. El login con Google se puede sumar más adelante vinculando esa sesión invitada, sin cambiar el esquema de `scores`.
