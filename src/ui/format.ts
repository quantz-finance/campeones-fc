import { plausibleIso } from '../domain/dates';
import type { MatchStatus, Outcome } from '../domain/types';
import type { SideRecord, Streak } from '../domain/stats';
import { civilInZone } from './costa-rica-time';

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

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
  if (record.wins + record.draws + record.losses === 0) return 'Sin partidos aún';
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

export function statusTone(status: MatchStatus): 'accent' | 'warn' | 'danger' | 'draw' | 'muted' | 'gold' | 'up' {
  if (status === 'confirmed') return 'up';
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

export function formatDay(iso: string | null | undefined): string {
  const at = plausibleIso(iso);
  if (!at) return '';
  return new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short' }).format(new Date(at));
}

/** Vie 27 nov · 9:00 PM, en hora de Costa Rica. Vacío si la fecha no es creíble. */
export function formatEventWhen(iso: string | null | undefined): string {
  const at = plausibleIso(iso);
  if (!at) return '';
  const civil = civilInZone(at);
  const weekday = new Date(Date.UTC(civil.year, civil.month - 1, civil.day)).getUTCDay();
  const hour12 = civil.hour % 12 === 0 ? 12 : civil.hour % 12;
  const period = civil.hour < 12 ? 'AM' : 'PM';
  const minute = String(civil.minute).padStart(2, '0');
  return `${WEEKDAYS[weekday]} ${civil.day} ${MONTHS[civil.month - 1]} · ${hour12}:${minute} ${period}`;
}

export function tournamentJoinLabel(registered: boolean, requested: boolean, open: boolean): string {
  if (registered) return 'Inscrito ✓';
  if (requested) return 'Solicitud enviada';
  return open ? 'Inscribirme' : 'Pedir invitación';
}

export function groupJoinLabel(member: boolean, requested: boolean, open: boolean): string {
  if (member) return 'Miembro ✓';
  if (requested) return 'Solicitud enviada';
  return open ? 'Unirme' : 'Pedir invitación';
}

export function slotsLine(registered: number, max: number | null | undefined): string {
  if (max == null) return `${registered} inscritos`;
  return `${registered}/${max} inscritos`;
}

export function tournamentStatusLabel(status: 'registration' | 'in_progress' | 'completed'): string {
  if (status === 'registration') return 'Inscripciones abiertas';
  if (status === 'completed') return 'Finalizado';
  return 'En juego';
}

export function firstName(displayName: string): string {
  return displayName.trim().split(/\s+/)[0] || displayName;
}

export function scoreText(goalsA: number | null, goalsB: number | null): string | null {
  if (goalsA == null || goalsB == null) return null;
  return `${goalsA}–${goalsB}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '·';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function tagOf(name: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return first.slice(0, 3).toUpperCase();
}

export function monogram(name: string): string {
  const skip = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'a']);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const strong = parts.filter((part) => !skip.has(part.toLowerCase()));
  const use = strong.length > 0 ? strong : parts;
  return use
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function goalsPerMatch(goals: number, played: number): string {
  if (played <= 0) return '0';
  return (goals / played).toLocaleString('es-CR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}
