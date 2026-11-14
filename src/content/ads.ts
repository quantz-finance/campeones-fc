// Catálogo de anuncios por espacio (carruseles). La fuente es anuncios.json con el arte de Stan,
// convertido a ads.generated.ts por scripts/sync-ads.mjs. El equipo publica los anuncios a mano.
// Cada PNG ya trae el texto y la etiqueta «Anuncio»: se muestra solo la imagen, con su texto alterno.
import { AD_SECTIONS, AD_SPACE, type AdSection } from '../domain/ad-request';
import { generatedAds } from './ads.generated';

export type { AdSection };

export type AdPiece = {
  id: string;
  /** Texto para VoiceOver (texto_alterno de Stan). */
  alt: string;
  headline: string;
  /** Ruta interna o enlace externo. Sin enlace, el anuncio no es pulsable. */
  href: string | null;
  /** require() del PNG @3x (Metro devuelve un número de asset). */
  image: number;
};

export type AdSpaceArt = {
  /** ancho / alto exacto del espacio (de los píxeles del PNG @3x). */
  aspect: number;
  ads: AdPiece[];
  /** Última lámina: «Quiero ver mi anuncio aquí». */
  cta: AdPiece;
};

export type AdCatalog = Record<AdSection, AdSpaceArt>;

export function adSpace(section: AdSection, catalog: AdCatalog = generatedAds): AdSpaceArt {
  return catalog[section];
}

/** Ancho en pt de un espacio, según el ancho disponible (las medidas de Stan son a 358 de ancho útil). */
export function adWidthFor(section: AdSection, available: number): number {
  const full = AD_SPACE[section].width >= 300;
  return full ? available : Math.round((available * AD_SPACE[section].width) / 358);
}

export { AD_SECTIONS };
