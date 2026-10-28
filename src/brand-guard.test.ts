import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { branding } from '../config/branding';

const root = fileURLToPath(new URL('..', import.meta.url));
const skip = new Set(['node_modules', '.git', 'dist', '.expo', 'agent-tools', 'assets']);

function files(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (skip.has(entry) || entry === 'package-lock.json' || entry === 'brand-guard.test.ts') continue;
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...files(path));
    else if (/\.(ts|tsx|json|md|html|sql|js|mjs)$/.test(entry)) out.push(path);
  }
  return out;
}

describe('marca', () => {
  it('no usa marcas ajenas ni el voseo', () => {
    const forbidden = [
      /\bFIFA\b/i,
      /EA\s*SPORTS/i,
      /\bEASPORTS\b/i,
      /\bEAFC\b/i,
      /\bEA\s+FC\b/i,
      /\bUEFA\b/i,
      /\bChampions\b/,
      /\btenés\b/i,
      /\bpodés\b/i,
      /\bquerés\b/i,
      /\bjugás\b/i,
      /\bhacé\b/i,
      /\bmirá\b/i,
    ];
    const extra = [/Champions League/i, /Liga de Campeones/i, /Copa de Campeones/i, /Mortal Kombat/i, /Warner Bros/i];
    const hits: string[] = [];
    for (const path of files(root)) {
      const text = readFileSync(path, 'utf8').split(branding.disclaimer).join('');
      for (const pattern of [...forbidden, ...extra]) {
        if (pattern.test(text)) hits.push(`${path} coincide con ${pattern}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('deja el aviso de no afiliación en el login y en el perfil', () => {
    expect(branding.disclaimer).toBe('No afiliado a EA, Warner Bros., FIFA ni UEFA.');
    const login = readFileSync(join(root, 'src/app/entrar.tsx'), 'utf8');
    const perfil = readFileSync(join(root, 'src/app/(app)/(tabs)/perfil.tsx'), 'utf8');
    expect(login).toContain('Affiliation');
    expect(perfil).toContain('Affiliation');
  });

  it('mantiene el nombre en la configuración única', () => {
    expect(branding.name).toBe('Campeones FC');
    expect(branding.slug).toBe('campeones-fc');
    expect(branding.demoEmailDomain).toBe('demo.campeonesfc');
    expect(branding.company).toBe('Quantz');
    expect(branding.tagline).toContain('cada partido');
  });

  it('apunta a las cuentas reales de Instagram y X', () => {
    expect(branding.social.instagram).toBe('https://instagram.com/campeones.app');
    expect(branding.social.x).toBe('https://x.com/campeonesapp');
  });
});
