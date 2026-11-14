import { plausibleIso } from './dates';
import { replayRatings } from './elo';
import { rules } from './rules';
import { rankPlayers, resultOf, summarize } from './stats';
import {
  involves,
  opponentOf,
  type AchievementCode,
  type Match,
  type Slot,
  type TournamentFormat,
} from './types';

export type AchievementGroup = { id: string; createdBy: string };
export type AchievementMember = { groupId: string; userId: string; joinedAt?: string };
export type AchievementTournament = {
  id: string;
  format: TournamentFormat;
  size: number | null;
  status: 'in_progress' | 'completed';
  winnerId: string | null;
  playerIds: string[];
};

export type AchievementInput = {
  playerId: string;
  matches: Match[];
  groups?: AchievementGroup[];
  groupMembers?: AchievementMember[];
  tournaments?: AchievementTournament[];
  slots?: Slot[];
};

function confirmed(matches: Match[], playerId?: string): Match[] {
  return matches
    .filter((match) => match.status === 'confirmed' && match.confirmedAt)
    .filter((match) => (playerId ? involves(match, playerId) : true));
}

function goalsOf(match: Match, playerId: string): { gf: number; ga: number } | null {
  if (match.goalsA == null || match.goalsB == null) return null;
  return match.playerAId === playerId
    ? { gf: match.goalsA, ga: match.goalsB }
    : { gf: match.goalsB, ga: match.goalsA };
}

/** Mejor racha de partidos confirmados sin perder (los empates cuentan). */
export function bestUnbeatenStreak(matches: Match[], playerId: string): number {
  const chrono = confirmed(matches, playerId).slice().sort((a, b) => (a.confirmedAt ?? a.createdAt).localeCompare(b.confirmedAt ?? b.createdAt));
  let best = 0;
  let run = 0;
  for (const match of chrono) {
    if (resultOf(match, playerId) === 'loss') {
      run = 0;
    } else {
      run += 1;
      best = Math.max(best, run);
    }
  }
  return best;
}

/** Victoria inmediatamente después de al menos 3 derrotas seguidas. */
export function hasComeback(matches: Match[], playerId: string): boolean {
  const chrono = confirmed(matches, playerId).slice().sort((a, b) => (a.confirmedAt ?? a.createdAt).localeCompare(b.confirmedAt ?? b.createdAt));
  let losses = 0;
  for (const match of chrono) {
    const outcome = resultOf(match, playerId);
    if (outcome === 'loss') {
      losses += 1;
      continue;
    }
    if (outcome === 'win' && losses >= 3) return true;
    losses = 0;
  }
  return false;
}

export function hasCleanSheet(matches: Match[], playerId: string): boolean {
  return confirmed(matches, playerId).some((match) => {
    if (resultOf(match, playerId) !== 'win') return false;
    const goals = goalsOf(match, playerId);
    return goals != null && goals.ga === 0;
  });
}

export function hasThrashing(matches: Match[], playerId: string): boolean {
  return confirmed(matches, playerId).some((match) => {
    if (resultOf(match, playerId) !== 'win') return false;
    const goals = goalsOf(match, playerId);
    return goals != null && goals.gf - goals.ga >= 4;
  });
}

export function hasFiveNil(matches: Match[], playerId: string): boolean {
  return confirmed(matches, playerId).some((match) => {
    if (resultOf(match, playerId) !== 'win') return false;
    const goals = goalsOf(match, playerId);
    return goals != null && goals.gf === 5 && goals.ga === 0;
  });
}

export function bestRivalMeetings(matches: Match[], playerId: string): number {
  const counts = new Map<string, number>();
  for (const match of confirmed(matches, playerId)) {
    const opponent = opponentOf(match, playerId);
    counts.set(opponent, (counts.get(opponent) ?? 0) + 1);
  }
  return counts.size ? Math.max(...counts.values()) : 0;
}

export function peakRating(matches: Match[], playerId: string): number {
  const all = confirmed(matches);
  const replay = replayRatings(all);
  const history = replay.history.filter((row) => row.userId === playerId);
  const current = replay.ratings[playerId] ?? rules.initialRating;
  return history.reduce((max, row) => Math.max(max, row.rating), current);
}

function groupIdsOf(members: AchievementMember[], playerId: string): string[] {
  return [...new Set(members.filter((item) => item.userId === playerId).map((item) => item.groupId))];
}

function qualifiedInGroup(
  groupId: string,
  playerId: string,
  matches: Match[],
  members: AchievementMember[],
): { place: number; qualified: number } | null {
  const ids = [...new Set(members.filter((item) => item.groupId === groupId).map((item) => item.userId))];
  const groupMatches = confirmed(matches).filter((match) => match.groupId === groupId);
  const { qualified } = rankPlayers(ids, groupMatches);
  const index = qualified.findIndex((row) => row.playerId === playerId);
  if (index < 0) return null;
  return { place: index + 1, qualified: qualified.length };
}

/** Llegó a la final de un torneo de llaves de 4, 8 o 16. */
export function reachedFinal(playerId: string, tournaments: AchievementTournament[], slots: Slot[]): boolean {
  for (const cup of tournaments) {
    if (cup.format !== 'single_elim') continue;
    const size = cup.size || cup.playerIds.length;
    if (![4, 8, 16].includes(size)) continue;
    const finalRound = Math.log2(size);
    const final = slots.find((slot) => slot.tournamentId === cup.id && slot.round === finalRound);
    if (!final) continue;
    if (final.playerAId === playerId || final.playerBId === playerId || final.winnerId === playerId) return true;
    if (cup.winnerId === playerId) return true;
  }
  return false;
}

/**
 * Logros que se pueden calcular con los datos que ya tiene el cliente.
 * `anfitrion` y `capitan` no se otorgan: el enlace de invitación no guarda quién entró con él.
 */
export function earnedAchievementCodes(input: AchievementInput): AchievementCode[] {
  const { playerId } = input;
  const matches = input.matches;
  const groups = input.groups ?? [];
  const members = input.groupMembers ?? [];
  const tournaments = input.tournaments ?? [];
  const slots = input.slots ?? [];
  const record = summarize(matches, playerId);
  const codes: AchievementCode[] = [];

  if (record.played >= 1) codes.push('primer-partido');
  if (record.wins >= 1) codes.push('primera-victoria');
  if (groupIdsOf(members, playerId).length >= 1) codes.push('debut-grupo');
  const groupPlaces = groupIdsOf(members, playerId)
    .map((groupId) => qualifiedInGroup(groupId, playerId, matches, members))
    .filter((row): row is { place: number; qualified: number } => row != null);
  if (groupPlaces.length > 0) codes.push('en-el-ranking');

  if (record.bestWinStreak >= 3) codes.push('racha-3');
  if (record.bestWinStreak >= 5) codes.push('racha-5');
  if (record.bestWinStreak >= 10) codes.push('racha-10');
  if (bestUnbeatenStreak(matches, playerId) >= 10) codes.push('invicto');
  if (hasComeback(matches, playerId)) codes.push('remontada');

  if (record.played >= 10) codes.push('partidos-10');
  if (record.played >= 50) codes.push('partidos-50');
  if (record.played >= 100) codes.push('partidos-100');
  if (record.played >= 250) codes.push('partidos-250');

  if (hasCleanSheet(matches, playerId)) codes.push('arco-en-cero');
  if (hasThrashing(matches, playerId)) codes.push('goleada');
  if (hasFiveNil(matches, playerId)) codes.push('manita');

  if (reachedFinal(playerId, tournaments, slots)) codes.push('finalista');
  if (tournaments.some((cup) => cup.status === 'completed' && cup.winnerId === playerId)) codes.push('campeon-torneo');
  if (groupPlaces.some((row) => row.place === 1)) codes.push('lider-grupo');
  if (peakRating(matches, playerId) >= rules.initialRating + 100) codes.push('elo-100');

  // anfitrion y capitan: siempre bloqueados (no hay atribución de quién usó el enlace).
  if (groups.some((group) => group.createdBy === playerId && members.filter((item) => item.groupId === group.id).length >= 6)) {
    codes.push('fundador');
  }
  if (bestRivalMeetings(matches, playerId) >= 10) codes.push('clasico');

  return codes;
}

export function fromWorld(
  playerId: string,
  world: {
    matches: Match[];
    groups: AchievementGroup[];
    groupMembers: AchievementMember[];
    tournaments: AchievementTournament[];
    slots: Slot[];
  },
): AchievementCode[] {
  return earnedAchievementCodes({
    playerId,
    matches: world.matches,
    groups: world.groups,
    groupMembers: world.groupMembers,
    tournaments: world.tournaments,
    slots: world.slots,
  });
}

export type TrophyProgress = { current: number; target: number };

function chrono(matches: Match[], playerId: string): Match[] {
  return confirmed(matches, playerId)
    .slice()
    .sort((a, b) => (a.confirmedAt ?? a.createdAt).localeCompare(b.confirmedAt ?? b.createdAt));
}

function atOf(match: Match): string {
  return match.confirmedAt ?? match.createdAt;
}

function maxGroupMatches(matches: Match[], members: AchievementMember[], playerId: string): number {
  let best = 0;
  for (const groupId of groupIdsOf(members, playerId)) {
    const n = confirmed(matches, playerId).filter((match) => match.groupId === groupId).length;
    best = Math.max(best, n);
  }
  return best;
}

function maxCreatedGroupSize(groups: AchievementGroup[], members: AchievementMember[], playerId: string): number {
  let best = 0;
  for (const group of groups.filter((item) => item.createdBy === playerId)) {
    best = Math.max(best, members.filter((item) => item.groupId === group.id).length);
  }
  return best;
}

function cap(current: number, target: number): TrophyProgress {
  return { current: Math.max(0, current), target };
}

/** Contadores que se pueden calcular con los datos actuales. anfitrion y capitan no tienen progreso. */
export function achievementProgress(input: AchievementInput): Partial<Record<AchievementCode, TrophyProgress>> {
  const { playerId, matches } = input;
  const groups = input.groups ?? [];
  const members = input.groupMembers ?? [];
  const record = summarize(matches, playerId);
  const played = record.played;
  const streak = record.bestWinStreak;
  const eloGain = Math.max(0, Math.round(peakRating(matches, playerId) - rules.initialRating));
  return {
    'partidos-10': cap(played, 10),
    'partidos-50': cap(played, 50),
    'partidos-100': cap(played, 100),
    'partidos-250': cap(played, 250),
    'racha-3': cap(streak, 3),
    'racha-5': cap(streak, 5),
    'racha-10': cap(streak, 10),
    invicto: cap(bestUnbeatenStreak(matches, playerId), 10),
    'elo-100': cap(eloGain, 100),
    'en-el-ranking': cap(maxGroupMatches(matches, members, playerId), 3),
    clasico: cap(bestRivalMeetings(matches, playerId), 10),
    fundador: cap(maxCreatedGroupSize(groups, members, playerId), 6),
  };
}

function dateWhenStreakHits(matches: Match[], playerId: string, length: number, kind: 'win' | 'unbeaten'): string | null {
  const list = chrono(matches, playerId);
  let run = 0;
  for (const match of list) {
    const outcome = resultOf(match, playerId);
    const counts = kind === 'win' ? outcome === 'win' : outcome !== 'loss';
    run = counts ? run + 1 : 0;
    if (run >= length) return atOf(match);
  }
  return null;
}

function dateOfNth(matches: Match[], playerId: string, n: number): string | null {
  const list = chrono(matches, playerId);
  return list[n - 1] ? atOf(list[n - 1]) : null;
}

function dateOfFirstWin(matches: Match[], playerId: string, test: (match: Match) => boolean = () => true): string | null {
  for (const match of chrono(matches, playerId)) {
    if (resultOf(match, playerId) === 'win' && test(match)) return atOf(match);
  }
  return null;
}

function rankingUnlockDate(groupId: string, playerId: string, matches: Match[], members: AchievementMember[], needLeader: boolean): string | null {
  const ids = [...new Set(members.filter((item) => item.groupId === groupId).map((item) => item.userId))];
  const groupMatches = confirmed(matches)
    .filter((match) => match.groupId === groupId)
    .slice()
    .sort((a, b) => (a.confirmedAt ?? a.createdAt).localeCompare(b.confirmedAt ?? b.createdAt));
  const seen: Match[] = [];
  for (const match of groupMatches) {
    seen.push(match);
    const { qualified } = rankPlayers(ids, seen);
    const index = qualified.findIndex((row) => row.playerId === playerId);
    if (index < 0) continue;
    if (!needLeader || index === 0) return atOf(match);
  }
  return null;
}

/**
 * Fecha real en la que se desbloqueó el logro (el partido o el alta que lo cumplió).
 * Si no se puede deducir, no se inventa.
 */
export function achievementUnlockDates(input: AchievementInput): Partial<Record<AchievementCode, string>> {
  const { playerId, matches } = input;
  const groups = input.groups ?? [];
  const members = input.groupMembers ?? [];
  const tournaments = input.tournaments ?? [];
  const slots = input.slots ?? [];
  const dates: Partial<Record<AchievementCode, string>> = {};
  const earned = new Set(earnedAchievementCodes(input));
  const put = (code: AchievementCode, value: string | null | undefined) => {
    const at = plausibleIso(value);
    if (earned.has(code) && at) dates[code] = at;
  };

  put('primer-partido', dateOfNth(matches, playerId, 1));
  put('primera-victoria', dateOfFirstWin(matches, playerId));
  const joins = members
    .filter((item) => item.userId === playerId)
    .map((item) => plausibleIso(item.joinedAt))
    .filter((at): at is string => Boolean(at))
    .sort();
  put('debut-grupo', joins[0] ?? null);
  let rankingAt: string | null = null;
  let leaderAt: string | null = null;
  for (const groupId of groupIdsOf(members, playerId)) {
    rankingAt = rankingAt ?? rankingUnlockDate(groupId, playerId, matches, members, false);
    leaderAt = leaderAt ?? rankingUnlockDate(groupId, playerId, matches, members, true);
  }
  put('en-el-ranking', rankingAt);
  put('lider-grupo', leaderAt);
  put('racha-3', dateWhenStreakHits(matches, playerId, 3, 'win'));
  put('racha-5', dateWhenStreakHits(matches, playerId, 5, 'win'));
  put('racha-10', dateWhenStreakHits(matches, playerId, 10, 'win'));
  put('invicto', dateWhenStreakHits(matches, playerId, 10, 'unbeaten'));
  const come = chrono(matches, playerId);
  let losses = 0;
  for (const match of come) {
    const outcome = resultOf(match, playerId);
    if (outcome === 'loss') {
      losses += 1;
      continue;
    }
    if (outcome === 'win' && losses >= 3) {
      put('remontada', atOf(match));
      break;
    }
    losses = 0;
  }
  put('partidos-10', dateOfNth(matches, playerId, 10));
  put('partidos-50', dateOfNth(matches, playerId, 50));
  put('partidos-100', dateOfNth(matches, playerId, 100));
  put('partidos-250', dateOfNth(matches, playerId, 250));
  put(
    'arco-en-cero',
    dateOfFirstWin(matches, playerId, (match) => {
      const goals = goalsOf(match, playerId);
      return goals != null && goals.ga === 0;
    }),
  );
  put(
    'goleada',
    dateOfFirstWin(matches, playerId, (match) => {
      const goals = goalsOf(match, playerId);
      return goals != null && goals.gf - goals.ga >= 4;
    }),
  );
  put(
    'manita',
    dateOfFirstWin(matches, playerId, (match) => {
      const goals = goalsOf(match, playerId);
      return goals != null && goals.gf === 5 && goals.ga === 0;
    }),
  );

  const cups = tournaments.filter((cup) => earned.has('finalista') || earned.has('campeon-torneo'));
  for (const cup of cups) {
    if (earned.has('finalista') && !dates['finalista'] && reachedFinal(playerId, [cup], slots)) {
      const size = cup.size || cup.playerIds.length;
      const finalRound = Math.log2(size);
      const final = slots.find((slot) => slot.tournamentId === cup.id && slot.round === finalRound);
      const match = final?.matchId ? matches.find((item) => item.id === final.matchId) : undefined;
      put('finalista', match ? atOf(match) : null);
    }
    if (earned.has('campeon-torneo') && !dates['campeon-torneo'] && cup.status === 'completed' && cup.winnerId === playerId) {
      const cupMatches = chrono(matches, playerId).filter((item) => item.tournamentId === cup.id);
      put('campeon-torneo', cupMatches.length ? atOf(cupMatches[cupMatches.length - 1]) : null);
    }
  }

  if (earned.has('elo-100')) {
    const history = replayRatings(confirmed(matches)).history.filter((row) => row.userId === playerId);
    const hit = history.find((row) => row.rating >= rules.initialRating + 100);
    put('elo-100', hit?.at ?? null);
  }

  if (earned.has('fundador')) {
    let best: string | null = null;
    for (const group of groups.filter((item) => item.createdBy === playerId)) {
      const joinsAt = members
        .filter((item) => item.groupId === group.id)
        .map((item) => plausibleIso(item.joinedAt))
        .filter((at): at is string => Boolean(at))
        .sort();
      if (joinsAt.length >= 6) {
        const at = joinsAt[5];
        if (best == null || at < best) best = at;
      }
    }
    put('fundador', best);
  }

  if (earned.has('clasico')) {
    const counts = new Map<string, number>();
    for (const match of chrono(matches, playerId)) {
      const opponent = opponentOf(match, playerId);
      const n = (counts.get(opponent) ?? 0) + 1;
      counts.set(opponent, n);
      if (n >= 10) {
        put('clasico', atOf(match));
        break;
      }
    }
  }

  return dates;
}
