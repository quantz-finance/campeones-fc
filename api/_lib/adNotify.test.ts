import { describe, expect, it, vi } from 'vitest';
import { adRequestEmail, mailConfig, sendAdRequestEmail, type AdRequestRow } from './adNotify';

const row: AdRequestRow = {
  id: '6f1c2c55-0d43-4a8e-9a43-1d8a9f1d0a11',
  user_id: 'u1',
  business: 'Cancha <La 10>',
  contact_name: 'Ana',
  contact: 'ana@cancha.cr',
  section: 'inicio-franja',
  message: 'Alquiler de fútbol 5',
  image_path: null,
  created_at: '2026-11-14T05:00:00Z',
};

describe('aviso de solicitud de anuncio', () => {
  it('sin llave o sin destinatario no hay configuración (y dice qué falta)', () => {
    expect(mailConfig({}).missing).toEqual(['RESEND_API_KEY', 'AD_REQUESTS_NOTIFY_EMAIL']);
    expect(mailConfig({ RESEND_API_KEY: 'k', AD_REQUESTS_NOTIFY_EMAIL: 'a@b.co' }).config?.from).toMatch(/resend\.dev/);
  });
  it('arma el correo con los datos, escapa HTML y responde al contacto si es correo', () => {
    const mail = adRequestEmail(row, null);
    expect(mail.subject).toBe('Solicitud de anuncio: Cancha <La 10> · Inicio · Franja');
    expect(mail.html).toContain('Cancha &lt;La 10&gt;');
    expect(mail.text).toContain('hora de Costa Rica');
    expect(mail.replyTo).toBe('ana@cancha.cr');
    expect(adRequestEmail({ ...row, contact: '8888 1234' }, null).replyTo).toBeNull();
  });
  it('envía a Resend con la llave del servidor', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id: 'em_1' }), { status: 200 }));
    const out = await sendAdRequestEmail({ apiKey: 'k', to: 'rolo@x.com', from: 'CFC <a@b.co>' }, adRequestEmail(row, 'https://img'), fetchImpl as any);
    expect(out).toEqual({ ok: true, status: 200, id: 'em_1' });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer k');
    expect(JSON.parse(String(init.body)).to).toEqual(['rolo@x.com']);
  });
});
