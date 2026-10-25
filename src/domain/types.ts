export type MatchStatus =
  | 'pending_accept'
  | 'in_progress'
  | 'disputed'
  | 'confirmed'
  | 'expired'
  | 'cancelled';

export type Match = {
  id: string;
  playerAId: string;
  playerBId: string;
  status: MatchStatus;
  groupId: string | null;
  tournamentId: string | null;
  tournamentSlotId: string | null;
  winnerId: string | null;
  isDraw: boolean;
  goalsA: number | null;
  goalsB: number | null;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  confirmedAt: string | null;
  /** Rating global antes del partido y cambio Elo (los guarda el servidor al confirmar). */
  ratingABefore?: number | null;
  ratingBBefore?: number | null;
  ratingDeltaA?: number | null;
  ratingDeltaB?: number | null;
  /** Registro en Stellar (solo con Supabase): estado del anclaje y hash de la transacción. */
  chainStatus?: 'pending' | 'submitting' | 'anchored' | 'failed' | null;
  chainTx?: string | null;
  chainNetwork?: 'testnet' | 'mainnet' | null;
};

export type MatchReport = {
  matchId: string;
  reporterId: string;
  winnerId: string | null;
  isDraw: boolean;
  goalsA: number | null;
  goalsB: number | null;
  updatedAt: string;
};

export type ReportDraft = {
  winnerId: string | null;
  isDraw: boolean;
  goalsA: number | null;
  goalsB: number | null;
};

export type Outcome = 'win' | 'loss' | 'draw';

export type TournamentFormat = 'single_elim' | 'round_robin';

export type Slot = {
  id: string;
  tournamentId: string;
  round: number;
  position: number;
  playerAId: string | null;
  playerBId: string | null;
  winnerId: string | null;
  matchId: string | null;
};

export type AchievementCode = 'first_win' | 'streak_5' | 'tournament_champion';

export function isOpenStatus(status: MatchStatus): boolean {
  return status === 'pending_accept' || status === 'in_progress' || status === 'disputed';
}

export function involves(match: Match, playerId: string): boolean {
  return match.playerAId === playerId || match.playerBId === playerId;
}

export function between(match: Match, a: string, b: string): boolean {
  return (
    (match.playerAId === a && match.playerBId === b) ||
    (match.playerAId === b && match.playerBId === a)
  );
}

export function opponentOf(match: Match, playerId: string): string {
  return match.playerAId === playerId ? match.playerBId : match.playerAId;
}

export function byTime(a: Match, b: Match): number {
  const left = a.confirmedAt ?? a.createdAt;
  const right = b.confirmedAt ?? b.createdAt;
  return left.localeCompare(right) || a.id.localeCompare(b.id);
}
