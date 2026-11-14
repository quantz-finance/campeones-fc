/**
 * Fechas que realmente ocurrieron en la app. Epoch, basura e ISO inválidos
 * no se muestran: un placeholder como `new Date(0)` (31 dic 1969 en UTC-6)
 * no es un desbloqueo.
 */
export const EARLIEST_PLAUSIBLE_MS = Date.parse('2020-01-01T00:00:00.000Z');

export function plausibleIso(value: string | null | undefined): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const t = Date.parse(value);
  if (!Number.isFinite(t) || t < EARLIEST_PLAUSIBLE_MS) return null;
  return value;
}
