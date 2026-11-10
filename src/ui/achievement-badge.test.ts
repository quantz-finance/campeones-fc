import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { trophyCatalog } from '../content/trophies';

const here = dirname(fileURLToPath(import.meta.url));
const mapFile = resolve(here, '../content/logros-art.ts');

describe('arte de logros (mapa único, reemplazable)', () => {
  it('cada logro del catálogo apunta a un PNG que existe', () => {
    const source = readFileSync(mapFile, 'utf8');
    for (const trophy of trophyCatalog) {
      const match = source.match(new RegExp(`${trophy.code}: require\\('([^']+)'\\)`));
      expect(match, trophy.code).not.toBeNull();
      expect(existsSync(resolve(dirname(mapFile), match![1]))).toBe(true);
    }
  });
});
