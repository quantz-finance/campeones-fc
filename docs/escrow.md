# Match stakes with Trustless Work (testnet only)

Status: scaffold on branch `escrow`. Not deployed, migration not applied.

## Design (one escrow per match, settled through dispute resolution)

- Contract: Trustless Work **single-release** escrow (API V1, `dev.api.trustlesswork.com`, as proven in Meteorito), one milestone, `platformFee: 0`, asset Circle testnet USDC (`GBBD47IF…LFLA5`).
- Roles: `PLATFORM_PUBLIC` = approver, serviceProvider, releaseSigner, platformAddress **and receiver**. `STAKE_RESOLVER` (second key) = disputeResolver. Two keys are required because the contract rejects a dispute opened by the dispute resolver (`DisputeResolverCannotDisputeTheEscrow`).
- `amount` = pot (2 × stake). Each player calls `fund_escrow` for their stake, signed by their Cavos wallet (`signXdr`); the server validates the XDR (our contract, `fund_escrow`, exact amount, source = the player) and wraps it in a fee-bump paid by the platform.
- `release_funds` is never used (the receiver is fixed and the winner is unknown up front). When both players have confirmed:
  1. `dispute-escrow` signed by the platform (approver), submitted straight to Horizon (not TW send-transaction),
  2. `resolve-dispute` signed by the resolver (pays its own fee), also straight to Horizon, with `distributions` summing **exactly** to the on-chain balance:
     - winner: 100% of the balance;
     - draw / no confirmation by `result_deadline` / match expired or cancelled / only one deposit by `fund_deadline`: each player gets back what they deposited.
- Stakes: 5 / 10 / 20 test USDC (default 10, max 20). Fee: Trustless Work keeps 30 bps pro rata; a 10 + 10 pot pays the winner 19.94.
- State is read from the contract (Soroban simulation of `get_escrow` and the USDC SAC `balance`), not from the TW indexer (it misses fee-bumped txs).

## Flow

1. Player A proposes a stake on a match (`propose`). Player B accepts (`accept`), and the server checks both USDC trustlines and deploys the escrow.
2. Each player taps "Depositar": `fund_xdr` → Cavos `signXdr` → `fund`. Both funded → `locked`.
3. They play and both confirm (`submit_match_report`). The client calls `settle` (the cron also sweeps every 10 min) → `paid` / `refunded`, with the `settle_tx` link to stellar.expert ("Verificado en Stellar").

One-time: `trustline_xdr` / `trustline` (sponsored `changeTrust`, signed by the player); optional `faucet` from the platform treasury.

## Files

- `api/_lib/stake.ts` (pure decision + amounts, tested), `api/_lib/stakeFlow.ts` (orchestration), `api/_lib/tw.ts` (TW client), `api/_lib/feebump.ts` (XDR validation + fee-bump, tested), `api/_lib/trustline.ts`, `api/stake.ts` (endpoint + cron)
- `supabase/migrations/20261026000000_match_stakes.sql`
- `src/lib/payments/stake.ts` (client), `signXdr` added to the Cavos bridge

## UI

- `Registrar` tab: stake picker (Sin apuesta / 5 / 10 / 20) when proposing a match; the proposal is sent right after the match is created.
- Match screen: `StakeCard` (src/ui/stake-card.tsx) with status chip, Aceptar apuesta / Jugar sin apuesta, Depositar (Cavos signXdr; activates the USDC trustline and claims the demo faucet first), pot locked, paid/refunded with "✓ Verificado en Stellar" (stellar.expert link).
- After a report is submitted the client calls `settle`; the card also nudges `settle` when it sees a confirmed match with a pot.

## Testnet accounts (done 2026-10-24)

- Platform `GCV7BH45ZTACITJKW7VR5YZ5JGXKXOHGRNJ4E5MVHD77WP6G7ZWNNBCP`: USDC trustline added, 200 test USDC (DEX path payment XLM→USDC from a friendbot account).
- Resolver `GDOVWNIIHKDYDQX5PEZ34VJDLWJGVKVSWGBSE4O3D7PSY2FYSRXKGTWB`: friendbot-funded. Secret only in `/workspace/cfc/secrets/stake_resolver.env` on the box.
- Refill platform USDC: `node /workspace/out/refill-testnet-treasury.mjs GCV7BH45ZTACITJKW7VR5YZ5JGXKXOHGRNJ4E5MVHD77WP6G7ZWNNBCP 200` (from a folder with @stellar/stellar-sdk).

## Setup checklist (testnet)

1. Trustless Work **testnet** API key (browser, ~3 min): open https://dapp.trustlesswork.com with Freighter (or xBull / Albedo / LOBSTR via Stellar Wallets Kit) set to **Testnet** → Connect → Settings: name, email, **use case** (required) → API Keys → Network **Testnet** → Request API Key → copy once. Set it in Vercel as `TRUSTLESS_WORK_API_KEY` (Preview first).
2. Vercel env (Preview): `STAKE_RESOLVER_SECRET` (from the box file), `STAKES_ENABLED=1`, `EXPO_PUBLIC_STAKES_ENABLED=1`, `STAKE_FAUCET_UNITS=10`, `STAKE_MAX_UNITS=20`. Already there: `PLATFORM_PUBLIC`, `PLATFORM_SECRET`, `CRON_SECRET`, Supabase keys.
3. Apply `supabase/migrations/20261026000000_match_stakes.sql` (a branch/preview DB first, then project ncduberxgrvgbkruhkvr).
4. Smoke test on the preview with two accounts: propose 10 → accept → both Depositar → both vote the same winner → card shows Pagado + Verificado en Stellar. Also a draw (refund) once.
5. Merge to main.
