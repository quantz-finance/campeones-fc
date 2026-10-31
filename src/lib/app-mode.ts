// Modo de la app por cuenta: "Modo prueba" (ves el mundo demo, solo lectura) o Real (solo jugadores y partidos reales).
import type { Profile } from '../data/types';

export type AppMode = 'prueba' | 'real';

export const APP_MODES: { key: AppMode; label: string; chip: string }[] = [
  { key: 'real', label: 'Real', chip: 'REAL' },
  { key: 'prueba', label: 'Modo prueba', chip: 'MODO PRUEBA' },
];

export function appModeOf(profile: Pick<Profile, 'showDemo'> | null | undefined, local = false): AppMode {
  return local || profile?.showDemo === true ? 'prueba' : 'real';
}

export function modeChip(mode: AppMode): string {
  return APP_MODES.find((m) => m.key === mode)!.chip;
}

// Los rostros fotorrealistas del mundo demo son inventados y generados con IA.
export const AI_PHOTO_NOTE = 'Personaje ficticio. Imagen generada con IA.';
