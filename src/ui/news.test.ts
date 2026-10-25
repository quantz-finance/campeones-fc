import { describe, expect, it } from 'vitest';
import type { Match } from '../domain/types';
import { buildNews, genericNews } from './news';

const base: Match = {
  id: 'm1', playerAId: 'a', playerBId: 'b', status: 'confirmed', groupId: null, tournamentId: null,
  tournamentSlotId: null, winnerId: 'a', isDraw: false, goalsA: 3, goalsB: 1,
  createdAt: '2026-10-01T00:00:00Z', expiresAt: '2026-10-02T00:00:00Z', acceptedAt: null,
  confirmedAt: '2026-10-01T01:00:00Z', ratingDeltaA: 16.2, ratingDeltaB: -16.2,
};
const people = { a: { displayName: 'Andrés Quesada' }, b: { displayName: 'Mateo Rojas' } };

describe('cinta de noticias', () => {
  it('narra partidos, pendientes y líder', () => {
    const news = buildNews({
      me: 'a', recent: [base], people, actionCount: 2, streak: { type: 'win', count: 3 },
      leader: { groupName: 'Los del barrio', leaderName: 'Andrés' },
    });
    expect(news).toContain('Andrés 3-1 Mateo · +16 Elo');
    expect(news).toContain('Tienes 2 partidos por confirmar');
    expect(news).toContain('Andrés lidera Los del barrio');
    expect(news).toContain('Vas con 3 victorias seguidas');
  });

  it('cae en líneas genéricas sin datos', () => {
    const news = buildNews({ me: 'a', recent: [], people: {}, actionCount: 0, streak: { type: 'none', count: 0 } });
    expect(news).toEqual(genericNews.slice(0, 4));
  });

  it('respeta las reglas legales', () => {
    const all = [...genericNews, ...buildNews({ me: 'a', recent: [base], people, actionCount: 1, streak: { type: 'none', count: 0 } })].join(' ');
    expect(all).not.toMatch(/última hora|breaking|apuesta|dinero|cuota|moneda|yo uso/i);
  });
});
