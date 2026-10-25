// Verificación independiente del registro de Campeones FC en Stellar. Sin dependencias: solo Node 22.
// Repite, sin usar el código de la app, lo mismo que src/domain/match-proof.ts, src/domain/merkle.ts
// y src/domain/elo.ts (scripts/chain/lib.test.ts comprueba que den igual).
import { createHash } from 'node:crypto';

export const sha256Hex = (data) => createHash('sha256').update(data).digest('hex');

/** JSON canónico: claves ordenadas, sin espacios. */
export function canonicalJson(value) {
  if (value === null || typeof value !== 'object') {
    if (value === undefined) return 'null';
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const keys = Object.keys(value).filter((k) => value[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(',')}}`;
}

/** Huella de un resultado canónico ({ v, match_id, player_a, player_b, winner, draw, goals_a, goals_b, confirmed_at }). */
export const resultDigest = (result) => sha256Hex(canonicalJson(result));

export const EMPTY_ROOT = '0'.repeat(64);
const hx = (h) => Buffer.from(h, 'hex');
export const leafHash = (digest) => sha256Hex(Buffer.concat([Buffer.from([0]), hx(digest)]));
export const nodeHash = (l, r) => sha256Hex(Buffer.concat([Buffer.from([1]), hx(l), hx(r)]));

export function merkleRoot(digests) {
  if (!digests.length) return EMPTY_ROOT;
  let level = digests.map(leafHash);
  while (level.length > 1) {
    const next = [];
    for (let i = 0; i < level.length; i += 2) next.push(i + 1 < level.length ? nodeHash(level[i], level[i + 1]) : level[i]);
    level = next;
  }
  return level[0];
}

export function rootFromProof(digest, proof) {
  let h = leafHash(digest);
  for (const s of proof) h = s.side === 'R' ? nodeHash(h, s.hash) : nodeHash(s.hash, h);
  return h;
}

export const recordHash = (record) => sha256Hex(canonicalJson(record));

/** Memo hash (hex) de una transacción en Horizon. */
export async function txMemoHex(horizon, tx) {
  const r = await fetch(`${horizon}/transactions/${tx}`);
  if (!r.ok) throw new Error(`Horizon ${r.status} para ${tx}`);
  const t = await r.json();
  if (!t.successful) throw new Error(`la transacción ${tx} no fue exitosa`);
  if (t.memo_type !== 'hash') throw new Error(`la transacción ${tx} no tiene memo hash`);
  return Buffer.from(t.memo, 'base64').toString('hex');
}

// --- Elo FIDE (igual que src/domain/elo.ts y public.apply_rating) ---
export const INITIAL = 1200;
export function expectedScore(a, b) {
  const diff = Math.max(-400, Math.min(400, b - a));
  return 1 / (1 + 10 ** (diff / 400));
}
export const kFactor = (games, peak) => (games < 30 ? 40 : peak >= 2400 ? 10 : 20);
export const roundHalfAway = (v) => Math.sign(v) * Math.round(Math.abs(v));
export const ratingDelta = (r, o, s, k) => roundHalfAway(k * (s - expectedScore(r, o)));

/** Repite los resultados en orden (confirmed_at, match_id) desde 1200. Devuelve { userId: { rating, games, peak } }. */
export function replayElo(results) {
  const ordered = results.slice().sort((x, y) => Date.parse(x.confirmed_at) - Date.parse(y.confirmed_at) || x.match_id.localeCompare(y.match_id));
  const st = {};
  const get = (id) => st[id] ?? { rating: INITIAL, games: 0, peak: INITIAL };
  for (const r of ordered) {
    const a = get(r.player_a);
    const b = get(r.player_b);
    const sA = r.draw || !r.winner ? 0.5 : r.winner === r.player_a ? 1 : 0;
    const dA = ratingDelta(a.rating, b.rating, sA, kFactor(a.games, a.peak));
    const dB = ratingDelta(b.rating, a.rating, 1 - sA, kFactor(b.games, b.peak));
    st[r.player_a] = { rating: a.rating + dA, games: a.games + 1, peak: Math.max(a.peak, a.rating + dA) };
    st[r.player_b] = { rating: b.rating + dB, games: b.games + 1, peak: Math.max(b.peak, b.rating + dB) };
  }
  return st;
}
