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
      expect(src).toMatch(/PRF is unsupported|prf\|not supported/);
      expect(src).toContain('globalThis.__cfcPasskeySkip = true; finishSecureStep(); return;');
    }
  });

  it('falla fuerte si el kit cambió y no calza un punto requerido', () => {
    expect(() => patchKitSource('const x = 1;')).toThrow(/errores/);
  });

  it('actualiza un kit con el parche v1 (caché de Vercel) sin fallar ni duplicar', () => {
    const src = readFileSync('node_modules/@cavos/kit/dist/react/index.mjs', 'utf8');
    const v1 = src
      .replace(PATCH_MARK, '/* campeones-patch:cavos-kit 0.4.4 v1 */')
      .replace('if (!globalThis.__cfcKeepDeviceKey) VaultClient.attach(', 'VaultClient.attach(')
      .replace(/const __m = e instanceof Error[^\n]*/, 'setPkError(e instanceof Error ? e.message : "We couldn\'t set up your passkey. Try again.");');
    const { out, applied } = patchKitSource(v1);
    expect(applied).toEqual(['conservar-llave', 'passkey-sin-prf']);
    expect(out.startsWith(PATCH_MARK)).toBe(true);
    expect(out.split('__setErrorRaw').length).toBe(src.split('__setErrorRaw').length);
    expect(out).toContain('if (!globalThis.__cfcKeepDeviceKey) VaultClient.attach(');
  });

  it('es idempotente', () => {
    const src = readFileSync('node_modules/@cavos/kit/dist/react/index.mjs', 'utf8');
    expect(patchKitSource(src).applied).toEqual([]);
  });
});
