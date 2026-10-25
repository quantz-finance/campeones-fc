import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sin tipos
import { PATCH_MARK, patchKitSource } from './patch-cavos-kit.mjs';

describe('parche del modal de @cavos/kit', () => {
  it('el kit instalado quedó parchado (postinstall) en index.js e index.mjs', () => {
    for (const f of ['index.js', 'index.mjs']) {
      const src = readFileSync(`node_modules/@cavos/kit/dist/react/${f}`, 'utf8');
      expect(src.startsWith(PATCH_MARK)).toBe(true);
      expect(src).toContain('globalThis.__cfcAuthError');
      expect(src).toContain('globalThis.__cfcOtpFill');
      expect(src).toContain('maxLength: i === 0 ? EMAIL_CODE_LENGTH : 1,');
      expect(src).not.toContain('normalizeEmailCode(raw).slice(-1)');
      expect(src).toContain('"Ingresa tu código"');
      expect(src).toContain('if (!globalThis.__cfcKeepDeviceKey) VaultClient.attach(');
    }
  });

  it('falla fuerte si el kit cambió y no calza un punto requerido', () => {
    expect(() => patchKitSource('const x = 1;')).toThrow(/errores/);
  });

  it('es idempotente', () => {
    const src = readFileSync('node_modules/@cavos/kit/dist/react/index.mjs', 'utf8');
    expect(patchKitSource(src).applied).toEqual([]);
  });
});
