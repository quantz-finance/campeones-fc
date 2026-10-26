// Entrada con Cavos -> sesión de Supabase (POST /api/auth) y firma de resultados (POST /api/anchor).
import { attestationMessage, type ConfirmedResult } from '../../domain/match-proof';
import type { Match } from '../../domain/types';
import { ApiError, apiPost } from '../api';
import { getSupabase } from '../supabase';
import { RELOGIN } from './auth-ux';
import { CAVOS_APP_ID, STELLAR_NETWORK } from './config';
import { loginPath, tokenExpired } from './login-path';
import { cavosStore, waitForCavos, type CavosBridged } from './store';
import { clearCavosToken } from './token-persist';

export type WalletLink = { status: 'bound' | 'same'; address: string };

/** La billetera existe pero su llave no está en este navegador y hay passkey: falta "Confirma que eres tú". */
export class DeviceApprovalNeeded extends Error {
  constructor() {
    super('Confirma que eres tú con tu passkey para usar tu billetera en este dispositivo.');
  }
}

/**
 * La llave de la billetera no está en este navegador y no hay passkey para traerla. Sin la firma de la billetera
 * el servidor no abre sesión (el token de Cavos solo no basta: su aud es compartido entre apps de Cavos).
 */
export class NoDeviceKey extends Error {
  constructor() {
    super('Este navegador no tiene tu billetera de Cavos. Entra desde el dispositivo donde creaste tu cuenta.');
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

/** Cambia el login de Cavos (token ~1 h) por una sesión de Supabase que se renueva sola. */
export async function exchangeCavosSession(b: CavosBridged): Promise<WalletLink> {
  const token = b.token();
  if (!token || !b.address) throw new ApiError(RELOGIN, 401, 'auth_missing');
  // El kit guarda el token en sessionStorage y no lo renueva (~1 h): uno vencido nunca pasa en el servidor.
  if (tokenExpired(token)) throw new ApiError(RELOGIN, 401, 'session_expired');
  const path = loginPath(b.wallet);
  if (path === 'approve') throw new DeviceApprovalNeeded();
  if (path === 'token') throw new NoDeviceKey();
  const { nonce, message } = await apiPost<{ nonce: string; message: string }>('/api/auth', token, { step: 'nonce' });
  let sig;
  try {
    sig = await b.signMessage(message);
  } catch (e) {
    // La llave no está en este navegador aunque el estado dijera otra cosa.
    if ((e as any)?.code === 'not_signer') {
      if (b.wallet.hasPasskey) throw new DeviceApprovalNeeded();
      throw new NoDeviceKey();
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

export async function accessToken(): Promise<string> {
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
  cavosStore.setSignedOut(true);
  clearCavosToken(CAVOS_APP_ID);
  const b = cavosStore.get().bridged;
  if (b) await b.logout().catch(() => undefined);
}
