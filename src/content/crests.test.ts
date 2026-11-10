import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GROUP_CREST_IDS, TROPHY_IDS, defaultLogo, entityPhoto, isLogoId } from './crest-ids';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const artFile = readFileSync(resolve(here, 'crests.ts'), 'utf8');
const migration = readFileSync(resolve(root, 'supabase/migrations/20261113000000_entity_logos.sql'), 'utf8');

describe('escudos y trofeos v5', () => {
  it('23 escudos y 8 trofeos, sin repetidos', () => {
    expect(new Set(GROUP_CREST_IDS).size).toBe(23);
    expect(new Set(TROPHY_IDS).size).toBe(8);
  });

  it('cada pieza tiene PNG normal y small en assets y está en el mapa de arte', () => {
    for (const [folder, ids] of [['escudos', GROUP_CREST_IDS], ['trofeos', TROPHY_IDS]] as const) {
      for (const id of ids) {
        for (const sub of ['', 'small/']) {
          const rel = `../../assets/${folder}/${sub}${id}.png`;
          expect(artFile.includes(`require('${rel}')`), rel).toBe(true);
          expect(existsSync(resolve(here, rel)), rel).toBe(true);
        }
      }
    }
  });

  it('el check de la migración coincide con la lista de la app', () => {
    const list = (name: string) => {
      const block = migration.slice(migration.indexOf(`${name}_logo_valid check`));
      const inner = block.slice(block.indexOf('logo in (') + 9, block.indexOf(')'));
      return inner.split(',').map((item) => item.trim().replace(/'/g, ''));
    };
    expect(list('groups')).toEqual([...GROUP_CREST_IDS]);
    expect(list('tournaments')).toEqual([...TROPHY_IDS]);
  });

  it('el logo por defecto es determinista y válido', () => {
    expect(defaultLogo('groups', 'abc')).toBe(defaultLogo('groups', 'abc'));
    expect(isLogoId('groups', defaultLogo('groups', 'abc'))).toBe(true);
    expect(isLogoId('tournaments', defaultLogo('tournaments', 'x'))).toBe(true);
    const spread = new Set(Array.from({ length: 60 }, (_, i) => defaultLogo('groups', `g${i}`)));
    expect(spread.size).toBeGreaterThan(10);
  });

  it('valida ids', () => {
    expect(isLogoId('groups', 'leon')).toBe(true);
    expect(isLogoId('groups', 'copa-asas')).toBe(false);
    expect(isLogoId('tournaments', 'copa-asas')).toBe(true);
    expect(isLogoId('groups', null)).toBe(false);
  });

  it('ignora las fotos-logo v2 del demo, respeta las fotos subidas', () => {
    expect(entityPhoto('https://x.supabase.co/storage/v1/object/public/photos/demo/groups/abc-v2.webp')).toBeNull();
    expect(entityPhoto('https://x.supabase.co/storage/v1/object/public/photos/groups/123/k1.webp')).toContain('/groups/123/');
    expect(entityPhoto(null)).toBeNull();
  });
});
