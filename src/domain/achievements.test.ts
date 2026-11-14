import { describe, expect, it } from 'vitest';
import { buildSingleElim } from './bracket';
import {
  achievementProgress,
  achievementUnlockDates,
  earnedAchievementCodes,
  type AchievementGroup,
  type AchievementMember,
  type AchievementTournament,
} from './achievements';
import { rules } from './rules';
import type { Match, Slot } from './types';

function confirmed(
  id: string,
  a: string,
  b: string,
  winner: string | null,
  goalsA: number,
  goalsB: number,
  at: string,
  extra: Partial<Match> = {},
): Match {
  return {
    id,
    playerAId: a,
    playerBId: b,
    status: 'confirmed',
    groupId: extra.groupId ?? null,
    tournamentId: extra.tournamentId ?? null,
    tournamentSlotId: extra.tournamentSlotId ?? null,
    winnerId: winner,
    isDraw: winner == null,
    goalsA,
    goalsB,
    createdAt: at,
    expiresAt: at,
    acceptedAt: at,
    confirmedAt: at,
    ratingABefore: extra.ratingABefore ?? null,
    ratingBBefore: extra.ratingBBefore ?? null,
    ratingDeltaA: extra.ratingDeltaA ?? null,
    ratingDeltaB: extra.ratingDeltaB ?? null,
  };
}

function disputed(id: string, at: string): Match {
  return { ...confirmed(id, 'a', 'b', 'a', 1, 0, at), status: 'disputed', confirmedAt: null };
}

function members(groupId: string, ids: string[]): AchievementMember[] {
  return ids.map((userId, i) => ({ groupId, userId, joinedAt: `2026-01-0${i + 1}T00:00:00.000Z` }));
}

describe('logros: condiciones computables', () => {
  it('no cuenta partidos en disputa ni pendientes', () => {
    expect(earnedAchievementCodes({ playerId: 'a', matches: [disputed('d1', '2026-10-01T00:00:00.000Z')] })).toEqual([]);
  });

  it('otorga primer partido y primera victoria, y guarda la fecha del partido', () => {
    const match = confirmed('m1', 'a', 'b', 'a', 1, 0, '2026-10-02T12:00:00.000Z');
    const input = { playerId: 'a', matches: [match] };
    expect(earnedAchievementCodes(input)).toEqual(expect.arrayContaining(['primer-partido', 'primera-victoria']));
    expect(achievementUnlockDates(input)['primera-victoria']).toBe('2026-10-02T12:00:00.000Z');
  });

  it('otorga debut-grupo al unirse y fundador al llegar a 6 miembros del grupo creado', () => {
    const groups: AchievementGroup[] = [{ id: 'g1', createdBy: 'a' }];
    const six = members('g1', ['a', 'b', 'c', 'd', 'e', 'f']);
    const input = { playerId: 'a', matches: [], groups, groupMembers: six };
    expect(earnedAchievementCodes(input)).toEqual(expect.arrayContaining(['debut-grupo', 'fundador']));
    expect(achievementUnlockDates(input).fundador).toBe('2026-01-06T00:00:00.000Z');
    expect(achievementProgress({ playerId: 'a', matches: [], groups, groupMembers: members('g1', ['a', 'b']) }).fundador).toEqual({
      current: 2,
      target: 6,
    });
  });

  it('pone en el ranking a los 3 partidos del grupo y líder si queda #1', () => {
    const groupMembers = members('g1', ['a', 'b']);
    const matches = [
      confirmed('g1', 'a', 'b', 'a', 2, 0, '2026-10-01T00:00:00.000Z', { groupId: 'g1' }),
      confirmed('g2', 'a', 'b', 'a', 1, 0, '2026-10-02T00:00:00.000Z', { groupId: 'g1' }),
      confirmed('g3', 'a', 'b', 'a', 3, 1, '2026-10-03T00:00:00.000Z', { groupId: 'g1' }),
    ];
    const input = { playerId: 'a', matches, groupMembers };
    expect(earnedAchievementCodes(input)).toEqual(expect.arrayContaining(['en-el-ranking', 'lider-grupo']));
    expect(achievementProgress({ playerId: 'a', matches: matches.slice(0, 2), groupMembers })['en-el-ranking']).toEqual({
      current: 2,
      target: 3,
    });
    expect(achievementUnlockDates(input)['en-el-ranking']).toBe('2026-10-03T00:00:00.000Z');
  });

  it('cuenta rachas de 3, 5 y 10, invicto con empates, y remontada L-L-L-W', () => {
    const wins = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((day) =>
      confirmed(`w${day}`, 'a', 'b', 'a', 1, 0, `2026-10-${String(day).padStart(2, '0')}T00:00:00.000Z`),
    );
    expect(earnedAchievementCodes({ playerId: 'a', matches: wins.slice(0, 3) })).toEqual(
      expect.arrayContaining(['racha-3']),
    );
    expect(earnedAchievementCodes({ playerId: 'a', matches: wins.slice(0, 5) })).toEqual(
      expect.arrayContaining(['racha-3', 'racha-5']),
    );
    expect(earnedAchievementCodes({ playerId: 'a', matches: wins })).toEqual(
      expect.arrayContaining(['racha-3', 'racha-5', 'racha-10', 'invicto', 'partidos-10']),
    );
    const unbeaten = [
      confirmed('u1', 'a', 'b', 'a', 1, 0, '2026-11-01T00:00:00.000Z'),
      confirmed('u2', 'a', 'b', null, 1, 1, '2026-11-02T00:00:00.000Z'),
      confirmed('u3', 'a', 'b', 'a', 2, 1, '2026-11-03T00:00:00.000Z'),
      confirmed('u4', 'a', 'b', null, 0, 0, '2026-11-04T00:00:00.000Z'),
      confirmed('u5', 'a', 'b', 'a', 1, 0, '2026-11-05T00:00:00.000Z'),
      confirmed('u6', 'a', 'b', null, 2, 2, '2026-11-06T00:00:00.000Z'),
      confirmed('u7', 'a', 'b', 'a', 3, 2, '2026-11-07T00:00:00.000Z'),
      confirmed('u8', 'a', 'b', null, 1, 1, '2026-11-08T00:00:00.000Z'),
      confirmed('u9', 'a', 'b', 'a', 1, 0, '2026-11-09T00:00:00.000Z'),
      confirmed('u10', 'a', 'b', null, 0, 0, '2026-11-10T00:00:00.000Z'),
    ];
    expect(earnedAchievementCodes({ playerId: 'a', matches: unbeaten })).toContain('invicto');
    expect(earnedAchievementCodes({ playerId: 'a', matches: unbeaten })).not.toContain('racha-10');
    const come = [
      confirmed('c1', 'a', 'b', 'b', 0, 1, '2026-12-01T00:00:00.000Z'),
      confirmed('c2', 'a', 'b', 'b', 0, 2, '2026-12-02T00:00:00.000Z'),
      confirmed('c3', 'a', 'b', 'b', 1, 2, '2026-12-03T00:00:00.000Z'),
      confirmed('c4', 'a', 'b', 'a', 2, 0, '2026-12-04T00:00:00.000Z'),
    ];
    expect(earnedAchievementCodes({ playerId: 'a', matches: come })).toContain('remontada');
    expect(achievementUnlockDates({ playerId: 'a', matches: come }).remontada).toBe('2026-12-04T00:00:00.000Z');
  });

  it('cuenta partidos 10/50/100/250 y el progreso compartido', () => {
    const ten = Array.from({ length: 10 }, (_, i) =>
      confirmed(`p${i}`, 'a', 'b', 'b', 0, 1, `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
    );
    const codes = earnedAchievementCodes({ playerId: 'a', matches: ten });
    expect(codes).toContain('partidos-10');
    expect(codes).not.toContain('partidos-50');
    const progress = achievementProgress({ playerId: 'a', matches: ten });
    expect(progress['partidos-10']).toEqual({ current: 10, target: 10 });
    expect(progress['partidos-50']).toEqual({ current: 10, target: 50 });
    expect(progress['partidos-100']?.target).toBe(100);
    expect(progress['partidos-250']?.target).toBe(250);
  });

  it('detecta arco en cero, goleada y manita (5-0 da los tres)', () => {
    const manita = confirmed('s1', 'a', 'b', 'a', 5, 0, '2026-10-01T00:00:00.000Z');
    expect(earnedAchievementCodes({ playerId: 'a', matches: [manita] })).toEqual(
      expect.arrayContaining(['arco-en-cero', 'goleada', 'manita']),
    );
    const thrashing = confirmed('s2', 'a', 'b', 'a', 4, 0, '2026-10-02T00:00:00.000Z');
    const codes = earnedAchievementCodes({ playerId: 'a', matches: [thrashing] });
    expect(codes).toEqual(expect.arrayContaining(['arco-en-cero', 'goleada']));
    expect(codes).not.toContain('manita');
  });

  it('otorga finalista en la final de llaves y campeón si winnerId coincide; una liga no da finalista', () => {
    let n = 0;
    const slots: Slot[] = buildSingleElim('t1', ['a', 'b', 'c', 'd'], () => `slot_${(n += 1)}`);
    const final = slots.find((slot) => slot.round === 2)!;
    final.playerAId = 'a';
    final.playerBId = 'c';
    const cups: AchievementTournament[] = [
      { id: 't1', format: 'single_elim', size: 4, status: 'completed', winnerId: 'a', playerIds: ['a', 'b', 'c', 'd'] },
    ];
    expect(earnedAchievementCodes({ playerId: 'a', matches: [], tournaments: cups, slots })).toEqual(
      expect.arrayContaining(['finalista', 'campeon-torneo']),
    );
    expect(earnedAchievementCodes({ playerId: 'c', matches: [], tournaments: cups, slots })).toEqual(['finalista']);
    const league: AchievementTournament[] = [
      { id: 't2', format: 'round_robin', size: 4, status: 'completed', winnerId: 'a', playerIds: ['a', 'b', 'c', 'd'] },
    ];
    const leagueCodes = earnedAchievementCodes({ playerId: 'a', matches: [], tournaments: league, slots: [] });
    expect(leagueCodes).toContain('campeon-torneo');
    expect(leagueCodes).not.toContain('finalista');
  });

  it('otorga elo-100 al llegar a 1300 y clásico a los 10 partidos con el mismo rival', () => {
    const wins = Array.from({ length: 10 }, (_, i) =>
      confirmed(`e${i}`, 'a', 'b', 'a', 1, 0, `2026-02-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
    );
    const codes = earnedAchievementCodes({ playerId: 'a', matches: wins });
    expect(codes).toContain('elo-100');
    expect(codes).toContain('clasico');
    const mid = achievementProgress({ playerId: 'a', matches: wins.slice(0, 4) });
    expect(mid['elo-100']?.current).toBeGreaterThan(0);
    expect(mid['elo-100']?.current).toBeLessThan(100);
    expect(mid.clasico).toEqual({ current: 4, target: 10 });
  });

  it('nunca otorga anfitrión ni capitán (no hay atribución del enlace)', () => {
    const matches = Array.from({ length: 20 }, (_, i) =>
      confirmed(`x${i}`, 'a', 'b', 'a', 1, 0, `2026-03-${String(i + 1).padStart(2, '0')}T00:00:00.000Z`),
    );
    const groups: AchievementGroup[] = [{ id: 'g1', createdBy: 'a' }];
    const groupMembers = members('g1', ['a', 'b', 'c', 'd', 'e', 'f']);
    const codes = earnedAchievementCodes({ playerId: 'a', matches, groups, groupMembers });
    expect(codes).not.toContain('anfitrion');
    expect(codes).not.toContain('capitan');
    expect(achievementProgress({ playerId: 'a', matches }).anfitrion).toBeUndefined();
    expect(achievementProgress({ playerId: 'a', matches }).capitan).toBeUndefined();
  });
});
