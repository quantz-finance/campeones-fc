// Verificación en el navegador de lo que devuelve /api/verificar?id=: no confía en el servidor,
// recalcula los hashes y lee los memos directamente de Horizon (Stellar).
import { canonicalJson, sha256Hex } from '../domain/match-proof';
import { recordHash, rootFromProof, type DailyRecord, type ProofStep } from '../domain/merkle';

export type VerifyResponse = {
  network: 'testnet' | 'mainnet';
  horizon: string;
  match: { id: string; status: string; confirmed_at: string; chain_status: string | null; backfill: boolean; anchored_at: string | null };
  hash: string | null;
  tx: string | null;
  url: string | null;
  payload: any;
  signatures: { count: number; players: { role: 'a' | 'b'; address: string | null; signed: boolean }[] };
  current: { result: Record<string, unknown>; digest: string; matches_anchored: boolean | null };
  daily: null | {
    day: string;
    count: number;
    root: string;
    prev: string | null;
    record_hash: string;
    record: DailyRecord;
    status: string;
    tx: string | null;
    url: string | null;
    complete: boolean;
    index: number;
    leaf_digest: string | null;
    proof: ProofStep[];
  };
};

export type Check = { label: string; ok: boolean | null; detail?: string };

/** Memo hash (hex) de una transacción leída en Horizon. */
export async function horizonMemo(horizon: string, tx: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  const r = await fetcher(`${horizon}/transactions/${tx}`);
  if (!r.ok) return null;
  const t = await r.json();
  if (!t.successful || t.memo_type !== 'hash' || typeof t.memo !== 'string') return null;
  const bin = atob(t.memo);
  return Array.from(bin, (c) => c.charCodeAt(0).toString(16).padStart(2, '0')).join('');
}

export async function runChecks(v: VerifyResponse, fetcher: typeof fetch = fetch): Promise<Check[]> {
  const checks: Check[] = [];
  if (v.payload && v.hash) {
    checks.push({ label: 'El hash sale del JSON canónico', ok: sha256Hex(canonicalJson(v.payload)) === v.hash });
    checks.push({ label: 'El resultado de hoy es el mismo que se registró', ok: v.payload.result_digest === v.current.digest });
  }
  if (v.tx && v.hash && v.match.chain_status === 'anchored') {
    const memo = await horizonMemo(v.horizon, v.tx, fetcher).catch(() => null);
    checks.push({ label: 'El memo de la transacción en Stellar es ese hash', ok: memo === v.hash, detail: memo ?? 'no se pudo leer' });
  }
  const d = v.daily;
  if (d) {
    checks.push({ label: `El acta del ${d.day} corresponde a su contenido`, ok: recordHash(d.record) === d.record_hash });
    if (d.leaf_digest) {
      checks.push({
        label: 'El partido está dentro del acta (prueba Merkle)',
        ok: d.leaf_digest === v.current.digest && rootFromProof(d.leaf_digest, d.proof) === d.record.root,
      });
    }
    if (d.tx && d.status === 'anchored') {
      const memo = await horizonMemo(v.horizon, d.tx, fetcher).catch(() => null);
      checks.push({ label: 'El acta está anclada en Stellar', ok: memo === d.record_hash, detail: memo ?? 'no se pudo leer' });
    }
  }
  return checks;
}

/** Mensaje que firma Cavos: "Cavos Signed Message:\n" + largo en bytes + "\n" + mensaje. */
export function cavosSignedBytes(message: string): Uint8Array {
  const m = new TextEncoder().encode(message);
  return new TextEncoder().encode(`Cavos Signed Message:\n${m.length}\n${message}`);
}
