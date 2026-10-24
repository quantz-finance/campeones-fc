import type { MatchStatus, Outcome } from '../domain/types';
import type { SideRecord, Streak } from '../domain/stats';

export function pct(rate: number): string {
  if (!Number.isFinite(rate) || rate <= 0) return '0%';
  return `${Math.round(rate * 100)}%`;
}

export function elo(value: number): string {
  return Math.round(value).toLocaleString('es-CR');
}

export function signed(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

export function recordLine(record: Pick<SideRecord, 'wins' | 'draws' | 'losses'>): string {
  return `${record.wins} V · ${record.draws} E · ${record.losses} D`;
}

export function streakLabel(streak: Streak): string {
  if (streak.type === 'none' || streak.count === 0) return 'Sin racha';
  if (streak.type === 'win') return streak.count === 1 ? '1 victoria' : `${streak.count} victorias`;
  if (streak.type === 'loss') return streak.count === 1 ? '1 derrota' : `${streak.count} derrotas`;
  return streak.count === 1 ? '1 empate' : `${streak.count} empates`;
}

export const statusLabel: Record<MatchStatus, string> = {
  pending_accept: 'Por aceptar',
  in_progress: 'En juego',
  disputed: 'En disputa',
  confirmed: 'Confirmado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

export function statusTone(status: MatchStatus): 'accent' | 'warn' | 'danger' | 'draw' | 'muted' | 'gold' {
  if (status === 'confirmed') return 'accent';
  if (status === 'pending_accept') return 'warn';
  if (status === 'in_progress') return 'draw';
  if (status === 'disputed') return 'danger';
  if (status === 'expired') return 'muted';
  return 'muted';
}

export function outcomeLabel(outcome: Outcome): string {
  if (outcome === 'win') return 'Victoria';
  if (outcome === 'loss') return 'Derrota';
  return 'Empate';
}

export function formatWhen(iso: string, now = Date.now()): string {
  const diff = Date.parse(iso) - now;
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60000);
  const hours = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const unit = minutes < 60 ? `${Math.max(minutes, 1)} min` : hours < 36 ? `${hours} h` : `${days} d`;
  if (minutes < 1) return diff >= 0 ? 'en un momento' : 'ahora';
  return diff >= 0 ? `en ${unit}` : `hace ${unit}`;
}

export function formatDay(iso: string): string {
  return new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short' }).format(new Date(iso));
}

export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

export function scoreText(goalsA: number | null, goalsB: number | null): string | null {
  if (goalsA == null || goalsB == null) return null;
  return `${goalsA}–${goalsB}`;
}
