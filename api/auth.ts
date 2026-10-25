// POST /api/auth  (Authorization: Bearer <JWT de Cavos>)
//   { step: 'nonce' }  -> { nonce, message }
//   { step: 'session', address, publicKey, signature, nonce } -> { session, wallet }
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
import { assertRegisteredWallet } from './_lib/registry';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'CAVOS_JWT_ISSUERS', 'CAVOS_JWT_AUDIENCE', 'EXPO_PUBLIC_CAVOS_APP_ID'];

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'GET') {
      const missing = missingEnv(REQUIRED);
      return json(res, 200, { configured: missing.length === 0, missing, network: env.stellarNetwork() });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
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

    let proof: { address: string; nonce: string };
    try {
      proof = verifyBindProof(user.iss, user.sub, b);
    } catch (e) {
      const code = e instanceof ProofError ? e.code : 'proof_invalid';
      throw new HttpError(401, 'No pudimos comprobar tu billetera. Vuelve a entrar con Cavos.', code);
    }
    await assertRegisteredWallet(
      { baseUrl: env.cavosApiUrl(), appId: env.cavosAppId(), network: env.stellarNetwork(), environment: env.cavosEnvironment() },
      token,
      user.sub,
      proof.address,
    );
    if (!(await consumeNonce(user.iss, user.sub, proof.nonce))) {
      throw new HttpError(401, 'El código de entrada venció. Vuelve a intentarlo.', 'nonce_invalid');
    }

    const { userId, linkedBy } = await resolveUser(user, { identityUser, userByEmail, createAuthUser, linkIdentity });
    const wallet = await bindWallet(userId, proof.address, env.stellarNetwork());
    if (wallet === 'address_taken') throw new HttpError(409, 'Esa billetera ya está ligada a otra cuenta.', 'address_taken');
    await touchIdentity(user.iss, user.sub);
    const email = await userEmail(userId);
    if (!email) throw new Error('usuario sin correo');
    const session = await mintSession(email);
    if (session.user_id !== userId) throw new Error('la sesión acuñada no corresponde al usuario');
    return json(res, 200, { session, wallet: { status: wallet, address: proof.address }, linkedBy });
  } catch (e) {
    return fail(res, e);
  }
}
