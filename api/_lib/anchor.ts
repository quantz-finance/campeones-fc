// Anclaje idempotente de un partido confirmado.
// Estados: pending -> submitting -> anchored (o failed tras MAX_ATTEMPTS). Un solo dueño a la vez (claim atómico);
// el hash de la tx se guarda ANTES de enviarla, y una tx previa solo se reemplaza si ya venció y no entró.
import {
  anchorHash,
  anchorPayload,
  attestationMessage,
  type ChainNetwork,
  type ConfirmedResult,
  type PlayerProof,
} from '../../src/domain/match-proof';
import { HttpError } from './http';
import { verifySignedMessage } from './proof';
import { SubmitError, type Chain } from './stellar';
import { rebuildDecision } from './timebounds';

export const MAX_ATTEMPTS = 5;
export const CLAIM_STALE_S = 90;

export type MatchRow = {
  id: string;
  player_a_id: string;
  player_b_id: string;
  status: string;
  winner_id: string | null;
  is_draw: boolean;
  goals_a: number | null;
  goals_b: number | null;
  confirmed_at: string | null;
  chain_status: 'pending' | 'submitting' | 'anchored' | 'failed' | null;
  chain_hash: string | null;
  chain_tx: string | null;
  chain_max_time: number | null;
  chain_attempts: number;
  /** Partido confirmado antes del registro en Stellar: se ancla sin esperar firmas ("sin firma"). */
  chain_backfill?: boolean;
  /** Red en la que se ancló (o se está anclando). */
  chain_network?: ChainNetwork | null;
};

export type Attestation = { match_id: string; user_id: string; address: string; public_key: string; message: string; signature: string };

export interface AnchorStore {
  getMatch(id: string): Promise<MatchRow | null>;
  walletOf(userId: string): Promise<string | null>;
  attestations(matchId: string): Promise<Attestation[]>;
  /** Inserta si no existe (no sobrescribe). */
  saveAttestation(a: Attestation): Promise<void>;
  /** pending -> submitting, o submitting viejo (claimed_at < staleBefore) -> submitting. Devuelve la fila o null. */
  claim(id: string, staleBefore: Date): Promise<MatchRow | null>;
  savePrepared(id: string, p: { chain_hash: string; chain_payload: unknown; chain_tx: string; chain_max_time: number; chain_attempts: number; chain_network: ChainNetwork }): Promise<void>;
  markAnchored(id: string, tx: string): Promise<void>;
  release(id: string, p: { status: 'pending' | 'submitting' | 'failed'; error: string | null }): Promise<void>;
  queue(limit: number, staleBefore: Date): Promise<string[]>;
  /** Encola hasta `limit` partidos confirmados viejos como "sin firma". Devuelve cuántos. */
  queueBackfill?(limit: number, network: ChainNetwork): Promise<number>;
}

export type AnchorResult =
  | { state: 'anchored'; tx: string; hash: string | null; fresh: boolean; network: ChainNetwork }
  | { state: 'not_found' | 'not_confirmed' | 'not_queued' | 'busy' | 'in_flight' | 'waiting_signatures' | 'failed' }
  | { state: 'retry_later'; error: string };

export function toResult(m: MatchRow): ConfirmedResult {
  if (!m.confirmed_at) throw new Error('partido sin confirmed_at');
  return {
    matchId: m.id,
    playerAId: m.player_a_id,
    playerBId: m.player_b_id,
    winnerId: m.winner_id,
    isDraw: m.is_draw,
    goalsA: m.goals_a,
    goalsB: m.goals_b,
    confirmedAt: m.confirmed_at,
  };
}

/** Guarda la firma de un jugador sobre el resultado confirmado (verifica llave, mensaje y billetera ligada). */
export async function recordAttestation(
  store: AnchorStore,
  network: ChainNetwork,
  userId: string,
  matchId: string,
  att: { publicKey?: unknown; signature?: unknown },
): Promise<void> {
  const m = await store.getMatch(matchId);
  if (!m) throw new HttpError(404, 'No encontramos ese partido.', 'not_found');
  if (m.player_a_id !== userId && m.player_b_id !== userId) throw new HttpError(403, 'No jugaste este partido.', 'not_player');
  if (m.status !== 'confirmed' || !m.confirmed_at) throw new HttpError(409, 'El partido todavía no está confirmado.', 'not_confirmed');
  const address = await store.walletOf(userId);
  if (!address) throw new HttpError(409, 'Tu cuenta todavía no tiene billetera. Vuelve a entrar con Cavos.', 'no_wallet');
  if (typeof att.publicKey !== 'string' || typeof att.signature !== 'string') throw new HttpError(400, 'Firma incompleta.', 'bad_attestation');
  const message = attestationMessage(toResult(m), network);
  try {
    verifySignedMessage({ address, publicKey: att.publicKey, signature: att.signature, message });
  } catch {
    throw new HttpError(401, 'La firma no corresponde a tu billetera.', 'bad_attestation');
  }
  await store.saveAttestation({ match_id: m.id, user_id: userId, address, public_key: att.publicKey, message, signature: att.signature });
}

export async function buildPayload(store: AnchorStore, network: ChainNetwork, m: MatchRow) {
  const result = toResult(m);
  const message = attestationMessage(result, network);
  const atts = await store.attestations(m.id);
  const players: PlayerProof[] = [];
  for (const [role, userId] of [['a', m.player_a_id], ['b', m.player_b_id]] as const) {
    const address = await store.walletOf(userId);
    const a = atts.find((x) => x.user_id === userId && x.message === message && x.address === address);
    players.push({ role, userId, address, signature: a ? a.signature : null });
  }
  const payload = anchorPayload(result, network, players);
  return { payload, hash: anchorHash(payload), signatures: players.filter((p) => p.signature).length };
}

export async function anchorMatch(
  deps: { store: AnchorStore; chain: Chain; network: ChainNetwork; attestWaitS: number; now?: () => Date },
  matchId: string,
): Promise<AnchorResult> {
  const { store, chain, network } = deps;
  const now = deps.now ?? (() => new Date());
  const m0 = await store.getMatch(matchId);
  if (!m0) return { state: 'not_found' };
  if (m0.chain_status === 'anchored' && m0.chain_tx) {
    // Anclado en otra red (antes del cambio a mainnet): lo vuelve a encolar el backfill.
    if (m0.chain_network && m0.chain_network !== network) return { state: 'not_queued' };
    return { state: 'anchored', tx: m0.chain_tx, hash: m0.chain_hash, fresh: false, network };
  }
  if (m0.status !== 'confirmed' || !m0.confirmed_at) return { state: 'not_confirmed' };
  if (m0.chain_status === null) return { state: 'not_queued' };
  if (m0.chain_status === 'failed') return { state: 'failed' };

  // Esperar las dos firmas hasta attestWaitS desde la confirmación; después se ancla con las que haya.
  if (!m0.chain_tx && !m0.chain_backfill) {
    const { signatures } = await buildPayload(store, network, m0);
    const age = (now().getTime() - Date.parse(m0.confirmed_at)) / 1000;
    if (signatures < 2 && age < deps.attestWaitS) return { state: 'waiting_signatures' };
  }

  const m = await store.claim(matchId, new Date(now().getTime() - CLAIM_STALE_S * 1000));
  if (!m) return { state: 'busy' };

  try {
    // ¿Hubo un intento anterior? Nunca dos tx vivas: primero ver si entró o si ya venció.
    if (m.chain_tx) {
      const status = await chain.txStatus(m.chain_tx);
      if (status === 'success') {
        await store.markAnchored(m.id, m.chain_tx);
        return { state: 'anchored', tx: m.chain_tx, hash: m.chain_hash, fresh: false, network };
      }
      if (status === 'missing') {
        const dec = rebuildDecision({ maxTime: m.chain_max_time, ledgerCloseS: await chain.ledgerCloseS(), landed: false });
        if (!dec.ok) {
          await store.release(m.id, { status: 'submitting', error: null }); // sigue en vuelo; el próximo intento revisa
          return { state: 'in_flight' };
        }
      }
      // failed o vencida sin entrar: se puede reconstruir.
    }
    const attempts = (m.chain_attempts ?? 0) + 1;
    if (attempts > MAX_ATTEMPTS) {
      await store.release(m.id, { status: 'failed', error: 'demasiados intentos' });
      return { state: 'failed' };
    }
    const { payload, hash } = await buildPayload(store, network, m);
    const built = await chain.buildAnchor(hash);
    await store.savePrepared(m.id, { chain_hash: hash, chain_payload: payload, chain_tx: built.hash, chain_max_time: built.maxTime, chain_attempts: attempts, chain_network: network });
    try {
      const sent = await chain.submit(built.tx);
      await store.markAnchored(m.id, sent.hash);
      return { state: 'anchored', tx: sent.hash, hash, fresh: true, network };
    } catch (e) {
      // ¿Entró igual? (timeout después de aceptar)
      const landed = await chain.txStatus(built.hash).catch(() => 'missing' as const);
      if (landed === 'success') {
        await store.markAnchored(m.id, built.hash);
        return { state: 'anchored', tx: built.hash, hash, fresh: true, network };
      }
      const msg = e instanceof Error ? e.message : String(e);
      const retryable = e instanceof SubmitError ? e.retryable : true;
      if (landed === 'failed' || (e instanceof SubmitError && e.codes)) {
        // Rechazada con códigos: no quedó viva; se puede reconstruir en el próximo intento.
        await store.release(m.id, { status: retryable && attempts < MAX_ATTEMPTS ? 'pending' : 'failed', error: msg });
      } else {
        // Sin respuesta clara: queda 'submitting' con su chain_tx; el próximo intento espera a que venza.
        await store.release(m.id, { status: 'submitting', error: msg });
      }
      return { state: 'retry_later', error: msg };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await store.release(m.id, { status: m.chain_tx ? 'submitting' : 'pending', error: msg }).catch(() => undefined);
    return { state: 'retry_later', error: msg };
  }
}

/** Barrido del cron: procesa la cola en serie (una sola cuenta platform -> sin choques de secuencia). */
// Cada envío espera a que cierre un ledger (~5 s), así que se corta por tiempo para no pasar el maxDuration.
export async function sweep(deps: Parameters<typeof anchorMatch>[0], limit = 20, budgetMs = 30_000) {
  const now = deps.now ?? (() => new Date());
  const started = Date.now();
  const ids = await deps.store.queue(limit, new Date(now().getTime() - CLAIM_STALE_S * 1000));
  const out: Record<string, string> = {};
  for (const id of ids) {
    if (Date.now() - started > budgetMs) break;
    const r = await anchorMatch(deps, id);
    out[id] = r.state;
  }
  return out;
}
