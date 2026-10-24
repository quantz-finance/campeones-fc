import { replayRatings } from './elo';
import { rules } from './rules';
import {
  between,
  byTime,
  involves,
  opponentOf,
  type Match,
  type Outcome,
} from './types';

export type Streak = { type: Outcome | 'none'; count: number };

export type BiggestWin = {
  matchId: string;
  opponentId: string;
  goalsFor: number;
  goalsAgainst: number;
};

export type SideRecord = {
  played: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  scoredMatches: number;
  points: number;
  currentStreak: Streak;
  bestWinStreak: number;
  biggestWin: BiggestWin | null;
};

export type RivalRow = { opponentId: string; record: SideRecord };

export type EvolutionPoint = {
  matchId: string;
  at: string;
  pointsYou: number;
  pointsThem: number;
  ratingYou: number;
  ratingThem: number;
};

export type TableRow = SideRecord & { playerId: string; rating: number };

export type RankRow = {
  playerId: string;
  rating: number;
  played: number;
  winRate: number;
  wins: number;
  draws: number;
  losses: number;
};

export function resultOf(match: Match, playerId: string): Outcome {
  if (match.isDraw || !match.winnerId) return 'draw';
  return match.winnerId === playerId ? 'win' : 'loss';
}

export function pointsFor(outcome: Outcome): number {
  if (outcome === 'win') return 3;
  if (outcome === 'draw') return 1;
  return 0;
}

function goalsForPlayer(match: Match, playerId: string): { gf: number; ga: number } | null {
  if (match.goalsA == null || match.goalsB == null) return null;
  if (match.playerAId === playerId) return { gf: match.goalsA, ga: match.goalsB };
  return { gf: match.goalsB, ga: match.goalsA };
}

export function summarize(matches: Match[], playerId: string): SideRecord {
  const chrono = matches
    .filter((match) => match.status === 'confirmed' && involves(match, playerId))
    .slice()
    .sort(byTime);
  let wins = 0;
  let draws = 0;
  let losses = 0;
  let goalsFor = 0;
  let goalsAgainst = 0;
  let scoredMatches = 0;
  let bestWinStreak = 0;
  let running = 0;
  let biggestWin: BiggestWin | null = null;

  for (const match of chrono) {
    const outcome = resultOf(match, playerId);
    if (outcome === 'win') {
      wins += 1;
      running += 1;
      bestWinStreak = Math.max(bestWinStreak, running);
    } else {
      if (outcome === 'draw') draws += 1;
      else losses += 1;
      running = 0;
    }
    const goals = goalsForPlayer(match, playerId);
    if (goals) {
      scoredMatches += 1;
      goalsFor += goals.gf;
      goalsAgainst += goals.ga;
      if (outcome === 'win') {
        const diff = goals.gf - goals.ga;
        const bestDiff = biggestWin ? biggestWin.goalsFor - biggestWin.goalsAgainst : -1;
        if (
          !biggestWin ||
          diff > bestDiff ||
          (diff === bestDiff && goals.gf > biggestWin.goalsFor)
        ) {
          biggestWin = {
            matchId: match.id,
            opponentId: opponentOf(match, playerId),
            goalsFor: goals.gf,
            goalsAgainst: goals.ga,
          };
        }
      }
    }
  }

  const newest = chrono.slice().reverse();
  let currentStreak: Streak = { type: 'none', count: 0 };
  if (newest.length > 0) {
    const type = resultOf(newest[0], playerId);
    let count = 0;
    for (const match of newest) {
      if (resultOf(match, playerId) !== type) break;
      count += 1;
    }
    currentStreak = { type, count };
  }

  const played = wins + draws + losses;
  return {
    played,
    wins,
    draws,
    losses,
    winRate: played ? wins / played : 0,
    goalsFor,
    goalsAgainst,
    goalDiff: goalsFor - goalsAgainst,
    scoredMatches,
    points: wins * 3 + draws,
    currentStreak,
    bestWinStreak,
    biggestWin,
  };
}

function rivalBetter(a: RivalRow, b: RivalRow): number {
  return (
    b.record.winRate - a.record.winRate ||
    b.record.goalDiff - a.record.goalDiff ||
    b.record.wins - a.record.wins ||
    a.opponentId.localeCompare(b.opponentId)
  );
}

function rivalWorse(a: RivalRow, b: RivalRow): number {
  return (
    a.record.winRate - b.record.winRate ||
    a.record.goalDiff - b.record.goalDiff ||
    b.record.losses - a.record.losses ||
    a.opponentId.localeCompare(b.opponentId)
  );
}

export function headToHead(allMatches: Match[], playerId: string, opponentId: string) {
  const pair = allMatches.filter(
    (match) => match.status === 'confirmed' && between(match, playerId, opponentId),
  );
  const you = summarize(pair, playerId);
  const them = summarize(pair, opponentId);
  const chrono = pair.slice().sort(byTime);
  const replay = replayRatings(chrono);
  let pointsYou = 0;
  let pointsThem = 0;
  const evolution: EvolutionPoint[] = chrono.map((match) => {
    pointsYou += pointsFor(resultOf(match, playerId));
    pointsThem += pointsFor(resultOf(match, opponentId));
    const ratingYou =
      replay.history.find((row) => row.matchId === match.id && row.userId === playerId)?.rating ??
      rules.initialRating;
    const ratingThem =
      replay.history.find((row) => row.matchId === match.id && row.userId === opponentId)?.rating ??
      rules.initialRating;
    return {
      matchId: match.id,
      at: match.confirmedAt!,
      pointsYou,
      pointsThem,
      ratingYou,
      ratingThem,
    };
  });
  return {
    you,
    them,
    recent: chrono.slice().reverse().slice(0, 8),
    evolution,
  };
}

export function personalStats(allMatches: Match[], playerId: string) {
  const confirmed = allMatches.filter((match) => match.status === 'confirmed');
  const mine = confirmed.filter((match) => involves(match, playerId));
  const record = summarize(mine, playerId);
  const opponents = [...new Set(mine.map((match) => opponentOf(match, playerId)))];
  const byOpponent: RivalRow[] = opponents
    .map((opponentId) => ({
      opponentId,
      record: summarize(
        mine.filter((match) => between(match, playerId, opponentId)),
        playerId,
      ),
    }))
    .sort((a, b) => b.record.played - a.record.played || a.opponentId.localeCompare(b.opponentId));

  const seasoned = byOpponent.filter((row) => row.record.played >= rules.minMatchesForRival);
  const source = seasoned.length > 0 ? seasoned : byOpponent;
  const provisional = seasoned.length === 0 && byOpponent.length > 0;
  const best = source.length > 0 ? source.slice().sort(rivalBetter)[0] : null;
  const worstCandidate = source.length > 1 ? source.slice().sort(rivalWorse)[0] : null;
  const worst =
    worstCandidate && best && worstCandidate.opponentId === best.opponentId ? null : worstCandidate;

  const replay = replayRatings(confirmed);
  const chrono = mine.slice().sort(byTime);
  let points = 0;
  const evolution = chrono.map((match) => {
    points += pointsFor(resultOf(match, playerId));
    const rating =
      replay.history.find((row) => row.matchId === match.id && row.userId === playerId)?.rating ??
      rules.initialRating;
    return { matchId: match.id, at: match.confirmedAt!, points, rating };
  });

  return {
    record,
    byOpponent,
    best,
    worst,
    provisional,
    evolution,
    rating: replay.ratings[playerId] ?? rules.initialRating,
    recent: chrono.slice().reverse().slice(0, 10),
  };
}

export function standings(playerIds: string[], matches: Match[]): TableRow[] {
  const confirmed = matches.filter((match) => match.status === 'confirmed');
  const replay = replayRatings(confirmed);
  const rows: TableRow[] = playerIds.map((playerId) => ({
    playerId,
    ...summarize(confirmed, playerId),
    rating: replay.ratings[playerId] ?? rules.initialRating,
  }));
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDiff - a.goalDiff ||
      b.goalsFor - a.goalsFor ||
      b.winRate - a.winRate ||
      a.playerId.localeCompare(b.playerId),
  );
  return rows;
}

export function uniqueLeader(rows: TableRow[]): string | null {
  if (rows.length === 0) return null;
  const [first, second] = rows;
  if (!second) return first.playerId;
  if (
    first.points === second.points &&
    first.goalDiff === second.goalDiff &&
    first.goalsFor === second.goalsFor
  ) {
    return null;
  }
  return first.playerId;
}

export function rankPlayers(
  playerIds: string[],
  matches: Match[],
  minMatches: number = rules.minMatchesForRanking,
): { qualified: RankRow[]; everyone: RankRow[] } {
  const set = new Set(playerIds);
  const circle = matches.filter(
    (match) => match.status === 'confirmed' && set.has(match.playerAId) && set.has(match.playerBId),
  );
  const replay = replayRatings(circle);
  const everyone: RankRow[] = playerIds.map((playerId) => {
    const record = summarize(circle, playerId);
    return {
      playerId,
      rating: replay.ratings[playerId] ?? rules.initialRating,
      played: record.played,
      winRate: record.winRate,
      wins: record.wins,
      draws: record.draws,
      losses: record.losses,
    };
  });
  const qualified = everyone
    .filter((row) => row.played >= minMatches)
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.winRate - a.winRate ||
        b.played - a.played ||
        a.playerId.localeCompare(b.playerId),
    );
  return { qualified, everyone };
}

export function faceMatrix(playerIds: string[], matches: Match[]) {
  const out: Record<string, Record<string, { wins: number; draws: number; losses: number }>> = {};
  for (const row of playerIds) {
    out[row] = {};
    for (const col of playerIds) {
      if (row === col) continue;
      const record = summarize(
        matches.filter((match) => match.status === 'confirmed' && between(match, row, col)),
        row,
      );
      out[row][col] = { wins: record.wins, draws: record.draws, losses: record.losses };
    }
  }
  return out;
}
