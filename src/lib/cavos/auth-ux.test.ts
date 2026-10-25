import { describe, expect, it } from 'vitest';
import { authErrorText, EMAIL_UNSUPPORTED, GENERIC, OTP_COOLDOWN, OTP_INVALID, OTP_RATE, otpFill, otpGuard, otpRecordFailure, otpRecordSent, otpWait, otpWaitText, PASSKEY, RELOGIN } from './auth-ux';

describe('textos del login Cavos', () => {
  it('nunca muestra errores técnicos crudos', () => {
    expect(authErrorText('kit/auth: registry lookup 401 {"error":"Invalid user token"}')).toBe(RELOGIN);
    expect(authErrorText('Invalid or expired code.')).toBe(OTP_INVALID);
    expect(authErrorText('This email provider is not supported yet.')).toBe(EMAIL_UNSUPPORTED);
    expect(authErrorText('weird {"x":1}')).toBe(GENERIC);
    expect(authErrorText('Tu sesión venció.')).toBe('Tu sesión venció.');
  });

  it('reparte el código de 9 caracteres del autofill', () => {
    expect(otpFill('', 0, 'ab12cd34e', 9)).toEqual({ code: 'ab12cd34e', focus: 8 });
    expect(otpFill('ab', 2, '12cd34e', 9)).toEqual({ code: 'ab12cd34e', focus: 8 });
    expect(otpFill('', 0, 'ab12cd34ezz', 9)?.code).toBe('ab12cd34e');
    expect(otpFill('a', 0, 'ab', 9)).toBeNull();
  });
});

describe('passkey sin PRF', () => {
  it('el error crudo del kit nunca llega tal cual', () => {
    expect(authErrorText('kit/passkey-prf: this authenticator did not return a PRF result — PRF is unsupported here')).toBe(PASSKEY);
    expect(authErrorText('NotAllowedError: The operation either timed out or was not allowed.')).toBe(PASSKEY);
  });
});

describe('códigos por correo seguidos (429 de Cavos)', () => {
  it('los errores de pausa de Cavos no se confunden con «código inválido»', () => {
    expect(authErrorText('A code was just sent to this address. Wait a minute before requesting another.')).toBe(OTP_COOLDOWN);
    expect(authErrorText('Too many attempts. Try again in a few minutes.')).toBe(OTP_RATE);
    expect(authErrorText('kit/auth: /api/oauth/email/code -> 429 {"error":"x"}')).toBe(OTP_RATE);
    expect(OTP_RATE).toMatch(/Spam/);
  });

  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  };
  const t0 = 1_800_000_000_000;

  it('tras enviar: 60 s de pausa por correo (sin importar mayúsculas)', () => {
    const s = mem();
    expect(otpWait(s, 'a@b.co', t0)).toBe(0);
    otpRecordSent(s, 'A@B.co ', t0);
    expect(otpWait(s, 'a@b.co', t0 + 1_000)).toBe(59);
    expect(otpWait(s, 'otro@b.co', t0 + 1_000)).toBe(0);
    expect(otpWait(s, 'a@b.co', t0 + 61_000)).toBe(0);
  });

  it('un 429 alarga la pausa; otros errores no', () => {
    const s = mem();
    otpRecordFailure(s, 'a@b.co', 'Email sign-in is unavailable right now.', t0);
    expect(otpWait(s, 'a@b.co', t0)).toBe(0);
    otpRecordFailure(s, 'a@b.co', 'Too many attempts. Try again in a few minutes.', t0);
    expect(otpWait(s, 'a@b.co', t0)).toBe(180);
  });

  it('el modal: código vigente -> ir a escribirlo; pausa sin código -> mensaje; libre -> pedir', () => {
    const s = mem();
    const g = otpGuard(s);
    expect(g.before('a@b.co')).toBeNull();
    g.sent('a@b.co');
    expect(g.before('a@b.co')).toBe('skip');
    expect(g.countdown('a@b.co')).toBeGreaterThan(55);
    const s2 = mem();
    const g2 = otpGuard(s2);
    g2.failed('c@d.co', new Error('Too many attempts. Try again in a few minutes.'));
    expect(g2.before('c@d.co')).toMatch(/^Espera \d+ s/);
    expect(authErrorText(otpWaitText(42))).toBe(otpWaitText(42));
  });

  it('almacenamiento roto: nunca rompe el envío', () => {
    const broken = { getItem: () => '{oops', setItem: () => { throw new Error('quota'); } };
    expect(otpWait(broken, 'a@b.co')).toBe(0);
    expect(() => otpRecordSent(broken, 'a@b.co')).not.toThrow();
  });
});
