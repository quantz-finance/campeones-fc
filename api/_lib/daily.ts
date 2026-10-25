// Acta diaria: cada noche (00:20 hora de Costa Rica) se arma la raíz Merkle de los resultados confirmados
// del día anterior, encadenada con el acta previa, y se ancla en Stellar (memo hash + manageData 'cfc:day').
// Si faltan días (primera vez, cron caído) los arma en orden, unos cuantos por llamada.
// Anclaje idempotente igual que el de cada partido: el hash de la tx se guarda antes de enviarla.
import { resultDigest, type ChainNetwork } from '../../src/domain/match-proof';
import { dailyRecord, dayOf, dayRange, nextDay, recordHash, type DailyRecord } from '../../src/domain/merkle';
import { MAX_ATTEMPTS, CLAIM_STALE_S, toResult, type MatchRow } from './anchor';
import { DAILY_DATA_KEY, SubmitError, type Chain } from './stellar';
import { rebuildDecision } from './timebounds';

export type DailyRow = {
  day: string;
  network: ChainNetwork;
  match_count: number;
  root: string;
  prev_hash: string | null;
  record_hash: string;
  record: DailyRecord;
  match_ids: string[];
  status: 'pending' | 'submitting' | 'anchored' | 'failed';
  tx: string | null;
  max_time: number | null;
  attempts: number;
};

export type DayMatch = Pick<MatchRow, 'id' | 'player_a_id' | 'player_b_id' | 'winner_id' | 'is_draw' | 'goals_a' | 'goals_b' | 'confirmed_at'>;

export interface DailyStore {
  lastRecord(): Promise<DailyRow | null>;
  firstConfirmedAt(): Promise<string | null>;
  /** Confirmados con confirmed_at en [from, to), en orden (confirmed_at, id). */
  dayMatches(from: string, to: string): Promise<DayMatch[]>;
  /** Inserta si no existe ese día. */
  insertRecord(row: Omit<DailyRow, 'status' | 'tx' | 'max_time' | 'attempts'>): Promise<void>;
  queue(limit: number, staleBefore: Date): Promise<string[]>;
  claim(day: string, staleBefore: Date): Promise<DailyRow | null>;
  savePrepared(day: string, p: { tx: string; max_time: number; attempts: number }): Promise<void>;
  markAnchored(day: string, tx: string): Promise<void>;
  release(day: string, p: { status: 'pending' | 'submitting' | 'failed'; error: string | null }): Promise<void>;
}

/** Huellas de los resultados del día, en el orden del árbol. */
export function dayDigests(matches: DayMatch[]): { ids: string[]; digests: string[] } {
  const ordered = matches.slice().sort((a, b) => {
    const ta = Date.parse(a.confirmed_at!);
    const tb = Date.parse(b.confirmed_at!);
    return ta - tb || a.id.localeCompare(b.id);
  });
  return {
    ids: ordered.map((m) => m.id),
    digests: ordered.map((m) => resultDigest(toResult({ ...m, status: 'confirmed' } as MatchRow))),
  };
}

/** Arma las actas que falten hasta ayer (hora de Costa Rica). Devuelve los días armados. */
export async function buildMissingDays(
  deps: { store: DailyStore; network: ChainNetwork; now?: () => Date },
  maxDays = 60,
): Promise<string[]> {
  const { store, network } = deps;
  const today = dayOf((deps.now ?? (() => new Date()))().toISOString());
  const last = await store.lastRecord();
  let day: string;
  let prev: string | null;
  if (last) {
    day = nextDay(last.day);
    prev = last.record_hash;
  } else {
    const first = await store.firstConfirmedAt();
    if (!first) return [];
    day = dayOf(first);
    prev = null;
  }
  const built: string[] = [];
  while (day < today && built.length < maxDays) {
    const { from, to } = dayRange(day);
    const { ids, digests } = dayDigests(await store.dayMatches(from, to));
    const record = dailyRecord({ network, day, resultDigests: digests, prev });
    const hash = recordHash(record);
    await store.insertRecord({
      day,
      network,
      match_count: record.count,
      root: record.root,
      prev_hash: prev,
      record_hash: hash,
      record,
      match_ids: ids,
    });
    built.push(day);
    prev = hash;
    day = nextDay(day);
  }
  return built;
}

export type DailyAnchorState = 'anchored' | 'busy' | 'in_flight' | 'failed' | 'retry_later';

export async function anchorDay(deps: { store: DailyStore; chain: Chain; now?: () => Date }, day: string): Promise<DailyAnchorState> {
  const { store, chain } = deps;
  const now = deps.now ?? (() => new Date());
  const r = await store.claim(day, new Date(now().getTime() - CLAIM_STALE_S * 1000));
  if (!r) return 'busy';
  try {
    if (r.tx) {
      const status = await chain.txStatus(r.tx);
      if (status === 'success') {
        await store.markAnchored(day, r.tx);
        return 'anchored';
      }
      if (status === 'missing') {
        const dec = rebuildDecision({ maxTime: r.max_time, ledgerCloseS: await chain.ledgerCloseS(), landed: false });
        if (!dec.ok) {
          await store.release(day, { status: 'submitting', error: null });
          return 'in_flight';
        }
      }
    }
    const attempts = (r.attempts ?? 0) + 1;
    if (attempts > MAX_ATTEMPTS) {
      await store.release(day, { status: 'failed', error: 'demasiados intentos' });
      return 'failed';
    }
    const built = await chain.buildAnchor(r.record_hash, DAILY_DATA_KEY);
    await store.savePrepared(day, { tx: built.hash, max_time: built.maxTime, attempts });
    try {
      const sent = await chain.submit(built.tx);
      await store.markAnchored(day, sent.hash);
      return 'anchored';
    } catch (e) {
      const landed = await chain.txStatus(built.hash).catch(() => 'missing' as const);
      if (landed === 'success') {
        await store.markAnchored(day, built.hash);
        return 'anchored';
      }
      const msg = e instanceof Error ? e.message : String(e);
      const retryable = e instanceof SubmitError ? e.retryable : true;
      if (landed === 'failed' || (e instanceof SubmitError && e.codes)) {
        await store.release(day, { status: retryable && attempts < MAX_ATTEMPTS ? 'pending' : 'failed', error: msg });
      } else {
        await store.release(day, { status: 'submitting', error: msg });
      }
      return 'retry_later';
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await store.release(day, { status: r.tx ? 'submitting' : 'pending', error: msg }).catch(() => undefined);
    return 'retry_later';
  }
}

/** Cron nocturno: arma lo que falte y ancla en orden, cortando por tiempo. */
export async function runDaily(
  deps: { store: DailyStore; chain: Chain; network: ChainNetwork; now?: () => Date },
  budgetMs = 30_000,
) {
  const started = Date.now();
  const built = await buildMissingDays(deps);
  const days = await deps.store.queue(40, new Date((deps.now ?? (() => new Date()))().getTime() - CLAIM_STALE_S * 1000));
  const results: Record<string, DailyAnchorState> = {};
  for (const day of days) {
    if (Date.now() - started > budgetMs) break;
    results[day] = await anchorDay(deps, day);
  }
  return { built, results };
}
