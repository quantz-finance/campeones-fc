// Arte de los logros (sellos de Stan). PROVISIONAL: copia de assets/sets/_v3/logros a 256 px, mientras se aprueba
// el arte final. Para cambiarlo, reemplaza los PNG de assets/logros/ o apunta aquí a los nuevos: nada más los usa.
import type { ImageSourcePropType } from 'react-native';
import type { AchievementCode } from '../domain/types';

export const logroArt: Record<AchievementCode, ImageSourcePropType> = {
  first_win: require('../../assets/logros/primera-victoria.png'),
  streak_5: require('../../assets/logros/racha-5.png'),
  tournament_champion: require('../../assets/logros/campeon-torneo.png'),
};

/** Si el arte todavía es provisional (para avisos internos, nunca en la UI). */
export const logroArtIsPlaceholder = true;
