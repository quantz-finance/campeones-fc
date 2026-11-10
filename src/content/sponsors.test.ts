import { describe, expect, it } from 'vitest';
import { sponsorSlots, sponsorsFor } from './sponsors';

describe('espacios patrocinados', () => {
  it('todos dicen Patrocinado y los de la casa no traen marcas ni enlaces', () => {
    for (const slot of sponsorSlots) {
      expect(slot.kicker).toBe('Patrocinado');
      if (slot.kind === 'house') {
        expect(slot.href ?? null).toBeNull();
        expect(slot.imageUrl ?? null).toBeNull();
      }
    }
  });
  it('hay un banner, fichas de medio ancho y un torneo patrocinado', () => {
    expect(sponsorsFor('home', 'banner').length).toBeGreaterThanOrEqual(1);
    expect(sponsorsFor('home', 'tile').length).toBeGreaterThanOrEqual(2);
    expect(sponsorsFor('tournament').length).toBeGreaterThanOrEqual(1);
  });
});
