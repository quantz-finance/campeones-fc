import { describe, expect, it, vi } from 'vitest';
vi.mock('./config', () => ({ STELLAR_NETWORK: 'testnet', CAVOS_APP_ID: 'app' }));
vi.mock('../supabase', () => ({ getSupabase: () => null }));
vi.mock('../api', () => ({ ApiError: class extends Error {}, apiPost: vi.fn() }));
vi.mock('./login-path', () => ({ loginPath: () => '/entrar', tokenExpired: () => false }));
import { needsCavosLogin, withCavosSigner } from './session';
import { cavosStore, type CavosBridged } from './store';

const bridged = (over: Partial<CavosBridged>): CavosBridged =>
  ({
    isLoading: false, isAuthenticated: true, address: 'GABC', email: 'a@b.co', error: null,
    wallet: { ready: true, undeployed: false, needsApproval: false, hasPasskey: false, deploying: false },
    openModal: vi.fn(), logout: vi.fn(async () => undefined), approveDevice: vi.fn(async () => undefined),
    ...over,
  }) as unknown as CavosBridged;

describe('re-login de Cavos al firmar', () => {
  it('reconoce errores de sesión del kit', () => {
    expect(needsCavosLogin(new Error('Not logged in'))).toBe(true);
    expect(needsCavosLogin(Object.assign(new Error('x'), { raw: 'registry lookup failed: 401' }))).toBe(true);
    expect(needsCavosLogin(Object.assign(new Error('x'), { code: 'not_signer' }))).toBe(true);
    expect(needsCavosLogin(new Error('El partido no está confirmado'))).toBe(false);
  });

  it('si la firma falla por sesión: abre el login aquí y reintenta sola', async () => {
    const stale = bridged({});
    stale.openModal = vi.fn(() => setTimeout(() => cavosStore.setBridged(bridged({ address: 'GABC' })), 5));
    cavosStore.setBridged(stale);
    let calls = 0;
    const out = await withCavosSigner(async () => {
      calls += 1;
      if (calls === 1) throw Object.assign(new Error('Tu sesión de Cavos terminó'), { raw: 'Not logged in' });
      return 'firmado';
    });
    expect(out).toBe('firmado');
    expect(calls).toBe(2);
    expect(stale.logout).toHaveBeenCalled();
    expect(stale.openModal).toHaveBeenCalled();
  });

  it('otros errores no abren el login', async () => {
    const b = bridged({});
    cavosStore.setBridged(b);
    await expect(withCavosSigner(async () => { throw new Error('saldo insuficiente'); })).rejects.toThrow('saldo');
    expect(b.openModal).not.toHaveBeenCalled();
  });
});
