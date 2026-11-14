import { RARITY_RANK, trophyByCode, trophyCatalog } from '../content/trophies';
import type { PublicPlayer } from '../data/public-player';
import type { AchievementCode, Outcome } from '../domain/types';
import type { SocialLinks } from '../domain/social';

export type PlayerCardData = {
  profile: { displayName: string; username: string; photoUrl?: string | null; socialLinks?: SocialLinks | null };
  rating: number;
  peak: number;
  place: number | null;
  rankedPlayers: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  goalsFor: number;
  bestWinStreak: number;
  streak: { type: Outcome | 'none'; count: number };
  form: Outcome[];
  titles: number;
  achievements: { code: AchievementCode; unlocked: boolean; title: string }[];
};

export function rankLabel(place: number | null, rankedPlayers: number): string {
  return place ? `Ranking #${place} de ${rankedPlayers}` : 'Sin ranking aún';
}

export function achievementsLabel(unlocked: number, total: number): string {
  return `Logros · ${unlocked} de ${total}`;
}

export const FICHA_STRIP_EARNED = 5;
export const FICHA_STRIP_LOCKED = 3;

export type FichaBadge = { code: AchievementCode; unlocked: boolean; title: string };

/** En la tira de la ficha: ganados primero (hasta 5) o, si no hay, los de mayor rareza; el resto va en «+N». */
export function fichaAchievementStrip(items: FichaBadge[]): { shown: FichaBadge[]; extra: number } {
  const earned = items.filter((item) => item.unlocked);
  if (earned.length > 0) {
    const shown = earned.slice(0, FICHA_STRIP_EARNED);
    return { shown, extra: items.length - shown.length };
  }
  const locked = items.slice().sort((a, b) => {
    const rank = RARITY_RANK[trophyByCode[b.code].rarity] - RARITY_RANK[trophyByCode[a.code].rarity];
    return rank || a.code.localeCompare(b.code);
  });
  const shown = locked.slice(0, FICHA_STRIP_LOCKED);
  return { shown, extra: items.length - shown.length };
}

export function streakText(streak: PlayerCardData['streak']): string {
  if (streak.type === 'none' || streak.count === 0) return '–';
  return `${streak.count}${streak.type === 'win' ? 'V' : streak.type === 'draw' ? 'E' : 'D'}`;
}

/** Datos de la carta a partir de la ficha pública (lo usa también Perfil). */
export function cardFromPublic(data: PublicPlayer, nameOverride?: string): PlayerCardData {
  return {
    profile: { ...data.profile, displayName: nameOverride || data.profile.displayName },
    rating: data.rating,
    peak: data.peak,
    place: data.place,
    rankedPlayers: data.rankedPlayers,
    played: data.played,
    wins: data.wins,
    draws: data.draws,
    losses: data.losses,
    winRate: data.winRate,
    goalsFor: data.goalsFor,
    bestWinStreak: data.bestWinStreak,
    streak: data.streak,
    form: data.form,
    titles: data.titles.length,
    achievements: trophyCatalog.map((trophy) => ({
      code: trophy.code,
      title: trophy.title,
      unlocked: data.achievements.some((item) => item.code === trophy.code),
    })),
  };
}
