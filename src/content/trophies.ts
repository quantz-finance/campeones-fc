import type { AchievementCode } from '../domain/types';

export const trophyCatalog: { code: AchievementCode; title: string; description: string }[] = [
  {
    code: 'first_win',
    title: 'Primera victoria',
    description: 'Gana un partido que los dos confirmen.',
  },
  {
    code: 'streak_5',
    title: 'Racha de 5',
    description: 'Gana cinco partidos seguidos.',
  },
  {
    code: 'tournament_champion',
    title: 'Campeón de torneo',
    description: 'Gana un torneo de tu grupo.',
  },
];
