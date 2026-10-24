import { describe, expect, it } from 'vitest';
import { earnedAchievementCodes } from './achievements';
import { buildSingleElim, roundRobinPairs } from './bracket';
import { expectedScore, nextRatings, replayRatings } from './elo';
import { DomainError } from './errors';
import {
  acceptMatch,
  buildPendingMatch,
  expireIfDue,
  normalizeDraft,
  reportsAgree,
  resolveStatus,
} from './match-flow';
import { rules } from './rules';
import { headToHead, personalStats, rankPlayers, standings, summarize } from './stats';
import type { Match, MatchReport } from './types';

const start = new Date('2026-10-01T15:00:00.000Z');

function pending(overrides: Partial<Match> = {}): Match {
  return {
    ...buildPendingMatch({ id: 'm1', playerAId: 'a', playerBId: 'b' }, start),
    ...overrides,
  };
}

function report(partial: Partial<MatchReport> & Pick<MatchReport, 'reporterId'>): MatchReport {
  return {
    matchId: 'm1',
    winnerId: 'a',
    isDraw: false,
    goalsA: 2,
    goalsB: 1,
    updatedAt: start.toISOString(),
    ...partial,
  };
}

describe('doble confirmación', () => {
  it('confirma el partido cuando los dos votos coinciden y suma el marcador de quien lo anotó', () => {
    const live = acceptMatch(pending(), 'b', start);
    const agreed = report({ reporterId: 'a' });
    const other = report({ reporterId: 'b', goalsA: null, goalsB: null });
    expect(reportsAgree(agreed, other)).toBe(true);
    const done = resolveStatus(live, [agreed, other], start);
    expect(done.status).toBe('confirmed');
    expect(done.winnerId).toBe('a');
    expect(done.goalsA).toBe(2);
    expect(done.goalsB).toBe(1);
    expect(summarize([done], 'a').wins).toBe(1);
  });

  it('deja el partido en disputa y fuera de las estadísticas si los votos no coinciden', () => {
    const live = acceptMatch(pending(), 'b', start);
    const disputed = resolveStatus(
      live,
      [report({ reporterId: 'a', winnerId: 'a' }), report({ reporterId: 'b', winnerId: 'b', goalsA: 1, goalsB: 2 })],
      start,
    );
    expect(disputed.status).toBe('disputed');
    expect(disputed.winnerId).toBeNull();
    expect(summarize([disputed], 'a').played).toBe(0);
    const fixed = resolveStatus(
      disputed,
      [report({ reporterId: 'a', winnerId: 'b', goalsA: 1, goalsB: 2 }), report({ reporterId: 'b', winnerId: 'b', goalsA: 1, goalsB: 2 })],
      start,
    );
    expect(fixed.status).toBe('confirmed');
    expect(fixed.winnerId).toBe('b');
    expect(summarize([fixed], 'b').wins).toBe(1);
  });

  it('discute también cuando el ganador coincide pero el marcador no', () => {
    const left = report({ reporterId: 'a', goalsA: 2, goalsB: 0 });
    const right = report({ reporterId: 'b', goalsA: 3, goalsB: 1 });
    expect(reportsAgree(left, right)).toBe(false);
  });

  it('rechaza un marcador que no corresponde al ganador', () => {
    const live = acceptMatch(pending(), 'b', start);
    expect(() =>
      normalizeDraft(live, 'a', { isDraw: false, winnerId: 'a', goalsA: 1, goalsB: 2 }, true),
    ).toThrow(DomainError);
  });

  it('expira un partido sin aceptar y no deja confirmarlo después', () => {
    const match = pending();
    const later = new Date(start.getTime() + rules.acceptTtlMs);
    expect(expireIfDue(match, new Date(later.getTime() - 1)).status).toBe('pending_accept');
    const expired = expireIfDue(match, later);
    expect(expired.status).toBe('expired');
    expect(() => acceptMatch(match, 'b', later)).toThrow(/expiró/);
    expect(summarize([expired], 'a').played).toBe(0);
  });

  it('impide votar antes de que el rival acepte', () => {
    expect(() =>
      normalizeDraft(pending(), 'a', { isDraw: false, winnerId: 'a', goalsA: null, goalsB: null }, true),
    ).toThrow(/no está esperando/);
  });
});

describe('elo y ranking', () => {
  it('premia más la victoria contra alguien fuerte que contra alguien débil', () => {
    const upset = nextRatings(1200, 1500, 1);
    const favorite = nextRatings(1500, 1200, 1);
    expect(upset.ratingA - 1200).toBeGreaterThan(favorite.ratingA - 1500);
    expect(expectedScore(1500, 1200)).toBeGreaterThan(0.5);
  });

  it('acerca los ratings en un empate', () => {
    const next = nextRatings(1400, 1200, 0.5);
    expect(next.ratingA).toBeLessThan(1400);
    expect(next.ratingB).toBeGreaterThan(1200);
  });

  it('exige un mínimo de partidos para el ranking', () => {
    const matches: Match[] = [0, 1].map((index) => ({
      ...pending({ id: `w${index}`, status: 'confirmed', winnerId: 'a', confirmedAt: `2026-10-0${index + 1}T00:00:00.000Z` }),
    }));
    const early = rankPlayers(['a', 'b'], matches, 3);
    expect(early.qualified).toHaveLength(0);
    matches.push({
      ...pending({ id: 'w3', status: 'confirmed', winnerId: 'a', confirmedAt: '2026-10-03T00:00:00.000Z' }),
    });
    const ready = rankPlayers(['a', 'b'], matches, 3);
    expect(ready.qualified.map((row) => row.playerId)).toEqual(['a', 'b']);
    expect(ready.qualified[0].rating).toBeGreaterThan(ready.qualified[1].rating);
  });
});

describe('estadísticas', () => {
  const matches: Match[] = [
    confirmed('1', 'a', 'b', 'a', 4, 0, '2026-09-01T00:00:00.000Z'),
    confirmed('2', 'a', 'b', 'b', 1, 2, '2026-09-02T00:00:00.000Z'),
    confirmed('3', 'a', 'b', null, 1, 1, '2026-09-03T00:00:00.000Z'),
    confirmed('4', 'a', 'b', 'a', 2, 0, '2026-09-04T00:00:00.000Z'),
    confirmed('5', 'a', 'c', 'c', 0, 3, '2026-09-05T00:00:00.000Z'),
    confirmed('6', 'a', 'c', 'c', 1, 2, '2026-09-06T00:00:00.000Z'),
  ];

  it('arma el versus con racha, goleada y evolución', () => {
    const duel = headToHead(matches, 'a', 'b');
    expect(duel.you).toMatchObject({ wins: 2, draws: 1, losses: 1, goalsFor: 8, goalsAgainst: 3, goalDiff: 5 });
    expect(duel.you.winRate).toBeCloseTo(0.5);
    expect(duel.you.biggestWin).toMatchObject({ goalsFor: 4, goalsAgainst: 0, opponentId: 'b' });
    expect(duel.you.currentStreak).toEqual({ type: 'win', count: 1 });
    expect(duel.you.bestWinStreak).toBe(1);
    expect(duel.evolution.at(-1)?.pointsYou).toBe(2 * 3 + 1);
    expect(duel.recent[0].id).toBe('4');
  });

  it('señala mejor y peor rival', () => {
    const personal = personalStats(matches, 'a');
    expect(personal.best?.opponentId).toBe('b');
    expect(personal.worst?.opponentId).toBe('c');
    expect(personal.record.played).toBe(6);
  });

  it('ordena la tabla del grupo por puntos, diferencia y goles', () => {
    const table = standings(['a', 'b', 'c'], matches);
    expect(table.map((row) => row.playerId)).toEqual(['a', 'c', 'b']);
    expect(table[0].points).toBeGreaterThan(table[1].points);
  });
});

describe('bracket y trofeos', () => {
  it('avanza al ganador de cada lado y cierra en la final', () => {
    const slots = buildSingleElim('t', ['p1', 'p2', 'p3', 'p4'], sequence());
    expect(slots.filter((slot) => slot.round === 1)).toHaveLength(2);
    expect(slots.find((slot) => slot.round === 2)?.playerAId).toBeNull();
    const semi = slots.filter((slot) => slot.round === 1);
    semi[0].winnerId = 'p1';
    semi[1].winnerId = 'p4';
    const final = slots.find((slot) => slot.round === 2)!;
    final.playerAId = semi[0].winnerId;
    final.playerBId = semi[1].winnerId;
    expect(final.playerAId).toBe('p1');
    expect(final.playerBId).toBe('p4');
  });

  it('arma una liga sin cruces repetidos', () => {
    const pairs = roundRobinPairs(['a', 'b', 'c', 'd']);
    const keys = pairs.map(([a, b]) => [a, b].sort().join(':'));
    expect(new Set(keys).size).toBe(6);
    expect(roundRobinPairs(['a', 'b', 'c'])).toHaveLength(3);
  });

  it('entrega primera victoria, racha de 5 y campeón', () => {
    const wins = [1, 2, 3, 4, 5].map((day) =>
      confirmed(`s${day}`, 'a', 'b', 'a', 1, 0, `2026-10-0${day}T00:00:00.000Z`),
    );
    expect(earnedAchievementCodes({ playerId: 'a', matches: wins.slice(0, 1), tournamentWins: 0 })).toEqual([
      'first_win',
    ]);
    expect(earnedAchievementCodes({ playerId: 'a', matches: wins, tournamentWins: 0 })).toContain('streak_5');
    expect(earnedAchievementCodes({ playerId: 'a', matches: [], tournamentWins: 1 })).toEqual([
      'tournament_champion',
    ]);
    expect(summarize(wins, 'a').bestWinStreak).toBe(5);
  });

  it('calcula el elo en orden cronológico', () => {
    const matches = [
      confirmed('e1', 'a', 'b', 'a', 1, 0, '2026-10-01T00:00:00.000Z'),
      confirmed('e2', 'a', 'b', 'b', 0, 1, '2026-10-02T00:00:00.000Z'),
    ];
    const replay = replayRatings(matches);
    expect(replay.ratings.a).not.toBe(rules.initialRating);
    expect(replay.history).toHaveLength(4);
  });
});

function confirmed(
  id: string,
  a: string,
  b: string,
  winner: string | null,
  goalsA: number,
  goalsB: number,
  at: string,
): Match {
  return {
    ...pending({ id, playerAId: a, playerBId: b }),
    status: 'confirmed',
    winnerId: winner,
    isDraw: winner == null,
    goalsA,
    goalsB,
    confirmedAt: at,
  };
}

function sequence() {
  let n = 0;
  return () => `slot_${(n += 1)}`;
}
