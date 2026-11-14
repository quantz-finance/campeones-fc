import { describe, expect, it } from 'vitest';
import { siblingsOf, whyTitle } from '../content/trophies';
import type { TrophyView } from '../data/snapshots';
import { stageStats } from './logro-escenario-data';

function trophy(overrides: Partial<TrophyView> & Pick<TrophyView, 'code' | 'earned'>): TrophyView {
  return {
    title: 'X',
    description: 'Y',
    section: 'rachas',
    rarity: 'rara',
    earnedAt: null,
    progress: null,
    ...overrides,
  };
}

describe('escenario de transmisión: datos del marcador', () => {
  const streaks = { currentWinStreak: 2, bestWinStreak: 3, currentUnbeaten: 1 };

  it('ganado: fecha (o «Ganado»), sección y vitrina', () => {
    const row = trophy({ code: 'arco-en-cero', earned: true, earnedAt: '2026-11-09T12:00:00.000Z', section: 'goles', title: 'Arco en cero', rarity: 'comun' });
    const cells = stageStats(row, { earnedCount: 7, total: 24, ...streaks });
    expect(cells.map((c) => c.label)).toEqual(['GANADO', 'SECCIÓN', 'TU VITRINA']);
    expect(cells[1].value).toBe('Goles y marcadores');
    expect(cells[2].value).toBe('7/24');
    expect(cells[0].value.length).toBeGreaterThan(0);
  });

  it('ganado sin fecha real muestra solo «Ganado»', () => {
    const row = trophy({ code: 'campeon-torneo', earned: true, section: 'torneos', rarity: 'legendaria' });
    expect(stageStats(row, { earnedCount: 1, total: 24, ...streaks })[0].value).toBe('Ganado');
  });

  it('racha bloqueada: progreso y rachas reales', () => {
    const row = trophy({ code: 'racha-5', earned: false, progress: { current: 3, target: 5 } });
    const cells = stageStats(row, { earnedCount: 4, total: 24, ...streaks });
    expect(cells).toEqual([
      { value: '3/5', label: 'PROGRESO', color: '#F1D27A' },
      { value: '2', label: 'RACHA ACTUAL', color: '#FFFFFF' },
      { value: '3', label: 'MEJOR RACHA', color: '#FFFFFF' },
    ]);
  });

  it('anfitrión bloqueado no inventa progreso ni racha', () => {
    const row = trophy({ code: 'anfitrion', earned: false, section: 'social', rarity: 'comun' });
    expect(stageStats(row, { earnedCount: 0, total: 24, ...streaks })).toEqual([]);
  });

  it('serie de hermanos y artículo de «por qué»', () => {
    expect(siblingsOf('racha-5').map((item) => item.code)).toEqual(['racha-3', 'racha-5', 'racha-10']);
    expect(siblingsOf('manita').map((item) => item.code)).toEqual(['arco-en-cero', 'goleada', 'manita']);
    expect(siblingsOf('finalista')).toEqual([]);
    expect(whyTitle('búho')).toBe('Por qué el búho');
    expect(whyTitle('liebre')).toBe('Por qué la liebre');
    expect(whyTitle('abeja')).toBe('Por qué la abeja');
  });
});
