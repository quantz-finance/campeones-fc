import { describe, expect, it } from 'vitest';
import { sha256Hex } from './match-proof';
import { dailyRecord, dayOf, dayRange, EMPTY_ROOT, leafHash, merkleProof, merkleRoot, nextDay, nodeHash, recordHash, rootFromProof } from './merkle';

const d = (n: number) => sha256Hex(`r${n}`);

describe('merkle', () => {
  it('raíz de 0, 1, 2 y 3 hojas', () => {
    expect(merkleRoot([])).toBe(EMPTY_ROOT);
    expect(merkleRoot([d(1)])).toBe(leafHash(d(1)));
    expect(merkleRoot([d(1), d(2)])).toBe(nodeHash(leafHash(d(1)), leafHash(d(2))));
    expect(merkleRoot([d(1), d(2), d(3)])).toBe(nodeHash(nodeHash(leafHash(d(1)), leafHash(d(2))), leafHash(d(3))));
  });

  it('la prueba de cada hoja da la raíz, y cambiar un resultado la rompe', () => {
    for (const n of [1, 2, 3, 5, 8, 13]) {
      const ds = Array.from({ length: n }, (_, i) => d(i));
      const root = merkleRoot(ds);
      ds.forEach((x, i) => expect(rootFromProof(x, merkleProof(ds, i))).toBe(root));
      expect(rootFromProof(d(999), merkleProof(ds, 0))).not.toBe(root);
    }
  });

  it('el día del acta es hora de Costa Rica (UTC-6)', () => {
    expect(dayOf('2026-10-25T05:59:59.999Z')).toBe('2026-10-24');
    expect(dayOf('2026-10-25T06:00:00.000Z')).toBe('2026-10-25');
    expect(dayRange('2026-10-24')).toEqual({ from: '2026-10-24T06:00:00.000Z', to: '2026-10-25T06:00:00.000Z' });
    expect(nextDay('2026-12-31')).toBe('2027-01-01');
  });

  it('el acta se encadena con la anterior', () => {
    const a = dailyRecord({ network: 'testnet', day: '2026-10-23', resultDigests: [d(1)], prev: null });
    const b = dailyRecord({ network: 'testnet', day: '2026-10-24', resultDigests: [], prev: recordHash(a) });
    expect(b.prev).toBe(recordHash(a));
    expect(b.root).toBe(EMPTY_ROOT);
    expect(recordHash(b)).toMatch(/^[a-f0-9]{64}$/);
    expect(() => dailyRecord({ network: 'testnet', day: '2026-10-24', resultDigests: [], prev: 'x' })).toThrow();
  });
});
