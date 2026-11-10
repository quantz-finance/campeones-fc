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

describe('i18n portada', () => {
  it('traduce las secciones y los datos de la portada del inicio', () => {
    expect(translate('Estrella de la semana', 'en')).toBe('Star of the week');
    expect(translate('Torneos más calientes', 'en')).toBe('Hottest tournaments');
    expect(translate('#2 Ranking', 'en')).toBe('Ranking #2');
    expect(translate('Racha de 8 victorias', 'en')).toBe('8-win streak');
    expect(translate('12 Elo de diferencia', 'en')).toBe('12 Elo apart');
    expect(translate('Victorias · semana', 'en')).toBe('Wins · week');
    expect(translate('Copa X · Ganó Andrés · hace 3 d', 'en')).toBe('Copa X · Andrés won · 3 d ago');
  });
});

describe('i18n portada v2', () => {
  it('traduce mosaico, patrocinios y accesos', () => {
    expect(translate('Tabla', 'en')).toBe('Table');
    expect(translate('Patrocinado', 'en')).toBe('Sponsored');
    expect(translate('Elo · últimos 7 días', 'en')).toBe('Elo · last 7 days');
    expect(translate('Las estrellas', 'en')).toBe('The stars');
  });
});
