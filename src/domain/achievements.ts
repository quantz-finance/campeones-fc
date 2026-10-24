import { rules } from './rules';
import { summarize } from './stats';
import type { AchievementCode, Match } from './types';

export function earnedAchievementCodes(input: {
  playerId: string;
  matches: Match[];
  tournamentWins: number;
}): AchievementCode[] {
  const record = summarize(input.matches, input.playerId);
  const codes: AchievementCode[] = [];
  if (record.wins >= 1) codes.push('first_win');
  if (record.bestWinStreak >= rules.streakTrophy) codes.push('streak_5');
  if (input.tournamentWins > 0) codes.push('tournament_champion');
  return codes;
}
