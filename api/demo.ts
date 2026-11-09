// POST /api/demo -> { session } de la cuenta de prueba compartida (ver api/_lib/demoLogin.ts).
// GET  /api/demo -> { enabled, configured, missing } (solo nombres, nunca valores)
import { adminClient, mintSession, userByEmail } from './_lib/db';
import { DEMO_LOGIN_EMAIL, demoLogin, demoLoginEnabled } from './_lib/demoLogin';
import { missingEnv } from './_lib/env';
import { fail, HttpError, json } from './_lib/http';
import { clientIp, createLimiter } from './_lib/rateLimit';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

// 5 entradas por minuto por IP y 60 por minuto en total por instancia.
const perIp = createLimiter({ limit: 5, windowMs: 60_000 });
const overall = createLimiter({ limit: 60, windowMs: 60_000 });

export default async function handler(req: any, res: any) {
  try {
    const enabled = demoLoginEnabled(process.env.DEMO_LOGIN);
    if (req.method === 'GET') {
      const missing = missingEnv(REQUIRED);
      return json(res, 200, { enabled, configured: missing.length === 0, missing });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    if (!enabled) throw new HttpError(403, 'La entrada de prueba está apagada.', 'demo_disabled');
    const gate = perIp.hit(clientIp(req));
    const total = gate.ok ? overall.hit('all') : gate;
    if (!total.ok) {
      res.setHeader('Retry-After', String(total.retryAfter));
      throw new HttpError(429, `Muchos intentos seguidos. Espera ${total.retryAfter} s y vuelve a intentar.`, 'rate_limited', { retryAfter: total.retryAfter });
    }
    const missing = missingEnv(REQUIRED);
    if (missing.length) throw new HttpError(503, 'El servidor todavía no tiene acceso a la base de datos.', 'config_missing', { missing });

    const db = adminClient();
    const session = await demoLogin({
      findUser: userByEmail,
      async createUser(email, meta) {
        const { data, error } = await db.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: meta,
          app_metadata: { demo_login: true },
        });
        if (error || !data.user) throw new Error(`createUser: ${error?.message ?? 'sin usuario'}`);
        return data.user.id;
      },
      async prepare(userId) {
        const { error } = await db.from('profiles').update({ show_demo: true }).eq('id', userId).eq('show_demo', false);
        if (error) throw new Error(`prepare: ${error.message}`);
      },
      mint: mintSession,
    }, DEMO_LOGIN_EMAIL);
    return json(res, 200, { session });
  } catch (e) {
    return fail(res, e);
  }
}
