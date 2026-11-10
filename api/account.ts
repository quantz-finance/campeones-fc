// POST /api/account
//   Authorization: Bearer <access_token de Supabase de la persona>
//   { step: 'delete', confirm: 'ELIMINAR' } -> { ok: true, status: 'anonymized' }
// El userId sale SOLO del token. El cuerpo no puede pedir borrar a otra persona.
import { deleteAccount } from './_lib/deleteAccount';
import { supabaseDeleteAccountStore } from './_lib/deleteAccount.supabase';
import { adminClient, supabaseUserFromToken } from './_lib/db';
import { bearer, body, fail, HttpError, json } from './_lib/http';
import { clientIp, createLimiter } from './_lib/rateLimit';

const limiter = createLimiter({ limit: 5, windowMs: 15 * 60_000 });

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const token = bearer(req);
    const userId = await supabaseUserFromToken(token);
    const hit = limiter.hit(`${clientIp(req)}:${userId}`);
    if (!hit.ok) throw new HttpError(429, 'Espera un momento y vuelve a intentarlo.', 'rate_limited', { retryAfter: hit.retryAfter });

    const b = body(req);
    if (b.step !== 'delete') throw new HttpError(400, 'Paso desconocido.', 'bad_step');
    const result = await deleteAccount(supabaseDeleteAccountStore(adminClient()), userId, b.confirm);
    return json(res, 200, { ok: true, status: result.status });
  } catch (e) {
    return fail(res, e, req);
  }
}
