import { describe, expect, it } from 'vitest';
import { authErrorText, EMAIL_UNSUPPORTED, GENERIC, OTP_INVALID, otpFill, RELOGIN } from './auth-ux';

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
