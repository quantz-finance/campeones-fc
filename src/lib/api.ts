// Cliente de las funciones de Vercel (/api). Mensajes de error siempre en español.
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
    res = await fetch(path, {
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
