import { Keypair, Networks, Account, TransactionBuilder, Transaction } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { attestationMessage } from '../../src/domain/match-proof';
import { anchorMatch, recordAttestation, sweep, toResult, type AnchorStore, type Attestation, type MatchRow } from './anchor';
import { prefixedMessage } from './proof';
import { buildAnchorTx, DATA_KEY, SubmitError, type Chain, type TxStatus } from './stellar';

const A = Keypair.random();
const B = Keypair.random();
const PLATFORM = Keypair.random();

function row(p: Partial<MatchRow> = {}): MatchRow {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    player_a_id: 'user-a',
    player_b_id: 'user-b',
    status: 'confirmed',
    winner_id: 'user-a',
    is_draw: false,
    goals_a: 2,
    goals_b: 0,
    confirmed_at: '2026-10-24T22:00:00.000Z',
    chain_status: 'pending',
    chain_hash: null,
    chain_tx: null,
    chain_max_time: null,
    chain_attempts: 0,
    ...p,
  };
}

function memoryStore(m: MatchRow) {
  const state = { m: { ...m } as MatchRow & { claimed?: number; payload?: unknown; error?: string | null }, atts: [] as Attestation[] };
  const wallets: Record<string, string> = { 'user-a': A.publicKey(), 'user-b': B.publicKey() };
  const store: AnchorStore = {
    async getMatch(id) {
      return id === state.m.id ? { ...state.m } : null;
    },
    async walletOf(u) {
      return wallets[u] ?? null;
    },
    async attestations() {
      return [...state.atts];
    },
    async saveAttestation(a) {
      if (!state.atts.some((x) => x.user_id === a.user_id)) state.atts.push(a);
    },
    async claim(id, staleBefore) {
      const s = state.m;
      if (id !== s.id || s.status !== 'confirmed') return null;
      const stale = s.chain_status === 'submitting' && (!s.claimed || s.claimed < staleBefore.getTime());
      if (s.chain_status !== 'pending' && !stale) return null;
      s.chain_status = 'submitting';
      s.claimed = now.getTime();
      return { ...s };
    },
    async savePrepared(_id, p) {
      Object.assign(state.m, p, { payload: p.chain_payload });
    },
    async markAnchored(_id, tx) {
      Object.assign(state.m, { chain_status: 'anchored', chain_tx: tx, claimed: undefined });
    },
    async release(_id, p) {
      state.m.chain_status = p.status;
      state.m.error = p.error;
      if (p.status !== 'submitting') state.m.claimed = undefined;
    },
    async queue() {
      return ['pending', 'submitting'].includes(state.m.chain_status ?? '') ? [state.m.id] : [];
    },
  };
  return { store, state };
}

let now = new Date('2026-10-24T22:00:30.000Z');
const clock = () => now;

function fakeChain(opts: { submit?: (tx: Transaction) => Promise<{ hash: string }>; status?: (h: string) => TxStatus; closeS?: () => number } = {}) {
  const submitted: Transaction[] = [];
  let seq = 100n;
  const chain: Chain & { submitted: Transaction[] } = {
    submitted,
    async txStatus(h) {
      return opts.status ? opts.status(h) : submitted.some((t) => Buffer.from(t.hash()).toString('hex') === h) ? 'success' : 'missing';
    },
    async ledgerCloseS() {
      return opts.closeS ? opts.closeS() : Math.floor(now.getTime() / 1000);
    },
    async buildAnchor(hashHex) {
      const acct = new Account(PLATFORM.publicKey(), String(seq++));
      const tx = buildAnchorTx({ source: acct, hashHex, passphrase: Networks.TESTNET, windowS: 60 });
      tx.sign(PLATFORM);
      return { tx, hash: Buffer.from(tx.hash()).toString('hex'), maxTime: Number(tx.timeBounds!.maxTime) };
    },
    async submit(tx) {
      if (opts.submit) return opts.submit(tx);
      submitted.push(tx);
      return { hash: Buffer.from(tx.hash()).toString('hex') };
    },
  };
  return chain;
}

const sign = (kp: Keypair, m: MatchRow) => ({
  publicKey: kp.publicKey(),
  signature: kp.sign(prefixedMessage(attestationMessage(toResult(m), 'testnet'))).toString('base64'),
});

describe('anclaje de partidos', () => {
  it('la tx lleva memo hash y manageData con el mismo hash', () => {
    const tx = buildAnchorTx({ source: new Account(PLATFORM.publicKey(), '1'), hashHex: 'ab'.repeat(32), passphrase: Networks.TESTNET, windowS: 60 });
    expect(tx.memo.type).toBe('hash');
    expect(Buffer.from(tx.memo.value as Buffer).toString('hex')).toBe('ab'.repeat(32));
    expect(tx.operations).toHaveLength(1);
    const op: any = tx.operations[0];
    expect(op.type).toBe('manageData');
    expect(op.name).toBe(DATA_KEY);
    expect(Buffer.from(op.value).toString('hex')).toBe('ab'.repeat(32));
    expect(Number(tx.timeBounds!.maxTime)).toBeGreaterThan(0);
    expect(() => TransactionBuilder.fromXDR(tx.toXDR(), Networks.TESTNET)).not.toThrow();
  });

  it('espera las dos firmas y luego ancla una sola vez (idempotente)', async () => {
    now = new Date('2026-10-24T22:00:30.000Z');
    const { store, state } = memoryStore(row());
    const chain = fakeChain();
    const deps = { store, chain, network: 'testnet' as const, attestWaitS: 3600, now: clock };
    expect((await anchorMatch(deps, state.m.id)).state).toBe('waiting_signatures');
    await recordAttestation(store, 'testnet', 'user-a', state.m.id, sign(A, state.m));
    expect((await anchorMatch(deps, state.m.id)).state).toBe('waiting_signatures');
    await recordAttestation(store, 'testnet', 'user-b', state.m.id, sign(B, state.m));
    const r = await anchorMatch(deps, state.m.id);
    expect(r).toMatchObject({ state: 'anchored', fresh: true });
    const again = await anchorMatch(deps, state.m.id);
    expect(again).toMatchObject({ state: 'anchored', fresh: false });
    expect(chain.submitted).toHaveLength(1);
    const payload: any = (state.m as any).payload;
    expect(payload.players.map((p: any) => !!p.signature)).toEqual([true, true]);
    expect(Buffer.from(chain.submitted[0].memo.value as Buffer).toString('hex')).toBe(state.m.chain_hash);
  });

  it('pasado el plazo ancla con las firmas que haya', async () => {
    now = new Date('2026-10-26T00:00:00.000Z');
    const { store, state } = memoryStore(row());
    const chain = fakeChain();
    const r = await anchorMatch({ store, chain, network: 'testnet', attestWaitS: 3600, now: clock }, state.m.id);
    expect(r.state).toBe('anchored');
    expect((state.m as any).payload.players.every((p: any) => p.signature === null)).toBe(true);
  });

  it('rechaza firmas de otra llave o de quien no jugó', async () => {
    const { store, state } = memoryStore(row());
    await expect(recordAttestation(store, 'testnet', 'user-a', state.m.id, sign(B, state.m))).rejects.toMatchObject({ code: 'bad_attestation' });
    await expect(recordAttestation(store, 'testnet', 'user-z', state.m.id, sign(A, state.m))).rejects.toMatchObject({ code: 'not_player' });
    const pending = memoryStore(row({ status: 'in_progress', chain_status: null, confirmed_at: null }));
    await expect(recordAttestation(pending.store, 'testnet', 'user-a', pending.state.m.id, { publicKey: A.publicKey(), signature: 'x' })).rejects.toMatchObject({
      code: 'not_confirmed',
    });
  });

  it('no ancla partidos sin confirmar ni los de antes de la migración', async () => {
    const chain = fakeChain();
    const a = memoryStore(row({ status: 'in_progress', confirmed_at: null, chain_status: null }));
    expect((await anchorMatch({ store: a.store, chain, network: 'testnet', attestWaitS: 0 }, a.state.m.id)).state).toBe('not_confirmed');
    const b = memoryStore(row({ chain_status: null }));
    expect((await anchorMatch({ store: b.store, chain, network: 'testnet', attestWaitS: 0 }, b.state.m.id)).state).toBe('not_queued');
    expect(chain.submitted).toHaveLength(0);
  });

  it('si el envío no responde, no reconstruye hasta que la tx venza y no haya entrado', async () => {
    now = new Date('2026-10-26T00:00:00.000Z');
    const { store, state } = memoryStore(row());
    let close = Math.floor(now.getTime() / 1000);
    const chain = fakeChain({
      submit: async () => {
        throw new SubmitError('timeout', null, true);
      },
      status: () => 'missing',
      closeS: () => close,
    });
    const deps = { store, chain, network: 'testnet' as const, attestWaitS: 0, now: clock };
    expect((await anchorMatch(deps, state.m.id)).state).toBe('retry_later');
    expect(state.m.chain_status).toBe('submitting');
    const firstTx = state.m.chain_tx;
    expect(firstTx).toMatch(/^[a-f0-9]{64}$/);
    // Otro intento inmediato: el claim sigue vigente.
    expect((await anchorMatch(deps, state.m.id)).state).toBe('busy');
    // Pasa el claim viejo pero la tx aún no vence según el ledger: sigue en vuelo, misma tx.
    now = new Date(now.getTime() + 95_000);
    close = state.m.chain_max_time! - 1;
    expect((await anchorMatch(deps, state.m.id)).state).toBe('in_flight');
    expect(state.m.chain_tx).toBe(firstTx);
    // Venció y no entró: ahora sí reconstruye (nueva tx).
    now = new Date(now.getTime() + 95_000);
    close = state.m.chain_max_time! + 1;
    (chain as any).submit = async (tx: Transaction) => {
      chain.submitted.push(tx);
      return { hash: Buffer.from(tx.hash()).toString('hex') };
    };
    const r = await anchorMatch(deps, state.m.id);
    expect(r.state).toBe('anchored');
    expect(state.m.chain_tx).not.toBe(firstTx);
    expect(state.m.chain_attempts).toBe(2);
  });

  it('si la tx anterior sí entró, la marca anclada sin reenviar', async () => {
    now = new Date('2026-10-26T00:00:00.000Z');
    const prior = 'cd'.repeat(32);
    const { store, state } = memoryStore(row({ chain_status: 'submitting', chain_tx: prior, chain_max_time: 1, chain_attempts: 1 }));
    const chain = fakeChain({ status: (h) => (h === prior ? 'success' : 'missing') });
    const r = await sweep({ store, chain, network: 'testnet', attestWaitS: 0, now: clock });
    expect(r[state.m.id]).toBe('anchored');
    expect(state.m.chain_tx).toBe(prior);
    expect(chain.submitted).toHaveLength(0);
  });

  it('rechazo con códigos (p. ej. tx_bad_seq) vuelve a la cola para reintentar', async () => {
    now = new Date('2026-10-26T00:00:00.000Z');
    const { store, state } = memoryStore(row());
    const chain = fakeChain({
      submit: async () => {
        throw new SubmitError('bad seq', { transaction: 'tx_bad_seq' }, true);
      },
      status: () => 'missing',
    });
    expect((await anchorMatch({ store, chain, network: 'testnet', attestWaitS: 0, now: clock }, state.m.id)).state).toBe('retry_later');
    expect(state.m.chain_status).toBe('pending');
  });
});
