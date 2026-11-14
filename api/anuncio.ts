// POST /api/anuncio
//   Authorization: Bearer <access_token de Supabase>
//   { id }  -> { ok: true, notified: boolean, reason? }
// La app ya guardó la solicitud en ad_requests (RLS: solo insertar la propia). Aquí solo se avisa por
// correo al equipo, una vez por solicitud y solo a su dueño. Sin proveedor configurado, la solicitud
// queda guardada igual (notified: false, reason: 'email_not_configured').
import { adminClient, supabaseUserFromToken } from './_lib/db';
import { adRequestEmail, mailConfig, sendAdRequestEmail, type AdRequestRow } from './_lib/adNotify';
import { bearer, body, fail, HttpError, json } from './_lib/http';
import { clientIp, createLimiter } from './_lib/rateLimit';
import { reportServerError } from './_lib/report';

const limiter = createLimiter({ limit: 10, windowMs: 60 * 60_000 });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') return json(res, 405, { error: 'method' });
    const userId = await supabaseUserFromToken(bearer(req));
    const hit = limiter.hit(`${clientIp(req)}:${userId}`);
    if (!hit.ok) throw new HttpError(429, 'Espera un momento y vuelve a intentarlo.', 'rate_limited', { retryAfter: hit.retryAfter });
    const id = String(body(req).id ?? '');
    if (!UUID.test(id)) throw new HttpError(400, 'Solicitud inválida.', 'bad_id');

    const db = adminClient();
    const { data, error } = await db
      .from('ad_requests')
      .select('id,user_id,business,contact_name,contact,section,message,image_path,created_at,notified_at')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw new Error(`ad_requests: ${error.message}`);
    if (!data) throw new HttpError(404, 'No encontramos tu solicitud.', 'not_found');
    if (data.notified_at) return json(res, 200, { ok: true, notified: true, reason: 'already' });

    const { config, missing } = mailConfig();
    if (!config) {
      console.warn('[anuncio] sin proveedor de correo; faltan', missing.join(', '));
      return json(res, 200, { ok: true, notified: false, reason: 'email_not_configured' });
    }
    let imageUrl: string | null = null;
    if (data.image_path) {
      const signed = await db.storage.from('ad-requests').createSignedUrl(data.image_path, 7 * 24 * 3600);
      imageUrl = signed.data?.signedUrl ?? null;
    }
    const sent = await sendAdRequestEmail(config, adRequestEmail(data as AdRequestRow, imageUrl));
    if (!sent.ok) {
      await reportServerError(new Error(`resend ${sent.status}: ${sent.error}`), { path: '/api/anuncio' });
      return json(res, 200, { ok: true, notified: false, reason: 'email_failed' });
    }
    await db.from('ad_requests').update({ notified_at: new Date().toISOString() }).eq('id', id).is('notified_at', null);
    return json(res, 200, { ok: true, notified: true });
  } catch (e) {
    return fail(res, e, req);
  }
}
