// Rutas que el espectador puede abrir (solo lectura). Lo demás muestra la invitación a crear perfil.
const READ_ONLY_TABS = new Set(['inicio', 'grupos', 'jugar', 'torneos', 'perfil']);

/** segments de expo-router, p. ej. ['(app)', '(tabs)', 'inicio'] o ['(app)', 'grupo', '[id]']. */
export function spectatorAllows(segments: string[]): boolean {
  const parts = segments.filter((part) => !part.startsWith('('));
  const [first, second] = parts;
  if (!first) return true;
  if (parts.length === 1) return READ_ONLY_TABS.has(first);
  if (first === 'grupo' || first === 'torneo' || first === 'partido') return second !== 'nuevo';
  return false;
}
