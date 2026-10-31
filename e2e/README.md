# Pruebas e2e (Playwright)

Todo lo que escribe datos corre contra un **Supabase local y desechable** (Postgres + GoTrue + PostgREST levantados desde binarios, sin Docker). Nunca se escribe en la base compartida.

```bash
npm run e2e:stack:up     # levanta el stack en 127.0.0.1:54321 y aplica supabase/migrations + el seed demo
npm run e2e:local        # exporta la app a dist-e2e apuntando al stack local y corre las pruebas
npm run e2e:stack:down
```

- `E2E_WITH_CLEANUP=1 npm run e2e:stack:up` aplica también la migración pendiente `*_web2_cleanup_PENDING_APPROVAL.sql` (solo en local), para comprobar que la app sigue funcionando sin las tablas viejas.
- `E2E_STACK_DIR` cambia dónde se guardan binarios y datos (por defecto `e2e/.stack`).

## Contra una preview de Vercel

```bash
E2E_BASE_URL=https://<preview>.vercel.app \
E2E_APP_SUPABASE_URL=https://<ref>.supabase.co \
npm run e2e
```

Se prueba el bundle publicado, pero todas las llamadas a `E2E_APP_SUPABASE_URL` se redirigen al stack local, así que la preview tampoco escribe en la base compartida. Si la preview tiene Vercel Authentication, abre antes un enlace de acceso (cookie `_vercel_jwt`) y pásalo con `E2E_VERCEL_SHARE_URL`.

## Google

Google se simula: se interceptan `/auth/v1/authorize` (vuelve a `/auth/callback?code=…`) y el canje PKCE `/auth/v1/token?grant_type=pkce`, que responde con una sesión real del GoTrue local. No hay ninguna ruta de prueba en la app publicada. El inicio de sesión real con Google se prueba a mano: `docs/checklist-google.md`.

## Datos de prueba

Cada usuario de prueba se llama `e2e_<run><n>` (correo `@e2e.invalid`) y se borra al final de cada archivo (con sus partidos, por cascada). El mundo demo no se toca.

## Qué cubren

1. `01-entrada`: portada y /entrar sin sesión con solo el botón de Google; /verificar ya no existe; Términos y Aviso (BORRADOR, Ley 8968); consentimiento obligatorio; menores de 13 bloqueados (también en el servidor); 13–17 con aviso de permiso; login con Google (PKCE) que guarda el consentimiento; cancelar en Google.
2. `02-partido`: amistad por pantalla, reto, aviso al rival, marcador, confirmación de los dos, resultado y cambio de Elo.
3. `03-grupos-torneo-ranking`: grupo por pantalla, liga de 3 con su tabla, ranking tras 3 partidos confirmados y el «Modo prueba».
