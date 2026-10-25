# Campeones FC

El marcador oficial del pique con tus amigos: cada partido, cada serie y cada trofeo, en un solo lugar.

Producto de Quantz, desarrolladora de software de finanzas en Costa Rica. Esta versión es solo competitiva: no hay dinero, apuestas ni pagos.

## Marca

El nombre, la frase y los colores viven en `config/branding.ts`. La app los lee desde ahí. La interfaz sigue la dirección Broadcast: gráficos de transmisión sobre azul marino, con bloques en rojo, amarillo y azul. El manifest y `app.json` se regeneran con:

```bash
npm run brand
```

## Qué puedes hacer

- Entrar con Cavos (Google, Apple o código al correo). Cada jugador recibe una wallet de Stellar. En el modo demostración entras con las cuentas de ejemplo.
- Firmar con tu wallet el resultado confirmado. La plataforma lo ancla en Stellar (testnet por ahora) con las dos firmas y el partido muestra el enlace a stellar.expert.
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
4. El inicio de sesión es solo con Cavos (ver «Cavos y Stellar»). Sin `EXPO_PUBLIC_CAVOS_APP_ID`, la pantalla de entrada muestra «Cavos no configurado».
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

`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_POSTHOG_KEY` y `EXPO_PUBLIC_POSTHOG_HOST` se incrustan en el bundle. Defínelas en el entorno de build, no después. Sin la clave de PostHog, la analítica no hace nada y no se envían correos.

Sirve la PWA por HTTPS para poder instalarla. El service worker no guarda caché: cada petición va a la red, así que un deploy nuevo se ve al recargar.

En un proyecto de Supabase alojado, aplica la misma migración y agrega la URL pública a las redirecciones de Auth y al sitio permitido.

## Cavos y Stellar

Cavos crea la wallet de Stellar de cada jugador y envía los códigos por correo (no hace falta SMTP propio). El flujo:

1. El cliente abre el modal de Cavos (`@cavos/kit` 0.4.4, parcheado en `postinstall` por `scripts/patch-cavos-kit.mjs`: autocompletar el código de 9 caracteres en iOS, errores en español, pausa entre códigos que sobrevive a recargar y aviso de revisar Spam).
2. `POST /api/auth` (`step: nonce`) entrega un nonce de un solo uso. La wallet firma `campeones-fc:bind:<identidad>:<nonce>`.
3. `POST /api/auth` (`step: session`) verifica el JWT de Cavos (emisores cerrados, `aud` = appId), la firma y el nonce, y crea o encuentra el usuario de Supabase. Solo vincula por correo si `email_verified === true` y nunca con correos `privaterelay` de Apple. La identidad es `(iss, sub)`. Como el aud de Google, Apple y el enclave es compartido entre apps de Cavos, el token solo no basta: la primera billetera que firma queda ligada a la cuenta y cada entrada exige su firma sobre un nonce de un solo uso (igual que Meteorito). El servidor nunca llama a la API HTTP de Cavos y no hay entrada solo con token. Devuelve una sesión real de Supabase, así RLS y `auth.uid()` siguen igual.
4. Con el partido confirmado, cada jugador firma `campeones-fc:match:v1:<red>:<id>:<digest>`. `POST /api/anchor` guarda la firma y, con las dos (o tras `ANCHOR_ATTEST_WAIT_HOURS`, 24 por defecto), la cuenta de la plataforma escribe el hash canónico en un memo hash y en `manageData` (`cfc:last`). Es idempotente: el hash de la transacción se guarda antes de enviarla y solo se reconstruye cuando la anterior ya expiró sin entrar.
5. Un cron de Vercel llama `GET /api/anchor` cada 10 minutos para lo que quede pendiente.
6. Acta diaria: un cron de Vercel llama `GET /api/daily` a las 00:20 (hora de Costa Rica). Arma la raíz Merkle de los resultados confirmados del día anterior (hoja = `sha256(0x00 || huella del resultado)`, nodo = `sha256(0x01 || izq || der)`, orden `confirmed_at, id`), la encadena con el hash del acta anterior y la ancla en un memo hash (`manageData` `cfc:day`). Se guarda en `chain_daily_records`. Si faltan días, los arma en orden.
7. Partidos anteriores al registro: `scripts/chain/backfill.mjs` los encola "sin firma" (`chain_backfill`) y los ancla por lotes; después pone al día las actas.

### Verificar un resultado

- `/verificar/<id>` es pública: muestra el JSON canónico, el hash, las firmas y el enlace a stellar.expert. El navegador recalcula el hash, lee el memo directo de Horizon, comprueba la prueba Merkle del acta y valida las firmas ed25519. En la app, cada partido registrado dice «✓ Verificado en Stellar».
- `GET /api/verificar?id=<id>`, `?day=YYYY-MM-DD` y `?index=1` devuelven los datos (ids públicos y direcciones G…, nunca nombres ni correos).
- Elo desde la cadena, sin el código de la app (solo Node 22):

```bash
node scripts/chain/elo-from-chain.mjs            # comprueba cada acta contra Stellar y recalcula el Elo FIDE
node scripts/chain/elo-from-chain.mjs --json
```

Poner al día (necesita `CRON_SECRET`, no lo imprime):

```bash
CRON_SECRET=... node scripts/chain/backfill.mjs
```

Variables del servidor (Vercel): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CAVOS_JWKS_URL`, `CAVOS_JWT_ISSUERS`, `CAVOS_JWT_AUDIENCE`, opcionales `CAVOS_GOOGLE_AUDIENCE`, `CAVOS_APPLE_AUDIENCE`, `CAVOS_EXTRA_ISSUER` (`<iss>|<jwks>|<aud>`, hoy `https://enclave.cavos.xyz|https://enclave.cavos.xyz/.well-known/jwks.json|cavos-email`), `CAVOS_ENVIRONMENT`, `STELLAR_NETWORK`, `PLATFORM_PUBLIC`, `PLATFORM_SECRET`, `CRON_SECRET`, `ANCHOR_ATTEST_WAIT_HOURS`. Del cliente: `EXPO_PUBLIC_CAVOS_APP_ID`, `EXPO_PUBLIC_CAVOS_RP_ID`, `EXPO_PUBLIC_CAVOS_ENVIRONMENT`, `EXPO_PUBLIC_STELLAR_NETWORK`.

Prueba real en testnet (opcional, firma con la cuenta de la plataforma):

```bash
set -a; . ./platform.env; set +a
ANCHOR_TESTNET=1 npx vitest run api/_lib/anchor.testnet.test.ts
```

## Pagos, más adelante

Esta versión no mueve valor. `src/lib/payments/escrow.ts` deja el lugar para, en una versión futura, conectar wallets y una custodia (escrow) sobre Stellar con Trustless Work. `paymentsEnabled()` devuelve `false`. Un partido ya confirmado podrá apuntar a esa custodia sin cambiar la doble confirmación del resultado. No lo implementes hasta que el producto lo pida.

## Qué queda fuera de esta V1

- No hay un proyecto de Supabase creado ni credenciales en el repo.
- El anclaje usa testnet. Para la red principal hace falta una cuenta de la plataforma propia en mainnet (ver «Verificar un resultado»).
- La migración no corre en la integración continua.
- No hay apps nativas compiladas, notificaciones push ni cron de expiración.
- La custodia en Stellar no está implementada.
- El ranking de la pantalla usa los partidos que puedes ver, no la caché `player_ratings`.
