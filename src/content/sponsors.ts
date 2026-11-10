// Espacios patrocinados del inicio. Hoy no hay patrocinadores: son anuncios de la casa (placeholders)
// sin marcas reales. Para sumar uno real, agrega un objeto con kind: 'sponsor', su imagen, título y enlace.

export type SponsorSize = 'banner' | 'tile';

export type SponsorSlot = {
  id: string;
  /** banner: ancho completo; tile: medio ancho. */
  size: SponsorSize;
  /** house = espacio libre de la casa; sponsor = patrocinador real. */
  kind: 'house' | 'sponsor';
  /** Dónde va: en la portada o como torneo patrocinado en el carrusel. */
  placement: 'home' | 'tournament';
  kicker: string;
  title: string;
  body?: string;
  cta?: string;
  /** Enlace del CTA (externo o ruta interna). Sin enlace, la pieza no es pulsable. */
  href?: string | null;
  /** Imagen del patrocinador (URL https). */
  imageUrl?: string | null;
};

export const sponsorSlots: SponsorSlot[] = [
  {
    id: 'house-banner',
    size: 'banner',
    kind: 'house',
    placement: 'home',
    kicker: 'Patrocinado',
    title: 'Tu marca aquí',
    body: 'Patrocina un torneo y ponle tu nombre a la copa.',
    cta: 'Próximamente',
  },
  {
    id: 'house-tile-cup',
    size: 'tile',
    kind: 'house',
    placement: 'home',
    kicker: 'Patrocinado',
    title: 'Torneo patrocinado',
    body: 'Próximamente',
  },
  {
    id: 'house-tile-brand',
    size: 'tile',
    kind: 'house',
    placement: 'home',
    kicker: 'Patrocinado',
    title: 'Tu marca aquí',
    body: 'Espacio disponible',
  },
  {
    id: 'house-cup',
    size: 'tile',
    kind: 'house',
    placement: 'tournament',
    kicker: 'Patrocinado',
    title: 'Torneo patrocinado',
    body: 'Próximamente',
  },
];

export function sponsorsFor(placement: SponsorSlot['placement'], size?: SponsorSize): SponsorSlot[] {
  return sponsorSlots.filter((slot) => slot.placement === placement && (!size || slot.size === size));
}
