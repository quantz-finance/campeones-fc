// Acta diaria: raíz Merkle de los resultados confirmados de un día, encadenada con el acta anterior.
// Puro y determinista: lo usan el servidor (cron nocturno), la página /verificar y, copiado sin
// dependencias, scripts/chain/lib.mjs (cualquiera puede recalcularlo).
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { canonicalJson, sha256Hex, type ChainNetwork } from './match-proof';

/** Zona del día del acta. Costa Rica no tiene horario de verano: UTC-6 fijo. */
export const DAY_TZ = 'America/Costa_Rica';
export const DAY_OFFSET_MIN = -6 * 60;
/** Raíz de un día sin partidos. */
export const EMPTY_ROOT = '0'.repeat(64);

const isHex32 = (h: string) => /^[a-f0-9]{64}$/.test(h);
const cat = (tag: number, ...parts: Uint8Array[]) => {
  const out = new Uint8Array(1 + parts.reduce((n, p) => n + p.length, 0));
  out[0] = tag;
  let o = 1;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
};

/** Hoja = sha256(0x00 || huella del resultado). El prefijo separa hojas de nodos internos. */
export function leafHash(resultDigestHex: string): string {
  if (!isHex32(resultDigestHex)) throw new Error('huella inválida');
  return bytesToHex(sha256(cat(0, hexToBytes(resultDigestHex))));
}

/** Nodo = sha256(0x01 || izquierda || derecha). */
export function nodeHash(leftHex: string, rightHex: string): string {
  return bytesToHex(sha256(cat(1, hexToBytes(leftHex), hexToBytes(rightHex))));
}

/** Niveles del árbol, de las hojas a la raíz. Un nodo sin pareja sube tal cual. */
function levels(leaves: string[]): string[][] {
  const out = [leaves];
  while (out[out.length - 1].length > 1) {
    const prev = out[out.length - 1];
    const next: string[] = [];
    for (let i = 0; i < prev.length; i += 2) next.push(i + 1 < prev.length ? nodeHash(prev[i], prev[i + 1]) : prev[i]);
    out.push(next);
  }
  return out;
}

/** Raíz a partir de las huellas de los resultados, en orden (confirmed_at, id). */
export function merkleRoot(resultDigests: string[]): string {
  if (!resultDigests.length) return EMPTY_ROOT;
  const lv = levels(resultDigests.map(leafHash));
  return lv[lv.length - 1][0];
}

export type ProofStep = { side: 'L' | 'R'; hash: string };

/** Camino de la hoja `index` a la raíz. side = de qué lado está el hermano. */
export function merkleProof(resultDigests: string[], index: number): ProofStep[] {
  if (index < 0 || index >= resultDigests.length) throw new Error('índice fuera del árbol');
  const lv = levels(resultDigests.map(leafHash));
  const steps: ProofStep[] = [];
  let i = index;
  for (let l = 0; l < lv.length - 1; l++) {
    const row = lv[l];
    const sib = i % 2 === 0 ? i + 1 : i - 1;
    if (sib < row.length) steps.push({ side: i % 2 === 0 ? 'R' : 'L', hash: row[sib] });
    i = Math.floor(i / 2);
  }
  return steps;
}

/** Recalcula la raíz desde la huella de un resultado y su camino. */
export function rootFromProof(resultDigestHex: string, proof: ProofStep[]): string {
  let h = leafHash(resultDigestHex);
  for (const s of proof) h = s.side === 'R' ? nodeHash(h, s.hash) : nodeHash(s.hash, h);
  return h;
}

/** Día del acta (YYYY-MM-DD, hora de Costa Rica) de un instante. */
export function dayOf(iso: string): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) throw new Error('fecha inválida');
  return new Date(t + DAY_OFFSET_MIN * 60_000).toISOString().slice(0, 10);
}

/** Inicio y fin (UTC, ISO) del día del acta: [inicio, fin). */
export function dayRange(day: string): { from: string; to: string } {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('día inválido');
  const start = Date.parse(`${day}T00:00:00.000Z`) - DAY_OFFSET_MIN * 60_000;
  return { from: new Date(start).toISOString(), to: new Date(start + 86_400_000).toISOString() };
}

export const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00.000Z`) + 86_400_000).toISOString().slice(0, 10);

export type DailyRecord = {
  app: 'campeones-fc';
  kind: 'daily';
  v: 1;
  network: ChainNetwork;
  day: string;
  tz: typeof DAY_TZ;
  count: number;
  root: string;
  /** Hash del acta anterior (null en la primera). */
  prev: string | null;
};

export function dailyRecord(p: { network: ChainNetwork; day: string; resultDigests: string[]; prev: string | null }): DailyRecord {
  if (p.prev !== null && !isHex32(p.prev)) throw new Error('acta anterior inválida');
  dayRange(p.day);
  return {
    app: 'campeones-fc',
    kind: 'daily',
    v: 1,
    network: p.network,
    day: p.day,
    tz: DAY_TZ,
    count: p.resultDigests.length,
    root: merkleRoot(p.resultDigests),
    prev: p.prev,
  };
}

/** Hash del acta (va en el memo hash de la transacción del día). */
export const recordHash = (r: DailyRecord) => sha256Hex(canonicalJson(r));
