// Marcador del partido · «Retrato a sangre» (propuesta 2 de Stan, elegida por Rolando), alcance (a):
// rediseño de /partido/:id con el rival y el contexto ya fijados. Sin backend nuevo: todo sale del
// MatchSnapshot. Aquí va la lógica pura (estado de la pantalla, contexto, textos) para poder probarla.
import type { MatchSnapshot } from '../data/snapshots';
import { firstName } from './format';

export const MAX_GOALS = 30;

export type MarcadorState =
  | 'propuesta' // el rival te propuso el partido: aceptar o rechazar
  | 'esperando' // lo propusiste tú y falta que el rival acepte
  | 'registrar' // en juego: anotar el marcador (o corregirlo)
  | 'enviado' // ya registraste; falta que el rival confirme
  | 'confirmar' // el rival registró: «Te toca confirmar»
  | 'disputa' // no coinciden: nadie suma hasta que uno corrija
  | 'cerrado'
  | 'expirado'
  | 'cancelado'
  | 'viendo'; // no juegas en este partido

type Snap = Pick<MatchSnapshot, 'match' | 'youAre' | 'yourReport' | 'opponentReport'>;

export function marcadorState(snap: Snap, editing: boolean): MarcadorState {
  const { status } = snap.match;
  if (status === 'confirmed') return 'cerrado';
  if (status === 'expired') return 'expirado';
  if (status === 'cancelled') return 'cancelado';
  if (snap.youAre === 'other') return 'viendo';
  if (status === 'pending_accept') return snap.youAre === 'b' ? 'propuesta' : 'esperando';
  if (editing) return 'registrar';
  if (status === 'disputed') return 'disputa';
  if (snap.opponentReport && !snap.yourReport) return 'confirmar';
  if (snap.yourReport) return 'enviado';
  return 'registrar';
}

export type ContextKind = 'amistoso' | 'grupo' | 'torneo';

/** Para qué cuenta el partido: fijo, viene de cuando se propuso (o del cuadro del torneo). */
export function matchContext(snap: Pick<MatchSnapshot, 'match' | 'groupName' | 'tournamentName' | 'slotId'>): { kind: ContextKind; kicker: string; name: string } {
  if (snap.match.tournamentId || snap.slotId || snap.tournamentName) {
    return { kind: 'torneo', kicker: 'Partido de torneo', name: snap.tournamentName ?? 'Torneo' };
  }
  if (snap.match.groupId || snap.groupName) return { kind: 'grupo', kicker: 'Partido de grupo', name: snap.groupName ?? 'Grupo' };
  return { kind: 'amistoso', kicker: 'Amistoso', name: 'Solo entre ustedes' };
}

type Vote = { isDraw: boolean; winnerId: string | null; goalsA: number | null; goalsB: number | null };

/** Goles vistos desde «yo» (los míos primero), o null si no anotaron marcador. */
export function mineFirst(vote: Pick<Vote, 'goalsA' | 'goalsB'>, youAre: 'a' | 'b' | 'other'): { mine: number; theirs: number } | null {
  if (vote.goalsA == null || vote.goalsB == null) return null;
  return youAre === 'b' ? { mine: vote.goalsB, theirs: vote.goalsA } : { mine: vote.goalsA, theirs: vote.goalsB };
}

/** «4 – 2» (míos primero), «Empate» o «Ganaste» / «Ganó Carlos». */
export function voteText(vote: Vote, youAre: 'a' | 'b' | 'other', meId: string, themName: string): string {
  const goals = mineFirst(vote, youAre);
  if (goals) return `${goals.mine} – ${goals.theirs}`;
  if (vote.isDraw) return 'Empate';
  return vote.winnerId === meId ? 'Ganaste' : `Ganó ${firstName(themName)}`;
}

export type Pick3 = 'me' | 'them' | 'draw';

/** Línea «RESULTADO»: «Gana Usuario · 4 – 2», «Empate · 2 – 2» o, sin marcador, «Gana Usuario». */
export function resultLine(shown: Pick3, youName: string, themName: string, goals: { mine: number; theirs: number } | null): string {
  const who = shown === 'draw' ? 'Empate' : `Gana ${firstName(shown === 'me' ? youName : themName)}`;
  return goals ? `${who} · ${goals.mine} – ${goals.theirs}` : who;
}

/** Mantener presionado − / +: arranca a 260 ms y acelera hasta 60 ms por paso. */
export function repeatDelay(step: number): number {
  return Math.max(60, Math.round(260 * Math.pow(0.82, step)));
}

export function clampGoals(value: number): number {
  return Math.max(0, Math.min(MAX_GOALS, value));
}
