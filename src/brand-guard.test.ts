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
      /\btenés\b/i,
      /\bpodés\b/i,
      /\bquerés\b/i,
      /\bjugás\b/i,
      /\bhacé\b/i,
      /\bmirá\b/i,
    ];
    const hits: string[] = [];
    for (const path of files(root)) {
      const text = readFileSync(path, 'utf8');
      for (const pattern of forbidden) {
        if (pattern.test(text)) hits.push(`${path} coincide con ${pattern}`);
      }
    }
    expect(hits).toEqual([]);
  });

  it('mantiene el nombre en la configuración única', () => {
    expect(branding.name).toBe('Piquemos');
    expect(branding.company).toBe('Quantz');
    expect(branding.tagline).toContain('cada partido');
  });
});
