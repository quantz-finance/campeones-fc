import { describe, expect, it } from 'vitest';
import { decide, fitToBalance, formatUnits, netAfterFee, parseAmount, STROOPS, type MatchLite, type StakeRow } from './stake';

const A = 'GA' + 'A'.repeat(54), B = 'GB' + 'B'.repeat(54);
const base: StakeRow = {
  match_id: 'm1', status: 'locked', stake_stroops: (100n * STROOPS).toString(), contract_id: 'C' + 'X'.repeat(55),
  player_a_address: A, player_b_address: B, funded_a_tx: 'ta', funded_b_tx: 'tb',
  fund_deadline: '2026-10-25T00:30:00Z', result_deadline: '2026-10-26T00:00:00Z',
};
const m = (p: Partial<MatchLite>): MatchLite => ({ id: 'm1', player_a_id: 'ua', player_b_id: 'ub', status: 'in_progress', winner_id: null, is_draw: false, ...p });
const T0 = Date.parse('2026-10-25T00:10:00Z');
const POT = 200n * STROOPS;

describe('parseAmount', () => {
  it('parses units with up to 7 decimals', () => {
    expect(parseAmount('100')).toBe(100n * STROOPS);
    expect(parseAmount('2.5')).toBe(25_000_000n);
    expect(parseAmount(1)).toBe(STROOPS);
  });
  it('rejects bad amounts', () => {
    for (const v of ['0', '-1', '1.12345678', 'abc', '', '1e3', '5000']) expect(() => parseAmount(v)).toThrow();
  });
});

describe('decide', () => {
  it('pays the whole pot to the confirmed winner', () => {
    const d = decide(base, m({ status: 'confirmed', winner_id: 'ub' }), POT, T0);
    expect(d).toMatchObject({ action: 'settle', outcome: 'winner', distributions: [{ address: B, stroops: POT }] });
  });
  it('refunds each stake on a draw', () => {
    const d = decide(base, m({ status: 'confirmed', is_draw: true }), POT, T0);
    expect(d).toMatchObject({ action: 'settle', outcome: 'refund' });
    if (d.action === 'settle') expect(d.distributions.map((x) => x.stroops)).toEqual([100n * STROOPS, 100n * STROOPS]);
  });
  it('waits while the match is in progress and before the deadline', () => {
    expect(decide(base, m({}), POT, T0).action).toBe('wait');
    expect(decide(base, m({ status: 'disputed' }), POT, T0).action).toBe('wait');
  });
  it('refunds both when no confirmation arrives in time', () => {
    const d = decide(base, m({ status: 'disputed' }), POT, Date.parse('2026-10-26T00:00:01Z'));
    expect(d).toMatchObject({ action: 'settle', outcome: 'refund' });
  });
  it('refunds the only depositor when the funding window closes', () => {
    const s = { ...base, status: 'funding' as const, funded_b_tx: null };
    expect(decide(s, m({}), 100n * STROOPS, T0).action).toBe('wait');
    const d = decide(s, m({}), 100n * STROOPS, Date.parse('2026-10-25T00:31:00Z'));
    expect(d).toMatchObject({ action: 'settle', outcome: 'refund', distributions: [{ address: A, stroops: 100n * STROOPS }] });
  });
  it('never pays a winner unless both deposited', () => {
    const s = { ...base, status: 'funding' as const, funded_b_tx: null };
    expect(decide(s, m({ status: 'confirmed', winner_id: 'ua' }), 100n * STROOPS, T0)).toMatchObject({ outcome: 'refund' });
  });
  it('closes without a transaction when nobody deposited', () => {
    const s = { ...base, status: 'funding' as const, funded_a_tx: null, funded_b_tx: null };
    expect(decide(s, m({ status: 'cancelled' }), 0n, T0)).toMatchObject({ action: 'close', status: 'refunded' });
  });
});

describe('fitToBalance / fees', () => {
  it('distributions always sum to the escrow balance', () => {
    const d = [{ address: A, stroops: 100n * STROOPS }, { address: B, stroops: 100n * STROOPS }];
    for (const bal of [POT, POT + 3n, POT + 1_000_001n, POT - 7n]) {
      expect(fitToBalance(d, bal).reduce((s, x) => s + x.stroops, 0n)).toBe(bal);
    }
  });
  it('winner nets 99.7% of the pot after the Trustless Work fee', () => {
    expect(formatUnits(netAfterFee(POT, POT))).toBe('199.4');
  });
});
