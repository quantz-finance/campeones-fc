// Trustless Work mockeado (sin red): forma de los pedidos y configuración.
import { Keypair } from '@stellar/stellar-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fundEscrowXdr, stakeRoles } from './tw';

const platform = Keypair.random(), resolver = Keypair.random();
beforeEach(() => {
  vi.stubEnv('STELLAR_NETWORK', 'testnet');
  vi.stubEnv('PLATFORM_PUBLIC', platform.publicKey());
  vi.stubEnv('STAKE_RESOLVER_SECRET', resolver.secret());
  vi.stubEnv('TRUSTLESS_WORK_API_KEY', 'test-key');
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('Trustless Work client (mocked)', () => {
  it('platform holds every role except the dispute resolver', () => {
    const r = stakeRoles();
    expect(r.approver).toBe(platform.publicKey());
    expect(r.receiver).toBe(platform.publicKey());
    expect(r.disputeResolver).toBe(resolver.publicKey());
  });
  it('refuses a resolver equal to the platform', () => {
    vi.stubEnv('STAKE_RESOLVER_SECRET', platform.secret());
    expect(() => stakeRoles()).toThrow(/otra cuenta/);
  });
  it('builds fund-escrow with the player as signer and the x-api-key header', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ unsignedTransaction: 'AAAA' }), { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    const player = Keypair.random().publicKey();
    expect(await fundEscrowXdr('CABC', player, 10)).toBe('AAAA');
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://dev.api.trustlesswork.com/escrow/single-release/fund-escrow');
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('test-key');
    expect(JSON.parse(String(init.body))).toEqual({ contractId: 'CABC', signer: player, amount: 10 });
  });
  it('fails closed without an API key or on mainnet', async () => {
    vi.stubEnv('TRUSTLESS_WORK_API_KEY', '');
    await expect(fundEscrowXdr('CABC', 'G', 1)).rejects.toMatchObject({ code: 'config_missing' });
    vi.stubEnv('TRUSTLESS_WORK_API_KEY', 'k');
    vi.stubEnv('STELLAR_NETWORK', 'mainnet');
    await expect(fundEscrowXdr('CABC', 'G', 1)).rejects.toMatchObject({ code: 'testnet_only' });
  });
});
