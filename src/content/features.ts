// Banderas de funciones (cambiar aquí, una línea).
export const features = {
  /**
   * «Subir tu foto» como logo de grupo/torneo. El bucket `photos` de campeones-fc (migración 20261026030000_photos,
   * ya aplicada: público de lectura, 300 KB, webp/jpeg/png, escritura solo dueño del grupo o creador del torneo)
   * ya existe, y el botón de foto ya estaba en las pantallas de grupo y torneo. Pon false para ocultarlo.
   */
  logoPhotoUpload: true,
} as const;
