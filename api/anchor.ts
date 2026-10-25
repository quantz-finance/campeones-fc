// POST /api/anchor  (Authorization: Bearer <access_token de Supabase>)
//   { matchId, attestation?: { publicKey, signature } } -> guarda la firma y ancla si corresponde.
// GET /api/anchor   (Authorization: Bearer <CRON_SECRET>, lo manda el cron de Vercel) -> barre la cola.
// GET /api/anchor?backfill=N (mismo secreto) -> además encola N partidos viejos "sin firma" (scripts/chain/backfill.mjs).
// Idempotente: se puede llamar cuantas veces sea; nunca hay dos tx vivas para el mismo partido.
import { explorerTxUrl } from '../src/domain/match-proof';
import { anchorMatch, recordAttestation, sweep } from './_lib/anchor';
import { chainBacklog, supabaseAnchorStore, supabaseUserFromToken } from './_lib/db';
import { env, missingEnv } from './_lib/env';
import { bearer, body, fail, HttpError, json } from './_lib/http';
import { horizonChain } from './_lib/stellar';

const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'PLATFORM_PUBLIC', 'PLATFORM_SECRET'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function deps() {
  return { store: supabaseAnchorStore(), chain: horizonChain(), network: env.stellarNetwork(), attestWaitS: env.attestWaitHours() * 3600 };
}

export default async function handler(req: any, res: any) {
  try {
    const missing = missingEnv(REQUIRED);
    if (req.method === 'GET') {
      const secret = env.cronSecret();
      if (!secret || bearer(req) !== secret) throw new HttpError(401, 'no autorizado', 'unauthorized');
      if (missing.length) throw new HttpError(503, 'Falta configuración.', 'config_missing', { missing });
      const d = deps();
      const want = Number(req.query?.backfill ?? 0);
      const queuedNow = Number.isFinite(want) && want > 0 ? await d.store.queueBackfill!(Math.min(Math.floor(want), 200)) : 0;
      const results = await sweep(d, 40);
      const backlog = await chainBacklog();
      return json(res, 200, { ok: true, network: d.network, queuedNow, processed: Object.keys(results).length, results, backlog });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    if (missing.length) throw new HttpError(503, 'El registro en Stellar todavía no está configurado.', 'config_missing', { missing });
    const userId = await supabaseUserFromToken(bearer(req));
    const b = body(req);
    if (typeof b.matchId !== 'string' || !UUID.test(b.matchId)) throw new HttpError(400, 'Partido inválido.', 'bad_match');
    const d = deps();
    const m = await d.store.getMatch(b.matchId);
    if (!m || (m.player_a_id !== userId && m.player_b_id !== userId)) throw new HttpError(404, 'No encontramos ese partido.', 'not_found');
    if (b.attestation) await recordAttestation(d.store, d.network, userId, b.matchId, b.attestation);
    const r = await anchorMatch(d, b.matchId);
    const url = r.state === 'anchored' ? explorerTxUrl(r.tx, d.network) : null;
    return json(res, 200, { ...r, url, network: d.network });
  } catch (e) {
    return fail(res, e);
  }
}
