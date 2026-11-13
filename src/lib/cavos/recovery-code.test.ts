import { describe, expect, it } from 'vitest';
import { authErrorText, PASSKEY, PASSKEY_UNAVAILABLE, PASSKEY_WRONG, RECOVERY_EMPTY, RECOVERY_WRONG, shouldReportAuthError } from './auth-ux';
import { normalizeRecoveryCode, recoveryCodeProblem, recoveryWordCount, RECOVERY_WORDS } from './recovery-code';

const sixteen = 'able acid amber apple arch arrow ashen atlas able acid amber apple arch arrow ashen atlas';

describe('código de recuperación', () => {
  it('normaliza como el kit (trim, espacios, minúsculas) y acepta saltos de línea, comas y guiones', () => {
    expect(normalizeRecoveryCode('  Able   ACID\namber ')).toBe('able acid amber');
    expect(normalizeRecoveryCode('able-acid, amber')).toBe('able acid amber');
    expect(normalizeRecoveryCode(undefined)).toBe('');
  });

  it('vacío o solo espacios nunca llega al kit', () => {
    expect(recoveryWordCount('   \n ')).toBe(0);
    expect(recoveryCodeProblem('   ')).toBe('Escribe tu código de recuperación.');
  });

  it(`pide exactamente ${RECOVERY_WORDS} palabras`, () => {
    expect(recoveryCodeProblem('able acid')).toMatch(/16 palabras y aquí van 2/);
    expect(recoveryCodeProblem(sixteen)).toBeNull();
    expect(recoveryCodeProblem(sixteen.toUpperCase().replace(/ /g, '  '))).toBeNull();
  });
});

describe('errores de recuperar este dispositivo', () => {
  it('traduce los del kit y de iOS', () => {
    expect(authErrorText('kit/stellar: recovery code is empty')).toBe(RECOVERY_EMPTY);
    expect(authErrorText('kit/stellar: could not add this device with the recovery code — wrong factor or not enrolled')).toBe(RECOVERY_WRONG);
    expect(authErrorText('kit/stellar: could not add this device with the passkey — wrong factor or not enrolled')).toBe(PASSKEY_WRONG);
    expect(
      authErrorText(
        'The operation couldn’t be completed. Application with identifier FAKETEAMID.app.campeonesfc is not associated with domain partido.campeonesfc.app',
      ),
    ).toBe(PASSKEY_UNAVAILABLE);
    expect(authErrorText('kit/native: passkey PRF is unsupported; use recovery code or another device')).toBe(PASSKEY_UNAVAILABLE);
  });

  it('el PRF de la web sigue con su texto de siempre', () => {
    expect(authErrorText('kit/passkey-prf: PRF is unsupported here')).toBe(PASSKEY);
  });

  it('reporta al servidor la passkey sin Associated Domains', () => {
    const raw = 'Application with identifier X.app.campeonesfc is not associated with domain partido.campeonesfc.app';
    expect(shouldReportAuthError(raw, authErrorText(raw))).toBe(true);
  });
});
