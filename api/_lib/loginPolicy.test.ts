import { describe, expect, it } from 'vitest';
import { deviceNotAuthorized, walletOutcome } from './loginPolicy';

describe('billetera al entrar firmado', () => {
  it('bound / same pasan', () => {
    expect(walletOutcome('bound').status).toBe('bound');
    expect(walletOutcome('same').status).toBe('same');
  });
  it('otra billetera para una cuenta ya ligada nunca pasa (sería el reuso de un token de otra app)', () => {
    expect(() => walletOutcome('other_wallet')).toThrow(expect.objectContaining({ code: 'other_wallet', status: 409 }));
  });
  it('una billetera ligada a OTRA cuenta nunca pasa', () => {
    expect(() => walletOutcome('address_taken')).toThrow(expect.objectContaining({ code: 'address_taken' }));
  });
});

describe('sin llave en este navegador', () => {
  it('no hay entrada solo con token', () => {
    expect(deviceNotAuthorized()).toEqual(expect.objectContaining({ code: 'device_not_authorized', status: 409 }));
  });
});
