# Match stakes with Trustless Work (testnet only)

Status: scaffold on branch `escrow`. Not deployed, migration not applied.

## Design (one escrow per match, settled through dispute resolution)

- Contract: Trustless Work **single-release** escrow (API V1, `dev.api.trustlesswork.com`, as proven in Meteorito), one milestone, `platformFee: 0`, asset Circle testnet USDC (`GBBD47IF…LFLA5`).
- Roles: `PLATFORM_PUBLIC` = approver, serviceProvider, releaseSigner, platformAddress **and receiver**. `STAKE_RESOLVER` (second key) = disputeResolver. Two keys are required because the contract rejects a dispute opened by the dispute resolver (`DisputeResolverCannotDisputeTheEscrow`).
- `amount` = pot (2 × stake). Each player calls `fund_escrow` for their stake, signed by their Cavos wallet (`signXdr`); the server validates the XDR (our contract, `fund_escrow`, exact amount, source = the player) and wraps it in a fee-bump paid by the platform.
- `release_funds` is never used (the receiver is fixed and the winner is unknown up front). When both players have confirmed:
  1. `dispute-escrow` signed by the platform (approver),
  2. `resolve-dispute` signed by the resolver with `distributions` summing **exactly** to the on-chain balance:
     - winner: 100% of the balance;
     - draw / no confirmation by `result_deadline` / match expired or cancelled / only one deposit by `fund_deadline`: each player gets back what they deposited.
- Fee: Trustless Work keeps 30 bps pro rata. A 100 + 100 pot pays the winner 199.40.
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

## Setup checklist (testnet)

1. Get a Trustless Work **testnet** API key: dapp.trustlesswork.com → connect wallet → Settings (name, email, use case) → API Keys → Testnet. Set `TRUSTLESS_WORK_API_KEY` in Vercel.
2. Create the resolver keypair, fund it with friendbot, and set `STAKE_RESOLVER_SECRET` (server only).
3. Give the platform account a USDC trustline (it is the receiver; TW rejects receivers without a trustline). Fill it from faucet.circle.com (20 USDC every 2 h per address) if the demo faucet is used.
4. Apply the migration and set `STAKES_ENABLED=1` and `EXPO_PUBLIC_STAKES_ENABLED=1` on a preview first.
