// Entrada por correo en iOS/Android sin el modal del kit.
//
// @cavos/kit/react-native (0.4.4 y 0.5.3) no hace el código por correo: tiene que verificar la atestación del
// enclave de Cavos con WebCrypto (P-384, ECDH, HKDF, AES-GCM) y Hermes no lo trae. La web sí lo hace (producción).
// Así que la app abre una sesión de autenticación del sistema (ASWebAuthenticationSession, efímera) en
// partido.campeonesfc.app/auth/correo-app; esa página usa el kit web tal cual (atestación incluida), pide y
// verifica el código, y vuelve SOLO a campeones-fc://cavos-auth con el token del enclave y la preimagen de su
// nonce en el fragmento (#, nunca llega a un servidor). La app:
//   - genera `state` (32 bytes aleatorios) y exige que vuelva idéntico (la vuelta empezó aquí);
//   - acepta solo el issuer del enclave de Cavos y una preimagen cuyo sha256 calza con el nonce del token;
//   - entrega token + preimagen al kit, que vuelve a comprobar el amarre (assertLoginBinding).
// Ni el token ni la preimagen se escriben en logs. Puro (sin React Native) para poder probarlo en Node.
import { sha256 } from '@noble/hashes/sha256';
import { utf8ToBytes } from '@noble/hashes/utils';

export const ENCLAVE_EMAIL_ISSUER = 'https://enclave.cavos.xyz';
export const HANDOFF_PATH = '/auth/correo-app';
export const HANDOFF_REDIRECT = 'campeones-fc://cavos-auth';
const B64URL_32 = /^[A-Za-z0-9_-]{43}$/;

export function bytesToB64url(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlToUtf8(part: string): string {
  const b = part.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b + '='.repeat((4 - (b.length % 4)) % 4));
  // Sin TextDecoder (no siempre está en Hermes): UTF-8 vía decodeURIComponent.
  return decodeURIComponent(Array.from(bin, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
}

/** `state` de 32 bytes en base64url (43 caracteres). */
export function makeHandoffState(random: Uint8Array): string {
  if (random.length !== 32) throw new Error('handoff: state necesita 32 bytes aleatorios');
  return bytesToB64url(random);
}

export const isHandoffState = (s: unknown): s is string => typeof s === 'string' && B64URL_32.test(s);

/** URL que abre la app. `base` es el origen https de producción. */
export function handoffStartUrl(base: string, state: string): string {
  if (!/^https:\/\//i.test(base)) throw new Error('handoff: la página de correo tiene que ser https');
  if (!isHandoffState(state)) throw new Error('handoff: state inválido');
  return `${base.replace(/\/$/, '')}${HANDOFF_PATH}?state=${state}`;
}

/** Igual que el kit: nonce = base64url(sha256(preimagen)). */
export function loginNonceOf(secret: string): string {
  return bytesToB64url(sha256(utf8ToBytes(secret)));
}

/** URL de vuelta que arma la página web (siempre al esquema fijo de la app, nunca a uno que llegue por la URL). */
export function handoffReturnUrl(p: { state: string; token: string; secret: string }): string {
  if (!isHandoffState(p.state)) throw new Error('handoff: state inválido');
  const q = new URLSearchParams({ cfc_state: p.state, cfc_token: p.token, cfc_secret: p.secret });
  return `${HANDOFF_REDIRECT}#${q.toString()}`;
}

export class HandoffError extends Error {
  constructor(public code: 'redirect' | 'state' | 'token' | 'issuer' | 'secret' | 'binding') {
    super(`handoff: vuelta de la entrada por correo rechazada (${code})`);
    this.name = 'HandoffError';
  }
}

/** Valida la vuelta. Devuelve el token y la preimagen para el kit; si algo no calza, lanza (sin incluir datos). */
export function parseHandoffReturn(url: string, expectedState: string): { token: string; secret: string } {
  if (!url.startsWith(`${HANDOFF_REDIRECT}#`) && !url.startsWith(`${HANDOFF_REDIRECT}/#`)) throw new HandoffError('redirect');
  const params = new URLSearchParams(url.slice(url.indexOf('#') + 1));
  const state = params.get('cfc_state');
  if (!isHandoffState(expectedState) || state !== expectedState) throw new HandoffError('state');
  const token = params.get('cfc_token') ?? '';
  const secret = params.get('cfc_secret') ?? '';
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((x) => !x)) throw new HandoffError('token');
  let claims: { iss?: unknown; nonce?: unknown; exp?: unknown };
  try {
    claims = JSON.parse(b64urlToUtf8(parts[1]));
  } catch {
    throw new HandoffError('token');
  }
  if (claims.iss !== ENCLAVE_EMAIL_ISSUER) throw new HandoffError('issuer');
  if (!B64URL_32.test(secret)) throw new HandoffError('secret');
  if (typeof claims.nonce !== 'string' || !claims.nonce.endsWith(`.${loginNonceOf(secret)}`)) throw new HandoffError('binding');
  return { token, secret };
}
