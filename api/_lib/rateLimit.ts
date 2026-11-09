// Límite simple de peticiones en memoria (por instancia de la función).
// Es un freno de buena fe para /api/demo: con Fluid Compute las instancias se reutilizan,
// así que corta ráfagas del mismo IP sin depender de la base de datos.

export type Limiter = { hit: (key: string, now?: number) => { ok: boolean; retryAfter: number } };

export function createLimiter({ limit, windowMs, maxKeys = 5000 }: { limit: number; windowMs: number; maxKeys?: number }): Limiter {
  const hits = new Map<string, number[]>();
  return {
    hit(key, now = Date.now()) {
      const since = now - windowMs;
      const list = (hits.get(key) ?? []).filter((t) => t > since);
      if (list.length >= limit) {
        hits.set(key, list);
        return { ok: false, retryAfter: Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000)) };
      }
      list.push(now);
      hits.delete(key);
      hits.set(key, list);
      if (hits.size > maxKeys) hits.delete(hits.keys().next().value as string);
      return { ok: true, retryAfter: 0 };
    },
  };
}

/** IP del cliente según Vercel (primer valor de x-forwarded-for). */
export function clientIp(req: any): string {
  const fwd = String(req?.headers?.['x-forwarded-for'] ?? '').split(',')[0].trim();
  return fwd || String(req?.headers?.['x-real-ip'] ?? '') || 'unknown';
}
