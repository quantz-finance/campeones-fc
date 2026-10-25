// Reintentos con backoff para llamadas de RED (Horizon). Adaptado de Meteorito api/_lib/retry.ts.
// Solo errores transitorios (red, timeout, 5xx, 429). Antes de reenviar un submit, `landed` verifica si ya entró.
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function isTransient(e: any): boolean {
  const m = String(e?.message ?? e ?? '');
  const st = Number(e?.status ?? e?.response?.status ?? 0);
  if (st === 429 || (st >= 500 && st <= 599)) return true;
  return /timed? ?out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|socket hang up|fetch failed|network|Bad Gateway|Service Unavailable|Gateway Time-?out/i.test(m);
}

export async function withRetry<T>(
  label: string,
  fn: () => Promise<T>,
  opts: { landed?: () => Promise<T | null>; delaysMs?: number[] } = {},
): Promise<T> {
  const ds = opts.delaysMs ?? [500, 1500, 3000];
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (e: any) {
      if (i >= ds.length || !isTransient(e)) throw e;
      console.warn(`[retry] ${label}: ${String(e?.message ?? e).slice(0, 160)}; reintento ${i + 1}/${ds.length}`);
      await sleep(ds[i]);
      if (opts.landed) {
        const done = await opts.landed().catch(() => null);
        if (done != null) return done;
      }
    }
  }
}
