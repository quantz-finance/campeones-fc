import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { trophyCatalog } from '../content/trophies';

const here = dirname(fileURLToPath(import.meta.url));
const mapFile = resolve(here, '../content/logros-art.ts');
const source = readFileSync(mapFile, 'utf8');

function artIdFor(code: string): string {
  const match = source.match(new RegExp(`${code}: '([a-z0-9-]+)'`));
  expect(match, code).not.toBeNull();
  return match![1];
}

describe('arte de logros v5 (mapa único, reemplazable)', () => {
  it('cada logro del catálogo apunta a un sello con PNG normal y small que existen', () => {
    for (const trophy of trophyCatalog) {
      const id = artIdFor(trophy.code);
      for (const sub of ['', 'small/']) {
        const path = `../../assets/logros/${sub}${id}.png`;
        expect(source.includes(`require('${path}')`), `${id} ${sub}`).toBe(true);
        expect(existsSync(resolve(dirname(mapFile), path)), path).toBe(true);
      }
    }
  });

  it('los 13 sellos del set están mapeados', () => {
    const ids = [...source.matchAll(/require\('\.\.\/\.\.\/assets\/logros\/([a-z0-9-]+)\.png'\)/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(13);
  });

  it('ya no es arte provisional', () => {
    expect(source).toContain('logroArtIsPlaceholder = false');
  });
});
