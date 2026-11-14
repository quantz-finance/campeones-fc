import { beforeEach, describe, expect, test } from 'vitest';
import { clearQueryCache, depsSignature, fetchShared, prefetchQuery, readCached, sameData } from './query-cache';

describe('caché de consultas', () => {
  beforeEach(() => clearQueryCache());

  test('la firma usa valores para primitivos e identidad para objetos', () => {
    const repo = {};
    expect(depsSignature([repo, 'u1', 3])).toBe(depsSignature([repo, 'u1', 3]));
    expect(depsSignature([repo, 'u1', 3])).not.toBe(depsSignature([repo, 'u1', 4]));
    expect(depsSignature([{}, 'u1'])).not.toBe(depsSignature([{}, 'u1']));
    expect(depsSignature([null, undefined])).not.toBe(depsSignature(['null', 'undefined']));
  });

  test('dos pantallas con la misma llave y firma comparten una sola carga', async () => {
    let calls = 0;
    const load = () => new Promise<number>((resolve) => setTimeout(() => resolve(++calls), 5));
    const [a, b] = await Promise.all([fetchShared('k', 's1', load), fetchShared('k', 's1', load)]);
    expect(calls).toBe(1);
    expect(a).toBe(b);
    expect(readCached('k')).toEqual({ sig: 's1', data: 1 });
  });

  test('un resultado igual conserva la referencia anterior (sin repintar)', async () => {
    const first = await fetchShared('k', 's1', async () => ({ rows: [1, 2] }));
    const second = await fetchShared('k', 's2', async () => ({ rows: [1, 2] }));
    expect(second).toBe(first);
    expect(readCached('k')?.sig).toBe('s2');
    const third = await fetchShared('k', 's3', async () => ({ rows: [1, 2, 3] }));
    expect(third).not.toBe(first);
  });

  test('la precarga no repite si ya está al día y no rompe si falla', async () => {
    const repo = {};
    let calls = 0;
    await prefetchQuery('p', [repo, 1], async () => ++calls);
    await prefetchQuery('p', [repo, 1], async () => ++calls);
    expect(calls).toBe(1);
    await prefetchQuery('p', [repo, 2], async () => ++calls);
    expect(calls).toBe(2);
    await expect(prefetchQuery('x', [repo], async () => Promise.reject(new Error('sin red')))).resolves.toBeUndefined();
    expect(readCached('x')).toBeUndefined();
  });

  test('igualdad estructural', () => {
    expect(sameData({ a: [1] }, { a: [1] })).toBe(true);
    expect(sameData({ a: [1] }, { a: [2] })).toBe(false);
    expect(sameData(null, { a: 1 })).toBe(false);
  });
});
