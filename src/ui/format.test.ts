import { describe, expect, it } from 'vitest';
import { formatEventWhen, groupJoinLabel, tournamentJoinLabel } from './format';

describe('formatEventWhen', () => {
  it('pinta la fecha de Costa Rica sin comas raras y con AM/PM', () => {
    // 27 nov 2026, 21:00 America/Costa_Rica = 28 nov 03:00 UTC
    expect(formatEventWhen('2026-11-28T03:00:00.000Z')).toBe('Vie 27 nov · 9:00 PM');
    expect(formatEventWhen('2026-11-27T15:00:00.000Z')).toBe('Vie 27 nov · 9:00 AM');
  });

  it('deja vacío una fecha que no es creíble', () => {
    expect(formatEventWhen(null)).toBe('');
    expect(formatEventWhen('1970-01-01T00:00:00.000Z')).toBe('');
  });
});

describe('etiquetas para unirse', () => {
  it('en un torneo muestra inscrito, solicitud o la acción', () => {
    expect(tournamentJoinLabel(true, false, true)).toBe('Inscrito ✓');
    expect(tournamentJoinLabel(true, true, true)).toBe('Inscrito ✓');
    expect(tournamentJoinLabel(false, true, true)).toBe('Solicitud enviada');
    expect(tournamentJoinLabel(false, false, true)).toBe('Inscribirme');
    expect(tournamentJoinLabel(false, false, false)).toBe('Pedir invitación');
  });

  it('en un grupo muestra miembro, solicitud o la acción', () => {
    expect(groupJoinLabel(true, false, true)).toBe('Miembro ✓');
    expect(groupJoinLabel(false, true, false)).toBe('Solicitud enviada');
    expect(groupJoinLabel(false, false, true)).toBe('Unirme');
    expect(groupJoinLabel(false, false, false)).toBe('Pedir invitación');
  });
});
