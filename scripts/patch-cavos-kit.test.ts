import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
// @ts-expect-error módulo .mjs sin tipos
import { ATTESTATION_MARK, ENCLAVE_PCR0, PATCH_MARK, patchAttestationSource, patchKitSource } from './patch-cavos-kit.mjs';

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
      expect(src).toContain('if (__b === "skip") return; if (__b) throw new Error(__b); try { await auth.sendOtp(email); }');
      expect(src.split('globalThis.__cfcOtpGuard.countdown(email)').length).toBe(3);
      expect(src).not.toContain('setResendCountdown(60);');
      expect(src).toContain('revisa tu carpeta de Spam');
      expect(src).toContain('if (globalThis.__cfcOtpGuard) globalThis.__cfcOtpGuard.verified(email);');
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

  it('el kit instalado acepta las releases v1 y v2 del enclave de Cavos (chunk ESM y copias CJS)', () => {
    for (const f of ['chunk-T2ZMQHFD.mjs', 'index.js', 'react/index.js']) {
      const src = readFileSync(`node_modules/@cavos/kit/dist/${f}`, 'utf8');
      expect(src).toContain(ATTESTATION_MARK);
      expect(src).toContain(ENCLAVE_PCR0.v2);
      expect(src).toContain(ENCLAVE_PCR0.v1);
    }
  });

  it('parche del enclave: idempotente, ignora archivos sin la lista y deja las medidas viejas', () => {
    const src = readFileSync('node_modules/@cavos/kit/dist/chunk-T2ZMQHFD.mjs', 'utf8');
    expect(patchAttestationSource(src)).toEqual({ out: src, applied: false });
    expect(patchAttestationSource('const x = 1;')).toBeNull();
    const old = 'var D = {\n  pcr0: [\n    "f388b0bf627bdad34968ebab083688b999da2aaa369a65323a3085725de0fc79d7cf0fab6527d57e06b4b10950a150f9",\n    "5ec163560006f105b5448c2db77ecf5ec442e00abd475f65349d6d93e837279652708770c50b3aa2e8676f553f572825"\n  ]\n};';
    const r = patchAttestationSource(old)!;
    expect(r.applied).toBe(true);
    const list = JSON.parse(r.out.replace(ATTESTATION_MARK, '').match(/pcr0: (\[[\s\S]*?\])/)![1]);
    expect(list).toEqual([
      'f388b0bf627bdad34968ebab083688b999da2aaa369a65323a3085725de0fc79d7cf0fab6527d57e06b4b10950a150f9',
      '5ec163560006f105b5448c2db77ecf5ec442e00abd475f65349d6d93e837279652708770c50b3aa2e8676f553f572825',
      ENCLAVE_PCR0.v2,
      ENCLAVE_PCR0.v1,
    ]);
  });
});
