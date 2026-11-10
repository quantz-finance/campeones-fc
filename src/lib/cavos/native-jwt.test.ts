import { describe, expect, it } from 'vitest';
import {
  captureJwtFromIdentityAuthData,
  extractJwtFromAuthPayload,
  extractJwtFromCallbackUrl,
  getNativeCavosJwt,
  setNativeCavosJwt,
} from './native-jwt';

const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig';

describe('JWT nativo de Cavos', () => {
  it('lee el token de auth_data en el callback', () => {
    const url = `campeones-fc://cavos-auth?auth_data=${encodeURIComponent(JSON.stringify({ id_token: jwt }))}`;
    expect(extractJwtFromCallbackUrl(url)).toBe(jwt);
  });

  it('no inventa un token si el callback solo trae cavos_auth_code (el kit lo intercambia por dentro)', () => {
    expect(extractJwtFromCallbackUrl('campeones-fc://cavos-auth?cavos_auth_code=abc')).toBeNull();
  });

  it('lee el JWT del cuerpo de intercambio (id_token, jwt o token)', () => {
    expect(extractJwtFromAuthPayload({ id_token: jwt })).toBe(jwt);
    expect(extractJwtFromAuthPayload({ jwt })).toBe(jwt);
    expect(extractJwtFromAuthPayload({ token: jwt })).toBe(jwt);
    expect(extractJwtFromAuthPayload(JSON.stringify({ id_token: jwt }))).toBe(jwt);
    expect(extractJwtFromAuthPayload(jwt)).toBe(jwt);
    expect(extractJwtFromAuthPayload({ access_token: jwt })).toBeNull();
    expect(extractJwtFromAuthPayload('no-es-un-jwt')).toBeNull();
  });

  it('guarda el token cuando el kit llama a identityFromAuthData', () => {
    setNativeCavosJwt(null);
    expect(captureJwtFromIdentityAuthData({ id_token: jwt })).toBe(jwt);
    expect(getNativeCavosJwt()).toBe(jwt);
    setNativeCavosJwt('no-es-un-jwt');
    expect(getNativeCavosJwt()).toBeNull();
  });
});
