import { trophySections } from '../content/trophies';
import type { TrophyView } from '../data/snapshots';
import { formatDay } from './format';

export type StageStat = { value: string; label: string; color: string };

export type StageStreaks = {
  currentWinStreak: number;
  bestWinStreak: number;
  currentUnbeaten: number;
};

/** Celdas del marcador de 3 datos: solo con números reales, nada inventado. */
export function stageStats(
  trophy: TrophyView,
  ctx: { earnedCount: number; total: number } & StageStreaks,
): StageStat[] {
  if (trophy.earned) {
    const section = trophySections.find((item) => item.id === trophy.section)?.title ?? trophy.section;
    return [
      { value: trophy.earnedAt ? formatDay(trophy.earnedAt) : 'Ganado', label: 'GANADO', color: '#00FF87' },
      { value: section, label: 'SECCIÓN', color: '#FFFFFF' },
      { value: `${ctx.earnedCount}/${ctx.total}`, label: 'TU VITRINA', color: '#F1D27A' },
    ];
  }
  const cells: StageStat[] = [];
  if (trophy.progress) {
    const current = Math.min(trophy.progress.current, trophy.progress.target);
    cells.push({ value: `${current}/${trophy.progress.target}`, label: 'PROGRESO', color: '#F1D27A' });
  }
  const isWinStreak = trophy.code === 'racha-3' || trophy.code === 'racha-5' || trophy.code === 'racha-10';
  const isUnbeaten = trophy.code === 'invicto';
  if (isWinStreak) {
    cells.push({ value: String(ctx.currentWinStreak), label: 'RACHA ACTUAL', color: '#FFFFFF' });
    cells.push({ value: String(ctx.bestWinStreak), label: 'MEJOR RACHA', color: '#FFFFFF' });
  } else if (isUnbeaten) {
    cells.push({ value: String(ctx.currentUnbeaten), label: 'RACHA ACTUAL', color: '#FFFFFF' });
    if (trophy.progress) cells.push({ value: String(trophy.progress.current), label: 'MEJOR RACHA', color: '#FFFFFF' });
  }
  return cells;
}
