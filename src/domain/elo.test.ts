import { describe, expect, it } from 'vitest';
import { expectedScore, freshElo, kFactor, playElo, ratingDelta, replayRatings } from './elo';
import type { Match } from './types';

const at = (state: Partial<ReturnType<typeof freshElo>>) => ({ ...freshElo(), ...state });

function confirmedMatch(id: string, a: string, b: string, winner: string | null, day: number): Match {
  const iso = new Date(Date.UTC(2026, 4, 1) + day * 3_600_000).toISOString();
  return {
    id,
    playerAId: a,
    playerBId: b,
    status: 'confirmed',
    groupId: null,
    tournamentId: null,
    tournamentSlotId: null,
    winnerId: winner,
    isDraw: winner === null,
    goalsA: null,
    goalsB: null,
    createdAt: iso,
    expiresAt: iso,
    acceptedAt: iso,
    confirmedAt: iso,
  };
}

describe('elo FIDE', () => {
  it('ratings iguales: E = 0.5 y el ganador nuevo suma 20 (K 40)', () => {
    expect(expectedScore(1200, 1200)).toBe(0.5);
    const result = playElo(freshElo(), freshElo(), 1);
    expect(result.deltaA).toBe(20);
    expect(result.deltaB).toBe(-20);
    expect(result.a.rating).toBe(1220);
    expect(result.b.rating).toBe(1180);
  });

  it('una sorpresa paga más que ganar como favorito', () => {
    const upset = ratingDelta(1200, 1500, 1, 20);
    const favorite = ratingDelta(1500, 1200, 1, 20);
    expect(upset).toBe(17); // 20 * (1 - 0.1510)
    expect(favorite).toBe(3);
    expect(upset).toBeGreaterThan(favorite);
  });

  it('empatar contra alguien más fuerte suma puntos', () => {
    const weak = ratingDelta(1300, 1500, 0.5, 20);
    const strong = ratingDelta(1500, 1300, 0.5, 20);
    expect(weak).toBe(5);
    expect(strong).toBe(-5);
  });

  it('K: 40 los primeros 30 partidos, luego 20, y 10 si alguna vez llegó a 2400', () => {
    expect(kFactor(0, 1200)).toBe(40);
    expect(kFactor(29, 1500)).toBe(40);
    expect(kFactor(30, 1500)).toBe(20);
    expect(kFactor(30, 2399)).toBe(20);
    expect(kFactor(30, 2400)).toBe(10);
    // Bajar de 2400 no devuelve el K 20.
    expect(kFactor(80, 2410)).toBe(10);
    const veteran = playElo(at({ games: 30, rating: 1600, peak: 1650 }), at({ games: 29, rating: 1600 }), 1);
    expect(veteran.deltaA).toBe(10);
    expect(veteran.deltaB).toBe(-20);
    const elite = playElo(at({ games: 50, rating: 2350, peak: 2402 }), at({ games: 50, rating: 2350, peak: 2350 }), 1);
    expect(elite.deltaA).toBe(5);
    expect(elite.deltaB).toBe(-10);
  });

  it('una diferencia de más de 400 cuenta como 400', () => {
    expect(expectedScore(1000, 1800)).toBeCloseTo(expectedScore(1000, 1400), 12);
    expect(expectedScore(1800, 1000)).toBeCloseTo(1 / 1.1, 12);
    expect(ratingDelta(1800, 1000, 1, 20)).toBe(2); // 20 * (1 - 0.909)
    expect(ratingDelta(1000, 1800, 0, 20)).toBe(-2);
  });

  it('repite en orden cronológico, cuenta partidos y respeta lo que guardó el servidor', () => {
    const matches = [
      confirmedMatch('m2', 'a', 'b', 'b', 2),
      confirmedMatch('m1', 'a', 'b', 'a', 1),
    ];
    const replay = replayRatings(matches);
    expect(replay.history.map((row) => row.delta)).toEqual([20, -20, -22, 22]);
    expect(replay.ratings).toEqual({ a: 1198, b: 1202 });
    const stored: Match = { ...matches[1], ratingABefore: 1500, ratingBBefore: 1400, ratingDeltaA: 7, ratingDeltaB: -7 };
    expect(replayRatings([stored]).ratings).toEqual({ a: 1507, b: 1393 });
  });
});
