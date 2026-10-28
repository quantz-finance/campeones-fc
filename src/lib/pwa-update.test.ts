import { describe, expect, test } from 'vitest';
import { shouldReloadForUpdate, SW_RELOAD_WINDOW_MS } from './pwa-update';

describe('actualización de la PWA', () => {
  test('la primera instalación no recarga', () => {
    expect(shouldReloadForUpdate(false, null, 1_000)).toBe(false);
  });

  test('un worker nuevo, con uno ya activo, sí recarga', () => {
    expect(shouldReloadForUpdate(true, null, 5_000)).toBe(true);
  });

  test('no recarga otra vez dentro de la ventana', () => {
    const now = 20_000;
    expect(shouldReloadForUpdate(true, now - 1_000, now)).toBe(false);
    expect(shouldReloadForUpdate(true, now - SW_RELOAD_WINDOW_MS, now)).toBe(true);
  });
});
