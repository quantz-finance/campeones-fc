export const rules = {
  initialRating: 1200,
  // Elo FIDE: K = 40 los primeros 30 partidos, 20 después, 10 si alguna vez llegó a 2400.
  eloKNew: 40,
  eloKNewGames: 30,
  eloK: 20,
  eloKElite: 10,
  eloEliteRating: 2400,
  eloMaxDiff: 400,
  minMatchesForRanking: 3,
  minMatchesForRival: 2,
  acceptTtlMs: 12 * 60 * 60 * 1000,
  tournamentAcceptTtlMs: 72 * 60 * 60 * 1000,
  inviteTtlMs: 14 * 24 * 60 * 60 * 1000,
  streakTrophy: 5,
  maxGoals: 30,
  maxGroupName: 32,
  maxTournamentName: 40,
} as const;
