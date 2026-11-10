import { describe, expect, it } from 'vitest';
import { projectBillboard } from './project';
import { buildSeed, IDS } from './seed';
import { emptyWorld } from './types';

describe('portada del inicio', () => {
  const at = new Date('2026-10-24T18:00:00.000Z');
  const db = buildSeed(at);

  it('arma estrella, top, rachas, resultados y torneos con datos reales del círculo', () => {
    const board = projectBillboard(db, IDS.andre, at);
    expect(board.star).not.toBeNull();
    expect(board.top.length).toBeGreaterThanOrEqual(4);
    expect(board.top.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < board.top.length; i++) expect(board.top[i - 1].rating).toBeGreaterThanOrEqual(board.top[i].rating);
    expect(board.top[0].place).toBe(1);
    expect(board.results.length).toBeGreaterThan(0);
    expect(board.results.every(({ match }) => match.status === 'confirmed')).toBe(true);
    for (let i = 1; i < board.results.length; i++) {
      expect((board.results[i - 1].match.confirmedAt ?? '') >= (board.results[i].match.confirmedAt ?? '')).toBe(true);
    }
    expect(board.tournaments.length).toBeGreaterThanOrEqual(2);
    expect(board.tournaments[0].tournament.status).toBe('in_progress');
    const done = board.tournaments.find((item) => item.tournament.status === 'completed');
    expect(done?.champion?.id).toBe(IDS.andre);
    expect(board.streaks.every((item) => item.streak.type === 'win' && item.streak.count >= 2)).toBe(true);
    expect(board.movers.every((item) => item.windowDelta > 0)).toBe(true);
    for (const { match } of board.results) {
      expect(board.people[match.playerAId]).toBeTruthy();
      expect(board.people[match.playerBId]).toBeTruthy();
    }
  });

  it('con partidos recientes, la estrella es quien más ganó en la ventana', () => {
    const board = projectBillboard(db, IDS.andre, at);
    if (board.star?.reason !== 'top') {
      const wins = board.star!.player.windowWins;
      expect(wins).toBeGreaterThan(0);
      expect(Math.max(...board.top.map((p) => p.windowWins))).toBeLessThanOrEqual(wins);
    }
  });

  it('sin partidos en la semana, la estrella es el número 1 del ranking', () => {
    const later = new Date(at.getTime() + 120 * 86400000);
    const board = projectBillboard(db, IDS.andre, later);
    expect(board.star?.reason).toBe('top');
    expect(board.star?.player.profile.id).toBe(board.top[0].profile.id);
    expect(board.movers).toHaveLength(0);
  });

  it('un jugador sin partidos ve la portada vacía sin romperse', () => {
    const world = emptyWorld();
    world.users.push({ id: 'solo', username: 'solo', displayName: 'Solo Uno', avatarKey: 'rayo', email: 'solo@x.y' });
    const board = projectBillboard(world, 'solo', at);
    expect(board.star).toBeNull();
    expect(board.top).toHaveLength(0);
    expect(board.results).toHaveLength(0);
    expect(board.tournaments).toHaveLength(0);
  });
});
