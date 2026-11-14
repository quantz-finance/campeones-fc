import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { AD_SECTIONS, AD_SPACE } from '../domain/ad-request';

// ads.generated.ts usa require() de PNG (Metro). Aquí se revisa su texto, sin importarlo.
const generated = readFileSync(new URL('./ads.generated.ts', import.meta.url), 'utf8');

describe('catálogo de anuncios (arte de Stan)', () => {
  it('cada espacio tiene 4 anuncios y la CTA', () => {
    for (const section of AD_SECTIONS) {
      const block = generated.split(`"${section}": {`)[1]?.split('\n  },')[0] ?? '';
      expect(block.match(/^\s{6}\{ id:/gm)?.length, section).toBe(4);
      expect(block).toMatch(/cta: \{ id: "[a-z0-9-]+-quiero-mi-anuncio"/);
    }
  });
  it('la proporción de cada espacio coincide con su medida en pt', () => {
    for (const section of AD_SECTIONS) {
      const aspect = Number(generated.split(`"${section}": {`)[1].match(/aspect: ([\d.]+)/)?.[1]);
      expect(Math.abs(aspect - AD_SPACE[section].width / AD_SPACE[section].height), section).toBeLessThan(0.01);
    }
  });
  it('todas las piezas traen texto alterno para VoiceOver y ningún precio ni «gratis»', () => {
    expect(generated.match(/alt: ""/g)).toBeNull();
    expect(/gratis|\$|₡|descuento|apuesta/i.test(generated)).toBe(false);
  });
  it('los anuncios de la casa llevan a una pantalla de la app', () => {
    expect(generated).toMatch(/registra-partido".*href: "\/jugar"/);
    expect(generated).toMatch(/inicio-ficha-4-de-la-casa".*href: "\/grupo\/nuevo"/);
    expect(generated).toMatch(/inicio-copas-4-de-la-casa".*href: "\/torneo\/nuevo"/);
  });
});
