# Campeones FC

El marcador oficial del pique con tus amigos: cada partido, cada serie y cada trofeo, en un solo lugar.

Producto de Quantz, desarrolladora de software de finanzas en Costa Rica. Esta versión es solo competitiva: no hay dinero, apuestas ni pagos.

## Marca

El nombre, la frase y los colores viven en `config/branding.ts`. La app los lee desde ahí. La interfaz sigue la dirección Broadcast: gráficos de transmisión sobre azul marino, con bloques en rojo, amarillo y azul. El manifest y `app.json` se regeneran con:

```bash
npm run brand
```

## Qué puedes hacer

- Entrar con tu cuenta de Google (Supabase Auth). En el modo demostración entras con las cuentas de ejemplo.
- Elegir nombre de jugador y avatar.
- Invitar amigos con un enlace (WhatsApp u otro) o por usuario, y aceptar o rechazar.
- Proponer un partido. Tu rival lo acepta. Al terminar, cada uno marca quién ganó y, si quiere, los goles. Si coinciden, el resultado cuenta. Si no, queda en disputa y nadie suma hasta que uno corrija su voto.
- Un partido sin aceptar expira a las 12 horas (72 horas si es de torneo).
- Ver el versus 1 contra 1, tus estadísticas, la tabla de un grupo y el ranking. El rating es tipo Elo: ganarle a alguien fuerte suma más. Hacen falta 3 partidos para salir en el ranking.
- Crear un grupo y, dentro, un torneo de eliminación (4, 8 o 16) o una liga. El cuadro avanza solo con el mismo flujo de doble confirmación.
- Trofeos: primera victoria, racha de 5 y campeón de torneo.

## Requisitos

Node.js 22 y npm. Para el modo con base de datos, la [CLI de Supabase](https://supabase.com/docs/guides/local-development).

## Correrla en modo demostración

No hace falta ninguna credencial. Los datos de ejemplo viven en este navegador.

```bash
npm install
npm test
npm run web
```

Abre [http://127.0.0.1:8421](http://127.0.0.1:8421). En el iPhone, agrégala a la pantalla de inicio desde Safari: el manifest, `viewport-fit=cover` y las metas de Apple dejan la barra de estado sobre el azul marino.

Cuentas de ejemplo (también sirven como correo `usuario@demo.campeonesfc`):

| Usuario | Para qué sirve |
| --- | --- |
| andre | Inicio con partido por aceptar, racha y copa ganada |
| mateo | Tiene que aceptar la semifinal de la Copa relámpago |
| sofi | La otra semifinal, contra Vale |
| diego | Partido en disputa con Cami, y uno pendiente con Andre |
| cami | El otro voto de esa disputa |
| vale | Creó la Copa relámpago |
| nati | Pidió amistad con Andre y todavía no tiene partidos |

Para ver la doble confirmación en vivo, abre dos ventanas. En una entra Andre y en la otra Mateo (o Diego). Cada ventana guarda su sesión aparte y las dos se actualizan al instante.

Flujo corto:

1. En Amigos, copia un enlace o busca un usuario (`nati` le pide amistad a Andre).
2. En Jugar, propone un partido. En la otra ventana, acéptalo.
3. Los dos marcan el mismo ganador. El versus y Estadísticas se actualizan.
4. En Grupos abre «La junta del viernes»: tabla, ranking y matriz.
5. Abre la Copa relámpago (4 jugadores). Acepten los cruces y voten igual en cada uno hasta la final. El cuadro avanza solo.

Si el navegador ya tenía datos viejos, en Perfil puedes restablecer la demostración.

## Movimiento y sonido

Quien todavía no entra ve primero una portada (el toro, el nombre y el botón de entrar). Adentro, las pantallas entran como un gráfico de transmisión (piezas sesgadas, en escalera) y salen hacia un lado al pulsar, antes de que aparezca la siguiente. El sonido es sintetizado en el navegador: no hay archivos de audio. El interruptor **SONIDO / MUTE** queda arriba a la derecha y recuerda la preferencia. Detalle y licencia en `docs/AUDIO.md`.

## Tests

```bash
npm test
npm run typecheck
```

Cubren la doble confirmación, la disputa, la expiración, el avance del cuadro, las estadísticas y el rating. La migración SQL no se ejecuta en esos tests: es el mismo reglamento, escrito para Postgres.

## Supabase

1. Instala la CLI y, en esta carpeta, corre `supabase start` y `supabase db reset`.
2. Copia `.env.example` a `.env.local`.
3. Pon `EXPO_PUBLIC_SUPABASE_URL` (suele ser `http://127.0.0.1:54321`) y la clave anónima que imprime la CLI. Las dos juntas, o ninguna: si falta una, la app se detiene a propósito.
4. El inicio de sesión es solo con Google (ver «Entrar con Google»).
5. Reinicia `npm run web`. Las variables se leen al arrancar.

La migración `supabase/migrations/20261024120000_piquemos_v1.sql` crea las tablas, las políticas RLS y las funciones. El cliente no inserta partidos ni amistades a mano: llama a esas funciones. Realtime avisa de partidos, votos, amistades, torneos y trofeos.

El rating que ves en pantalla se recalcula con los partidos visibles (tú, tu grupo o dos amigos tuyos). `player_ratings` es una caché global del servidor y puede diferir si existe un partido que no puedes ver.

La expiración la dispara la app cada 30 segundos con `expire_pending_matches`. No hay un cron de base de datos en esta versión.

## Despliegue

```bash
npm run brand
npx expo export -p web
```

Eso deja una PWA estática en `dist/`. `vercel.json` usa ese comando, publica `dist` y reescribe cualquier ruta a `index.html` (el enlace `/i/tu-codigo` y `/auth/callback` son del cliente). Vercel sirve primero los archivos que sí existen.

`EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` se incrustan en el bundle. Defínelas en el entorno de build, no después. No hay analítica conectada: `src/lib/analytics.ts` es un adaptador apagado (aviso visible, sin grabación de sesión y con opción de excluirse cuando se active).

Sirve la PWA por HTTPS para poder instalarla. El service worker no guarda caché: cada petición va a la red, así que un deploy nuevo se ve al recargar.

En un proyecto de Supabase alojado, aplica la misma migración y agrega la URL pública a las redirecciones de Auth y al sitio permitido.

## Entrar con Google

La única entrada real es Google, con Supabase Auth (`signInWithOAuth`, proveedor `google`, flujo PKCE). Google vuelve a `/auth/callback` y supabase-js abre la sesión. El perfil lo crea el trigger `handle_new_user`.

Para activarlo en un proyecto de Supabase:

1. En Google Cloud, crea un cliente OAuth «Aplicación web» con la URI de redirección `https://<ref>.supabase.co/auth/v1/callback`.
2. En Supabase › Authentication › Providers › Google, pega el client ID y el secret y actívalo.
3. En Supabase › Authentication › URL Configuration, agrega a las redirecciones permitidas `https://campeones-fc.vercel.app/auth/callback` y, para las previews, el patrón de sus URLs (`https://<proyecto>-*-<equipo>.vercel.app/**`).

## Pruebas de punta a punta (Playwright)

Ver `e2e/README.md`. Resumen:

```bash
npx playwright install chromium
npm run e2e:stack:up   # Supabase local y desechable (sin Docker)
npm run e2e:local      # build de la app contra ese Supabase y corre las pruebas
E2E_BASE_URL=https://<preview>.vercel.app E2E_APP_SUPABASE_URL=https://<ref>.supabase.co npm run e2e   # la preview, con el backend redirigido al Supabase local
npm run e2e:stack:down
```

Las pruebas que escriben datos corren SOLO contra un Supabase local; nunca escriben en la base compartida. Para probar a mano el inicio de sesión real con Google, sigue `docs/checklist-google.md`. Para iOS, ver `docs/ios.md`.

## Qué queda fuera de esta V1

- No hay un proyecto de Supabase creado ni credenciales en el repo.
- No hay apps nativas compiladas, notificaciones push ni cron de expiración.
- El ranking de la pantalla usa los partidos que puedes ver, no la caché `player_ratings`.

## Licencia

Código abierto bajo la licencia MIT. Ver [LICENSE](LICENSE). Copyright (c) 2026 Quantz.
