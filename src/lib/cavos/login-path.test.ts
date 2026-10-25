import { describe, expect, it } from 'vitest';
import { loginPath, tokenExpired } from './login-path';

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
  it('llave en otro dispositivo: con passkey -> confirmar; sin respaldo -> sin llave', () => {
    expect(loginPath(w({ needsApproval: true, hasPasskey: true }))).toBe('approve');
    expect(loginPath(w({ needsApproval: true }))).toBe('token'); // la UI muestra «sin llave» (no hay entrada solo con token)
  });
});

describe('token de Cavos vencido', () => {
  const jwt = (p: object) => `h.${btoa(JSON.stringify(p)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`;
  it('detecta exp pasado, sin exp o malformado', () => {
    expect(tokenExpired(jwt({ exp: 1000 }), 2000)).toBe(true);
    expect(tokenExpired(jwt({}), 2000)).toBe(true);
    expect(tokenExpired('basura', 2000)).toBe(true);
  });
  it('acepta uno vigente (con margen)', () => {
    expect(tokenExpired(jwt({ exp: 5000 }), 2000)).toBe(false);
    expect(tokenExpired(jwt({ exp: 2010 }), 2000)).toBe(true);
  });
});
