// Datos derivados de la pantalla Cara a cara («Retrato a sangre», propuesta 2 de Stan). Todo sale del
// H2HSnapshot que ya está en el teléfono: nada de backend nuevo.
import { branding } from '../../config/branding';
import { matchDelta } from '../domain/elo';
import type { Match } from '../domain/types';
import { tagOf } from './format';

export const VERSUS = {
  you: '#00FF87',
  them: '#F1D27A',
  draw: '#8E7AA3',
  muted: '#B99BC6',
  plate: '#2A0030',
  youInk: '#37003C',
  themInk: '#2A1800',
} as const;

/** Partidos por página en «Historial». */
export const HISTORY_PAGE = 20;

export type Outcome = 'you' | 'them' | 'draw';

export type ResultView = {
  id: string;
  score: string;
  outcome: Outcome;
  label: string;
  at: string | null;
  delta: number | null;
};

/** Un partido de la serie visto desde «yo»: marcador (mío primero), quién ganó y mi cambio de Elo. */
export function resultView(match: Match, me: string, youName: string, themName: string): ResultView {
  const mine = match.playerAId === me ? match.goalsA : match.goalsB;
  const theirs = match.playerAId === me ? match.goalsB : match.goalsA;
  const outcome: Outcome = match.isDraw ? 'draw' : match.winnerId === me ? 'you' : 'them';
  return {
    id: match.id,
    score: mine != null && theirs != null ? `${mine}-${theirs}` : '–',
    outcome,
    label: outcome === 'draw' ? 'Empate' : `Gana ${tagOf(outcome === 'you' ? youName : themName)}`,
    at: match.confirmedAt ?? null,
    delta: matchDelta(match, me) ?? null,
  };
}

/** Las primeras `pages` páginas del historial y si queda más. */
export function historyPage<T>(items: T[], pages: number, size = HISTORY_PAGE): { shown: T[]; more: number } {
  const shown = items.slice(0, Math.max(1, pages) * size);
  return { shown, more: Math.max(0, items.length - shown.length) };
}

/** Partes de la barra de la serie (victorias mías, empates, del rival); las vacías no se pintan. */
export function seriesParts(wins: number, draws: number, losses: number): { key: Outcome; flex: number }[] {
  const parts: { key: Outcome; flex: number }[] = [
    { key: 'you', flex: wins },
    { key: 'draw', flex: draws },
    { key: 'them', flex: losses },
  ];
  return parts.filter((part) => part.flex > 0);
}

/** Texto de «Retar a …»: invitación a jugar y registrar, sin dinero ni apuestas. */
export function challengeMessage(rivalFirstName: string, youWins: number, themWins: number, played: number): string {
  if (played === 0) {
    return `${rivalFirstName}, te reto a un partido. Lo registramos en ${branding.name} y empieza nuestra serie.`;
  }
  return `${rivalFirstName}, te reto a otro partido: la serie va ${youWins}-${themWins}. Lo registramos en ${branding.name} y se mueve la tabla.`;
}

/** Ruta del registro de partido con el rival ya elegido. */
export function registerHref(rivalId: string): string {
  return `/jugar?rival=${encodeURIComponent(rivalId)}`;
}
