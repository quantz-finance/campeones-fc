// Verificación del JWT de Cavos (adaptado de Meteorito api/_lib/auth.ts).
// - Lista CERRADA de issuers (CAVOS_JWT_ISSUERS + CAVOS_EXTRA_ISSUER opcional).
// - aud obligatorio: el appId de Cavos (CAVOS_JWT_AUDIENCE). Sin appId no se acepta ningún token.
// - Tokens de Google/Apple/enclave: además del appId, solo el aud configurado para ESE issuer (opt-in).
//   Esos aud son compartidos entre apps de Cavos; /api/auth exige además la billetera registrada (registry.ts).
// - Sin ventana de gracia: el token solo se usa una vez, al entrar, para acuñar la sesión de Supabase.
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { env } from './env';
import { HttpError } from './http';

type KeyGetter = Parameters<typeof jwtVerify>[1];
const JWKS: Record<string, ReturnType<typeof createRemoteJWKSet>> = {};
let testKeys: KeyGetter | null = null;
/** Solo tests: verificar contra llaves locales. */
export const __setJwksForTests = (k: KeyGetter | null) => {
  testKeys = k;
};

const GOOGLE_ISS = ['https://accounts.google.com', 'accounts.google.com'];
const APPLE_ISS = 'https://appleid.apple.com';

function jwksFor(iss: string): KeyGetter {
  if (testKeys) return testKeys;
  const extra = env.cavosExtraIssuer();
  const url = GOOGLE_ISS.includes(iss)
    ? 'https://www.googleapis.com/oauth2/v3/certs'
    : iss === APPLE_ISS
      ? 'https://appleid.apple.com/auth/keys'
      : extra && extra.iss === iss
        ? extra.jwks
        : env.cavosJwks();
  return (JWKS[url] ??= createRemoteJWKSet(new URL(url))) as KeyGetter;
}

export interface CavosUser {
  iss: string;
  sub: string;
  email: string | null;
  /** true SOLO si el token trae email_verified === true (booleano o "true"). */
  emailVerified: boolean;
  name: string | null;
}

export const AUTH_INVALID = 'No pudimos verificar tu sesión de Cavos. Vuelve a entrar.';
export const SESSION_EXPIRED = 'Tu sesión de Cavos venció. Vuelve a entrar.';

const invalid = (reason: string) => new HttpError(401, AUTH_INVALID, 'auth_invalid', { reason });

export function allowedIssuers(): string[] {
  const extra = env.cavosExtraIssuer();
  return [...env.cavosIssuers(), ...(extra ? [extra.iss] : [])];
}

function claimsOf(token: string): Record<string, unknown> {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8'));
  } catch {
    throw invalid('malformed');
  }
}

export async function verifyCavosToken(token: string): Promise<CavosUser> {
  if (!token) throw new HttpError(401, 'Entra con Cavos para continuar.', 'auth_missing');
  const base = env.cavosAudiences();
  if (!base.length) throw new HttpError(503, 'Cavos todavía no está configurado en el servidor.', 'cavos_not_configured');
  const claims = claimsOf(token);
  const iss = typeof claims.iss === 'string' ? claims.iss : '';
  const allowed = allowedIssuers();
  const isGoogle = GOOGLE_ISS.includes(iss) && allowed.some((a) => GOOGLE_ISS.includes(a));
  if (!allowed.includes(iss) && !isGoogle) {
    console.warn('[auth] issuer rechazado', JSON.stringify({ iss }));
    throw invalid('issuer');
  }
  const extra = env.cavosExtraIssuer();
  const audiences = isGoogle
    ? [...base, ...env.googleAudiences()]
    : iss === APPLE_ISS
      ? [...base, ...env.appleAudiences()]
      : extra && extra.iss === iss && extra.aud
        ? [...base, extra.aud]
        : base;
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, jwksFor(iss), { issuer: iss, audience: audiences, clockTolerance: 30 }));
  } catch (e: any) {
    const code = String(e?.code ?? '');
    console.warn('[auth] token rechazado', JSON.stringify({ code, iss, aud: claims.aud }));
    if (code === 'ERR_JWT_EXPIRED') throw new HttpError(401, SESSION_EXPIRED, 'session_expired');
    throw invalid(code === 'ERR_JWT_CLAIM_VALIDATION_FAILED' ? String(e?.claim ?? 'claim') : 'signature');
  }
  const sub = String(payload.sub ?? (payload as any).user_id ?? '');
  if (!sub) throw invalid('no_sub');
  const p = payload as Record<string, unknown>;
  const email = typeof p.email === 'string' && p.email.includes('@') ? p.email.trim().toLowerCase() : null;
  const emailVerified = p.email_verified === true || p.email_verified === 'true';
  const name = typeof p.name === 'string' ? p.name.slice(0, 64) : null;
  return { iss, sub, email, emailVerified, name };
}

/** ¿Se puede ligar por correo? Solo con email_verified explícito y nunca con el relay privado de Apple. */
export function canLinkByEmail(u: CavosUser): boolean {
  if (!u.email || !u.emailVerified) return false;
  if (/@privaterelay\.appleid\.com$/i.test(u.email)) return false;
  return true;
}
