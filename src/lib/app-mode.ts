// Modo de la app por cuenta: Datos falsos (mundo demo, sin dinero), Testnet (real, Stellar testnet), Mainnet (próximamente).
import type { Profile } from '../data/types';

export type AppMode = 'fake' | 'testnet' | 'mainnet';

export const APP_MODES: { key: AppMode; label: string; chip: string; disabled?: boolean }[] = [
  { key: 'fake', label: 'Datos falsos', chip: 'DATOS FALSOS' },
  { key: 'testnet', label: 'Testnet', chip: 'TESTNET' },
  { key: 'mainnet', label: 'Mainnet', chip: 'MAINNET', disabled: true },
];

export function appModeOf(profile: Pick<Profile, 'showDemo'> | null | undefined, local = false): AppMode {
  return local || profile?.showDemo === true ? 'fake' : 'testnet';
}

export function modeChip(mode: AppMode): string {
  return APP_MODES.find((m) => m.key === mode)!.chip;
}

// Regla 6 de Neo: los rostros fotorrealistas del mundo demo son inventados y generados con IA.
export const AI_PHOTO_NOTE = 'Personaje ficticio. Imagen generada con IA.';
