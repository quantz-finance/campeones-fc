import { describe, expect, it } from 'vitest';
import { extractJwtFromCallbackUrl, getNativeCavosJwt, setNativeCavosJwt } from './native-jwt';

const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig';

describe('JWT nativo de Cavos', () => {
  it('lee el token de auth_data en el callback', () => {
    const url = `campeones-fc://cavos-auth?auth_data=${encodeURIComponent(JSON.stringify({ id_token: jwt }))}`;
    expect(extractJwtFromCallbackUrl(url)).toBe(jwt);
  });

  it('no inventa un token si el callback solo trae cavos_auth_code (el kit lo intercambia por dentro)', () => {
    expect(extractJwtFromCallbackUrl('campeones-fc://cavos-auth?cavos_auth_code=abc')).toBeNull();
  });

  it('guarda y limpia el token en memoria', () => {
    setNativeCavosJwt(jwt);
    expect(getNativeCavosJwt()).toBe(jwt);
    setNativeCavosJwt('no-es-un-jwt');
    expect(getNativeCavosJwt()).toBeNull();
  });
});
