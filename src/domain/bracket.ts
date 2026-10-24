import { DomainError } from './errors';
import type { Slot } from './types';

export function buildSingleElim(tournamentId: string, playerIds: string[], id: () => string): Slot[] {
  const size = playerIds.length;
  if (![4, 8, 16].includes(size)) {
    throw new DomainError('bad_size', 'La eliminación directa es de 4, 8 o 16 jugadores.');
  }
  const rounds = Math.log2(size);
  const slots: Slot[] = [];
  for (let round = 1; round <= rounds; round += 1) {
    const count = size / 2 ** round;
    for (let position = 0; position < count; position += 1) {
      const slot: Slot = {
        id: id(),
        tournamentId,
        round,
        position,
        playerAId: null,
        playerBId: null,
        winnerId: null,
        matchId: null,
      };
      if (round === 1) {
        slot.playerAId = playerIds[position * 2] ?? null;
        slot.playerBId = playerIds[position * 2 + 1] ?? null;
      }
      slots.push(slot);
    }
  }
  return slots;
}

export function roundRobinPairs(playerIds: string[]): [string, string][] {
  if (playerIds.length < 3 || playerIds.length > 16) {
    throw new DomainError('bad_size', 'La liga necesita entre 3 y 16 jugadores.');
  }
  const ids = [...playerIds];
  if (ids.length % 2 === 1) ids.push('__bye__');
  const count = ids.length;
  const rounds = count - 1;
  const half = count / 2;
  let rotation = ids;
  const pairs: [string, string][] = [];
  for (let round = 0; round < rounds; round += 1) {
    for (let index = 0; index < half; index += 1) {
      const a = rotation[index];
      const b = rotation[count - 1 - index];
      if (a !== '__bye__' && b !== '__bye__') pairs.push([a, b]);
    }
    const fixed = rotation[0];
    const rest = rotation.slice(1);
    const last = rest.pop();
    if (last) rest.unshift(last);
    rotation = [fixed, ...rest];
  }
  return pairs;
}

export function buildRoundRobin(tournamentId: string, playerIds: string[], id: () => string): Slot[] {
  return roundRobinPairs(playerIds).map(([playerAId, playerBId], position) => ({
    id: id(),
    tournamentId,
    round: 1,
    position,
    playerAId,
    playerBId,
    winnerId: null,
    matchId: null,
  }));
}

export function totalRounds(format: 'single_elim' | 'round_robin', size: number): number {
  if (format === 'round_robin') return 1;
  return Math.log2(size);
}

export function roundLabel(round: number, rounds: number, format: 'single_elim' | 'round_robin'): string {
  if (format === 'round_robin') return 'Todos contra todos';
  const fromFinal = rounds - round;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semifinal';
  if (fromFinal === 2) return 'Cuartos';
  if (fromFinal === 3) return 'Octavos';
  return `Ronda ${round}`;
}
