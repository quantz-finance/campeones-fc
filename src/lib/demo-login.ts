// Botón "Entrar con usuario de prueba": pide al servidor la sesión de la cuenta de prueba compartida
// (POST /api/demo) y la abre en Supabase. El cliente no guarda ni conoce ninguna credencial.
import { ApiError, apiUrl } from './api';
import { getSupabase } from './supabase';

type DemoResponse = { session: { access_token: string; refresh_token: string } };

export async function signInTestUser(): Promise<void> {
  let res: Response;
  try {
    res = await fetch(apiUrl('/api/demo'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  } catch {
    throw new ApiError('No hay conexión. Revisa tu internet y vuelve a intentar.', 0, 'network');
  }
  const data = (await res.json().catch(() => ({}))) as Partial<DemoResponse> & { error?: string; code?: string };
  if (!res.ok || !data.session) {
    throw new ApiError(data.error ?? 'No pudimos abrir el usuario de prueba. Intenta de nuevo en un momento.', res.status, data.code ?? 'error');
  }
  const { error } = await getSupabase().auth.setSession(data.session);
  if (error) throw new ApiError('No pudimos abrir el usuario de prueba. Intenta de nuevo en un momento.', 500, 'session');
}
