import { describe, expect, it } from 'vitest';
import { cleanSocialLinks, isStoredSocial, normalizeSocial, socialHandle } from './social';

const ok = (n: Parameters<typeof normalizeSocial>[0], v: string) => {
  const r = normalizeSocial(n, v);
  if (!r.ok) throw new Error(r.error);
  return r.value;
};

describe('redes sociales', () => {
  it('normaliza @usuario y enlaces al enlace canónico https', () => {
    expect(ok('tiktok', '@demo_andres')).toBe('https://www.tiktok.com/@demo_andres');
    expect(ok('tiktok', 'https://www.tiktok.com/@demo.andres?lang=es')).toBe('https://www.tiktok.com/@demo.andres');
    expect(ok('instagram', 'instagram.com/demo_andres/')).toBe('https://www.instagram.com/demo_andres');
    expect(ok('youtube', '@DemoAndres')).toBe('https://www.youtube.com/@DemoAndres');
    expect(ok('youtube', 'https://youtube.com/channel/UCabcdefghijklmnopqrstuv')).toBe('https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv');
    expect(ok('twitch', 'http://twitch.tv/demo_andres')).toBe('https://www.twitch.tv/demo_andres');
    expect(ok('kick', 'demo_andres')).toBe('https://kick.com/demo_andres');
    expect(ok('x', 'https://twitter.com/demo_andres')).toBe('https://x.com/demo_andres');
    expect(ok('discord', '@Demo_Andres')).toBe('demo_andres');
    expect(ok('x', '  ')).toBeNull();
  });
  it('rechaza otros dominios, esquemas y usuarios inválidos', () => {
    expect(normalizeSocial('instagram', 'https://evil.com/demo').ok).toBe(false);
    expect(normalizeSocial('x', 'javascript:alert(1)').ok).toBe(false);
    expect(normalizeSocial('x', 'https://x.com.evil.com/demo').ok).toBe(false);
    expect(normalizeSocial('x', 'nombre con espacios').ok).toBe(false);
    expect(normalizeSocial('twitch', 'abc').ok).toBe(false);
    expect(normalizeSocial('instagram', 'https://www.instagram.com/p/xyz').ok).toBe(false);
    expect(normalizeSocial('youtube', 'https://www.youtube.com/watch?v=abc').ok).toBe(false);
    expect(normalizeSocial('tiktok', 'https://user:pw@tiktok.com/@demo').ok).toBe(false);
  });
  it('limpia lo que viene de la base y muestra @usuario', () => {
    const links = cleanSocialLinks({ x: 'https://x.com/demo_andres', instagram: 'https://evil.com/x', foo: 'bar', kick: 3 });
    expect(links).toEqual({ x: 'https://x.com/demo_andres' });
    expect(cleanSocialLinks(null)).toEqual({});
    expect(isStoredSocial('tiktok', 'https://www.tiktok.com/@demo_andres')).toBe(true);
    expect(socialHandle('x', 'https://x.com/demo_andres')).toBe('@demo_andres');
    expect(socialHandle('tiktok', 'https://www.tiktok.com/@demo_andres')).toBe('@demo_andres');
  });
});
