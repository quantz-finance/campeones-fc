// Prueba del resultado: lo que firman los dos jugadores y lo que se ancla en Stellar.
// Puro y determinista: lo usan el cliente (firma) y el servidor (verificación + anclaje).
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

export type ChainNetwork = 'testnet' | 'mainnet';

export type ConfirmedResult = {
  matchId: string;
  playerAId: string;
  playerBId: string;
  winnerId: string | null;
  isDraw: boolean;
  goalsA: number | null;
  goalsB: number | null;
  confirmedAt: string;
};

export type PlayerProof = {
  role: 'a' | 'b';
  userId: string;
  address: string | null;
  signature: string | null;
};

/** JSON canónico: claves ordenadas, sin espacios, sin undefined. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) throw new Error('número no finito');
    if (value === undefined) return 'null';
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

export const sha256Hex = (text: string) => bytesToHex(sha256(utf8ToBytes(text)));

/** confirmed_at normalizado (Postgres devuelve microsegundos; nos quedamos en milisegundos UTC). */
export function normalizeTime(value: string): string {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) throw new Error('fecha inválida');
  return new Date(t).toISOString();
}

export function resultObject(r: ConfirmedResult) {
  if (!r.isDraw && !r.winnerId) throw new Error('resultado sin ganador');
  if (r.winnerId && r.winnerId !== r.playerAId && r.winnerId !== r.playerBId) throw new Error('ganador ajeno al partido');
  return {
    v: 1,
    match_id: r.matchId,
    player_a: r.playerAId,
    player_b: r.playerBId,
    winner: r.isDraw ? null : r.winnerId,
    draw: r.isDraw,
    goals_a: r.goalsA,
    goals_b: r.goalsB,
    confirmed_at: normalizeTime(r.confirmedAt),
  };
}

/** Huella del resultado (hex). */
export const resultDigest = (r: ConfirmedResult) => sha256Hex(canonicalJson(resultObject(r)));

/** Mensaje que firma cada jugador con su billetera Cavos (signMessage). */
export const attestationMessage = (r: ConfirmedResult, network: ChainNetwork) =>
  `campeones-fc:match:v1:${network}:${r.matchId}:${resultDigest(r)}`;

/** Documento que se ancla: resultado + direcciones y firmas de los jugadores. */
export function anchorPayload(r: ConfirmedResult, network: ChainNetwork, players: PlayerProof[]) {
  const byRole = (role: 'a' | 'b') => {
    const p = players.find((x) => x.role === role);
    const userId = role === 'a' ? r.playerAId : r.playerBId;
    if (p && p.userId !== userId) throw new Error('jugador no corresponde al partido');
    return { role, user: userId, address: p?.address ?? null, signature: p?.signature ?? null };
  };
  return {
    app: 'campeones-fc',
    v: 1,
    network,
    result: resultObject(r),
    result_digest: resultDigest(r),
    message: attestationMessage(r, network),
    players: [byRole('a'), byRole('b')],
  };
}

/** Hash de 32 bytes (hex) que va en el memo y en manageData. */
export const anchorHash = (payload: ReturnType<typeof anchorPayload>) => sha256Hex(canonicalJson(payload));

export function explorerTxUrl(hash: string, network: ChainNetwork) {
  return `https://stellar.expert/explorer/${network === 'mainnet' ? 'public' : 'testnet'}/tx/${hash}`;
}
