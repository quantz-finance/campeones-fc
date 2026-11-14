// Aviso por correo de una solicitud de anuncio nueva. Proveedor: Resend (API HTTP, sin dependencias).
// Variables del servidor (Vercel), nunca en el cliente:
//   AD_REQUESTS_NOTIFY_EMAIL  a quién avisar (el correo personal de Rolando)
//   RESEND_API_KEY            llave de Resend
//   AD_REQUESTS_FROM_EMAIL    remitente (opcional; por defecto el de pruebas de Resend, que solo
//                             puede escribirle al dueño de la cuenta de Resend)

export const AD_SPACE_LABEL: Record<string, string> = {
  'inicio-franja': 'Inicio · Franja (358×96 pt)',
  'inicio-ficha': 'Inicio · Ficha (172×120 pt)',
  'inicio-copas': 'Inicio · Torneos más calientes (168×168 pt)',
  'grupos-publicos': 'Grupos · Grupos públicos (174×205 pt)',
  'torneos-lista': 'Torneos · Lista (358×61 pt)',
};

export type AdRequestRow = {
  id: string;
  user_id: string | null;
  business: string;
  contact_name: string;
  contact: string;
  section: string;
  message: string;
  image_path: string | null;
  created_at: string;
};

export type MailConfig = { apiKey: string; to: string; from: string };

export function mailConfig(env: Record<string, string | undefined> = process.env): { config: MailConfig | null; missing: string[] } {
  const apiKey = (env.RESEND_API_KEY ?? '').trim();
  const to = (env.AD_REQUESTS_NOTIFY_EMAIL ?? '').trim();
  const from = (env.AD_REQUESTS_FROM_EMAIL ?? '').trim() || 'Campeones FC <onboarding@resend.dev>';
  const missing = [!apiKey && 'RESEND_API_KEY', !to && 'AD_REQUESTS_NOTIFY_EMAIL'].filter(Boolean) as string[];
  return { config: missing.length ? null : { apiKey, to, from }, missing };
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

export function adRequestEmail(row: AdRequestRow, imageUrl: string | null) {
  const space = AD_SPACE_LABEL[row.section] ?? row.section;
  const when = new Date(row.created_at).toLocaleString('es-CR', { timeZone: 'America/Costa_Rica', dateStyle: 'medium', timeStyle: 'short' });
  const lines: [string, string][] = [
    ['Negocio', row.business],
    ['Contacto', row.contact_name],
    ['Correo o teléfono', row.contact],
    ['Sección', space],
    ['Texto del anuncio', row.message],
    ['Recibida', `${when} (hora de Costa Rica)`],
    ['Id', row.id],
  ];
  const text = [
    'Nueva solicitud de anuncio en Campeones FC (en revisión).',
    '',
    ...lines.map(([k, v]) => `${k}: ${v}`),
    imageUrl ? `Imagen (enlace válido 7 días): ${imageUrl}` : 'Sin imagen.',
    '',
    'Para publicarla: revisa la solicitud, prepara el arte y súbelo a mano. Estado en Supabase: ad_requests.status.',
  ].join('\n');
  const html = `<div style="font-family:Arial,sans-serif;color:#1A0A1C">
<h2 style="margin:0 0 12px">Nueva solicitud de anuncio</h2>
<p style="margin:0 0 12px">Quedó <b>en revisión</b>.</p>
<table cellpadding="6" style="border-collapse:collapse">${lines
    .map(([k, v]) => `<tr><td style="color:#6b5a70;vertical-align:top">${esc(k)}</td><td><b>${esc(v)}</b></td></tr>`)
    .join('')}</table>
${imageUrl ? `<p><a href="${esc(imageUrl)}">Ver la imagen</a> (enlace válido 7 días)</p>` : '<p>Sin imagen.</p>'}
</div>`;
  return {
    subject: `Solicitud de anuncio: ${row.business} · ${space.split(' (')[0]}`,
    text,
    html,
    replyTo: isEmail(row.contact) ? row.contact.trim() : null,
  };
}

export async function sendAdRequestEmail(
  config: MailConfig,
  mail: ReturnType<typeof adRequestEmail>,
  fetchImpl: typeof fetch = fetch,
): Promise<{ ok: boolean; status: number; id?: string; error?: string }> {
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: config.from,
      to: [config.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  return res.ok ? { ok: true, status: res.status, id: data.id } : { ok: false, status: res.status, error: data.message ?? 'error' };
}
