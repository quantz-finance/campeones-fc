import { describe, expect, it } from 'vitest';
import { assertTokenOnlyAllowed, TOKEN_ONLY_MAX_AGE_S, tokenOnceKey, walletOutcome } from './loginPolicy';

const now = 1_800_000_000;

describe('entrada solo con token (dispositivo sin la llave)', () => {
  it('apagada por defecto: pide entrar desde el dispositivo de la billetera', () => {
    expect(() => assertTokenOnlyAllowed({ enabled: false, iat: now, nowS: now })).toThrow(expect.objectContaining({ code: 'device_not_authorized' }));
  });
  it('activa: acepta un token recién emitido', () => {
    expect(() => assertTokenOnlyAllowed({ enabled: true, iat: now - 60, nowS: now })).not.toThrow();
  });
  it('activa: rechaza un token viejo, del futuro o sin iat', () => {
    for (const iat of [now - TOKEN_ONLY_MAX_AGE_S - 1, now + 120, null]) {
      expect(() => assertTokenOnlyAllowed({ enabled: true, iat, nowS: now })).toThrow(expect.objectContaining({ code: 'session_expired' }));
    }
  });
});

describe('billetera al entrar firmado', () => {
  it('bound / same pasan', () => {
    expect(walletOutcome('bound', { allowOtherWallet: false }).status).toBe('bound');
    expect(walletOutcome('same', { allowOtherWallet: false }).status).toBe('same');
  });
  it('otra billetera de la misma persona: entra solo si el registro la confirmó o se aceptó el riesgo', () => {
    expect(() => walletOutcome('other_wallet', { allowOtherWallet: false })).toThrow(expect.objectContaining({ code: 'other_wallet' }));
    expect(walletOutcome('other_wallet', { allowOtherWallet: true }).status).toBe('other_wallet');
  });
  it('una billetera ligada a OTRA cuenta nunca pasa', () => {
    expect(() => walletOutcome('address_taken', { allowOtherWallet: true })).toThrow(expect.objectContaining({ code: 'address_taken' }));
  });
});

describe('clave de un solo uso del token', () => {
  it('cumple el CHECK de session_nonces y no se parece a un nonce aleatorio (48 hex)', () => {
    const k = tokenOnceKey('eyJ.a.b');
    expect(k).toMatch(/^[a-f0-9]{32,128}$/);
    expect(k).toHaveLength(64);
    expect(tokenOnceKey('eyJ.a.b')).toBe(k);
    expect(tokenOnceKey('eyJ.a.c')).not.toBe(k);
  });
});
