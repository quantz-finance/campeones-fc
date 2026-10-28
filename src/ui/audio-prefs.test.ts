import { describe, expect, test } from 'vitest';
import { AUDIO_LEVELS, MUTE_KEY, readMuted, writeMuted } from './audio-prefs';

describe('preferencia de audio', () => {
  test('empieza con sonido y recuerda el silencio', () => {
    const mem = new Map<string, string>();
    const storage = {
      getItem: (key: string) => mem.get(key) ?? null,
      setItem: (key: string, value: string) => {
        mem.set(key, value);
      },
    };
    expect(readMuted(storage)).toBe(false);
    writeMuted(storage, true);
    expect(mem.get(MUTE_KEY)).toBe('1');
    expect(readMuted(storage)).toBe(true);
    writeMuted(storage, false);
    expect(readMuted(storage)).toBe(false);
  });

  test('si el almacenamiento falla, no rompe', () => {
    const storage = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('bloqueado');
      },
    };
    expect(readMuted(storage)).toBe(false);
    expect(() => writeMuted(storage, true)).not.toThrow();
  });

  test('la música queda por debajo de los efectos', () => {
    expect(AUDIO_LEVELS.music).toBeLessThan(AUDIO_LEVELS.sfx);
    expect(AUDIO_LEVELS.master).toBeLessThanOrEqual(1);
    expect(AUDIO_LEVELS.music).toBeGreaterThan(0);
  });
});
