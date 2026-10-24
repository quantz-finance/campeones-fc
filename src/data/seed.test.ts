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
