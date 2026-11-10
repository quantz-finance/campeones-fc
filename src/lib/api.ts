// Cliente de las funciones de Vercel (/api). Mensajes de error siempre en español.

/** API de producción (testnet). En iOS/Android no hay origen HTTP; si falta EXPO_PUBLIC_API_BASE, usamos esta. */
export const DEFAULT_NATIVE_API_BASE = 'https://partido.campeonesfc.app';

export function apiBaseUrl(): string {
  const raw = (process.env.EXPO_PUBLIC_API_BASE ?? '').trim().replace(/\/$/, '');
  if (raw) return raw;
  // Expo inyecta EXPO_OS en el bundle (ios | android | web). En tests de Node queda vacío.
  const os = (process.env.EXPO_OS ?? '').toLowerCase();
  if (os === 'ios' || os === 'android') return DEFAULT_NATIVE_API_BASE;
  return '';
}

/** Convierte un path /api/... en URL absoluta cuando hay base (nativo). En la web sigue siendo relativo. */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = apiBaseUrl();
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export async function apiPost<T>(path: string, token: string, payload: unknown): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new ApiError('No hay conexión. Revisa tu internet y vuelve a intentar.', 0, 'network');
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof data.error === 'string' ? data.error : 'Algo falló. Intenta de nuevo en un momento.';
    throw new ApiError(msg, res.status, String(data.code ?? 'error'), data);
  }
  return data as T;
}

/** Ficha pública de un jugador (sin sesión). */
export async function fetchPublicPlayer(id: string): Promise<import('../data/public-player').PublicPlayer> {
  let res: Response;
  try {
    res = await fetch(apiUrl(`/api/jugador?id=${encodeURIComponent(id)}`));
  } catch {
    throw new ApiError('No hay conexión. Revisa tu internet y vuelve a intentar.', 0, 'network');
  }
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(typeof data.error === 'string' ? data.error : 'No pudimos abrir esta ficha. Intenta de nuevo.', res.status, typeof data.code === 'string' ? data.code : 'error');
  }
  return data as unknown as import('../data/public-player').PublicPlayer;
}
