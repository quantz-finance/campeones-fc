// POST /api/auth  (Authorization: Bearer <JWT de Cavos>)
//   { step: 'nonce' }  -> { nonce, message }
//   { step: 'session', address, publicKey, signature, nonce } -> { session, wallet }
//   { step: 'session', tokenOnly: true } -> 409 device_not_authorized (sin firma de la billetera no hay sesión)
// Nunca llama a la API HTTP de Cavos (igual que Meteorito): JWT por JWKS + firma de la billetera. Ver loginPolicy.ts.
// GET /api/auth -> { configured, missing } (solo nombres, nunca valores)
import { verifyCavosToken } from './_lib/cavosAuth';
import { resolveUser } from './_lib/bridge';
import {
  bindWallet,
  consumeNonce,
  createAuthUser,
  identityUser,
  issueNonce,
  linkIdentity,
  mintSession,
  touchIdentity,
  userByEmail,
  userEmail,
} from './_lib/db';
import { env, missingEnv } from './_lib/env';
import { bearer, body, fail, HttpError, json } from './_lib/http';
import { bindMessage, ProofError, verifyBindProof } from './_lib/proof';
import { deviceNotAuthorized, walletOutcome } from './_lib/loginPolicy';
import { clientIp, createLimiter } from './_lib/rateLimit';

// Errores del login que el cliente solo ve como texto amable: el crudo (ya sin correo ni tokens) se deja en el log.
const clientErrorLimiter = createLimiter({ limit: 10, windowMs: 60_000 });
export function clientErrorLine(b: any): string | null {
  const clean = (v: unknown, n: number) =>
    String(v ?? '')
      .replace(/[^\s@"'<>]+@[^\s@"'<>]+\.[a-z]{2,}/gi, '<correo>')
      .replace(/[A-Za-z0-9_\-]{32,}/g, '<largo>')
      .replace(/[\r\n]+/g, ' ')
      .slice(0, n);
  const message = clean(b?.message, 300);
  if (!message) return null;
  return JSON.stringify({ message, path: clean(b?.path, 60) || null });
}

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'CAVOS_JWT_ISSUERS', 'CAVOS_JWT_AUDIENCE', 'EXPO_PUBLIC_CAVOS_APP_ID'];

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const missing = missingEnv(REQUIRED);
      return json(res, 200, { configured: missing.length === 0, missing, network: env.stellarNetwork() });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const pre = body(req);
    if (pre?.step === 'client_error') {
      const line = clientErrorLine(pre);
      if (line && clientErrorLimiter.hit(clientIp(req)).ok) console.warn('[auth] error en el cliente', line);
      return json(res, 202, { ok: true });
    }
    const missing = missingEnv(REQUIRED);
    if (missing.length) throw new HttpError(503, 'Cavos todavía no está configurado en el servidor.', 'cavos_not_configured', { missing });

    const token = bearer(req);
    const user = await verifyCavosToken(token);
    const b = body(req);
    if (b.step === 'nonce') {
      const nonce = await issueNonce(user.iss, user.sub);
      return json(res, 200, { nonce, message: bindMessage(user.iss, user.sub, nonce) });
    }
    if (b.step !== 'session') throw new HttpError(400, 'Paso desconocido.', 'bad_step');

    if (b.tokenOnly === true) throw deviceNotAuthorized();

    let proof: { address: string; nonce: string };
    try {
      proof = verifyBindProof(user.iss, user.sub, b);
    } catch (e) {
      const code = e instanceof ProofError ? e.code : 'proof_invalid';
      throw new HttpError(401, 'No pudimos comprobar tu billetera. Vuelve a entrar con Cavos.', code);
    }
    if (!(await consumeNonce(user.iss, user.sub, proof.nonce))) {
      throw new HttpError(401, 'El código de entrada venció. Vuelve a intentarlo.', 'nonce_invalid');
    }

    const { userId, linkedBy } = await resolveUser(user, { identityUser, userByEmail, createAuthUser, linkIdentity });
    // La primera billetera de la cuenta es la de anclaje; otra billetera de la misma persona no la reemplaza.
    const wallet = walletOutcome(await bindWallet(userId, proof.address, env.stellarNetwork()));
    await touchIdentity(user.iss, user.sub);
    const email = await userEmail(userId);
    if (!email) throw new Error('usuario sin correo');
    const session = await mintSession(email);
    if (session.user_id !== userId) throw new Error('la sesión acuñada no corresponde al usuario');
    return json(res, 200, { session, wallet: { status: wallet.status, address: proof.address }, linkedBy });
  } catch (e) {
    return fail(res, e, req);
  }
}
