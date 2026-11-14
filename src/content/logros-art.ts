// Arte de los logros: medallas doradas v7 de Stan (assets/sets/logros).
// Normal = PNG de 512 px; small = variante de 128 px para tamaños menores de 56 px.
// lock / lockSmall = variante bloqueada grafito lila (script de Stan, _build/locked.py).
import type { ImageSourcePropType } from 'react-native';
import type { AchievementCode } from '../domain/types';

type Art = {
  normal: ImageSourcePropType;
  small: ImageSourcePropType;
  lock: ImageSourcePropType;
  lockSmall: ImageSourcePropType;
};

export const logroArtById: Record<AchievementCode, Art> = {
  'primer-partido': { normal: require('../../assets/logros/primer-partido.png'), small: require('../../assets/logros/small/primer-partido.png'), lock: require('../../assets/logros/lock/primer-partido.png'), lockSmall: require('../../assets/logros/lock-small/primer-partido.png') },
  'primera-victoria': { normal: require('../../assets/logros/primera-victoria.png'), small: require('../../assets/logros/small/primera-victoria.png'), lock: require('../../assets/logros/lock/primera-victoria.png'), lockSmall: require('../../assets/logros/lock-small/primera-victoria.png') },
  'debut-grupo': { normal: require('../../assets/logros/debut-grupo.png'), small: require('../../assets/logros/small/debut-grupo.png'), lock: require('../../assets/logros/lock/debut-grupo.png'), lockSmall: require('../../assets/logros/lock-small/debut-grupo.png') },
  'en-el-ranking': { normal: require('../../assets/logros/en-el-ranking.png'), small: require('../../assets/logros/small/en-el-ranking.png'), lock: require('../../assets/logros/lock/en-el-ranking.png'), lockSmall: require('../../assets/logros/lock-small/en-el-ranking.png') },
  'racha-3': { normal: require('../../assets/logros/racha-3.png'), small: require('../../assets/logros/small/racha-3.png'), lock: require('../../assets/logros/lock/racha-3.png'), lockSmall: require('../../assets/logros/lock-small/racha-3.png') },
  'racha-5': { normal: require('../../assets/logros/racha-5.png'), small: require('../../assets/logros/small/racha-5.png'), lock: require('../../assets/logros/lock/racha-5.png'), lockSmall: require('../../assets/logros/lock-small/racha-5.png') },
  'racha-10': { normal: require('../../assets/logros/racha-10.png'), small: require('../../assets/logros/small/racha-10.png'), lock: require('../../assets/logros/lock/racha-10.png'), lockSmall: require('../../assets/logros/lock-small/racha-10.png') },
  'invicto': { normal: require('../../assets/logros/invicto.png'), small: require('../../assets/logros/small/invicto.png'), lock: require('../../assets/logros/lock/invicto.png'), lockSmall: require('../../assets/logros/lock-small/invicto.png') },
  'remontada': { normal: require('../../assets/logros/remontada.png'), small: require('../../assets/logros/small/remontada.png'), lock: require('../../assets/logros/lock/remontada.png'), lockSmall: require('../../assets/logros/lock-small/remontada.png') },
  'partidos-10': { normal: require('../../assets/logros/partidos-10.png'), small: require('../../assets/logros/small/partidos-10.png'), lock: require('../../assets/logros/lock/partidos-10.png'), lockSmall: require('../../assets/logros/lock-small/partidos-10.png') },
  'partidos-50': { normal: require('../../assets/logros/partidos-50.png'), small: require('../../assets/logros/small/partidos-50.png'), lock: require('../../assets/logros/lock/partidos-50.png'), lockSmall: require('../../assets/logros/lock-small/partidos-50.png') },
  'partidos-100': { normal: require('../../assets/logros/partidos-100.png'), small: require('../../assets/logros/small/partidos-100.png'), lock: require('../../assets/logros/lock/partidos-100.png'), lockSmall: require('../../assets/logros/lock-small/partidos-100.png') },
  'partidos-250': { normal: require('../../assets/logros/partidos-250.png'), small: require('../../assets/logros/small/partidos-250.png'), lock: require('../../assets/logros/lock/partidos-250.png'), lockSmall: require('../../assets/logros/lock-small/partidos-250.png') },
  'arco-en-cero': { normal: require('../../assets/logros/arco-en-cero.png'), small: require('../../assets/logros/small/arco-en-cero.png'), lock: require('../../assets/logros/lock/arco-en-cero.png'), lockSmall: require('../../assets/logros/lock-small/arco-en-cero.png') },
  'goleada': { normal: require('../../assets/logros/goleada.png'), small: require('../../assets/logros/small/goleada.png'), lock: require('../../assets/logros/lock/goleada.png'), lockSmall: require('../../assets/logros/lock-small/goleada.png') },
  'manita': { normal: require('../../assets/logros/manita.png'), small: require('../../assets/logros/small/manita.png'), lock: require('../../assets/logros/lock/manita.png'), lockSmall: require('../../assets/logros/lock-small/manita.png') },
  'finalista': { normal: require('../../assets/logros/finalista.png'), small: require('../../assets/logros/small/finalista.png'), lock: require('../../assets/logros/lock/finalista.png'), lockSmall: require('../../assets/logros/lock-small/finalista.png') },
  'campeon-torneo': { normal: require('../../assets/logros/campeon-torneo.png'), small: require('../../assets/logros/small/campeon-torneo.png'), lock: require('../../assets/logros/lock/campeon-torneo.png'), lockSmall: require('../../assets/logros/lock-small/campeon-torneo.png') },
  'lider-grupo': { normal: require('../../assets/logros/lider-grupo.png'), small: require('../../assets/logros/small/lider-grupo.png'), lock: require('../../assets/logros/lock/lider-grupo.png'), lockSmall: require('../../assets/logros/lock-small/lider-grupo.png') },
  'elo-100': { normal: require('../../assets/logros/elo-100.png'), small: require('../../assets/logros/small/elo-100.png'), lock: require('../../assets/logros/lock/elo-100.png'), lockSmall: require('../../assets/logros/lock-small/elo-100.png') },
  'anfitrion': { normal: require('../../assets/logros/anfitrion.png'), small: require('../../assets/logros/small/anfitrion.png'), lock: require('../../assets/logros/lock/anfitrion.png'), lockSmall: require('../../assets/logros/lock-small/anfitrion.png') },
  'capitan': { normal: require('../../assets/logros/capitan.png'), small: require('../../assets/logros/small/capitan.png'), lock: require('../../assets/logros/lock/capitan.png'), lockSmall: require('../../assets/logros/lock-small/capitan.png') },
  'fundador': { normal: require('../../assets/logros/fundador.png'), small: require('../../assets/logros/small/fundador.png'), lock: require('../../assets/logros/lock/fundador.png'), lockSmall: require('../../assets/logros/lock-small/fundador.png') },
  'clasico': { normal: require('../../assets/logros/clasico.png'), small: require('../../assets/logros/small/clasico.png'), lock: require('../../assets/logros/lock/clasico.png'), lockSmall: require('../../assets/logros/lock-small/clasico.png') },
};

/** Debajo de este tamaño (px) se usa la variante small. */
export const SMALL_ART_BELOW = 56;

export function logroArt(code: AchievementCode, size: number, unlocked = true): ImageSourcePropType {
  const art = logroArtById[code];
  const small = size < SMALL_ART_BELOW;
  if (!unlocked) return small ? art.lockSmall : art.lock;
  return small ? art.small : art.normal;
}

/** Si el arte todavía es provisional (para avisos internos, nunca en la UI). */
export const logroArtIsPlaceholder = false;
