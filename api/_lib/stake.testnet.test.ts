// E2E opcional contra Stellar testnet + Trustless Work dev API (dinero de prueba). Sin base de datos: usa las mismas
// funciones que api/stake.ts. Jugadores = cuentas nuevas SIN XLM (como las de Cavos): la plataforma patrocina todo.
//   set -a; . platform.env; . stake_resolver.env; TRUSTLESS_WORK_API_KEY=$(cat tw_api_key.value); set +a
//   STAKE_TESTNET=1 npx vitest run api/_lib/stake.testnet.test.ts
import { Keypair, Networks, TransactionBuilder, type Transaction } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { feeBumpAndSend, validateEscrowTx } from './feebump';
import { decide, STROOPS, toUnits, type MatchLite, type StakeRow } from './stake';
import { buildTrustlineTx, faucetTx, submitTrustlineTx, usdcBalance, validateTrustlineTx, walletState } from './trustline';
import * as tw from './tw';

const enabled = process.env.STAKE_TESTNET === '1' && !!process.env.TRUSTLESS_WORK_API_KEY && !!process.env.STAKE_RESOLVER_SECRET;
const sign = (xdr: string, kp: Keypair) => { const t = TransactionBuilder.fromXDR(xdr, Networks.TESTNET) as Transaction; t.sign(kp); return t.toXDR(); };

describe.skipIf(!enabled)('apuesta real en testnet', () => {
  it('10 + 10: escrow, dos depósitos, gana A y cobra ~19.94', async () => {
    process.env.STELLAR_NETWORK = 'testnet';
    const A = Keypair.random(), B = Keypair.random();
    for (const p of [A, B]) {
      const st = await walletState(p.publicKey());
      expect(st).toBe('no_account');
      const tx = await buildTrustlineTx(p.publicKey(), 'no_account');
      await submitTrustlineTx(validateTrustlineTx(sign(tx.toXDR(), p), p.publicKey())).catch((e: any) => { throw new Error('trustline ' + JSON.stringify(e.extra)); });
      await faucetTx(p.publicKey(), 10);
      expect(await usdcBalance(p.publicKey())).toBe(10);
    }
    const matchId = crypto.randomUUID();
    const stake = 10n * STROOPS;
    const { contractId, hash } = await tw.deployStakeEscrow({ matchId, potUnits: 20, title: `Campeones FC smoke ${matchId.slice(0, 8)}` });
    console.log('[smoke] escrow', contractId, 'deploy', hash);
    const funded: Record<string, string> = {};
    for (const [k, p] of [['a', A], ['b', B]] as const) {
      const unsigned = await tw.fundEscrowXdr(contractId, p.publicKey(), toUnits(stake));
      console.log('[smoke] fund inner fee', (TransactionBuilder.fromXDR(unsigned, Networks.TESTNET) as Transaction).fee);
      const inner = validateEscrowTx(sign(unsigned, p), { contractId, fn: 'fund_escrow', source: p.publicKey(), amountStroops: stake });
      funded[k] = (await feeBumpAndSend(inner)).hash;
    }
    const bal = await tw.escrowBalanceStroops(contractId);
    expect(bal).toBe(20n * STROOPS);
    const row: StakeRow = {
      match_id: matchId, status: 'locked', stake_stroops: stake, contract_id: contractId, player_a_address: A.publicKey(), player_b_address: B.publicKey(),
      funded_a_tx: funded.a, funded_b_tx: funded.b, fund_deadline: null, result_deadline: null,
    };
    const m: MatchLite = { id: matchId, player_a_id: 'ua', player_b_id: 'ub', status: 'confirmed', winner_id: 'ua', is_draw: false };
    const d = decide(row, m, bal);
    expect(d.action).toBe('settle');
    if (d.action !== 'settle') return;
    const dz = await tw.disputeEscrow(contractId);
    const r = await tw.resolveDispute(contractId, d.distributions.map((x) => ({ address: x.address, amount: toUnits(x.stroops) })));
    console.log('[smoke] dispute', dz.hash, 'payout', r.hash, `https://stellar.expert/explorer/testnet/tx/${r.hash}`);
    const flags = await tw.escrowFlags(contractId);
    expect(flags.resolved).toBe(true);
    const won = await usdcBalance(A.publicKey());
    console.log('[smoke] winner USDC', won, 'loser USDC', await usdcBalance(B.publicKey()));
    expect(won).toBeCloseTo(19.94, 2);
  }, 240_000);
});
