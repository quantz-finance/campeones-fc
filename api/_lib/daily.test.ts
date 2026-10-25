import { Account, Keypair, Networks, type Transaction } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { resultDigest } from '../../src/domain/match-proof';
import { EMPTY_ROOT, merkleRoot, recordHash } from '../../src/domain/merkle';
import { anchorMatch, toResult, type MatchRow } from './anchor';
import { buildMissingDays, runDaily, type DailyRow, type DailyStore, type DayMatch } from './daily';
import { buildAnchorTx, DAILY_DATA_KEY, type Chain } from './stellar';

const PLATFORM = Keypair.random();
const uid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const m = (n: number, at: string): DayMatch => ({
  id: uid(n),
  player_a_id: uid(900),
  player_b_id: uid(901),
  winner_id: n % 3 === 0 ? null : uid(900),
  is_draw: n % 3 === 0,
  goals_a: n % 3 === 0 ? 1 : 2,
  goals_b: n % 3 === 0 ? 1 : 0,
  confirmed_at: at,
});

function memory(matches: DayMatch[]) {
  const rows: DailyRow[] = [];
  const store: DailyStore = {
    async lastRecord() {
      return rows.length ? { ...rows[rows.length - 1] } : null;
    },
    async firstConfirmedAt() {
      return matches.map((x) => x.confirmed_at!).sort()[0] ?? null;
    },
    async dayMatches(from, to) {
      return matches.filter((x) => x.confirmed_at! >= from && x.confirmed_at! < to);
    },
    async insertRecord(r) {
      if (!rows.some((x) => x.day === r.day)) rows.push({ ...r, status: 'pending', tx: null, max_time: null, attempts: 0 });
    },
    async queue(limit) {
      return rows.filter((r) => r.status === 'pending' || r.status === 'submitting').slice(0, limit).map((r) => r.day);
    },
    async claim(day) {
      const r = rows.find((x) => x.day === day);
      if (!r || (r.status !== 'pending' && r.status !== 'submitting')) return null;
      r.status = 'submitting';
      return { ...r };
    },
    async savePrepared(day, p) {
      Object.assign(rows.find((x) => x.day === day)!, p);
    },
    async markAnchored(day, tx) {
      Object.assign(rows.find((x) => x.day === day)!, { status: 'anchored', tx });
    },
    async release(day, p) {
      rows.find((x) => x.day === day)!.status = p.status;
    },
  };
  return { store, rows };
}

function fakeChain() {
  const submitted: Transaction[] = [];
  let seq = 1n;
  const chain: Chain & { submitted: Transaction[] } = {
    submitted,
    async txStatus(h) {
      return submitted.some((t) => Buffer.from(t.hash()).toString('hex') === h) ? 'success' : 'missing';
    },
    async ledgerCloseS() {
      return Math.floor(Date.now() / 1000);
    },
    async buildAnchor(hashHex, dataKey) {
      const tx = buildAnchorTx({ source: new Account(PLATFORM.publicKey(), String(seq++)), hashHex, dataKey, passphrase: Networks.TESTNET, windowS: 60 });
      tx.sign(PLATFORM);
      return { tx, hash: Buffer.from(tx.hash()).toString('hex'), maxTime: Number(tx.timeBounds!.maxTime) };
    },
    async submit(tx) {
      submitted.push(tx);
      return { hash: Buffer.from(tx.hash()).toString('hex') };
    },
  };
  return chain;
}

describe('acta diaria', () => {
  // 23 oct (CR): 2 partidos; 24 oct: ninguno; 25 oct: 1 (hoy, todavía no se cierra).
  const matches = [
    m(2, '2026-10-24T03:00:00.000Z'), // 23 oct 21:00 CR
    m(1, '2026-10-23T07:00:00.000Z'), // 23 oct 01:00 CR
    m(3, '2026-10-25T07:00:00.000Z'), // 25 oct 01:00 CR
  ];
  const now = () => new Date('2026-10-25T08:00:00.000Z'); // 25 oct 02:00 CR
  const now24 = () => new Date('2026-10-24T08:00:00.000Z'); // 24 oct 02:00 CR

  it('sin historial arranca ayer: no crea actas de días pasados', async () => {
    const { store } = memory(matches);
    expect(await buildMissingDays({ store, network: 'testnet', now })).toEqual(['2026-10-24']);
  });

  it('arma los días cerrados en orden, encadenados, y no el día en curso', async () => {
    const { store, rows } = memory(matches);
    expect(await buildMissingDays({ store, network: 'testnet', now: now24 })).toEqual(['2026-10-23']);
    expect(await buildMissingDays({ store, network: 'testnet', now })).toEqual(['2026-10-24']);
    expect(rows[0].match_ids).toEqual([uid(1), uid(2)]);
    const digests = [matches[1], matches[0]].map((x) => resultDigest(toResult({ ...x, status: 'confirmed' } as MatchRow)));
    expect(rows[0].root).toBe(merkleRoot(digests));
    expect(rows[0].prev_hash).toBeNull();
    expect(rows[1].root).toBe(EMPTY_ROOT);
    expect(rows[1].prev_hash).toBe(rows[0].record_hash);
    expect(rows[1].record_hash).toBe(recordHash(rows[1].record));
    expect(await buildMissingDays({ store, network: 'testnet', now })).toEqual([]);
  });

  it('ancla cada acta una vez con memo hash y manageData cfc:day', async () => {
    const { store, rows } = memory(matches);
    const chain = fakeChain();
    const first = await runDaily({ store, chain, network: 'testnet', now: now24 });
    expect(first.results).toEqual({ '2026-10-23': 'anchored' });
    const out = await runDaily({ store, chain, network: 'testnet', now });
    expect(out.results).toEqual({ '2026-10-24': 'anchored' });
    expect(chain.submitted).toHaveLength(2);
    const tx = chain.submitted[0];
    expect(Buffer.from(tx.memo.value as Buffer).toString('hex')).toBe(rows[0].record_hash);
    expect((tx.operations[0] as any).name).toBe(DAILY_DATA_KEY);
    const again = await runDaily({ store, chain, network: 'testnet', now });
    expect(again.results).toEqual({});
    expect(chain.submitted).toHaveLength(2);
  });
});

describe('backfill', () => {
  it('un partido viejo marcado chain_backfill se ancla sin esperar firmas', async () => {
    const row: MatchRow = {
      id: uid(5),
      player_a_id: uid(900),
      player_b_id: uid(901),
      status: 'confirmed',
      winner_id: uid(900),
      is_draw: false,
      goals_a: 3,
      goals_b: 1,
      confirmed_at: new Date(Date.now() - 60_000).toISOString(),
      chain_status: 'pending',
      chain_hash: null,
      chain_tx: null,
      chain_max_time: null,
      chain_attempts: 0,
      chain_backfill: true,
    };
    const s = { ...row } as MatchRow;
    const chain = fakeChain();
    const store: any = {
      getMatch: async () => ({ ...s }),
      walletOf: async () => null,
      attestations: async () => [],
      saveAttestation: async () => undefined,
      claim: async () => (s.chain_status === 'pending' ? (Object.assign(s, { chain_status: 'submitting' }), { ...s }) : null),
      savePrepared: async (_: string, p: any) => Object.assign(s, p),
      markAnchored: async (_: string, tx: string) => Object.assign(s, { chain_status: 'anchored', chain_tx: tx }),
      release: async (_: string, p: any) => Object.assign(s, { chain_status: p.status }),
      queue: async () => [],
    };
    const r = await anchorMatch({ store, chain, network: 'testnet', attestWaitS: 86_400 }, s.id);
    expect(r.state).toBe('anchored');
    expect((s as any).chain_payload.players.every((p: any) => p.signature === null)).toBe(true);
    expect(s.chain_network).toBe('testnet');
    // Al cambiar a mainnet, lo anclado en testnet no cuenta: lo vuelve a encolar el backfill.
    const onMainnet = await anchorMatch({ store, chain, network: 'mainnet', attestWaitS: 86_400 }, s.id);
    expect(onMainnet.state).toBe('not_queued');
  });
});
