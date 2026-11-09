import { describe, expect, it } from 'vitest';
import { OWN_DOMAIN, resolveRpId } from './rp-id';

const ENV = 'campeones-fc.vercel.app';

describe('rpId según el dominio', () => {
  it('dominio propio y sus subdominios -> campeonesfc.app', () => {
    expect(resolveRpId('campeonesfc.app', ENV)).toBe(OWN_DOMAIN);
    expect(resolveRpId('partido.campeonesfc.app', ENV)).toBe(OWN_DOMAIN);
    expect(resolveRpId('www.campeonesfc.app', ENV)).toBe(OWN_DOMAIN);
    expect(resolveRpId('PARTIDO.CampeonesFC.app.', ENV)).toBe(OWN_DOMAIN);
  });
  it('vercel, previews y otros hosts -> el del entorno', () => {
    expect(resolveRpId('campeones-fc.vercel.app', ENV)).toBe(ENV);
    expect(resolveRpId('campeones-abc123-quantz4.vercel.app', ENV)).toBe(ENV);
    expect(resolveRpId('localhost', ENV)).toBe(ENV);
  });
  it('no se deja engañar por hosts parecidos', () => {
    expect(resolveRpId('evilcampeonesfc.app', ENV)).toBe(ENV);
    expect(resolveRpId('campeonesfc.app.evil.com', ENV)).toBe(ENV);
  });
  it('sin host (nativo/SSR) -> el del entorno', () => {
    expect(resolveRpId(undefined, ENV)).toBe(ENV);
    expect(resolveRpId(null, ENV)).toBe(ENV);
    expect(resolveRpId('', ENV)).toBe(ENV);
  });
});
