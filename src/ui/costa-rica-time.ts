/** Fecha y hora en America/Costa_Rica (UTC-6, sin horario de verano). */
export const PICKER_ZONE = 'America/Costa_Rica';
const OFFSET_HOURS = 6;

export type CivilTime = { year: number; month: number; day: number; hour: number; minute: number };

function part(parts: Intl.DateTimeFormatPart[], type: string): string {
  return parts.find((item) => item.type === type)?.value ?? '';
}

export function civilInZone(iso: string | Date, zone = PICKER_ZONE): CivilTime {
  const at = iso instanceof Date ? iso : new Date(iso);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  return {
    year: Number(part(parts, 'year')),
    month: Number(part(parts, 'month')),
    day: Number(part(parts, 'day')),
    hour: Number(part(parts, 'hour')),
    minute: Number(part(parts, 'minute')),
  };
}

/** Convierte fecha civil de Costa Rica a ISO UTC. */
export function isoFromCostaRica(year: number, month: number, day: number, hour: number, minute: number): string {
  return new Date(Date.UTC(year, month - 1, day, hour + OFFSET_HOURS, minute)).toISOString();
}

export function startOfDayCostaRica(now = new Date()): { year: number; month: number; day: number } {
  const c = civilInZone(now);
  return { year: c.year, month: c.month, day: c.day };
}

export function addDays(year: number, month: number, day: number, days: number): { year: number; month: number; day: number } {
  const utc = Date.UTC(year, month - 1, day + days);
  const d = new Date(utc);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function sameDay(a: { year: number; month: number; day: number }, b: { year: number; month: number; day: number }): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function dayChipLabel(year: number, month: number, day: number, today: { year: number; month: number; day: number }): string {
  if (sameDay({ year, month, day }, today)) return 'Hoy';
  const tomorrow = addDays(today.year, today.month, today.day, 1);
  if (sameDay({ year, month, day }, tomorrow)) return 'Mañana';
  const raw = new Intl.DateTimeFormat('es-CR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
  const cleaned = raw.replace(',', '').replace(/\s+/g, ' ').trim();
  return cleaned ? cleaned[0].toUpperCase() + cleaned.slice(1) : `${day}`;
}

export function upcomingDays(count = 16, now = new Date()): { year: number; month: number; day: number }[] {
  const today = startOfDayCostaRica(now);
  return Array.from({ length: count }, (_, index) => addDays(today.year, today.month, today.day, index));
}

export function snapMinute(minute: number, step = 15): number {
  const rounded = Math.round(minute / step) * step;
  if (rounded >= 60) return 0;
  if (rounded < 0) return 0;
  return rounded;
}
