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

describe('i18n ficha pública y redes', () => {
  it('traduce la ficha y los errores de redes', () => {
    expect(translate('Ficha del jugador', 'en')).toBe('Player card');
    expect(translate('de 6 jugadores', 'en')).toBe('of 6 players');
    expect(translate('Ese enlace no es de TikTok.', 'en')).toBe("That link isn't from TikTok.");
    expect(translate('Usuario de Instagram no válido.', 'en')).toBe('Invalid Instagram username.');
    expect(translate('Tus redes', 'en')).toBe('Your socials');
    expect(translate('Logros · 0 de 3', 'en')).toBe('Achievements · 0 of 3');
    expect(translate('Ranking #2 de 10', 'en')).toBe('Rank #2 of 10');
  });
});

describe('buscador en inglés', () => {
  it('traduce el estado vacío y los conteos del buscador', () => {
    expect(translate('No encontramos a «vale».', 'en')).toBe('We couldn’t find “vale”.'.replace('’', "'"));
    expect(translate('3 elegidos', 'en')).toBe('3 picked');
    expect(translate('Busca por nombre o @usuario', 'en')).toBe('Search by name or @username');
    expect(translate('@andre · Sin partidos aún', 'en')).toBe('@andre · No matches yet');
  });
});
