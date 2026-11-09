import { describe, expect, it } from 'vitest';
import { en } from './en';
import { translate } from './lang';

describe('i18n', () => {
  it('en español deja el texto igual', () => {
    expect(translate('Entrar con usuario de prueba', 'es')).toBe('Entrar con usuario de prueba');
  });
  it('traduce frases exactas, patrones y segmentos con ·', () => {
    expect(translate('Entrar con usuario de prueba', 'en')).toBe('Sign in as test user');
    expect(translate('15 partidos', 'en')).toBe('15 matches');
    expect(translate('Por confirmar · 2', 'en')).toBe('To confirm · 2');
    expect(translate('Diego te retó', 'en')).toBe('Diego challenged you');
  });
  it('sin traducción conocida deja el original', () => {
    expect(translate('Andrés Quesada', 'en')).toBe('Andrés Quesada');
  });
  it('el diccionario no usa "pique"', () => {
    const all = Object.keys(en).join(' ');
    expect(/pique/i.test(all)).toBe(false);
  });
});

describe('i18n tramos', () => {
  it('traduce cada tramo y los conteos dentro de patrones', () => {
    expect(translate('Esperando a Mateo · lo propusiste hace 15 min', 'en')).toBe('Waiting for Mateo · you proposed it 15 min ago');
    expect(translate('Racha actual: 8 victorias. Mejor racha: 8 victorias.', 'en')).toBe('Current streak: 8 wins. Best streak: 8 wins.');
  });
});
