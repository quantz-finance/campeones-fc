import { describe, expect, test } from 'vitest';
import { tabBarVisible, toastBottom } from './toast-place';

describe('posición del aviso', () => {
  test('sube el aviso cuando hay barra', () => {
    expect(tabBarVisible('/inicio')).toBe(true);
    expect(tabBarVisible('/grupo/abc')).toBe(true);
    expect(tabBarVisible('/torneo/copa')).toBe(true);
    expect(tabBarVisible('/grupo/nuevo')).toBe(false);
    expect(tabBarVisible('/torneo/nuevo')).toBe(false);
    expect(tabBarVisible('/partido/1')).toBe(false);
    expect(tabBarVisible('/amigos')).toBe(false);
  });

  test('usa píxeles enteros y deja aire bajo el aviso', () => {
    expect(toastBottom('/inicio', 34)).toBe(64 + 34 + 8);
    expect(toastBottom('/inicio', 0)).toBe(64 + 10 + 8);
    expect(toastBottom('/amigos', 34)).toBe(34 + 8);
    expect(toastBottom('/partido/1', 0)).toBe(20);
    expect(Number.isInteger(toastBottom('/inicio', 34.6))).toBe(true);
  });
});