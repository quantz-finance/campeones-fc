import { describe, expect, it } from 'vitest';
import { loginPath } from './login-path';

describe('camino de entrada según la billetera en este navegador', () => {
  const w = (p: Partial<{ ready: boolean; undeployed: boolean; needsApproval: boolean; hasPasskey: boolean; deploying: boolean }>) => ({
    ready: false, undeployed: false, needsApproval: false, hasPasskey: false, deploying: false, ...p,
  });
  it('espera mientras el kit no sabe (o despliega)', () => {
    expect(loginPath(w({}))).toBeNull();
    expect(loginPath(w({ ready: true, deploying: true }))).toBeNull();
  });
  it('llave aquí -> firma', () => {
    expect(loginPath(w({ ready: true }))).toBe('sign');
    expect(loginPath(w({ undeployed: true }))).toBe('sign');
  });
  it('llave en otro dispositivo: con passkey -> confirmar; sin respaldo -> solo token', () => {
    expect(loginPath(w({ needsApproval: true, hasPasskey: true }))).toBe('approve');
    expect(loginPath(w({ needsApproval: true }))).toBe('token');
  });
});
