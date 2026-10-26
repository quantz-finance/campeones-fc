import { describe, expect, it } from 'vitest';
import { clearCavosToken, currentCavosToken, persistCavosToken, persistKey, rehydrateCavosToken, sdkTokenKey, tokenState } from './token-persist';

const mem = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
};
const jwt = (exp: number) => `x.${btoa(JSON.stringify({ exp })).replace(/=+$/, '')}.y`;
const APP = 'app1';
const NOW = 1_800_000_000;

describe('sesión de Cavos persistente', () => {
  it('reabrir la app (sessionStorage vacío) repone el token guardado', () => {
    const stores = { session: mem(), local: mem() };
    stores.session.setItem(sdkTokenKey(APP), jwt(NOW + 3000));
    persistCavosToken(APP, stores, NOW);
    stores.session.m.clear(); // iOS cerró la app
    expect(rehydrateCavosToken(APP, stores, NOW + 60)).toBe('restored');
    expect(stores.session.getItem(sdkTokenKey(APP))).toBe(jwt(NOW + 3000));
  });
  it('un token vencido hace poco sigue sirviendo para reconectar; uno muy viejo se descarta', () => {
    expect(tokenState(jwt(NOW - 3600), NOW)).toBe('renewable');
    const stores = { session: mem(), local: mem() };
    stores.local.setItem(persistKey(APP), jwt(NOW - 8 * 86400));
    expect(rehydrateCavosToken(APP, stores, NOW)).toBe('expired');
    expect(stores.local.getItem(persistKey(APP))).toBeNull();
  });
  it('no pisa un token más nuevo de la pestaña y se borra al cerrar sesión', () => {
    const stores = { session: mem(), local: mem() };
    stores.local.setItem(persistKey(APP), jwt(NOW + 100));
    stores.session.setItem(sdkTokenKey(APP), jwt(NOW + 3000));
    expect(rehydrateCavosToken(APP, stores, NOW)).toBe('present');
    expect(currentCavosToken(APP, stores, NOW)).toBe(jwt(NOW + 3000));
    clearCavosToken(APP, stores);
    expect(currentCavosToken(APP, stores, NOW)).toBeNull();
  });
});
