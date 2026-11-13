import { describe, expect, it } from 'vitest';
// La fórmula del kit (loginNonce / assertLoginBinding), para comprobar que la nuestra calza exactamente.
// @ts-expect-error chunk interno del kit sin tipos
import { assertLoginBinding, loginNonce, loginSecretFrom } from '../../../node_modules/@cavos/kit/dist/chunk-7ZTPQKT4.mjs';
import {
  ENCLAVE_EMAIL_ISSUER,
  HandoffError,
  bytesToB64url,
  handoffReturnUrl,
  handoffStartUrl,
  isHandoffState,
  loginNonceOf,
  makeHandoffState,
  parseHandoffReturn,
} from './email-handoff';

const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const jwt = (claims: object) => `${b64url({ alg: 'ES256' })}.${b64url(claims)}.firma`;
const secret = loginSecretFrom(new Uint8Array(32).fill(7));
const state = makeHandoffState(new Uint8Array(32).fill(1));
const good = jwt({ iss: ENCLAVE_EMAIL_ISSUER, sub: 'u1', email: 'ñandú@ejemplo.com', nonce: `abc.${loginNonce(secret)}` });

describe('entrada por correo nativa (handoff web → app)', () => {
  it('state de 32 bytes en base64url', () => {
    expect(isHandoffState(state)).toBe(true);
    expect(() => makeHandoffState(new Uint8Array(16))).toThrow();
    expect(isHandoffState('corto')).toBe(false);
  });

  it('nuestro nonce es el del kit', () => {
    expect(loginNonceOf(secret)).toBe(loginNonce(secret));
    expect(bytesToB64url(new Uint8Array([251, 255]))).toBe('-_8');
  });

  it('la URL de inicio es https y lleva solo el state', () => {
    expect(handoffStartUrl('https://partido.campeonesfc.app/', state)).toBe(`https://partido.campeonesfc.app/auth/correo-app?state=${state}`);
    expect(() => handoffStartUrl('http://127.0.0.1:8421', state)).toThrow(/https/);
    expect(() => handoffStartUrl('https://x', 'malo')).toThrow();
  });

  it('ida y vuelta: token y preimagen llegan intactos y el kit acepta el amarre', () => {
    const url = handoffReturnUrl({ state, token: good, secret });
    expect(url.startsWith('campeones-fc://cavos-auth#')).toBe(true);
    expect(url).not.toContain('?'); // en el fragmento, nunca en la query
    const got = parseHandoffReturn(url, state);
    expect(got).toEqual({ token: good, secret });
    const claims = JSON.parse(Buffer.from(good.split('.')[1], 'base64url').toString());
    expect(() => assertLoginBinding(claims.nonce, got.secret)).not.toThrow();
  });

  const code = (fn: () => unknown) => {
    try {
      fn();
    } catch (e) {
      return e instanceof HandoffError ? e.code : 'otro';
    }
    return 'ok';
  };

  it('rechaza otro state, otro esquema, otro issuer, preimagen que no calza o token roto', () => {
    const url = handoffReturnUrl({ state, token: good, secret });
    expect(code(() => parseHandoffReturn(url, makeHandoffState(new Uint8Array(32).fill(2))))).toBe('state');
    expect(code(() => parseHandoffReturn(url.replace('campeones-fc://', 'otra-app://'), state))).toBe('redirect');
    expect(code(() => parseHandoffReturn(url.replace('#', '?'), state))).toBe('redirect');
    const google = jwt({ iss: 'https://accounts.google.com', nonce: `x.${loginNonce(secret)}` });
    expect(code(() => parseHandoffReturn(handoffReturnUrl({ state, token: google, secret }), state))).toBe('issuer');
    const other = loginSecretFrom(new Uint8Array(32).fill(9));
    expect(code(() => parseHandoffReturn(handoffReturnUrl({ state, token: good, secret: other }), state))).toBe('binding');
    expect(code(() => parseHandoffReturn(handoffReturnUrl({ state, token: good, secret: 'corta' }), state))).toBe('secret');
    expect(code(() => parseHandoffReturn(handoffReturnUrl({ state, token: 'no.es', secret }), state))).toBe('token');
  });

  it('el error no filtra el token ni la preimagen', () => {
    const url = handoffReturnUrl({ state, token: good, secret });
    try {
      parseHandoffReturn(url, makeHandoffState(new Uint8Array(32).fill(3)));
    } catch (e) {
      expect(String((e as Error).message)).not.toContain(secret);
      expect(String((e as Error).message)).not.toContain(good.split('.')[1]);
    }
  });
});
