import { DomainError } from './errors';
import { rules } from './rules';
import type { Match, MatchReport, ReportDraft } from './types';

export function buildPendingMatch(
  input: {
    id: string;
    playerAId: string;
    playerBId: string;
    groupId?: string | null;
    tournamentId?: string | null;
    tournamentSlotId?: string | null;
    ttlMs?: number;
  },
  now: Date,
): Match {
  const ttl = input.ttlMs ?? rules.acceptTtlMs;
  return {
    id: input.id,
    playerAId: input.playerAId,
    playerBId: input.playerBId,
    status: 'pending_accept',
    groupId: input.groupId ?? null,
    tournamentId: input.tournamentId ?? null,
    tournamentSlotId: input.tournamentSlotId ?? null,
    winnerId: null,
    isDraw: false,
    goalsA: null,
    goalsB: null,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ttl).toISOString(),
    acceptedAt: null,
    confirmedAt: null,
  };
}

export function expireIfDue(match: Match, now: Date): Match {
  if (match.status === 'pending_accept' && now.getTime() >= Date.parse(match.expiresAt)) {
    return { ...match, status: 'expired' };
  }
  return match;
}

export function acceptMatch(match: Match, userId: string, now: Date): Match {
  const due = expireIfDue(match, now);
  if (due.status === 'expired') {
    throw new DomainError('expired', 'Este partido expiró sin que lo aceptaran.');
  }
  if (due.status !== 'pending_accept') {
    throw new DomainError('bad_status', 'Este partido ya no está para aceptar.');
  }
  if (userId !== due.playerBId) {
    throw new DomainError('not_opponent', 'Solo tu rival puede aceptar el partido.');
  }
  return { ...due, status: 'in_progress', acceptedAt: now.toISOString() };
}

export function normalizeDraft(
  match: Match,
  reporterId: string,
  draft: ReportDraft,
  allowDraw: boolean,
): Omit<MatchReport, 'matchId' | 'updatedAt'> {
  if (match.playerAId !== reporterId && match.playerBId !== reporterId) {
    throw new DomainError('not_player', 'No juegas este partido.');
  }
  if (match.status !== 'in_progress' && match.status !== 'disputed') {
    throw new DomainError('bad_status', 'Este partido no está esperando un resultado.');
  }

  let winnerId = draft.winnerId;
  const isDraw = draft.isDraw;
  if (isDraw) {
    if (!allowDraw) {
      throw new DomainError(
        'draw_not_allowed',
        'En eliminación directa el partido no puede terminar en empate. Pónganse de acuerdo en un ganador.',
      );
    }
    winnerId = null;
  } else if (winnerId !== match.playerAId && winnerId !== match.playerBId) {
    throw new DomainError('bad_report', 'Elige un ganador o marca empate.');
  }

  let goalsA = draft.goalsA;
  let goalsB = draft.goalsB;
  const hasA = goalsA != null;
  const hasB = goalsB != null;
  if (hasA !== hasB) {
    throw new DomainError('bad_report', 'Si anotas goles, completa los dos.');
  }
  if (hasA && hasB) {
    if (
      !Number.isInteger(goalsA) ||
      !Number.isInteger(goalsB) ||
      goalsA! < 0 ||
      goalsB! < 0 ||
      goalsA! > rules.maxGoals ||
      goalsB! > rules.maxGoals
    ) {
      throw new DomainError('bad_report', `Los goles van de 0 a ${rules.maxGoals}.`);
    }
    if (isDraw && goalsA !== goalsB) {
      throw new DomainError('bad_report', 'En un empate los goles tienen que ser iguales.');
    }
    if (!isDraw && winnerId === match.playerAId && !(goalsA! > goalsB!)) {
      throw new DomainError('bad_report', 'El marcador no coincide con el ganador.');
    }
    if (!isDraw && winnerId === match.playerBId && !(goalsB! > goalsA!)) {
      throw new DomainError('bad_report', 'El marcador no coincide con el ganador.');
    }
  } else {
    goalsA = null;
    goalsB = null;
  }

  return { reporterId, winnerId, isDraw, goalsA, goalsB };
}

export function reportsAgree(a: MatchReport, b: MatchReport): boolean {
  if (a.isDraw !== b.isDraw || a.winnerId !== b.winnerId) return false;
  const aScored = a.goalsA != null && a.goalsB != null;
  const bScored = b.goalsA != null && b.goalsB != null;
  if (aScored && bScored) return a.goalsA === b.goalsA && a.goalsB === b.goalsB;
  return true;
}

function pickScores(a: MatchReport, b: MatchReport): { goalsA: number | null; goalsB: number | null } {
  const aScored = a.goalsA != null && a.goalsB != null;
  const bScored = b.goalsA != null && b.goalsB != null;
  if (aScored) return { goalsA: a.goalsA, goalsB: a.goalsB };
  if (bScored) return { goalsA: b.goalsA, goalsB: b.goalsB };
  return { goalsA: null, goalsB: null };
}

export function resolveStatus(match: Match, reports: MatchReport[], now: Date): Match {
  const mine = reports.filter((report) => report.matchId === match.id);
  const fromA = mine.find((report) => report.reporterId === match.playerAId);
  const fromB = mine.find((report) => report.reporterId === match.playerBId);
  if (!fromA || !fromB) {
    return {
      ...match,
      status: 'in_progress',
      winnerId: null,
      isDraw: false,
      goalsA: null,
      goalsB: null,
      confirmedAt: null,
    };
  }
  if (!reportsAgree(fromA, fromB)) {
    return {
      ...match,
      status: 'disputed',
      winnerId: null,
      isDraw: false,
      goalsA: null,
      goalsB: null,
      confirmedAt: null,
    };
  }
  const goals = pickScores(fromA, fromB);
  return {
    ...match,
    status: 'confirmed',
    winnerId: fromA.isDraw ? null : fromA.winnerId,
    isDraw: fromA.isDraw,
    goalsA: goals.goalsA,
    goalsB: goals.goalsB,
    confirmedAt: now.toISOString(),
  };
}
