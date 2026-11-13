// Llave de control de Stellar en iOS sin WebCrypto ni IndexedDB (no existen en Hermes).
// @cavos/kit 0.4.4 (y 0.5.3) crea la llave de la billetera con crypto.subtle Ed25519 y la guarda en IndexedDB:
// en el iPhone eso fallaba con "Cavos: WebCrypto is unavailable" justo después de Google/Apple.
// Aquí la semilla se cifra para una llave P-256 del Secure Enclave (CavosKit.getOrCreateUnwrapKey) y se firma con
// NativeControlSigner (CavosKit.unwrapControlAndSign): la semilla nunca se guarda en claro ni vuelve a JS.
// El sobre cifrado se guarda con CavosKit.setStoredValue. Ver el parche 9) y 10) en scripts/patch-cavos-kit.mjs.
// Solo lo importa bridge.native.tsx; la web no instala estos ganchos.
import { getCavosNativeModule, NativeControlSigner } from '@cavos/kit/react-native';
import { randomBytes } from '@noble/hashes/utils';
import { APP_SALT } from './config';
import { decodeEnvelope, encodeEnvelope, sealControlSeedForDevice, type ControlEnvelope } from './control-envelope';
import { getNativeCavosJwt } from './native-jwt';

/** Llave P-256 del dispositivo que envuelve las semillas de control (una por instalación). No cambiarla. */
export const CONTROL_WRAP_ALIAS = `cfc-control-wrap:${APP_SALT}`;
const envelopeKey = (keyId: string) => `cfc-control:${keyId}`;
const addressKey = (k: { userId: string; appId: string; chain: string; network: string }) =>
  `cfc-address:${k.userId}:${k.appId}:${k.chain}:${k.network}`;

type Persistable = NativeControlSigner & { persist(keyId: string): Promise<void> };

function unb64(s: string) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function devicePublicKey(): Promise<Uint8Array> {
  const r = await getCavosNativeModule().getOrCreateUnwrapKey(CONTROL_WRAP_ALIAS);
  return unb64(r.publicKey);
}

async function signerFor(env: ControlEnvelope): Promise<Persistable> {
  const signer = (await NativeControlSigner.create({
    keyId: CONTROL_WRAP_ALIAS,
    deviceWrap: env.deviceWrap,
    ciphertext: env.ciphertext,
  })) as Persistable;
  signer.persist = (keyId: string) => getCavosNativeModule().setStoredValue(envelopeKey(keyId), encodeEnvelope(env));
  return signer;
}

async function fromSeed(seed: Uint8Array, keyId?: string): Promise<Persistable> {
  const env = sealControlSeedForDevice(seed, await devicePublicKey());
  const signer = await signerFor(env);
  if (keyId) await signer.persist(keyId);
  return signer;
}

export const nativeControlKeys = {
  async create(opts?: { keyId?: string }) {
    const seed = randomBytes(32);
    try {
      return await fromSeed(seed, opts?.keyId);
    } finally {
      seed.fill(0);
    }
  },
  importFromSeed(seed: Uint8Array, opts?: { keyId?: string }) {
    if (seed.length !== 32) throw new Error('kit/stellar: control seed must be 32 bytes');
    return fromSeed(seed, opts?.keyId);
  },
  async load(opts: { keyId: string }) {
    const env = decodeEnvelope(await getCavosNativeModule().getStoredValue(envelopeKey(opts.keyId)));
    if (!env) return null;
    try {
      return await signerFor(env);
    } catch (e) {
      // Sobre de otro dispositivo (p. ej. copia de seguridad restaurada): la llave del Secure Enclave no viaja.
      console.warn('[cavos] no pude abrir la llave guardada de este dispositivo', e instanceof Error ? e.message : e);
      return null;
    }
  },
  async remove(keyId: string) {
    await getCavosNativeModule().setStoredValue(envelopeKey(keyId), null);
  },
};

export const nativeAddressCache = {
  async read(key: { userId: string; appId: string; chain: string; network: string }) {
    return (await getCavosNativeModule().getStoredValue(addressKey(key))) ?? null;
  },
  async write(key: { userId: string; appId: string; chain: string; network: string }, address: string) {
    await getCavosNativeModule().setStoredValue(addressKey(key), address);
  },
};

/** Instala los ganchos que lee el kit parchado. Idempotente. */
export function installNativeControlKeys() {
  const g = globalThis as any;
  g.__cfcControlKeys = nativeControlKeys;
  g.__cfcAddressCache = nativeAddressCache;
  g.__cfcCavosToken = () => getNativeCavosJwt();
}
