import { describe, expect, it } from 'vitest';
import { projectPublicPlayer } from './public-player';
import { buildSeed, IDS } from './seed';

describe('ficha pública del jugador', () => {
  const db = buildSeed(new Date('2026-10-24T18:00:00.000Z'));
  it('trae marcador, forma, logros, títulos y redes de ejemplo', () => {
    const p = projectPublicPlayer(db, IDS.andre, IDS.vale);
    expect(p.played).toBe(p.wins + p.draws + p.losses);
    expect(p.place).toBe(1);
    expect(p.peak).toBeGreaterThanOrEqual(p.rating);
    expect(p.form.length).toBeLessThanOrEqual(5);
    expect(p.titles.some((t) => t.name === 'Copa del barrio')).toBe(true);
    expect(p.achievements.map((a) => a.code)).toContain('tournament_champion');
    expect(p.profile.socialLinks.tiktok).toBe('https://www.tiktok.com/@demo_andres');
    expect(p.groups.length).toBeGreaterThan(0);
    expect(p.recent[0].opponent).not.toBeNull();
  });
  it('un espectador no ve grupos y el resto sí', () => {
    const p = projectPublicPlayer(db, IDS.andre, null);
    expect(p.groups).toHaveLength(0);
    expect(p.played).toBeGreaterThan(0);
  });
  it('jugador inexistente: no encontrado', () => {
    expect(() => projectPublicPlayer(db, 'nadie', null)).toThrow();
  });
});
