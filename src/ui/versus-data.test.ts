import { describe, expect, it } from 'vitest';
import type { Match } from '../domain/types';
import { challengeMessage, historyPage, registerHref, resultView, seriesParts } from './versus-data';

const base = { id: 'm1', playerAId: 'me', playerBId: 'rv', goalsA: 4, goalsB: 2, isDraw: false, winnerId: 'me', confirmedAt: '2026-11-12T20:00:00Z', status: 'confirmed' } as unknown as Match;

describe('versus-data', () => {
  it('muestra el marcador desde mi lado y quién ganó', () => {
    expect(resultView(base, 'me', 'Usuario', 'Carlos')).toMatchObject({ score: '4-2', outcome: 'you', label: 'Gana USU' });
    expect(resultView(base, 'rv', 'Carlos', 'Usuario')).toMatchObject({ score: '2-4', outcome: 'them', label: 'Gana USU' });
    expect(resultView({ ...base, goalsB: 4, isDraw: true, winnerId: null } as unknown as Match, 'me', 'U', 'C').outcome).toBe('draw');
  });
  it('pagina el historial completo', () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    expect(historyPage(items, 1)).toEqual({ shown: items.slice(0, 20), more: 25 });
    expect(historyPage(items, 3).more).toBe(0);
    expect(historyPage(items, 3).shown).toHaveLength(45);
  });
  it('omite las partes vacías de la barra', () => {
    expect(seriesParts(6, 0, 4).map((p) => p.key)).toEqual(['you', 'them']);
  });
  it('reta sin dinero ni apuestas', () => {
    for (const text of [challengeMessage('Carlos', 0, 0, 0), challengeMessage('Carlos', 6, 4, 12)]) {
      expect(text).toContain('Carlos');
      expect(text).not.toMatch(/apuest|dinero|plata|₡|\$|colones/i);
    }
    expect(challengeMessage('Carlos', 6, 4, 12)).toContain('6-4');
  });
  it('arma la ruta de registro con el rival', () => {
    expect(registerHref('abc-1')).toBe('/jugar?rival=abc-1');
  });
});
