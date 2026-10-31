import { describe, expect, it } from 'vitest';
import { ageCheck, ageOn, checkConsent, parseBirthDate } from './consent';

const today = '2026-10-31';
const base = { terms: true, privacy: true, parentalAck: false };

describe('fecha de nacimiento', () => {
  it('acepta DD/MM/AAAA y AAAA-MM-DD, rechaza fechas que no existen', () => {
    expect(parseBirthDate('05/03/2010')).toBe('2010-03-05');
    expect(parseBirthDate('2010-03-05')).toBe('2010-03-05');
    expect(parseBirthDate('31/02/2010')).toBeNull();
    expect(parseBirthDate('ayer')).toBeNull();
  });
  it('cuenta los años cumplidos', () => {
    expect(ageOn('2013-10-31', today)).toBe(13);
    expect(ageOn('2013-11-01', today)).toBe(12);
  });
  it('no acepta fechas futuras', () => {
    expect(ageCheck('01/01/2030', today).band).toBeNull();
  });
});

describe('consentimiento', () => {
  it('bloquea a menores de 13 aunque acepten todo', () => {
    const r = checkConsent({ ...base, parentalAck: true, birthDate: '01/11/2013' }, today);
    expect(r).toMatchObject({ ok: false, reason: 'under_13' });
  });
  it('de 13 a 17 pide el permiso de la madre, padre o tutor', () => {
    expect(checkConsent({ ...base, birthDate: '31/10/2013' }, today)).toMatchObject({ ok: false, reason: 'parental' });
    expect(checkConsent({ ...base, parentalAck: true, birthDate: '31/10/2013' }, today)).toMatchObject({ ok: true, band: '13_17' });
  });
  it('exige aceptar términos y privacidad', () => {
    expect(checkConsent({ ...base, terms: false, birthDate: '01/01/1990' }, today)).toMatchObject({ ok: false, reason: 'terms' });
    expect(checkConsent({ ...base, privacy: false, birthDate: '01/01/1990' }, today)).toMatchObject({ ok: false, reason: 'terms' });
    expect(checkConsent({ ...base, birthDate: '01/01/1990' }, today)).toMatchObject({ ok: true, band: '18_plus' });
  });
});
