# Registro en Stellar: paso a mainnet

Todo el cambio de red es por variables de entorno: `STELLAR_NETWORK` (servidor: passphrase, Horizon, enlaces) y
`EXPO_PUBLIC_STELLAR_NETWORK` (cliente: Cavos, enlaces a stellar.expert; se fija al compilar). Las dos tienen que
decir lo mismo. No hay URLs de testnet fijas en el código: `api/_lib/env.ts` y `src/domain/match-proof.ts` las eligen.

Costo en mainnet (base fee 100 stroops por operación, 2 operaciones por transacción): volver a anclar ~800 partidos
y ~175 actas ≈ 0.02 XLM. La cuenta además deja 2 XLM bloqueados de reserva (1 base + `cfc:last` + `cfc:day`).
El servidor no ancla si la cuenta tiene menos de 2.5 XLM (`platform_unfunded`).

## Lo que hace Vitalik (antes)

1. Crea una cuenta nueva de mainnet solo para Campeones FC y la fondea con ~10 XLM.
2. En Vercel (proyecto `campeones-fc`), **solo en Production**: `PLATFORM_PUBLIC` = la G… nueva y
   `PLATFORM_SECRET` = su secreto (tipo Sensitive). En Preview se quedan las llaves de testnet.
3. Nos pasa la dirección pública (nunca el secreto).

## Cambio (cuando lo anterior está listo)

```bash
# 1. Se niega si la cuenta no existe en mainnet o tiene menos de 5 XLM.
node scripts/chain/mainnet-cutover.mjs check --address G...
# 2. Verifica las llaves en Production, pone STELLAR_NETWORK y EXPO_PUBLIC_STELLAR_NETWORK=mainnet solo en
#    Production (Preview sigue en testnet) y redespliega. Sin VERCEL_TOKEN: hacerlo a mano en el dashboard.
VERCEL_TOKEN=... VERCEL_TEAM_ID=team_LsDFjLJR2YHkE9z7oALdbzTa node scripts/chain/mainnet-cutover.mjs switch --address G...
# 3. Cuando el deploy esté READY: producción dice mainnet, con esa cuenta y con saldo.
node scripts/chain/mainnet-cutover.mjs verify --address G...
# 4. Vuelve a anclar todo el historial en mainnet (lo de testnet se archiva en chain_anchor_archive)
#    y empieza la cadena de actas de mainnet desde el primer día.
CRON_SECRET=... node scripts/chain/mainnet-cutover.mjs backfill --address G...
# 5. Comprobación independiente:
node scripts/chain/elo-from-chain.mjs
```

Después: abrir un `/verificar/<id>`; el enlace debe ir a `stellar.expert/explorer/public/tx/...`.

Volver atrás: poner las dos variables en `testnet` y redesplegar. Lo anclado en mainnet queda en la cadena; correr
`backfill.mjs` lo vuelve a anclar en testnet (lo de mainnet se archiva igual).

Riesgo a confirmar: que la app de Cavos esté habilitada para mainnet en su consola. La dirección de cada jugador no
cambia de red (se deriva de su llave y `APP_SALT`, no de la red), así que las billeteras ligadas siguen valiendo.
