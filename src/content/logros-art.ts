// Arte de los logros: sellos verdes v5 de Stan (assets/sets/logros, aprobados por Rolando el 10 nov).
// Normal = PNG de 256 px; small = variante simplificada de 128 px para listas o tamaños menores de 56 px.
// Hay 13 sellos; hoy la app otorga 3 códigos (first_win, streak_5, tournament_champion). El resto queda
// listo en logroArtById para cuando se sumen esos logros al dominio.
import type { ImageSourcePropType } from 'react-native';
import type { AchievementCode } from '../domain/types';

export type LogroArtId =
  | 'primer-partido'
  | 'primera-victoria'
  | 'racha-3'
  | 'racha-5'
  | 'racha-10'
  | 'partidos-10'
  | 'partidos-50'
  | 'partidos-100'
  | 'invicto'
  | 'remontada'
  | 'campeon-torneo'
  | 'lider-grupo'
  | 'elo-100';

type Art = { normal: ImageSourcePropType; small: ImageSourcePropType };

export const logroArtById: Record<LogroArtId, Art> = {
  'primer-partido': { normal: require('../../assets/logros/primer-partido.png'), small: require('../../assets/logros/small/primer-partido.png') },
  'primera-victoria': { normal: require('../../assets/logros/primera-victoria.png'), small: require('../../assets/logros/small/primera-victoria.png') },
  'racha-3': { normal: require('../../assets/logros/racha-3.png'), small: require('../../assets/logros/small/racha-3.png') },
  'racha-5': { normal: require('../../assets/logros/racha-5.png'), small: require('../../assets/logros/small/racha-5.png') },
  'racha-10': { normal: require('../../assets/logros/racha-10.png'), small: require('../../assets/logros/small/racha-10.png') },
  'partidos-10': { normal: require('../../assets/logros/partidos-10.png'), small: require('../../assets/logros/small/partidos-10.png') },
  'partidos-50': { normal: require('../../assets/logros/partidos-50.png'), small: require('../../assets/logros/small/partidos-50.png') },
  'partidos-100': { normal: require('../../assets/logros/partidos-100.png'), small: require('../../assets/logros/small/partidos-100.png') },
  invicto: { normal: require('../../assets/logros/invicto.png'), small: require('../../assets/logros/small/invicto.png') },
  remontada: { normal: require('../../assets/logros/remontada.png'), small: require('../../assets/logros/small/remontada.png') },
  'campeon-torneo': { normal: require('../../assets/logros/campeon-torneo.png'), small: require('../../assets/logros/small/campeon-torneo.png') },
  'lider-grupo': { normal: require('../../assets/logros/lider-grupo.png'), small: require('../../assets/logros/small/lider-grupo.png') },
  'elo-100': { normal: require('../../assets/logros/elo-100.png'), small: require('../../assets/logros/small/elo-100.png') },
};

/** Sello de cada logro que la app otorga hoy. */
export const logroArtIdByCode: Record<AchievementCode, LogroArtId> = {
  first_win: 'primera-victoria',
  streak_5: 'racha-5',
  tournament_champion: 'campeon-torneo',
};

/** Debajo de este tamaño (px) se usa la variante small. */
export const SMALL_ART_BELOW = 56;

export function logroArt(code: AchievementCode, size: number): ImageSourcePropType {
  const art = logroArtById[logroArtIdByCode[code]];
  return size < SMALL_ART_BELOW ? art.small : art.normal;
}

/** Si el arte todavía es provisional (para avisos internos, nunca en la UI). */
export const logroArtIsPlaceholder = false;
