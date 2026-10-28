/** Preferencia de silencio. Sin archivos de audio: ver docs/AUDIO.md. */

export const MUTE_KEY = 'campeones-fc-audio-muted';

/** Volumen por defecto: la música queda de fondo y los efectos se oyen encima. */
export const AUDIO_LEVELS = {
  master: 0.85,
  /** Por debajo de los efectos, aunque el arreglo tenga más capas. */
  music: 0.18,
  sfx: 0.62,
} as const;

type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export function readMuted(storage: StorageLike | null): boolean {
  try {
    return storage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(storage: StorageLike | null, muted: boolean) {
  try {
    storage?.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // almacenamiento bloqueado: la preferencia vive solo en memoria
  }
}
