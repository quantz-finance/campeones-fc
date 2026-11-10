// Escudos de grupo (23, blanco/lila) y trofeos de torneo (8, oro plano): sets v5 de Stan, aprobados por Rolando.
// normal = PNG 256 px; small = variante simplificada 128 px para tamaños de 32–48 px (marco simple, silueta maciza).
// Los ids son los que guarda la columna `logo` (ver supabase/migrations/20261113000000_entity_logos.sql).

import { defaultLogo, isLogoId, type LogoKind } from './crest-ids';

export * from './crest-ids';

export type LogoArt = { id: string; name: string; nameEn: string; normal: number; small: number };

export const GROUP_CRESTS = [
  { id: 'leon', name: 'León', nameEn: 'Lion', normal: require('../../assets/escudos/leon.png'), small: require('../../assets/escudos/small/leon.png') },
  { id: 'aguila', name: 'Águila', nameEn: 'Eagle', normal: require('../../assets/escudos/aguila.png'), small: require('../../assets/escudos/small/aguila.png') },
  { id: 'toro', name: 'Toro', nameEn: 'Bull', normal: require('../../assets/escudos/toro.png'), small: require('../../assets/escudos/small/toro.png') },
  { id: 'lobo', name: 'Lobo', nameEn: 'Wolf', normal: require('../../assets/escudos/lobo.png'), small: require('../../assets/escudos/small/lobo.png') },
  { id: 'corona', name: 'Corona', nameEn: 'Crown', normal: require('../../assets/escudos/corona.png'), small: require('../../assets/escudos/small/corona.png') },
  { id: 'rayo', name: 'Rayo', nameEn: 'Lightning', normal: require('../../assets/escudos/rayo.png'), small: require('../../assets/escudos/small/rayo.png') },
  { id: 'balon', name: 'Balón', nameEn: 'Ball', normal: require('../../assets/escudos/balon.png'), small: require('../../assets/escudos/small/balon.png') },
  { id: 'llama', name: 'Llama', nameEn: 'Flame', normal: require('../../assets/escudos/llama.png'), small: require('../../assets/escudos/small/llama.png') },
  { id: 'estrella', name: 'Estrella', nameEn: 'Star', normal: require('../../assets/escudos/estrella.png'), small: require('../../assets/escudos/small/estrella.png') },
  { id: 'montana', name: 'Montaña', nameEn: 'Mountain', normal: require('../../assets/escudos/montana.png'), small: require('../../assets/escudos/small/montana.png') },
  { id: 'ola', name: 'Ola', nameEn: 'Wave', normal: require('../../assets/escudos/ola.png'), small: require('../../assets/escudos/small/ola.png') },
  { id: 'cohete', name: 'Cohete', nameEn: 'Rocket', normal: require('../../assets/escudos/cohete.png'), small: require('../../assets/escudos/small/cohete.png') },
  { id: 'tigre', name: 'Tigre', nameEn: 'Tiger', normal: require('../../assets/escudos/tigre.png'), small: require('../../assets/escudos/small/tigre.png') },
  { id: 'caballo', name: 'Caballo', nameEn: 'Horse', normal: require('../../assets/escudos/caballo.png'), small: require('../../assets/escudos/small/caballo.png') },
  { id: 'oso', name: 'Oso', nameEn: 'Bear', normal: require('../../assets/escudos/oso.png'), small: require('../../assets/escudos/small/oso.png') },
  { id: 'halcon', name: 'Halcón', nameEn: 'Falcon', normal: require('../../assets/escudos/halcon.png'), small: require('../../assets/escudos/small/halcon.png') },
  { id: 'dragon', name: 'Dragón', nameEn: 'Dragon', normal: require('../../assets/escudos/dragon.png'), small: require('../../assets/escudos/small/dragon.png') },
  { id: 'tiburon', name: 'Tiburón', nameEn: 'Shark', normal: require('../../assets/escudos/tiburon.png'), small: require('../../assets/escudos/small/tiburon.png') },
  { id: 'pantera', name: 'Pantera', nameEn: 'Panther', normal: require('../../assets/escudos/pantera.png'), small: require('../../assets/escudos/small/pantera.png') },
  { id: 'jaguar', name: 'Jaguar', nameEn: 'Jaguar', normal: require('../../assets/escudos/jaguar.png'), small: require('../../assets/escudos/small/jaguar.png') },
  { id: 'castillo', name: 'Castillo', nameEn: 'Castle', normal: require('../../assets/escudos/castillo.png'), small: require('../../assets/escudos/small/castillo.png') },
  { id: 'espadas-cruzadas', name: 'Espadas cruzadas', nameEn: 'Crossed swords', normal: require('../../assets/escudos/espadas-cruzadas.png'), small: require('../../assets/escudos/small/espadas-cruzadas.png') },
  { id: 'balon-alado', name: 'Balón alado', nameEn: 'Winged ball', normal: require('../../assets/escudos/balon-alado.png'), small: require('../../assets/escudos/small/balon-alado.png') },
] as const satisfies readonly LogoArt[];

export const TOURNAMENT_TROPHIES = [
  { id: 'copa-clasica', name: 'Copa clásica', nameEn: 'Classic cup', normal: require('../../assets/trofeos/copa-clasica.png'), small: require('../../assets/trofeos/small/copa-clasica.png') },
  { id: 'copa-asas', name: 'Copa con asas', nameEn: 'Handled cup', normal: require('../../assets/trofeos/copa-asas.png'), small: require('../../assets/trofeos/small/copa-asas.png') },
  { id: 'copa-grande', name: 'Copa grande', nameEn: 'Grand cup', normal: require('../../assets/trofeos/copa-grande.png'), small: require('../../assets/trofeos/small/copa-grande.png') },
  { id: 'escudo', name: 'Escudo', nameEn: 'Shield', normal: require('../../assets/trofeos/escudo.png'), small: require('../../assets/trofeos/small/escudo.png') },
  { id: 'medalla', name: 'Medalla', nameEn: 'Medal', normal: require('../../assets/trofeos/medalla.png'), small: require('../../assets/trofeos/small/medalla.png') },
  { id: 'cinturon', name: 'Cinturón', nameEn: 'Belt', normal: require('../../assets/trofeos/cinturon.png'), small: require('../../assets/trofeos/small/cinturon.png') },
  { id: 'trofeo-estrella', name: 'Trofeo estrella', nameEn: 'Star trophy', normal: require('../../assets/trofeos/trofeo-estrella.png'), small: require('../../assets/trofeos/small/trofeo-estrella.png') },
  { id: 'laurel', name: 'Laurel', nameEn: 'Laurel', normal: require('../../assets/trofeos/laurel.png'), small: require('../../assets/trofeos/small/laurel.png') },
] as const satisfies readonly LogoArt[];
/** Debajo de este tamaño (px) se usa la variante small. */
export const SMALL_LOGO_BELOW = 56;

export function logoSet(kind: LogoKind): readonly LogoArt[] {
  return kind === 'groups' ? GROUP_CRESTS : TOURNAMENT_TROPHIES;
}

/** Logo a mostrar: el elegido si es válido; si no, el de por defecto. */
export function resolveLogo(kind: LogoKind, entityId: string, logo?: string | null): LogoArt {
  const id = isLogoId(kind, logo) ? logo : defaultLogo(kind, entityId);
  return logoSet(kind).find((item) => item.id === id)!;
}

export function logoSource(art: LogoArt, size: number): number {
  return size < SMALL_LOGO_BELOW ? art.small : art.normal;
}
