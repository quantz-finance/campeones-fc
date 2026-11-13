// Sobre de la llave de control de Stellar para iOS (puro: sin React Native, se prueba en Node).
// Mismo formato que firma CavosKitModule.swift (unwrapControlAndSign / unwrapControlPublicKey):
//   deviceWrap = ephPubCompressed(33) || nonce(12) || AES-GCM(kek, dek)
//   ciphertext = nonce(12) || AES-GCM(dek, controlSeed)
//   kek = HKDF-SHA256(x de ECDH(eph, llave del Secure Enclave), salt = ephPubCompressed, info = "cavos-stellar-dek-ecies")
// La semilla solo existe en JS un instante al crearla; después se firma en nativo y la semilla nunca vuelve a JS.
import { gcm } from '@noble/ciphers/aes';
import { p256 } from '@noble/curves/p256';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';

export const ECIES_INFO = 'cavos-stellar-dek-ecies';
const NONCE = 12;

export type ControlEnvelope = { deviceWrap: Uint8Array; ciphertext: Uint8Array };

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Cifra la semilla Ed25519 (32 bytes) para la llave P-256 del dispositivo (SEC1 sin comprimir, 65 bytes). */
export function sealControlSeedForDevice(seed: Uint8Array, devicePubSec1: Uint8Array): ControlEnvelope {
  if (seed.length !== 32) throw new Error('kit/stellar: control seed must be 32 bytes');
  if (devicePubSec1.length !== 65 || devicePubSec1[0] !== 4) throw new Error('kit/native: invalid ECDH public key');
  const dek = randomBytes(32);
  const eph = p256.utils.randomPrivateKey();
  try {
    const ephPub = p256.getPublicKey(eph, true);
    const sharedX = p256.getSharedSecret(eph, devicePubSec1, false).subarray(1, 33);
    const kek = hkdf(sha256, sharedX, ephPub, ECIES_INFO, 32);
    const n1 = randomBytes(NONCE);
    const n2 = randomBytes(NONCE);
    const deviceWrap = concat(ephPub, n1, gcm(kek, n1).encrypt(dek));
    const ciphertext = concat(n2, gcm(dek, n2).encrypt(seed));
    kek.fill(0);
    sharedX.fill(0);
    return { deviceWrap, ciphertext };
  } finally {
    dek.fill(0);
    eph.fill(0);
  }
}

const b64 = (u: Uint8Array) => {
  let s = '';
  u.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Para guardar: solo datos cifrados (sin la llave del Secure Enclave no sirven). */
export function encodeEnvelope(e: ControlEnvelope): string {
  return JSON.stringify({ v: 1, w: b64(e.deviceWrap), c: b64(e.ciphertext) });
}

export function decodeEnvelope(raw: string | null | undefined): ControlEnvelope | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { v?: number; w?: string; c?: string };
    if (j.v !== 1 || typeof j.w !== 'string' || typeof j.c !== 'string') return null;
    return { deviceWrap: unb64(j.w), ciphertext: unb64(j.c) };
  } catch {
    return null;
  }
}
