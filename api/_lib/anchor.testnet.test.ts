// E2E opcional contra Stellar testnet con la cuenta platform real.
// Corre solo con ANCHOR_TESTNET=1 y PLATFORM_PUBLIC/PLATFORM_SECRET en el entorno:
//   set -a; . /ruta/segura/platform.env; set +a; ANCHOR_TESTNET=1 npx vitest run api/_lib/anchor.testnet.test.ts
import { Horizon, Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { anchorHash, attestationMessage, explorerTxUrl } from '../../src/domain/match-proof';
import { anchorMatch, recordAttestation, toResult, type AnchorStore, type Attestation, type MatchRow } from './anchor';
import { prefixedMessage } from './proof';
import { DATA_KEY, horizonChain } from './stellar';

const enabled = process.env.ANCHOR_TESTNET === '1' && !!process.env.PLATFORM_SECRET;

describe.skipIf(!enabled)('anclaje real en testnet', () => {
  it('ancla un partido confirmado (fabricado) con las firmas de los dos jugadores, una sola vez', async () => {
    process.env.STELLAR_NETWORK = 'testnet';
    const A = Keypair.random();
    const B = Keypair.random();
    const m: MatchRow = {
      id: crypto.randomUUID(),
      player_a_id: crypto.randomUUID(),
      player_b_id: crypto.randomUUID(),
      status: 'confirmed',
      winner_id: null,
      is_draw: false,
      goals_a: 3,
      goals_b: 1,
      confirmed_at: new Date().toISOString(),
      chain_status: 'pending',
      chain_hash: null,
      chain_tx: null,
      chain_max_time: null,
      chain_attempts: 0,
    };
    m.winner_id = m.player_a_id;
    const wallets: Record<string, string> = { [m.player_a_id]: A.publicKey(), [m.player_b_id]: B.publicKey() };
    const atts: Attestation[] = [];
    let payload: any = null;
    const store: AnchorStore = {
      getMatch: async () => ({ ...m }),
      walletOf: async (u) => wallets[u] ?? null,
      attestations: async () => [...atts],
      saveAttestation: async (a) => void atts.push(a),
      claim: async () => (m.chain_status === 'pending' ? (Object.assign(m, { chain_status: 'submitting' }), { ...m }) : null),
      savePrepared: async (_id, p) => {
        Object.assign(m, p);
        payload = p.chain_payload;
      },
      markAnchored: async (_id, tx) => void Object.assign(m, { chain_status: 'anchored', chain_tx: tx }),
      release: async (_id, p) => void Object.assign(m, { chain_status: p.status }),
      queue: async () => [],
    };
    const msg = attestationMessage(toResult(m), 'testnet');
    for (const [kp, user] of [[A, m.player_a_id], [B, m.player_b_id]] as const) {
      await recordAttestation(store, 'testnet', user, m.id, { publicKey: kp.publicKey(), signature: kp.sign(prefixedMessage(msg)).toString('base64') });
    }
    const deps = { store, chain: horizonChain(), network: 'testnet' as const, attestWaitS: 3600 };
    const r = await anchorMatch(deps, m.id);
    expect(r.state).toBe('anchored');
    if (r.state !== 'anchored') return;
    expect(await anchorMatch(deps, m.id)).toMatchObject({ state: 'anchored', fresh: false, tx: r.tx });

    const server = new Horizon.Server('https://horizon-testnet.stellar.org');
    const tx: any = await server.transactions().transaction(r.tx).call();
    expect(tx.successful).toBe(true);
    expect(tx.memo_type).toBe('hash');
    expect(Buffer.from(tx.memo, 'base64').toString('hex')).toBe(anchorHash(payload));
    const acct: any = await server.loadAccount(process.env.PLATFORM_PUBLIC!);
    expect(Buffer.from(acct.data_attr[DATA_KEY], 'base64').toString('hex')).toBe(anchorHash(payload));
    console.log(`ANCHOR_TX ${r.tx} ${explorerTxUrl(r.tx, 'testnet')} hash=${anchorHash(payload)} match=${m.id} fee_charged=${tx.fee_charged}`);
  }, 90_000);
});
