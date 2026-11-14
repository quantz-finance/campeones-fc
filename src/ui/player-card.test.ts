import { describe, expect, it } from 'vitest';
import type { PublicPlayer } from '../data/public-player';
import { achievementsLabel, cardFromPublic, rankLabel, streakText } from './player-card-data';

const sample: PublicPlayer = {
  profile: {
    id: '1',
    username: 'prueba',
    displayName: 'Usuario de prueba',
    avatarKey: 'rayo',
    photoUrl: null,
    socialLinks: {},
  },
  rating: 1200,
  peak: 1200,
  place: null,
  rankedPlayers: 0,
  played: 0,
  wins: 0,
  draws: 0,
  losses: 0,
  winRate: 0,
  goalsFor: 0,
  goalsAgainst: 0,
  bestWinStreak: 0,
  streak: { type: 'none', count: 0 },
  form: [],
  achievements: [],
  titles: [],
  groups: [],
  recent: [],
};

describe('ficha retrato a sangre', () => {
  it('arma la carta solo con campos que ya existen', () => {
    const card = cardFromPublic(sample, 'Usuario de prueba');
    expect(card.profile.displayName).toBe('Usuario de prueba');
    expect(card.profile.username).toBe('prueba');
    expect(card.rating).toBe(1200);
    expect(card.peak).toBe(1200);
    expect(card.titles).toBe(0);
    expect(card.achievements.map((item) => item.code)).toEqual(['first_win', 'streak_5', 'tournament_champion']);
    expect(card.achievements.every((item) => !item.unlocked)).toBe(true);
  });

  it('marca logros desbloqueados y cuenta títulos', () => {
    const card = cardFromPublic({
      ...sample,
      achievements: [{ code: 'first_win', title: 'Primera victoria', earnedAt: '2026-01-01' }],
      titles: [{ id: 't1', name: 'Copa', photoUrl: null, logo: null }],
    });
    expect(card.titles).toBe(1);
    expect(card.achievements.find((item) => item.code === 'first_win')?.unlocked).toBe(true);
    expect(card.achievements.filter((item) => item.unlocked)).toHaveLength(1);
  });

  it('escribe el ranking, los logros y la racha con los rótulos de la app', () => {
    expect(rankLabel(null, 0)).toBe('Sin ranking aún');
    expect(rankLabel(2, 10)).toBe('Ranking #2 de 10');
    expect(achievementsLabel(0, 3)).toBe('Logros · 0 de 3');
    expect(achievementsLabel(2, 3)).toBe('Logros · 2 de 3');
    expect(streakText({ type: 'none', count: 0 })).toBe('–');
    expect(streakText({ type: 'win', count: 3 })).toBe('3V');
    expect(streakText({ type: 'draw', count: 1 })).toBe('1E');
    expect(streakText({ type: 'loss', count: 2 })).toBe('2D');
  });

});
