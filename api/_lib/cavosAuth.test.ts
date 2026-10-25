import { createLocalJWKSet, exportJWK, generateKeyPair, SignJWT } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { __setJwksForTests, canLinkByEmail, verifyCavosToken } from './cavosAuth';
import { CAVOS_APPLE_CLIENT, CAVOS_GOOGLE_CLIENT } from './env';

const ISS = 'https://cavos.app/firebase';
const APP_ID = 'app_test_123';
let priv: CryptoKey;

async function token(claims: Record<string, unknown>, opts: { iss?: string; aud?: string; exp?: string | number } = {}) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(opts.iss ?? ISS)
    .setAudience(opts.aud ?? APP_ID)
    .setSubject('sub-1')
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? '1h')
    .sign(priv);
}

beforeAll(async () => {
  const kp = await generateKeyPair('RS256');
  priv = kp.privateKey as CryptoKey;
  const jwk = { ...(await exportJWK(kp.publicKey)), kid: 'k1', alg: 'RS256' };
  __setJwksForTests(createLocalJWKSet({ keys: [jwk] }) as any);
});
afterAll(() => __setJwksForTests(null));
beforeEach(() => {
  process.env.CAVOS_JWT_ISSUERS = `${ISS},https://accounts.google.com,https://appleid.apple.com`;
  process.env.CAVOS_JWT_AUDIENCE = APP_ID;
  delete process.env.CAVOS_EXTRA_ISSUER;
  delete process.env.CAVOS_GOOGLE_AUDIENCE;
  delete process.env.CAVOS_APPLE_AUDIENCE;
});

describe('JWT de Cavos', () => {
  it('acepta un token válido y devuelve (iss, sub)', async () => {
    const u = await verifyCavosToken(await token({ email: 'Ana@Gmail.com', email_verified: true, name: 'Ana' }));
    expect(u).toEqual({ iss: ISS, sub: 'sub-1', email: 'ana@gmail.com', emailVerified: true, name: 'Ana' });
  });

  it('sin appId configurado no acepta ningún token', async () => {
    delete process.env.CAVOS_JWT_AUDIENCE;
    await expect(verifyCavosToken(await token({}))).rejects.toMatchObject({ status: 503, code: 'cavos_not_configured' });
  });

  it('rechaza un aud distinto al appId', async () => {
    await expect(verifyCavosToken(await token({}, { aud: 'otra-app' }))).rejects.toMatchObject({ status: 401, code: 'auth_invalid' });
  });

  it('acepta los tokens de Google y Apple con el cliente OAuth real de Cavos (sin configurar nada)', async () => {
    const g = await token({}, { iss: 'https://accounts.google.com', aud: CAVOS_GOOGLE_CLIENT });
    await expect(verifyCavosToken(g)).resolves.toMatchObject({ iss: 'https://accounts.google.com' });
    const a = await token({}, { iss: 'https://appleid.apple.com', aud: CAVOS_APPLE_CLIENT });
    await expect(verifyCavosToken(a)).resolves.toMatchObject({ iss: 'https://appleid.apple.com' });
  });

  it('el cliente de Google solo vale con issuer de Google (y viceversa); otro aud se rechaza', async () => {
    const wrongIss = await token({}, { aud: CAVOS_GOOGLE_CLIENT });
    await expect(verifyCavosToken(wrongIss)).rejects.toMatchObject({ code: 'auth_invalid' });
    const appleWithGoogle = await token({}, { iss: 'https://appleid.apple.com', aud: CAVOS_GOOGLE_CLIENT });
    await expect(verifyCavosToken(appleWithGoogle)).rejects.toMatchObject({ code: 'auth_invalid' });
    const other = await token({}, { iss: 'https://accounts.google.com', aud: 'otra-app.apps.googleusercontent.com' });
    await expect(verifyCavosToken(other)).rejects.toMatchObject({ code: 'auth_invalid' });
  });

  it('CAVOS_GOOGLE_AUDIENCE sobrescribe el cliente por defecto', async () => {
    process.env.CAVOS_GOOGLE_AUDIENCE = 'cavos-oauth-client';
    const t = await token({}, { iss: 'https://accounts.google.com', aud: 'cavos-oauth-client' });
    await expect(verifyCavosToken(t)).resolves.toMatchObject({ iss: 'https://accounts.google.com' });
  });

  it('la lista de issuers es cerrada; el enclave solo entra por CAVOS_EXTRA_ISSUER', async () => {
    const t = await token({}, { iss: 'https://enclave.cavos.xyz' });
    await expect(verifyCavosToken(t)).rejects.toMatchObject({ code: 'auth_invalid' });
    process.env.CAVOS_EXTRA_ISSUER = 'https://enclave.cavos.xyz|https://enclave.cavos.xyz/.well-known/jwks.json';
    await expect(verifyCavosToken(t)).resolves.toMatchObject({ iss: 'https://enclave.cavos.xyz' });
  });

  it('el aud compartido del enclave ("cavos-email") solo vale para ese issuer y si se configura', async () => {
    const enclave = await token({}, { iss: 'https://enclave.cavos.xyz', aud: 'cavos-email' });
    process.env.CAVOS_EXTRA_ISSUER = 'https://enclave.cavos.xyz|https://enclave.cavos.xyz/.well-known/jwks.json';
    await expect(verifyCavosToken(enclave)).rejects.toMatchObject({ code: 'auth_invalid' });
    process.env.CAVOS_EXTRA_ISSUER = 'https://enclave.cavos.xyz|https://enclave.cavos.xyz/.well-known/jwks.json|cavos-email';
    await expect(verifyCavosToken(enclave)).resolves.toMatchObject({ iss: 'https://enclave.cavos.xyz' });
    // El mismo aud no abre la puerta a otro issuer.
    const other = await token({}, { aud: 'cavos-email' });
    await expect(verifyCavosToken(other)).rejects.toMatchObject({ code: 'auth_invalid' });
  });

  it('distingue un token vencido', async () => {
    const t = await token({}, { exp: Math.floor(Date.now() / 1000) - 3600 });
    await expect(verifyCavosToken(t)).rejects.toMatchObject({ code: 'session_expired' });
  });

  it('rechaza tokens mal formados o sin token', async () => {
    await expect(verifyCavosToken('abc')).rejects.toMatchObject({ status: 401 });
    await expect(verifyCavosToken('')).rejects.toMatchObject({ code: 'auth_missing' });
  });

  it('email_verified ausente o falso no permite ligar por correo; el relay de Apple nunca', async () => {
    const missing = await verifyCavosToken(await token({ email: 'ana@gmail.com' }));
    expect(missing.emailVerified).toBe(false);
    expect(canLinkByEmail(missing)).toBe(false);
    const no = await verifyCavosToken(await token({ email: 'ana@gmail.com', email_verified: false }));
    expect(canLinkByEmail(no)).toBe(false);
    const yes = await verifyCavosToken(await token({ email: 'ana@gmail.com', email_verified: true }));
    expect(canLinkByEmail(yes)).toBe(true);
    expect(canLinkByEmail({ ...yes, email: 'x1@privaterelay.appleid.com' })).toBe(false);
  });
});
