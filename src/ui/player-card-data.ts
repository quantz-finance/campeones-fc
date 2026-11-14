import { RARITY_RANK, trophyByCode, trophyCatalog } from '../content/trophies';
import type { PublicPlayer } from '../data/public-player';
import { rules } from '../domain/rules';
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

/**
 * En la tira de la ficha: ganados primero (hasta 5) o, si no hay, los de mayor rareza.
 * «+N» cuenta solo los del mismo tipo que no caben (ganados ocultos, o bloqueados ocultos).
 */
export function fichaAchievementStrip(items: FichaBadge[]): { shown: FichaBadge[]; extra: number } {
  const earned = items.filter((item) => item.unlocked);
  if (earned.length > 0) {
    const shown = earned.slice(0, FICHA_STRIP_EARNED);
    return { shown, extra: Math.max(0, earned.length - shown.length) };
  }
  const locked = items.slice().sort((a, b) => {
    const rank = RARITY_RANK[trophyByCode[b.code].rarity] - RARITY_RANK[trophyByCode[a.code].rarity];
    return rank || a.code.localeCompare(b.code);
  });
  const shown = locked.slice(0, FICHA_STRIP_LOCKED);
  return { shown, extra: Math.max(0, locked.length - shown.length) };
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

/** Carta a partir del perfil local (y, si hay, la ficha pública). Sirve en Perfil aunque falle la red. */
export function cardFromFicha(input: {
  profile: { displayName: string; username: string; photoUrl?: string | null; socialLinks?: SocialLinks | null };
  displayName?: string;
  publicPlayer?: PublicPlayer | null;
  personal?: {
    rating: number;
    record: { played: number; wins: number; draws: number; losses: number; winRate: number; goalsFor: number; bestWinStreak: number; currentStreak: PlayerCardData['streak'] };
    evolution?: { rating: number }[];
  } | null;
  trophies?: { code: AchievementCode; earned: boolean }[] | null;
  place?: number | null;
  rankedPlayers?: number;
}): PlayerCardData {
  if (input.publicPlayer) {
    const card = cardFromPublic(input.publicPlayer, input.displayName);
    return {
      ...card,
      profile: { ...card.profile, photoUrl: input.profile.photoUrl ?? card.profile.photoUrl },
    };
  }
  const record = input.personal?.record;
  const rating = input.personal?.rating ?? rules.initialRating;
  const peak = input.personal?.evolution?.reduce((max, point) => Math.max(max, point.rating), rating) ?? rating;
  const streak = record?.currentStreak ?? { type: 'none' as const, count: 0 };
  return {
    profile: { ...input.profile, displayName: input.displayName || input.profile.displayName },
    rating,
    peak,
    place: input.place ?? null,
    rankedPlayers: input.rankedPlayers ?? 0,
    played: record?.played ?? 0,
    wins: record?.wins ?? 0,
    draws: record?.draws ?? 0,
    losses: record?.losses ?? 0,
    winRate: record?.winRate ?? 0,
    goalsFor: record?.goalsFor ?? 0,
    bestWinStreak: record?.bestWinStreak ?? 0,
    streak,
    form: [],
    titles: 0,
    achievements: trophyCatalog.map((trophy) => ({
      code: trophy.code,
      title: trophy.title,
      unlocked: input.trophies?.some((item) => item.code === trophy.code && item.earned) ?? false,
    })),
  };
}
