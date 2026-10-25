// Entrada con Cavos -> sesión de Supabase (POST /api/auth) y firma de resultados (POST /api/anchor).
import { attestationMessage, type ConfirmedResult } from '../../domain/match-proof';
import type { Match } from '../../domain/types';
import { ApiError, apiPost } from '../api';
import { getSupabase } from '../supabase';
import { RELOGIN } from './auth-ux';
import { STELLAR_NETWORK } from './config';
import { loginPath } from './login-path';
import { cavosStore, waitForCavos, type CavosBridged } from './store';

export type WalletLink =
  | { status: 'bound' | 'same' | 'other_wallet'; address: string }
  /** Entró sin la llave de la billetera en este navegador: no puede firmar resultados aquí. */
  | { status: 'not_on_device'; address: null };

/** La billetera existe pero su llave no está en este navegador y hay passkey: falta "Confirma que eres tú". */
export class DeviceApprovalNeeded extends Error {
  constructor() {
    super('Confirma que eres tú con tu passkey para usar tu billetera en este dispositivo.');
  }
}

export { loginPath };

type SessionResponse = {
  session: { access_token: string; refresh_token: string };
  wallet: WalletLink;
  linkedBy: string;
};

async function finish(r: SessionResponse): Promise<WalletLink> {
  const { error } = await getSupabase().auth.setSession(r.session);
  if (error) throw new Error('No pudimos abrir tu sesión. Vuelve a intentarlo.');
  return r.wallet;
}

/** Entrada solo con el token: el servidor la acepta con guardas (ver api/_lib/loginPolicy.ts). */
async function tokenOnly(token: string): Promise<WalletLink> {
  return finish(await apiPost<SessionResponse>('/api/auth', token, { step: 'session', tokenOnly: true }));
}

/** Cambia el login de Cavos (token ~1 h) por una sesión de Supabase que se renueva sola. */
export async function exchangeCavosSession(b: CavosBridged): Promise<WalletLink> {
  const token = b.token();
  if (!token || !b.address) throw new ApiError(RELOGIN, 401, 'auth_missing');
  const path = loginPath(b.wallet);
  if (path === 'approve') throw new DeviceApprovalNeeded();
  if (path === 'token') return tokenOnly(token);
  const { nonce, message } = await apiPost<{ nonce: string; message: string }>('/api/auth', token, { step: 'nonce' });
  let sig;
  try {
    sig = await b.signMessage(message);
  } catch (e) {
    // La llave no está en este navegador aunque el estado dijera otra cosa.
    if ((e as any)?.code === 'not_signer') {
      if (b.wallet.hasPasskey) throw new DeviceApprovalNeeded();
      return tokenOnly(token);
    }
    throw e;
  }
  return finish(
    await apiPost<SessionResponse>('/api/auth', token, {
      step: 'session',
      address: b.address,
      publicKey: sig.publicKey,
      signature: sig.signature,
      nonce,
    }),
  );
}

export type AnchorResponse = {
  state: string;
  tx?: string;
  url?: string | null;
  error?: string;
};

export function confirmedResult(m: Match): ConfirmedResult {
  if (!m.confirmedAt) throw new Error('El partido todavía no está confirmado.');
  return {
    matchId: m.id,
    playerAId: m.playerAId,
    playerBId: m.playerBId,
    winnerId: m.winnerId,
    isDraw: m.isDraw,
    goalsA: m.goalsA,
    goalsB: m.goalsB,
    confirmedAt: m.confirmedAt,
  };
}

async function accessToken(): Promise<string> {
  const { data } = await getSupabase().auth.getSession();
  if (!data.session) throw new ApiError('Tu sesión venció. Vuelve a entrar.', 401, 'auth_missing');
  return data.session.access_token;
}

/** Firma el resultado confirmado con la billetera Cavos y pide anclarlo. Abre el login de Cavos si hace falta. */
export async function signResult(m: Match): Promise<AnchorResponse> {
  const token = await accessToken();
  let b = await waitForCavos((x) => !x.isLoading, 45_000);
  if (!b.isAuthenticated || !b.address) {
    b.openModal();
    b = await waitForCavos((x) => x.isAuthenticated && !!x.address, 5 * 60_000);
  }
  const sig = await b.signMessage(attestationMessage(confirmedResult(m), STELLAR_NETWORK));
  return apiPost<AnchorResponse>('/api/anchor', token, { matchId: m.id, attestation: sig });
}

/** Pide anclar sin firmar (p. ej. cuando el otro jugador ya firmó). Idempotente. */
export async function requestAnchor(matchId: string): Promise<AnchorResponse> {
  return apiPost<AnchorResponse>('/api/anchor', await accessToken(), { matchId });
}

export async function cavosLogout() {
  const b = cavosStore.get().bridged;
  if (b) await b.logout().catch(() => undefined);
}
