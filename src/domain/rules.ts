export const rules = {
  initialRating: 1200,
  eloK: 32,
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
