// Cliente de la apuesta por partido (Trustless Work, SOLO testnet). La UI llama estas funciones; el servidor decide.
import { apiPost } from '../api';
import { cavosStore } from '../cavos/store';
import { explorerTxUrl } from '../../domain/match-proof';

export type StakeStatus = 'proposed' | 'declined' | 'deploying' | 'funding' | 'locked' | 'settling' | 'paid' | 'refunded' | 'failed';

export function stakesEnabled(): boolean {
  return process.env.EXPO_PUBLIC_STAKES_ENABLED === '1';
}

const signXdr = async (x: string) => {
  const b = cavosStore.get().bridged;
  if (!b) throw new Error('Tu billetera de Cavos todavía no está lista.');
  return b.signXdr(x);
};
const call = <T>(token: string, action: string, extra: Record<string, unknown> = {}) => apiPost<T>('/api/stake', token, { action, ...extra });

export const proposeStake = (token: string, matchId: string, amount: string) => call<{ status: StakeStatus }>(token, 'propose', { matchId, amount });
export const acceptStake = (token: string, matchId: string) => call<{ status: StakeStatus; contractId?: string }>(token, 'accept', { matchId });
export const declineStake = (token: string, matchId: string) => call<{ ok: boolean }>(token, 'decline', { matchId });

/** Activa USDC de prueba en la billetera (una vez). La reserva y el fee los paga la plataforma. */
export async function ensureTrustline(token: string): Promise<void> {
  const r = await call<{ ready: boolean; unsignedXdr?: string }>(token, 'trustline_xdr');
  if (r.ready || !r.unsignedXdr) return;
  await call(token, 'trustline', { signedXdr: await signXdr(r.unsignedXdr) });
}

/** Deposita la parte del jugador: pide el XDR, lo firma con Cavos y lo manda. Un toque de "Depositar". */
export async function depositStake(token: string, matchId: string): Promise<{ status: StakeStatus; tx?: string }> {
  const { unsignedXdr } = await call<{ unsignedXdr: string }>(token, 'fund_xdr', { matchId });
  return call(token, 'fund', { matchId, signedXdr: await signXdr(unsignedXdr) });
}

/** Tras confirmar el resultado: liquida al instante (si no, lo hace el cron). Devuelve el link "Verificado en Stellar". */
export async function settleStake(token: string, matchId: string) {
  const r = await call<{ status: StakeStatus; settleTx?: string; url?: string | null }>(token, 'settle', { matchId });
  return { ...r, url: r.url ?? (r.settleTx ? explorerTxUrl(r.settleTx, 'testnet') : null) };
}
