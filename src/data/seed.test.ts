import { describe, expect, it } from 'vitest';
import { rules } from '../domain/rules';
import { createMemoryRepository } from './memory-repository';
import { projectPersonal, projectRanking } from './project';
import { buildSeed, IDS } from './seed';

describe('datos de demostración', () => {
  const db = buildSeed(new Date('2026-10-24T18:00:00.000Z'));

  it('deja un círculo jugable, con ranking, racha y un torneo abierto', () => {
    const ranking = projectRanking(db, IDS.andre);
    expect(ranking.rows.length).toBeGreaterThanOrEqual(4);
    expect(ranking.qualified).toBe(true);
    const personal = projectPersonal(db, IDS.andre);
    expect(personal.record.bestWinStreak).toBeGreaterThanOrEqual(rules.streakTrophy);
    expect(db.achievements.some((item) => item.userId === IDS.andre && item.code === 'streak_5')).toBe(true);
    expect(db.achievements.some((item) => item.userId === IDS.andre && item.code === 'tournament_champion')).toBe(
      true,
    );
    expect(db.achievements.some((item) => item.userId === IDS.cami && item.code === 'tournament_champion')).toBe(
      false,
    );
    const pending = db.matches.filter((match) => match.status === 'pending_accept');
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((match) => Date.parse(match.expiresAt) > Date.parse('2026-10-24T18:00:00.000Z'))).toBe(
      true,
    );
    const liveCup = db.tournaments.find((tournament) => tournament.name === 'Copa relámpago');
    const doneCup = db.tournaments.find((tournament) => tournament.name === 'Copa del barrio');
    expect(liveCup?.status).toBe('in_progress');
    expect(doneCup?.status).toBe('completed');
    expect(doneCup?.winnerId).toBe(IDS.andre);
    expect(db.matches.some((match) => match.status === 'disputed')).toBe(true);
    expect(db.friendships.some((friendship) => friendship.status === 'pending')).toBe(true);
  });

  it('se puede recorrer desde el repositorio en memoria', async () => {
    const repo = createMemoryRepository(buildSeed());
    const home = await repo.homeSnapshot(IDS.mateo);
    expect(home.actionMatches.length + home.waitingMatches.length).toBeGreaterThan(0);
    const group = await repo.groupSnapshot(IDS.group, IDS.vale);
    expect(group.leader).toBeTruthy();
    expect(group.table.length).toBe(6);
    expect(Object.keys(group.matrix)).toHaveLength(6);
  });
});

describe('semilla demo · Elo por partido', () => {
  it('cada partido confirmado trae el cambio Elo, igual que recompute_ratings()', async () => {
    const { buildSeed } = await import('./seed');
    const { playElo, freshElo } = await import('../domain/elo');
    const { byTime } = await import('../domain/types');
    const world = buildSeed(new Date('2026-10-24T12:00:00Z'));
    const confirmed = world.matches.filter((m) => m.status === 'confirmed').sort(byTime);
    expect(confirmed.length).toBeGreaterThan(0);
    const states: Record<string, ReturnType<typeof freshElo>> = {};
    for (const m of confirmed) {
      const a = states[m.playerAId] ?? freshElo();
      const b = states[m.playerBId] ?? freshElo();
      const scoreA = m.isDraw || !m.winnerId ? 0.5 : m.winnerId === m.playerAId ? 1 : 0;
      const played = playElo(a, b, scoreA);
      expect(m.ratingABefore).toBe(a.rating);
      expect(m.ratingBBefore).toBe(b.rating);
      expect(m.ratingDeltaA).toBe(played.deltaA);
      expect(m.ratingDeltaB).toBe(played.deltaB);
      states[m.playerAId] = played.a;
      states[m.playerBId] = played.b;
    }
  });
});
