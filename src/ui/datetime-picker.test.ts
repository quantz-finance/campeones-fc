import { describe, expect, it } from 'vitest';
import { civilInZone, dayChipLabel, isoFromCostaRica, snapMinute, startOfDayCostaRica } from './costa-rica-time';

describe('fecha de Costa Rica', () => {
  it('guarda las 21:00 de Costa Rica en UTC al día siguiente (UTC-6)', () => {
    expect(isoFromCostaRica(2026, 11, 28, 21, 0)).toBe('2026-11-29T03:00:00.000Z');
    const civil = civilInZone('2026-11-29T03:00:00.000Z');
    expect(civil).toEqual({ year: 2026, month: 11, day: 28, hour: 21, minute: 0 });
  });

  it('etiqueta hoy y mañana y redondea minutos de 15 en 15', () => {
    const today = startOfDayCostaRica(new Date('2026-11-13T20:00:00.000Z'));
    expect(dayChipLabel(today.year, today.month, today.day, today)).toBe('Hoy');
    expect(snapMinute(7)).toBe(0);
    expect(snapMinute(8)).toBe(15);
    expect(snapMinute(52)).toBe(45);
    expect(snapMinute(53)).toBe(0);
  });
});
