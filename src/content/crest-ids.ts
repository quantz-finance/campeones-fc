// Ids de los escudos (grupos) y trofeos (torneos) del set v5, sin imágenes (lo usan el dominio, la base y las pruebas).
// Deben coincidir con el check de supabase/migrations/20261113000000_entity_logos.sql (lo verifica crests.test.ts).
export const GROUP_CREST_IDS = ['leon', 'aguila', 'toro', 'lobo', 'corona', 'rayo', 'balon', 'llama', 'estrella', 'montana', 'ola', 'cohete', 'tigre', 'caballo', 'oso', 'halcon', 'dragon', 'tiburon', 'pantera', 'jaguar', 'castillo', 'espadas-cruzadas', 'balon-alado'] as const;
export const TROPHY_IDS = ['copa-clasica', 'copa-asas', 'copa-grande', 'escudo', 'medalla', 'cinturon', 'trofeo-estrella', 'laurel'] as const;

export type GroupCrestId = (typeof GROUP_CREST_IDS)[number];
export type TrophyId = (typeof TROPHY_IDS)[number];
export type LogoKind = 'groups' | 'tournaments';

export function logoIds(kind: LogoKind): readonly string[] {
  return kind === 'groups' ? GROUP_CREST_IDS : TROPHY_IDS;
}

export function isLogoId(kind: LogoKind, value: unknown): value is string {
  return typeof value === 'string' && logoIds(kind).includes(value);
}

/** Hash estable (FNV-1a de 32 bits) para elegir un logo por defecto que no cambia entre sesiones ni dispositivos. */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Logo por defecto, determinista por id (si el grupo o torneo nunca eligió uno o la columna aún no existe). */
export function defaultLogo(kind: LogoKind, entityId: string): string {
  const ids = logoIds(kind);
  return ids[stableHash(entityId) % ids.length];
}

// Fotos de demo de la v2 (escudos caricaturescos generados antes del set v5). Se ignoran para que el mundo de
// demostración y el modo espectador muestren los escudos v5. Las fotos que sube la gente se respetan siempre.
const LEGACY_DEMO_LOGO = /\/storage\/v1\/object\/public\/photos\/demo\/(groups|tournaments)\//;

export function isLegacyDemoLogo(photoUrl?: string | null): boolean {
  return Boolean(photoUrl && LEGACY_DEMO_LOGO.test(photoUrl));
}

/** Foto propia que manda sobre el escudo (null si no hay o si es un logo de demo antiguo). */
export function entityPhoto(photoUrl?: string | null): string | null {
  return photoUrl && !isLegacyDemoLogo(photoUrl) ? photoUrl : null;
}
