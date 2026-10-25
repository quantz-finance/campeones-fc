// GET /api/daily (Authorization: Bearer <CRON_SECRET>): acta diaria en Stellar. La llama el cron de Vercel
// cada noche y scripts/chain/backfill.mjs para ponerse al día. Idempotente.
import { runDaily } from './_lib/daily';
import { supabaseDailyStore } from './_lib/db';
import { env, missingEnv } from './_lib/env';
import { bearer, fail, HttpError, json } from './_lib/http';
import { horizonChain } from './_lib/stellar';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PLATFORM_PUBLIC', 'PLATFORM_SECRET'];

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'method' });
    const secret = env.cronSecret();
    if (!secret || bearer(req) !== secret) throw new HttpError(401, 'no autorizado', 'unauthorized');
    const missing = missingEnv(REQUIRED);
    if (missing.length) throw new HttpError(503, 'Falta configuración.', 'config_missing', { missing });
    const store = supabaseDailyStore();
    const out = await runDaily({ store, chain: horizonChain(), network: env.stellarNetwork() });
    const pending = await store.queue(1000, new Date(0));
    return json(res, 200, { ok: true, network: env.stellarNetwork(), ...out, pending: pending.length });
  } catch (e) {
    return fail(res, e);
  }
}
