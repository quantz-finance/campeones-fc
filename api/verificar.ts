// GET /api/verificar (público, sin sesión). Solo datos que ya son públicos en Stellar o necesarios para verificarlos:
// ids de partido y de jugador (UUID), direcciones G…, marcador, fecha y firmas. Nunca nombres ni correos.
//   ?id=<uuid>      -> un partido: JSON canónico anclado, hash, tx, firmas y su prueba Merkle en el acta del día.
//   ?index=1        -> todas las actas diarias (para scripts/chain/elo-from-chain.mjs).
//   ?day=YYYY-MM-DD -> un acta con los resultados canónicos de ese día, en el orden del árbol.
//   ?status=1       -> red configurada, Horizon y estado público de la cuenta de la plataforma.
import { explorerTxUrl, resultDigest, resultObject, type ChainNetwork } from '../src/domain/match-proof';
import { merkleProof, recordHash } from '../src/domain/merkle';
import { toResult, type MatchRow } from './_lib/anchor';
import { dayDigests, type DailyRow, type DayMatch } from './_lib/daily';
import { adminClient } from './_lib/db';
import { env } from './_lib/env';
import { fail, HttpError } from './_lib/http';
import { platformFunding } from './_lib/stellar';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MATCH_COLS =
  'id,player_a_id,player_b_id,status,winner_id,is_draw,goals_a,goals_b,confirmed_at,chain_status,chain_hash,chain_payload,chain_tx,chain_backfill,chain_network,anchored_at';
const DAILY_COLS = 'day,network,match_count,root,prev_hash,record_hash,record,match_ids,status,tx,anchored_at';

function send(res: any, status: number, body: unknown, cacheS = 30) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? `public, max-age=0, s-maxage=${cacheS}, stale-while-revalidate=300` : 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

const txUrl = (tx: string | null, network: ChainNetwork) => (tx ? explorerTxUrl(tx, network) : null);

function publicRecord(r: DailyRow & { anchored_at?: string | null }) {
  return {
    day: r.day,
    count: r.match_count,
    root: r.root,
    prev: r.prev_hash,
    record_hash: r.record_hash,
    record: r.record,
    record_ok: recordHash(r.record) === r.record_hash,
    status: r.status,
    tx: r.tx,
    url: txUrl(r.tx, r.network),
    anchored_at: r.anchored_at ?? null,
  };
}

async function recordMatches(r: DailyRow): Promise<DayMatch[]> {
  const db = adminClient();
  const out: DayMatch[] = [];
  for (let i = 0; i < r.match_ids.length; i += 200) {
    const ids = r.match_ids.slice(i, i + 200);
    const { data, error } = await db.from('matches').select('id,player_a_id,player_b_id,winner_id,is_draw,goals_a,goals_b,confirmed_at').in('id', ids);
    if (error) throw new Error(error.message);
    out.push(...((data ?? []) as DayMatch[]));
  }
  const byId = new Map(out.map((m) => [m.id, m]));
  return r.match_ids.map((id) => byId.get(id)).filter((m): m is DayMatch => !!m);
}

async function oneMatch(id: string) {
  const db = adminClient();
  const current = env.stellarNetwork();
  const { data: m, error } = await db.from('matches').select(MATCH_COLS).eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!m || m.status !== 'confirmed' || !m.confirmed_at) throw new HttpError(404, 'No encontramos un partido confirmado con ese código.', 'not_found');
  const row = m as MatchRow & { chain_payload: any; chain_backfill: boolean; anchored_at: string | null };
  // Lo anclado en otra red (antes de cambiar de red) se muestra como pendiente en la red actual.
  const sameNet = !row.chain_network || row.chain_network === current;
  const network: ChainNetwork = current;
  if (!sameNet) {
    row.chain_status = 'pending';
    row.chain_hash = null;
    row.chain_tx = null;
    row.chain_payload = null;
  }
  const currentResult = resultObject(toResult(row));
  const currentDigest = resultDigest(toResult(row));
  const payload = row.chain_payload ?? null;
  const players = Array.isArray(payload?.players)
    ? payload.players.map((p: any) => ({ role: p.role, address: p.address ?? null, signed: !!p.signature }))
    : [];

  let daily: unknown = null;
  const { data: rec, error: e2 } = await db.from('chain_daily_records').select(DAILY_COLS).eq('network', network).contains('match_ids', [id]).maybeSingle();
  if (e2) throw new Error(e2.message);
  if (rec) {
    const r = rec as DailyRow & { anchored_at: string | null };
    const ms = await recordMatches(r);
    const { ids, digests } = dayDigests(ms);
    const index = ids.indexOf(id);
    daily = {
      ...publicRecord(r),
      complete: ms.length === r.match_ids.length,
      index,
      leaf_digest: index >= 0 ? digests[index] : null,
      proof: index >= 0 ? merkleProof(digests, index) : [],
    };
  }

  return {
    network,
    horizon: env.horizon(),
    match: {
      id: row.id,
      status: row.status,
      confirmed_at: row.confirmed_at,
      chain_status: row.chain_status,
      backfill: !!row.chain_backfill,
      anchored_at: row.anchored_at,
    },
    hash: row.chain_hash,
    tx: row.chain_tx,
    url: row.chain_status === 'anchored' ? txUrl(row.chain_tx, network) : null,
    payload,
    signatures: { count: players.filter((p: any) => p.signed).length, players },
    current: { result: currentResult, digest: currentDigest, matches_anchored: payload ? payload.result_digest === currentDigest : null },
    daily,
  };
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'method' });
    const q = req.query ?? {};
    const db = adminClient();
    if (typeof q.id === 'string') {
      if (!UUID.test(q.id)) throw new HttpError(400, 'Código de partido inválido.', 'bad_id');
      return send(res, 200, await oneMatch(q.id.toLowerCase()));
    }
    if (q.status) {
      const f = await platformFunding().catch(() => null);
      return send(
        res,
        200,
        { network: env.stellarNetwork(), horizon: env.horizon(), platform: f ? { address: f.address || null, exists: f.exists, balance: f.balance, funded: f.funded } : null },
        15,
      );
    }
    if (q.index) {
      const all: any[] = [];
      for (let page = 0; ; page++) {
        const { data, error } = await db
          .from('chain_daily_records')
          .select(DAILY_COLS)
          .eq('network', env.stellarNetwork())
          .order('day', { ascending: true })
          .range(page * 1000, page * 1000 + 999);
        if (error) throw new Error(error.message);
        all.push(...(data ?? []));
        if (!data || data.length < 1000) break;
      }
      return send(res, 200, { network: env.stellarNetwork(), horizon: env.horizon(), records: all.map((r) => publicRecord(r as DailyRow)) }, 120);
    }
    if (typeof q.day === 'string') {
      if (!DAY.test(q.day)) throw new HttpError(400, 'Día inválido.', 'bad_day');
      const { data, error } = await db.from('chain_daily_records').select(DAILY_COLS).eq('network', env.stellarNetwork()).eq('day', q.day).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new HttpError(404, 'No hay acta para ese día.', 'not_found');
      const r = data as unknown as DailyRow;
      const ms = await recordMatches(r);
      const { ids } = dayDigests(ms);
      const byId = new Map(ms.map((m) => [m.id, m]));
      return send(
        res,
        200,
        {
          network: env.stellarNetwork(),
          ...publicRecord(r),
          complete: ms.length === r.match_ids.length,
          results: ids.map((id) => resultObject(toResult({ ...byId.get(id)!, status: 'confirmed' } as MatchRow))),
        },
        300,
      );
    }
    throw new HttpError(400, 'Falta ?id=, ?day= o ?index=1.', 'bad_request');
  } catch (e) {
    return fail(res, e);
  }
}
