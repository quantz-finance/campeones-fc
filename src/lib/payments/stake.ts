// Cliente de la apuesta por partido (Trustless Work, SOLO testnet). La UI llama estas funciones; el servidor decide.
import { apiPost } from '../api';
import { accessToken, withCavosSigner } from '../cavos/session';
import { cavosStore, waitForCavos } from '../cavos/store';
import { explorerTxUrl } from '../../domain/match-proof';
import { getSupabase } from '../supabase';

export type StakeStatus = 'proposed' | 'declined' | 'deploying' | 'funding' | 'locked' | 'settling' | 'paid' | 'refunded' | 'failed';
export type StakeRow = {
  match_id: string;
  status: StakeStatus;
  stake_stroops: number | string;
  proposed_by: string;
  contract_id: string | null;
  funded_a_tx: string | null;
  funded_b_tx: string | null;
  fund_deadline: string | null;
  outcome: 'winner' | 'draw' | 'refund' | null;
  winner_id: string | null;
  settle_tx: string | null;
  last_error: string | null;
};

export const STAKE_OPTIONS = [5, 10, 20] as const;
export const DEFAULT_STAKE = 10;
/** Trustless Work se queda con 0.3 % del pozo al repartir. */
export const netPot = (stakeUnits: number) => Math.floor(stakeUnits * 2 * 0.997 * 100) / 100;
export const units = (stroops: number | string) => Number(stroops) / 1e7;

export function stakesEnabled(): boolean {
  return process.env.EXPO_PUBLIC_STAKES_ENABLED === '1';
}

export async function loadStake(matchId: string): Promise<StakeRow | null> {
  const { data } = await getSupabase().from('match_stakes').select('*').eq('match_id', matchId).maybeSingle();
  return (data as StakeRow | null) ?? null;
}

/** Firma con la billetera Cavos (abre el login si hace falta). Sin XLM: el servidor paga el fee. */
async function signXdr(x: string) {
  return withCavosSigner((b) => b.signXdr(x));
}
const call = async <T>(action: string, extra: Record<string, unknown> = {}) => apiPost<T>('/api/stake', await accessToken(), { action, ...extra });

export const proposeStake = (matchId: string, amount: number) => call<{ status: StakeStatus }>('propose', { matchId, amount: String(amount) });
export const declineStake = (matchId: string) => call<{ ok: boolean }>('decline', { matchId });

/** Activa USDC de prueba en la billetera (una vez) y, si no tiene saldo, pide el faucet de demo. */
export async function ensureWalletReady(): Promise<void> {
  const r = await call<{ ready: boolean; unsignedXdr?: string }>('trustline_xdr');
  if (!r.ready && r.unsignedXdr) await call('trustline', { signedXdr: await signXdr(r.unsignedXdr) });
  await call('faucet').catch(() => undefined); // apagado o ya con saldo: no importa
}

export async function acceptStake(matchId: string) {
  await ensureWalletReady();
  return call<{ status: StakeStatus; contractId?: string }>('accept', { matchId });
}

/** Deposita la parte del jugador: pide el XDR, lo firma con Cavos y lo manda. */
export async function depositStake(matchId: string): Promise<{ status: StakeStatus; tx?: string }> {
  await ensureWalletReady();
  const { unsignedXdr } = await call<{ unsignedXdr: string }>('fund_xdr', { matchId });
  return call('fund', { matchId, signedXdr: await signXdr(unsignedXdr) });
}

/** Tras confirmar el resultado: liquida al instante (si no, lo hace el cron). Idempotente. */
export async function settleStake(matchId: string) {
  return call<{ status: StakeStatus; settleTx?: string; url?: string | null }>('settle', { matchId });
}

export const payoutUrl = (tx: string) => explorerTxUrl(tx, 'testnet');
