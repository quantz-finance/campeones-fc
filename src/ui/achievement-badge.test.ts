import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { trophyCatalog } from '../content/trophies';

const here = dirname(fileURLToPath(import.meta.url));
const mapFile = resolve(here, '../content/logros-art.ts');
const source = readFileSync(mapFile, 'utf8');

describe('arte de logros v7 (dorado y bloqueado grafito lila)', () => {
  it('cada logro del catálogo tiene PNG normal, small, lock y lock-small', () => {
    expect(trophyCatalog).toHaveLength(24);
    for (const trophy of trophyCatalog) {
      const id = trophy.code;
      for (const sub of ['', 'small/', 'lock/', 'lock-small/']) {
        const path = `../../assets/logros/${sub}${id}.png`;
        expect(source.includes(`require('${path}')`), `${id} ${sub}`).toBe(true);
        expect(existsSync(resolve(dirname(mapFile), path)), path).toBe(true);
      }
    }
  });

  it('los 24 sellos del set están mapeados', () => {
    const normal = [...source.matchAll(/assets\/logros\/([a-z0-9-]+)\.png/g)].map((m) => m[1]);
    expect(new Set(normal).size).toBe(24);
  });

  it('ya no es arte provisional', () => {
    expect(source).toContain('logroArtIsPlaceholder = false');
  });
});
