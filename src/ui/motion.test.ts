import { describe, expect, test } from 'vitest';
import { formatRoll, renderRoll, rollTarget, staggerDelay, EXIT_TOTAL_MS, EXIT_MS } from './motion-tokens';

describe('movimiento', () => {
  test('escalona y se detiene en el tope', () => {
    expect(staggerDelay(0)).toBe(0);
    expect(staggerDelay(2, 10, 4)).toBe(20);
    expect(staggerDelay(9, 10, 4)).toBe(40);
    expect(staggerDelay(-3, 10, 4)).toBe(0);
  });

  test('la salida dura lo bastante para el último elemento', () => {
    expect(EXIT_TOTAL_MS).toBeGreaterThan(EXIT_MS);
  });

  test('cuenta cifras simples y deja quieto el resto', () => {
    expect(rollTarget('64%')).toMatchObject({ target: 64, suffix: '%', decimals: 0 });
    expect(rollTarget('1,5')).toMatchObject({ target: 1.5, decimalComma: true, decimals: 1 });
    expect(rollTarget('1 200')).toBeNull();
    expect(rollTarget('VS')).toBeNull();
    expect(renderRoll('64%', 0)).toBe('0%');
    expect(renderRoll('64%', 1)).toBe('64%');
    expect(formatRoll(1.5, 1, 1, true)).toBe('1,5');
    expect(renderRoll('VS', 0.4)).toBe('VS');
  });
});
