import { trophyCatalog } from '../content/trophies';
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
