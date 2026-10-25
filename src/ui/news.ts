import type { Match } from '../domain/types';
import type { Streak } from '../domain/stats';
import { firstName } from './format';

/**
 * Titulares de la cinta de noticias del inicio. El comentarista narra: nada de
 * testimonios, apuestas, dinero ni marcas ajenas. La única etiqueta permitida en
 * la cinta es "EN VIVO" (la pone el componente, no estas líneas).
 */
export type NewsInput = {
  me: string;
  recent: Match[];
  people: Record<string, { displayName: string } | undefined>;
  actionCount: number;
  streak: Streak;
  leader?: { groupName: string; leaderName: string } | null;
  tournaments?: { name: string; status: 'in_progress' | 'completed'; players: number; winnerName: string | null }[];
};

export const genericNews = [
  'Registra tu partido y súmalo a la tabla',
  'El ranking se calcula con Elo FIDE: cada resultado mueve la tabla',
  'Reta a un amigo y arranca tu racha',
  'Arma una copa en tu grupo: eliminación directa o liga',
];

const MAX = 8;

function name(input: NewsInput, id: string | null | undefined, fallback: string): string {
  return firstName(input.people[id ?? '']?.displayName ?? fallback);
}

export function matchHeadline(input: NewsInput, match: Match): string {
  const a = name(input, match.playerAId, 'Local');
  const b = name(input, match.playerBId, 'Visita');
  const score = match.goalsA != null && match.goalsB != null ? `${match.goalsA}-${match.goalsB}` : 'vs';
  const base = `${a} ${score} ${b}`;
  if (match.isDraw) return `${base} · Empate`;
  const delta = match.winnerId === match.playerAId ? match.ratingDeltaA : match.winnerId === match.playerBId ? match.ratingDeltaB : null;
  if (delta != null && Number.isFinite(delta) && delta !== 0) {
    const rounded = Math.round(Math.abs(delta));
    return `${base} · +${rounded} Elo`;
  }
  return match.winnerId ? `${base} · Gana ${name(input, match.winnerId, a)}` : base;
}

export function buildNews(input: NewsInput): string[] {
  const out: string[] = [];
  if (input.actionCount > 0) {
    out.push(
      input.actionCount === 1
        ? 'Tienes 1 partido por confirmar'
        : `Tienes ${input.actionCount} partidos por confirmar`,
    );
  }
  const confirmed = input.recent.filter((match) => match.status === 'confirmed').slice(0, 3);
  for (const match of confirmed) out.push(matchHeadline(input, match));
  if (input.leader) out.push(`${input.leader.leaderName} lidera ${input.leader.groupName}`);
  if (input.streak.type === 'win' && input.streak.count >= 2) {
    out.push(`Vas con ${input.streak.count} victorias seguidas`);
  }
  for (const cup of (input.tournaments ?? []).slice(0, 2)) {
    if (cup.status === 'completed' && cup.winnerName) out.push(`${firstName(cup.winnerName)} gana ${/^copa\b/i.test(cup.name) ? 'la' : 'la copa'} ${cup.name}`);
    else if (cup.status === 'in_progress') out.push(`${cup.name} en juego · ${cup.players} jugadores`);
  }
  for (const line of genericNews) {
    if (out.length >= 4) break;
    out.push(line);
  }
  return out.slice(0, MAX);
}
