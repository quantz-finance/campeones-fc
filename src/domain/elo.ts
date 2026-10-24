import { rules } from './rules';
import { byTime, type Match } from './types';

export function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + 10 ** ((ratingB - ratingA) / 400));
}

export function nextRatings(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  k: number = rules.eloK,
): { ratingA: number; ratingB: number } {
  const expectedA = expectedScore(ratingA, ratingB);
  const expectedB = expectedScore(ratingB, ratingA);
  return {
    ratingA: ratingA + k * (scoreA - expectedA),
    ratingB: ratingB + k * (1 - scoreA - expectedB),
  };
}

export type RatingReplay = {
  ratings: Record<string, number>;
  history: { userId: string; matchId: string; at: string; rating: number }[];
};

export function replayRatings(
  matches: Match[],
  initial: number = rules.initialRating,
  k: number = rules.eloK,
): RatingReplay {
  const confirmed = matches
    .filter((match) => match.status === 'confirmed' && match.confirmedAt)
    .slice()
    .sort(byTime);
  const ratings: Record<string, number> = {};
  const history: RatingReplay['history'] = [];
  const ratingOf = (id: string) => ratings[id] ?? initial;

  for (const match of confirmed) {
    const beforeA = ratingOf(match.playerAId);
    const beforeB = ratingOf(match.playerBId);
    const scoreA = match.isDraw ? 0.5 : match.winnerId === match.playerAId ? 1 : 0;
    const next = nextRatings(beforeA, beforeB, scoreA, k);
    ratings[match.playerAId] = next.ratingA;
    ratings[match.playerBId] = next.ratingB;
    history.push({
      userId: match.playerAId,
      matchId: match.id,
      at: match.confirmedAt!,
      rating: next.ratingA,
    });
    history.push({
      userId: match.playerBId,
      matchId: match.id,
      at: match.confirmedAt!,
      rating: next.ratingB,
    });
  }

  return { ratings, history };
}
