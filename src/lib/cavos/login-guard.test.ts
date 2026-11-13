import { describe, expect, it } from 'vitest';
import { isBrowserAlreadyOpen, singleFlight } from './login-guard';

describe('una entrada a la vez', () => {
  it('un doble toque reusa la entrada abierta (no abre otro navegador)', async () => {
    let calls = 0;
    let release!: () => void;
    const run = singleFlight(async (_p: string) => {
      calls++;
      await new Promise<void>((r) => (release = r));
    });
    const a = run('google');
    const b = run('google');
    expect(a).toBe(b);
    expect(run.busy()).toBe(true);
    await Promise.resolve();
    release();
    await a;
    expect(calls).toBe(1);
    expect(run.busy()).toBe(false);
  });

  it('si la entrada falla o se cancela, el siguiente toque vuelve a abrir', async () => {
    let calls = 0;
    const run = singleFlight(async () => {
      calls++;
      throw new Error('kit/native-auth: login cancelled');
    });
    await expect(run()).rejects.toThrow(/cancelled/);
    expect(run.busy()).toBe(false);
    await expect(run()).rejects.toThrow();
    expect(calls).toBe(2);
  });

  it('reconoce el error de sesión vieja de expo-web-browser', () => {
    expect(isBrowserAlreadyOpen("Calling the 'openAuthSessionAsync' function has failed\n→ Caused by: Another web browser is already open")).toBe(true);
    expect(isBrowserAlreadyOpen('kit/native-auth: login cancelled')).toBe(false);
  });
});
