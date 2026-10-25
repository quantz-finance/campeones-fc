// El script público (sin dependencias) tiene que dar exactamente lo mismo que el código de la app.
import { describe, expect, it } from 'vitest';
import { playElo, freshElo, type EloState } from '../../src/domain/elo';
import { canonicalJson as appCanonical, resultDigest as appDigest, resultObject } from '../../src/domain/match-proof';
import { dailyRecord, merkleProof, merkleRoot as appRoot, recordHash as appRecordHash } from '../../src/domain/merkle';
// @ts-ignore módulo .mjs sin tipos
import { canonicalJson, merkleRoot, recordHash, replayElo, resultDigest, rootFromProof } from './lib.mjs';

const players = ['aaaaaaaa-0000-4000-8000-000000000001', 'aaaaaaaa-0000-4000-8000-000000000002', 'aaaaaaaa-0000-4000-8000-000000000003'];
function results(n: number) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
  return Array.from({ length: n }, (_, i) => {
    const a = players[i % 3];
    const b = players[(i + 1 + (rnd() < 0.5 ? 0 : 1)) % 3];
    const ga = Math.floor(rnd() * 5);
    const gb = Math.floor(rnd() * 5);
    return resultObject({
      matchId: `bbbbbbbb-0000-4000-8000-${String(i).padStart(12, '0')}`,
      playerAId: a,
      playerBId: b,
      winnerId: ga === gb ? null : ga > gb ? a : b,
      isDraw: ga === gb,
      goalsA: ga,
      goalsB: gb,
      confirmedAt: new Date(Date.UTC(2026, 4, 1) + i * 3_600_000).toISOString(),
    });
  });
}

describe('scripts/chain/lib.mjs', () => {
  const rs = results(120);
  it('JSON canónico, huellas, raíz y acta iguales', () => {
    expect(canonicalJson(rs[0])).toBe(appCanonical(rs[0]));
    const ds = rs.map((r) => appDigest({ matchId: r.match_id, playerAId: r.player_a, playerBId: r.player_b, winnerId: r.winner, isDraw: r.draw, goalsA: r.goals_a, goalsB: r.goals_b, confirmedAt: r.confirmed_at }));
    expect(rs.map(resultDigest)).toEqual(ds);
    expect(merkleRoot(ds)).toBe(appRoot(ds));
    expect(rootFromProof(ds[17], merkleProof(ds, 17))).toBe(appRoot(ds));
    const rec = dailyRecord({ network: 'testnet', day: '2026-05-01', resultDigests: ds, prev: null });
    expect(recordHash(rec)).toBe(appRecordHash(rec));
  });

  it('el Elo recalculado es el de src/domain/elo.ts', () => {
    const st: Record<string, EloState> = {};
    for (const r of rs) {
      const a = st[r.player_a] ?? freshElo();
      const b = st[r.player_b] ?? freshElo();
      const p = playElo(a, b, r.draw ? 0.5 : r.winner === r.player_a ? 1 : 0);
      st[r.player_a] = p.a;
      st[r.player_b] = p.b;
    }
    expect(replayElo([...rs].reverse())).toEqual(st);
  });
});
