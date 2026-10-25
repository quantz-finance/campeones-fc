// Orquestación de la apuesta: propuesta, despliegue, depósitos y liquidación. Toda escritura es condicional sobre el
// status anterior (dos llamadas en paralelo nunca hacen dos tx). La decisión de pago vive en stake.ts (pura).
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from './db';
import { HttpError } from './http';
import { decide, formatUnits, parseAmount, toUnits, type MatchLite, type StakeRow } from './stake';
import * as tw from './tw';
import { validateEscrowTx, feeBumpAndSend } from './feebump';
import { walletState } from './trustline';

const db = (): SupabaseClient => adminClient();
const nowIso = () => new Date().toISOString();
const minutes = (n: number) => new Date(Date.now() + n * 60_000).toISOString();
const fundWindowMin = () => Number(process.env.STAKE_FUND_WINDOW_MIN ?? '30');
const resultWindowH = () => Number(process.env.STAKE_RESULT_WINDOW_HOURS ?? '24');
const maxUnits = () => Number(process.env.STAKE_MAX_UNITS ?? '100');
const STALE_MS = 120_000;

async function match(id: string): Promise<MatchLite> {
  const { data, error } = await db().from('matches').select('id,player_a_id,player_b_id,status,winner_id,is_draw').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'No encontramos ese partido.', 'not_found');
  return data as MatchLite;
}
async function stake(id: string): Promise<StakeRow & Record<string, any>> {
  const { data, error } = await db().from('match_stakes').select('*').eq('match_id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, 'Este partido no tiene apuesta.', 'no_stake');
  return data;
}
async function wallet(userId: string): Promise<string> {
  const { data } = await db().from('wallets').select('address').eq('user_id', userId).maybeSingle();
  if (!data?.address) throw new HttpError(409, 'Los dos jugadores necesitan su billetera de Stellar.', 'wallet_missing');
  return data.address;
}
/** Update condicional: devuelve la fila si el status (u otra condición) seguía igual; null si otro proceso ganó. */
async function move(id: string, from: string[], patch: Record<string, unknown>) {
  const { data, error } = await db().from('match_stakes').update({ ...patch, updated_at: nowIso() }).eq('match_id', id).in('status', from).select('*').maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}
const side = (m: MatchLite, userId: string): 'a' | 'b' => {
  if (m.player_a_id === userId) return 'a';
  if (m.player_b_id === userId) return 'b';
  throw new HttpError(404, 'No encontramos ese partido.', 'not_found');
};

/** El retador propone un monto (antes o justo después de que el rival acepte el partido). */
export async function propose(userId: string, matchId: string, rawAmount: unknown) {
  tw.assertTestnet();
  const m = await match(matchId);
  side(m, userId);
  if (!['pending_accept', 'in_progress'].includes(m.status)) throw new HttpError(409, 'Ya no se puede apostar en este partido.', 'bad_status');
  let stroops: bigint;
  try { stroops = parseAmount(rawAmount, maxUnits()); } catch (e: any) { throw new HttpError(400, e.message, 'bad_amount'); }
  const { error } = await db().from('match_stakes').insert({
    match_id: matchId, proposed_by: userId, stake_stroops: stroops.toString(), asset_issuer: tw.twEnv.usdcIssuer(),
  });
  if (error?.code === '23505') throw new HttpError(409, 'Este partido ya tiene apuesta.', 'exists');
  if (error) throw new Error(error.message);
  return { status: 'proposed', amount: formatUnits(stroops) };
}

export async function decline(userId: string, matchId: string) {
  const m = await match(matchId); side(m, userId);
  return { ok: !!(await move(matchId, ['proposed'], { status: 'declined' })) };
}

/** El rival acepta: verificamos trustlines y desplegamos el escrow (firma y paga la cuenta platform). */
export async function accept(userId: string, matchId: string) {
  tw.assertTestnet();
  const m = await match(matchId);
  side(m, userId);
  const s = await stake(matchId);
  if (s.proposed_by === userId) throw new HttpError(403, 'Tu rival tiene que aceptar la apuesta.', 'not_opponent');
  if (s.status !== 'proposed') return { status: s.status, contractId: s.contract_id };
  const [A, B] = await Promise.all([wallet(m.player_a_id), wallet(m.player_b_id)]);
  for (const addr of [A, B]) {
    if ((await walletState(addr)) !== 'ready') throw new HttpError(409, 'Los dos jugadores necesitan activar USDC de prueba en su billetera.', 'trustline_missing', { address: addr });
  }
  const claimed = await move(matchId, ['proposed'], { status: 'deploying', claimed_at: nowIso(), player_a_address: A, player_b_address: B, accepted_at: nowIso() });
  if (!claimed) return { status: (await stake(matchId)).status };
  try {
    const pot = BigInt(s.stake_stroops) * 2n;
    const { contractId, hash } = await tw.deployStakeEscrow({ matchId, potUnits: toUnits(pot), title: `Campeones FC ${matchId.slice(0, 8)}` });
    await move(matchId, ['deploying'], {
      status: 'funding', contract_id: contractId, deploy_tx: hash, claimed_at: null,
      fund_deadline: minutes(fundWindowMin()), result_deadline: minutes(resultWindowH() * 60),
    });
    return { status: 'funding', contractId, deployTx: hash };
  } catch (e: any) {
    // Vuelve a 'proposed' para reintentar (el escrow no se creó o no tenemos su id).
    await move(matchId, ['deploying'], { status: 'proposed', claimed_at: null, last_error: String(e?.message ?? e).slice(0, 500), attempts: (s.attempts ?? 0) + 1 });
    throw e;
  }
}

/** XDR sin firmar de fund_escrow para el jugador que llama. */
export async function fundXdr(userId: string, matchId: string) {
  const m = await match(matchId);
  const k = side(m, userId);
  const s = await stake(matchId);
  if (s.status !== 'funding' || !s.contract_id) throw new HttpError(409, 'La apuesta no está esperando depósitos.', 'bad_status');
  if (s[`funded_${k}_tx`]) throw new HttpError(409, 'Ya depositaste.', 'already_funded');
  const addr = k === 'a' ? s.player_a_address! : s.player_b_address!;
  const xdr = await tw.fundEscrowXdr(s.contract_id, addr, toUnits(BigInt(s.stake_stroops)));
  return { unsignedXdr: xdr, amount: formatUnits(BigInt(s.stake_stroops)) };
}

/** Recibe el XDR firmado con Cavos, lo valida (contrato, función, monto exacto, source) y lo envía con fee-bump. */
export async function fund(userId: string, matchId: string, signedXdr: unknown) {
  if (typeof signedXdr !== 'string' || signedXdr.length > 20_000) throw new HttpError(400, 'XDR inválido', 'bad_xdr');
  const m = await match(matchId);
  const k = side(m, userId);
  const s = await stake(matchId);
  if (s[`funded_${k}_tx`]) return { status: s.status, already: true };
  if (s.status !== 'funding' || !s.contract_id) throw new HttpError(409, 'La apuesta no está esperando depósitos.', 'bad_status');
  const addr = k === 'a' ? s.player_a_address! : s.player_b_address!;
  const inner = validateEscrowTx(signedXdr, { contractId: s.contract_id, fn: 'fund_escrow', source: addr, amountStroops: BigInt(s.stake_stroops) });
  // Candado por lado (doble toque / dos pestañas): solo uno envía.
  const lockCol = `funding_${k}_lock`;
  const { data: locked } = await db().from('match_stakes').update({ [lockCol]: nowIso() }).eq('match_id', matchId).eq('status', 'funding')
    .is(`funded_${k}_tx`, null).or(`${lockCol}.is.null,${lockCol}.lt.${new Date(Date.now() - STALE_MS).toISOString()}`).select('match_id').maybeSingle();
  if (!locked) throw new HttpError(409, 'Tu depósito ya se está enviando.', 'funding_in_progress');
  try {
    const sent = await feeBumpAndSend(inner);
    const { data } = await db().from('match_stakes').update({ [`funded_${k}_tx`]: sent.hash, [`funded_${k}_at`]: nowIso(), [lockCol]: null, updated_at: nowIso() })
      .eq('match_id', matchId).select('*').single();
    if (data.funded_a_tx && data.funded_b_tx) await move(matchId, ['funding'], { status: 'locked' });
    await settle(matchId).catch(() => null); // por si el resultado ya estaba confirmado
    return { status: data.funded_a_tx && data.funded_b_tx ? 'locked' : 'funding', tx: sent.hash };
  } catch (e) {
    await db().from('match_stakes').update({ [lockCol]: null }).eq('match_id', matchId);
    throw e;
  }
}

/**
 * Liquida si corresponde (idempotente). Lo llaman: el cliente justo después de confirmar el resultado, fund() y el cron.
 * Pasos: decidir -> tomar 'settling' -> dispute_escrow (platform) -> resolve_dispute (resolver) -> paid / refunded.
 */
export async function settle(matchId: string) {
  tw.assertTestnet();
  const s = await stake(matchId);
  if (['paid', 'refunded', 'declined', 'proposed', 'deploying'].includes(s.status)) return { status: s.status, settleTx: s.settle_tx };
  const m = await match(matchId);
  if (!s.contract_id) return { status: s.status };
  const bal = await tw.escrowBalanceStroops(s.contract_id);
  const d = decide(s, m, bal);
  if (d.action === 'wait') return { status: s.status, waiting: d.reason };
  if (d.action === 'close') { await move(matchId, ['funding', 'locked'], { status: d.status, outcome: 'refund', settled_at: nowIso() }); return { status: d.status }; }

  const stale = new Date(Date.now() - STALE_MS).toISOString();
  const { data: claimed } = await db().from('match_stakes').update({ status: 'settling', claimed_at: nowIso(), updated_at: nowIso() })
    .eq('match_id', matchId).or(`status.in.(funding,locked,failed),and(status.eq.settling,claimed_at.lt.${stale})`).select('*').maybeSingle();
  if (!claimed) return { status: 'settling' };
  try {
    let flags = await tw.escrowFlags(s.contract_id);
    if (flags.resolved || flags.released) {
      await move(matchId, ['settling'], { status: d.outcome === 'winner' ? 'paid' : 'refunded', settle_tx: claimed.settle_tx ?? 'onchain', settled_at: nowIso(), claimed_at: null });
      return { status: 'done' };
    }
    if (!flags.disputed) {
      const dz = await tw.disputeEscrow(s.contract_id);
      await db().from('match_stakes').update({ dispute_tx: dz.hash }).eq('match_id', matchId);
    }
    // Saldo fresco justo antes de repartir (la suma tiene que ser exacta).
    const fresh = decide({ ...s, status: 'settling' }, m, await tw.escrowBalanceStroops(s.contract_id));
    if (fresh.action !== 'settle') throw new Error(`decisión cambió: ${fresh.action}`);
    const distributions = fresh.distributions.map((x) => ({ address: x.address, amount: toUnits(x.stroops) }));
    const r = await tw.resolveDispute(s.contract_id, distributions);
    const winnerId = fresh.outcome === 'winner' ? m.winner_id : null;
    await move(matchId, ['settling'], {
      status: fresh.outcome === 'winner' ? 'paid' : 'refunded', outcome: m.is_draw && m.status === 'confirmed' ? 'draw' : fresh.outcome,
      winner_id: winnerId, distributions, settle_tx: r.hash, settled_at: nowIso(), claimed_at: null, last_error: null,
    });
    return { status: fresh.outcome === 'winner' ? 'paid' : 'refunded', settleTx: r.hash, distributions };
  } catch (e: any) {
    await move(matchId, ['settling'], { status: 'failed', claimed_at: null, last_error: String(e?.message ?? e).slice(0, 500), attempts: (claimed.attempts ?? 0) + 1 });
    throw e;
  }
}

/** Cron: liquida/devuelve lo que toque. failed se reintenta hasta 5 veces. */
export async function sweep(limit = 20) {
  const { data } = await db().from('match_stakes').select('match_id,attempts,status').in('status', ['funding', 'locked', 'settling', 'failed']).order('updated_at').limit(limit);
  const out: Record<string, unknown> = {};
  for (const r of data ?? []) {
    if (r.status === 'failed' && (r.attempts ?? 0) >= 5) continue;
    try { out[r.match_id] = await settle(r.match_id); } catch (e: any) { out[r.match_id] = { error: String(e?.message ?? e).slice(0, 200) }; }
  }
  return out;
}
