// GET /api/espectador -> { world } para mirar sin cuenta (solo el mundo de ejemplo, ver api/_lib/spectator.ts).
// Sin sesión ni token: no hay ninguna escritura posible por aquí. Solo GET.
import type { SupabaseClient } from '@supabase/supabase-js';
import { adminClient } from './_lib/db';
import { missingEnv } from './_lib/env';
import { fail, HttpError, json } from './_lib/http';
import { clientIp, createLimiter } from './_lib/rateLimit';
import { loadSpectatorWorld, spectatorEnabled, type SpectatorSource } from './_lib/spectator';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const PAGE = 1000;

// 20 lecturas por minuto por IP y 300 por minuto en total por instancia (la CDN guarda la respuesta 60 s).
const perIp = createLimiter({ limit: 20, windowMs: 60_000 });
const overall = createLimiter({ limit: 300, windowMs: 60_000 });

function source(db: SupabaseClient): SpectatorSource {
  async function all(build: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>) {
    const out: Record<string, unknown>[] = [];
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await build(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Record<string, unknown>[];
      out.push(...rows);
      if (rows.length < PAGE) return out;
    }
  }
  return {
    demoRows: (table, columns) => all((from, to) => db.from(table).select(columns).eq('is_demo', true).order('id').range(from, to)),
    async rowsIn(table, columns, column, values) {
      if (values.length === 0) return [];
      return all((from, to) => db.from(table).select(columns).in(column, values).range(from, to));
    },
  };
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return json(res, 405, { error: 'method' });
    if (!spectatorEnabled(process.env.SPECTATOR)) throw new HttpError(403, 'El modo espectador está apagado.', 'spectator_disabled');
    const gate = perIp.hit(clientIp(req));
    const total = gate.ok ? overall.hit('all') : gate;
    if (!total.ok) {
      res.setHeader('Retry-After', String(total.retryAfter));
      throw new HttpError(429, `Muchos intentos seguidos. Espera ${total.retryAfter} s y vuelve a intentar.`, 'rate_limited', { retryAfter: total.retryAfter });
    }
    const missing = missingEnv(REQUIRED);
    if (missing.length) throw new HttpError(503, 'El servidor todavía no tiene acceso a la base de datos.', 'config_missing', { missing });
    const world = await loadSpectatorWorld(source(adminClient()));
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300');
    res.end(JSON.stringify({ world }));
  } catch (e) {
    return fail(res, e);
  }
}
