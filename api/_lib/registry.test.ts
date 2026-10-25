import { describe, expect, it } from 'vitest';
import { assertRegisteredWallet, registryAddress, type RegistryConfig, type RegistryFetch } from './registry';

const cfg: RegistryConfig = { baseUrl: 'https://cavos.xyz', appId: 'app-1', network: 'testnet', environment: 'production' };
const A = 'GCV7BH45ZTACITJKW7VR5YZ5JGXKXOHGRNJ4E5MVHD77WP6G7ZWNNBCP';
const B = 'GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H';

const reply = (status: number, body: unknown, seen?: string[]): RegistryFetch => async (url, init) => {
  seen?.push(url, init.headers.Authorization);
  return { ok: status < 300, status, json: async () => body };
};

describe('registro de Cavos', () => {
  it('consulta con el token del usuario, el appId, la red y el entorno', async () => {
    const seen: string[] = [];
    expect(await registryAddress(cfg, 'tok', 'sub-1', reply(200, { found: true, address: A }, seen))).toBe(A);
    const u = new URL(seen[0]);
    expect(u.pathname).toBe('/api/wallets');
    expect(Object.fromEntries(u.searchParams)).toEqual({ app_id: 'app-1', user_social_id: 'sub-1', network: 'stellar-testnet', environment: 'production' });
    expect(seen[1]).toBe('Bearer tok');
  });

  it('acepta solo la billetera registrada', async () => {
    await expect(assertRegisteredWallet(cfg, 't', 's', A, reply(200, { found: true, address: A }))).resolves.toBeUndefined();
    await expect(assertRegisteredWallet(cfg, 't', 's', A, reply(200, { found: true, address: B }))).rejects.toMatchObject({ status: 401, code: 'wallet_mismatch' });
    await expect(assertRegisteredWallet(cfg, 't', 's', A, reply(200, { found: false }))).rejects.toMatchObject({ code: 'wallet_not_registered' });
  });

  it('falla cerrado si Cavos rechaza el token o no responde', async () => {
    await expect(assertRegisteredWallet(cfg, 't', 's', A, reply(401, {}))).rejects.toMatchObject({ status: 401, code: 'registry_unauthorized' });
    await expect(assertRegisteredWallet(cfg, 't', 's', A, reply(500, {}))).rejects.toMatchObject({ status: 503 });
    const boom: RegistryFetch = async () => {
      throw new Error('net');
    };
    await expect(assertRegisteredWallet(cfg, 't', 's', A, boom)).rejects.toMatchObject({ status: 503, code: 'registry_unreachable' });
  });
});
