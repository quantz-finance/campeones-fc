export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'error',
    public extra: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

export function json(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export function fail(res: any, e: unknown) {
  if (e instanceof HttpError) return json(res, e.status, { error: e.message, code: e.code, ...e.extra });
  console.error('[api] error inesperado', e);
  return json(res, 500, { error: 'Algo falló de nuestro lado. Intenta de nuevo en un momento.', code: 'internal' });
}

export function bearer(req: any): string {
  const h: string = req.headers?.authorization ?? '';
  return h.startsWith('Bearer ') ? h.slice(7).trim() : '';
}

export function body(req: any): any {
  const b = req.body;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b);
    } catch {
      return {};
    }
  }
  return b ?? {};
}
