import { createDecipheriv, createECDH, hkdfSync, sign as edSign, createPrivateKey, createPublicKey } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decodeEnvelope, ECIES_INFO, encodeEnvelope, sealControlSeedForDevice } from './control-envelope';

// Hace lo mismo que CavosKitModule.swift (unwrapControlAndSign) con node:crypto, sin @noble.
function swiftOpen(env: { deviceWrap: Uint8Array; ciphertext: Uint8Array }, device: ReturnType<typeof createECDH>) {
  const eph = Buffer.from(env.deviceWrap.subarray(0, 33));
  const x = device.computeSecret(eph); // ECDH estándar: solo la x (32 bytes), como SecKeyCopyKeyExchangeResult
  const kek = Buffer.from(hkdfSync('sha256', x, eph, Buffer.from(ECIES_INFO), 32));
  const gcmOpen = (blob: Uint8Array, key: Buffer) => {
    const b = Buffer.from(blob);
    const d = createDecipheriv('aes-256-gcm', key, b.subarray(0, 12));
    d.setAuthTag(b.subarray(b.length - 16));
    return Buffer.concat([d.update(b.subarray(12, b.length - 16)), d.final()]);
  };
  const dek = gcmOpen(env.deviceWrap.subarray(33), kek);
  return gcmOpen(env.ciphertext, dek);
}

describe('sobre de la llave de control (formato de CavosKit iOS)', () => {
  it('el Swift del kit abre la semilla y firma con ella', () => {
    const device = createECDH('prime256v1');
    device.generateKeys();
    const seed = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
    const env = sealControlSeedForDevice(seed, new Uint8Array(device.getPublicKey()));
    expect(env.deviceWrap.length).toBe(33 + 12 + 32 + 16);
    expect(env.ciphertext.length).toBe(12 + 32 + 16);
    const opened = swiftOpen(env, device);
    expect([...opened]).toEqual([...seed]);
    // Ed25519 desde la semilla (lo que hace Curve25519.Signing.PrivateKey(rawRepresentation:))
    const pkcs8 = Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), opened]);
    const key = createPrivateKey({ key: pkcs8, format: 'der', type: 'pkcs8' });
    expect(edSign(null, Buffer.from('hola'), key).length).toBe(64);
    expect(createPublicKey(key).export({ format: 'der', type: 'spki' }).length).toBe(44);
  });

  it('cada sobre es distinto (DEK y efímera nuevas) y solo lo abre ese dispositivo', () => {
    const a = createECDH('prime256v1');
    a.generateKeys();
    const b = createECDH('prime256v1');
    b.generateKeys();
    const seed = new Uint8Array(32).fill(7);
    const e1 = sealControlSeedForDevice(seed, new Uint8Array(a.getPublicKey()));
    const e2 = sealControlSeedForDevice(seed, new Uint8Array(a.getPublicKey()));
    expect(Buffer.from(e1.deviceWrap).equals(Buffer.from(e2.deviceWrap))).toBe(false);
    expect(() => swiftOpen(e1, b)).toThrow();
  });

  it('valida tamaños y guarda/lee el sobre', () => {
    const d = createECDH('prime256v1');
    d.generateKeys();
    const pub = new Uint8Array(d.getPublicKey());
    expect(() => sealControlSeedForDevice(new Uint8Array(31), pub)).toThrow(/32 bytes/);
    expect(() => sealControlSeedForDevice(new Uint8Array(32), pub.subarray(1))).toThrow(/ECDH/);
    const env = sealControlSeedForDevice(new Uint8Array(32).fill(1), pub);
    const back = decodeEnvelope(encodeEnvelope(env))!;
    expect([...back.deviceWrap]).toEqual([...env.deviceWrap]);
    expect([...back.ciphertext]).toEqual([...env.ciphertext]);
    expect(decodeEnvelope(null)).toBeNull();
    expect(decodeEnvelope('{"v":2}')).toBeNull();
    expect(decodeEnvelope('no')).toBeNull();
  });
});
