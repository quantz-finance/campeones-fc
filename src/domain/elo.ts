import { rules } from './rules';
import { byTime, type Match } from './types';

// Elo con las reglas FIDE. El servidor hace la misma cuenta en public.apply_rating
// (supabase/migrations/20261025020000_fide_elo.sql).

/** Puntaje esperado con la regla de los 400 puntos: una diferencia mayor cuenta como 400. */
export function expectedScore(ratingA: number, ratingB: number): number {
  const diff = Math.max(-rules.eloMaxDiff, Math.min(rules.eloMaxDiff, ratingB - ratingA));
  return 1 / (1 + 10 ** (diff / 400));
}

/** K de FIDE según los partidos con rating jugados antes de este y el máximo rating alcanzado. */
export function kFactor(games: number, peak: number): number {
  if (games < rules.eloKNewGames) return rules.eloKNew;
  if (peak >= rules.eloEliteRating) return rules.eloKElite;
  return rules.eloK;
}

/** Redondeo con las mitades lejos de cero (igual que round(numeric) en Postgres). */
export function roundHalfAway(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value));
}

/** Cambio entero de rating para un jugador: K * (S - E). */
export function ratingDelta(rating: number, opponent: number, score: number, k: number): number {
  return roundHalfAway(k * (score - expectedScore(rating, opponent)));
}

export type EloState = { rating: number; games: number; peak: number };

export const freshElo = (): EloState => ({
  rating: rules.initialRating,
  games: 0,
  peak: rules.initialRating,
});

/** Un partido: cada jugador con su propio K. scoreA = 1, 0.5 o 0. */
export function playElo(a: EloState, b: EloState, scoreA: number) {
  const deltaA = ratingDelta(a.rating, b.rating, scoreA, kFactor(a.games, a.peak));
  const deltaB = ratingDelta(b.rating, a.rating, 1 - scoreA, kFactor(b.games, b.peak));
  const next = (state: EloState, delta: number): EloState => ({
    rating: state.rating + delta,
    games: state.games + 1,
    peak: Math.max(state.peak, state.rating + delta),
  });
  return { a: next(a, deltaA), b: next(b, deltaB), deltaA, deltaB };
}

/** Atajo con K fijo (por defecto el de un jugador nuevo) para los dos. */
export function nextRatings(
  ratingA: number,
  ratingB: number,
  scoreA: number,
  k: number = rules.eloKNew,
): { ratingA: number; ratingB: number } {
  return {
    ratingA: ratingA + ratingDelta(ratingA, ratingB, scoreA, k),
    ratingB: ratingB + ratingDelta(ratingB, ratingA, 1 - scoreA, k),
  };
}

export type RatingReplay = {
  ratings: Record<string, number>;
  history: { userId: string; matchId: string; at: string; rating: number; delta: number }[];
};

/**
 * Repite los partidos confirmados en orden cronológico. Si el servidor ya guardó el rating
 * previo y el cambio de un partido (rating global), se usan esos valores; si no, se calcula.
 */
export function replayRatings(matches: Match[]): RatingReplay {
  const confirmed = matches
    .filter((match) => match.status === 'confirmed' && match.confirmedAt)
    .slice()
    .sort(byTime);
  const states: Record<string, EloState> = {};
  const history: RatingReplay['history'] = [];
  const stateOf = (id: string) => states[id] ?? freshElo();

  for (const match of confirmed) {
    const a = stateOf(match.playerAId);
    const b = stateOf(match.playerBId);
    const scoreA = match.isDraw || !match.winnerId ? 0.5 : match.winnerId === match.playerAId ? 1 : 0;
    let nextA: EloState;
    let nextB: EloState;
    let deltaA: number;
    let deltaB: number;
    if (
      match.ratingABefore != null &&
      match.ratingBBefore != null &&
      match.ratingDeltaA != null &&
      match.ratingDeltaB != null
    ) {
      deltaA = match.ratingDeltaA;
      deltaB = match.ratingDeltaB;
      const ra = match.ratingABefore + deltaA;
      const rb = match.ratingBBefore + deltaB;
      nextA = { rating: ra, games: a.games + 1, peak: Math.max(a.peak, ra) };
      nextB = { rating: rb, games: b.games + 1, peak: Math.max(b.peak, rb) };
    } else {
      const played = playElo(a, b, scoreA);
      nextA = played.a;
      nextB = played.b;
      deltaA = played.deltaA;
      deltaB = played.deltaB;
    }
    states[match.playerAId] = nextA;
    states[match.playerBId] = nextB;
    history.push({ userId: match.playerAId, matchId: match.id, at: match.confirmedAt!, rating: nextA.rating, delta: deltaA });
    history.push({ userId: match.playerBId, matchId: match.id, at: match.confirmedAt!, rating: nextB.rating, delta: deltaB });
  }

  const ratings: Record<string, number> = {};
  for (const [id, state] of Object.entries(states)) ratings[id] = state.rating;
  return { ratings, history };
}

/** Cambio de rating de un jugador en un partido, si se conoce. */
export function matchDelta(match: Match, playerId: string): number | null {
  if (match.status !== 'confirmed') return null;
  if (match.playerAId === playerId) return match.ratingDeltaA ?? null;
  if (match.playerBId === playerId) return match.ratingDeltaB ?? null;
  return null;
}
