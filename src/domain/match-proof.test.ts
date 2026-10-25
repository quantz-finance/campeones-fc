import { describe, expect, it } from 'vitest';
import { anchorHash, anchorPayload, attestationMessage, canonicalJson, resultDigest, type ConfirmedResult } from './match-proof';

const base: ConfirmedResult = {
  matchId: '11111111-1111-4111-8111-111111111111',
  playerAId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  playerBId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  winnerId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  isDraw: false,
  goalsA: 3,
  goalsB: 1,
  confirmedAt: '2026-10-24T22:10:05.123456+00:00',
};

describe('hash canónico del partido', () => {
  it('JSON canónico: claves ordenadas, sin espacios, sin undefined', () => {
    expect(canonicalJson({ b: 1, a: [true, null, 'x'], c: undefined, d: { z: 1, y: 2 } })).toBe('{"a":[true,null,"x"],"b":1,"d":{"y":2,"z":1}}');
  });

  it('es estable: mismo resultado, misma huella (vector fijo)', () => {
    expect(resultDigest(base)).toBe(resultDigest({ ...base }));
    expect(resultDigest(base)).toMatch(/^[a-f0-9]{64}$/);
    // Vector calculado aparte con node:crypto sobre el JSON canónico escrito a mano.
    expect(resultDigest(base)).toBe('16bf1c6fcec59823c904036a40766894666e9428366d415c569432a724eeeffa');
  });

  it('normaliza confirmed_at (microsegundos de Postgres o Z) al mismo instante', () => {
    expect(resultDigest(base)).toBe(resultDigest({ ...base, confirmedAt: '2026-10-24T22:10:05.123Z' }));
    expect(resultDigest(base)).not.toBe(resultDigest({ ...base, confirmedAt: '2026-10-24T22:10:06.123Z' }));
  });

  it('cambia con cualquier dato del resultado', () => {
    const d = resultDigest(base);
    expect(resultDigest({ ...base, goalsA: 2 })).not.toBe(d);
    expect(resultDigest({ ...base, winnerId: base.playerBId })).not.toBe(d);
    expect(resultDigest({ ...base, matchId: '22222222-2222-4222-8222-222222222222' })).not.toBe(d);
  });

  it('el empate ignora el ganador y exige ganador si no es empate', () => {
    expect(resultDigest({ ...base, isDraw: true, winnerId: null })).toBe(resultDigest({ ...base, isDraw: true, winnerId: base.playerAId }));
    expect(() => resultDigest({ ...base, winnerId: null })).toThrow(/ganador/);
    expect(() => resultDigest({ ...base, winnerId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' })).toThrow(/ajeno/);
  });

  it('el mensaje a firmar incluye red, partido y huella', () => {
    expect(attestationMessage(base, 'testnet')).toBe(`campeones-fc:match:v1:testnet:${base.matchId}:${resultDigest(base)}`);
    expect(attestationMessage(base, 'mainnet')).not.toBe(attestationMessage(base, 'testnet'));
  });

  it('el hash anclado compromete las firmas y direcciones de los dos jugadores', () => {
    const players = [
      { role: 'a' as const, userId: base.playerAId, address: 'GA', signature: 'sigA' },
      { role: 'b' as const, userId: base.playerBId, address: 'GB', signature: 'sigB' },
    ];
    const full = anchorHash(anchorPayload(base, 'testnet', players));
    expect(full).toMatch(/^[a-f0-9]{64}$/);
    expect(anchorHash(anchorPayload(base, 'testnet', [...players].reverse()))).toBe(full);
    expect(anchorHash(anchorPayload(base, 'testnet', [players[0]]))).not.toBe(full);
    expect(anchorHash(anchorPayload(base, 'testnet', [players[0], { ...players[1], signature: 'otra' }]))).not.toBe(full);
    expect(() => anchorPayload(base, 'testnet', [{ ...players[0], userId: base.playerBId }])).toThrow();
  });
});
