import { trophyCatalog } from '../content/trophies';
import { achievementProgress, achievementUnlockDates, fromWorld } from '../domain/achievements';
import type { TrophyView } from './snapshots';
import type { World } from './types';

function inputOf(db: World, userId: string) {
  return {
    playerId: userId,
    matches: db.matches,
    groups: db.groups,
    groupMembers: db.groupMembers,
    tournaments: db.tournaments,
    slots: db.slots,
  };
}

/** Calcula los 24 logros a partir del mundo visible, sin escribir en la base. */
export function projectTrophies(db: World, userId: string): TrophyView[] {
  const input = inputOf(db, userId);
  const earned = new Set(fromWorld(userId, db));
  const dates = achievementUnlockDates(input);
  const progress = achievementProgress(input);
  return trophyCatalog.map((trophy) => ({
    ...trophy,
    earned: earned.has(trophy.code),
    earnedAt: earned.has(trophy.code) ? (dates[trophy.code] ?? null) : null,
    progress: progress[trophy.code] ?? null,
  }));
}

export function projectEarnedPublic(db: World, userId: string): { code: (typeof trophyCatalog)[number]['code']; title: string; earnedAt: string }[] {
  const trophies = projectTrophies(db, userId).filter((item) => item.earned);
  return trophies.map((item) => ({
    code: item.code,
    title: item.title,
    earnedAt: item.earnedAt ?? '',
  }));
}
