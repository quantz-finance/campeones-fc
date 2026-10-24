// Ventanas cortas y guardia de reconstrucción (adaptado de Meteorito api/_lib/timebounds.ts).
// Regla: nunca dos tx "vivas" para el mismo partido. Solo se reconstruye cuando la anterior
// (a) ya venció según el close time del último ledger (no el reloj local) y (b) su hash no entró.
export const txWindowS = () => {
  const n = Number(process.env.TX_MAX_WINDOW_S ?? '60');
  return Number.isFinite(n) && n >= 10 && n <= 300 ? n : 60;
};

export type RebuildDecision = { ok: true } | { ok: false; reason: 'landed' | 'no_timebounds' | 'not_expired' };

export function rebuildDecision(p: { maxTime: number | null; ledgerCloseS: number; landed: boolean }): RebuildDecision {
  if (p.landed) return { ok: false, reason: 'landed' };
  if (!p.maxTime) return { ok: false, reason: 'no_timebounds' };
  if (p.ledgerCloseS <= p.maxTime) return { ok: false, reason: 'not_expired' };
  return { ok: true };
}
