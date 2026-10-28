/** Tiempos compartidos del sistema de movimiento. Solo transform/opacity. */

export const STAGGER_MS = 42;
export const STAGGER_CAP = 7;
export const ENTER_MS = 440;
export const EXIT_MS = 200;
export const EXIT_STAGGER_MS = 18;
export const EXIT_STAGGER_CAP = 5;
/** La salida termina cuando el último elemento (con su retraso) ya salió. */
export const EXIT_TOTAL_MS = EXIT_MS + EXIT_STAGGER_MS * EXIT_STAGGER_CAP;
export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE_IN = 'cubic-bezier(0.5, 0, 0.9, 0.4)';
export const COUNT_MS = 680;

export function staggerDelay(index: number, step = STAGGER_MS, cap = STAGGER_CAP): number {
  const safe = Number.isFinite(index) ? Math.max(0, index) : 0;
  return Math.min(safe, cap) * step;
}

export type RollTarget = {
  target: number;
  decimals: number;
  prefix: string;
  suffix: string;
  decimalComma: boolean;
};

/**
 * Acepta enteros, decimales y un sufijo corto (`64%`, `1,5`).
 * Rechaza cifras con separador de miles (`1 200`) para no animarlas mal.
 */
export function rollTarget(value: string): RollTarget | null {
  const match = /^([^0-9-]*?)(-?\d+(?:[.,]\d+)?)([^0-9]*)$/.exec(value.trim());
  if (!match) return null;
  const raw = match[2];
  const decimalComma = raw.includes(',');
  const normalized = raw.replace(',', '.');
  const decimals = normalized.includes('.') ? (normalized.split('.')[1]?.length ?? 0) : 0;
  const target = Number(normalized);
  if (!Number.isFinite(target)) return null;
  return { target, decimals, prefix: match[1] ?? '', suffix: match[3] ?? '', decimalComma };
}

export function formatRoll(target: number, progress: number, decimals: number, decimalComma: boolean): string {
  const shown = target * Math.min(1, Math.max(0, progress));
  const text = decimals > 0 ? shown.toFixed(decimals) : String(Math.round(shown));
  return decimalComma ? text.replace('.', ',') : text;
}

export function renderRoll(value: string, progress: number): string {
  const roll = rollTarget(value);
  if (!roll) return value;
  return `${roll.prefix}${formatRoll(roll.target, progress, roll.decimals, roll.decimalComma)}${roll.suffix}`;
}
