// Solo desarrollo (__DEV__): autoprueba en el dispositivo de la llave de control nativa de Cavos.
// Ejercita el mismo código que usa el kit parchado tras el OAuth (parches 9 y 10 de scripts/patch-cavos-kit.mjs):
// WebCryptoControlKey.create/importFromSeed/load/remove -> globalThis.__cfcControlKeys -> NativeControlSigner,
// el caché de direcciones (globalThis.__cfcAddressCache) y el JWT para /api/wallets (globalThis.__cfcCavosToken).
// Las firmas se verifican en JS con @noble/curves. CavosStellar.connect corre con una identidad falsa y
// fetch simulado para /api/wallets (nunca escribe en Cavos); solo lee Horizon testnet.
// Lo importa únicamente src/app/dev/cavos-selftest.tsx dentro de `if (__DEV__)`.
import { Cavos, getCavosNativeModule, NativeControlSigner } from '@cavos/kit/react-native';
import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex, randomBytes } from '@noble/hashes/utils';
import { Account, Keypair, Networks, Operation, StrKey, TransactionBuilder } from '@stellar/stellar-base';
import { Buffer } from 'buffer';
import { APP_SALT, CAVOS_APP_ID, CAVOS_ENVIRONMENT, STELLAR_NETWORK } from './config';
import { getNativeCavosJwt, setNativeCavosJwt } from './native-jwt';

export const SELFTEST_PREFIX = '[CFC-SELFTEST]';
const LAST_KEY = 'cfc-selftest:last';

export type SelfTestLine = { ok: boolean; name: string; detail?: string };

type KitChunk = {
  WebCryptoControlKey: {
    create(opts?: { keyId?: string }): Promise<any>;
    importFromSeed(seed: Uint8Array, opts?: { keyId?: string }): Promise<any>;
    load(opts: { keyId: string }): Promise<any>;
    remove(keyId: string): Promise<void>;
  };
  prefixedMessageBytes(m: Uint8Array): Uint8Array;
};

// La clase no es pública: se carga el mismo chunk que importa @cavos/kit/react-native (parchado en postinstall).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const kit = require('@cavos/kit/dist/chunk-TLAPAQBY.mjs') as KitChunk;

// El stellar-sdk que usa el kit (16.x, ESM con js-xdr que importa 'buffer'), no el min.js de stellar-base de la app.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const kitSdk = require('@cavos/kit/node_modules/@stellar/stellar-sdk/lib/esm/index.js') as typeof import('@stellar/stellar-base');

const utf8 = (s: string) => new TextEncoder().encode(s);
const short = (s: string) => (s.length > 14 ? `${s.slice(0, 6)}…${s.slice(-6)}` : s);

let running: Promise<{ pass: number; fail: number }> | null = null;

/** Una corrida a la vez (el fetch simulado es global). */
export function runCavosSelfTest(onLine: (l: SelfTestLine) => void): Promise<{ pass: number; fail: number }> {
  if (!running) running = runOnce(onLine).finally(() => (running = null));
  return running;
}

async function runOnce(onLine: (l: SelfTestLine) => void): Promise<{ pass: number; fail: number }> {
  let pass = 0;
  let fail = 0;
  const report = (ok: boolean, name: string, detail?: string) => {
    if (ok) pass++;
    else fail++;
    const line = `${SELFTEST_PREFIX} ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` — ${detail}` : ''}`;
    if (ok) console.log(line);
    else console.warn(line);
    onLine({ ok, name, detail });
  };
  const check = async (name: string, fn: () => Promise<string | void>) => {
    try {
      const detail = await fn();
      report(true, name, detail || undefined);
    } catch (e) {
      report(false, name, e instanceof Error ? `${e.name}: ${e.message}` : String(e));
    }
  };
  const assert = (cond: unknown, msg: string) => {
    if (!cond) throw new Error(msg);
  };
  const verifyMsg = (sig: Uint8Array, msg: Uint8Array, pub: Uint8Array) =>
    ed25519.verify(sig, kit.prefixedMessageBytes(msg), pub);

  console.log(`${SELFTEST_PREFIX} START ${new Date().toISOString()} network=${STELLAR_NETWORK}`);
  const native = getCavosNativeModule();
  const runId = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;

  // @noble/hashes captura globalThis.crypto AL CARGARSE: si se evaluó antes del polyfill, randomBytes falla para siempre.
  await check('crypto.getRandomValues visible para @noble/hashes', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const captured = (require('@noble/hashes/crypto') as { crypto?: Crypto }).crypto;
    assert(typeof (globalThis as any).crypto?.getRandomValues === 'function', 'globalThis.crypto.getRandomValues no existe');
    assert(captured && typeof captured.getRandomValues === 'function', '@noble/hashes/crypto capturó undefined (se cargó antes del polyfill)');
    assert(randomBytes(32).length === 32, 'randomBytes falló');
  });

  // 0) Los ganchos los instala el puente nativo real al cargarse (mismo módulo que monta CavosLoader).
  await check('hooks instalados por bridge.native', async () => {
    await import('./bridge');
    const g = globalThis as any;
    assert(typeof g.__cfcControlKeys?.create === 'function', 'falta __cfcControlKeys');
    assert(typeof g.__cfcAddressCache?.read === 'function', 'falta __cfcAddressCache');
    assert(typeof g.__cfcCavosToken === 'function', 'falta __cfcCavosToken');
    assert(typeof (globalThis as any).crypto?.subtle === 'undefined', 'hay crypto.subtle (no sería Hermes puro)');
    return 'sin crypto.subtle; ganchos presentes';
  });

  await check('capacidades nativas', async () => {
    const caps = (await native.getCapabilities()) as unknown as Record<string, unknown>;
    assert(typeof native.unwrapControlAndSign === 'function', 'sin unwrapControlAndSign');
    return JSON.stringify(caps);
  });

  // 1) Recarga tras reiniciar la app: la llave guardada en la corrida anterior.
  const prevRaw = await native.getStoredValue(LAST_KEY);
  if (prevRaw) {
    await check('recarga tras reinicio (load + firma)', async () => {
      const prev = JSON.parse(prevRaw) as { keyId: string; address: string; at: string };
      const k = await kit.WebCryptoControlKey.load({ keyId: prev.keyId });
      assert(k, `load devolvió null para ${prev.keyId}`);
      assert(k instanceof NativeControlSigner, 'no es NativeControlSigner');
      assert(k.publicAddress() === prev.address, `dirección distinta ${k.publicAddress()} != ${prev.address}`);
      const msg = utf8(`recarga ${runId}`);
      const sig = await k.signMessage(msg);
      assert(verifyMsg(sig, msg, k.publicKeyRaw()), 'firma inválida');
      return `${short(prev.address)} guardada ${prev.at}`;
    });
  } else {
    console.log(`${SELFTEST_PREFIX} INFO sin llave previa: reinicia la app y vuelve a correr para probar la recarga`);
  }

  // 2) create (mismo camino que CavosStellar.connect) + firmas verificadas en JS.
  const keyId = `selftest-${runId}`;
  let created: any = null;
  await check('WebCryptoControlKey.create → NativeControlSigner', async () => {
    created = await kit.WebCryptoControlKey.create({ keyId });
    assert(created instanceof NativeControlSigner, 'no es NativeControlSigner');
    const raw = created.publicKeyRaw() as Uint8Array;
    assert(raw.length === 32, `llave pública de ${raw.length} bytes`);
    assert(StrKey.encodeEd25519PublicKey(Buffer.from(raw)) === created.publicAddress(), 'G… no coincide');
    return short(created.publicAddress());
  });
  if (created) {
    await check('signMessage verificado con @noble/curves', async () => {
      const msg = utf8(`Campeones FC autoprueba ${runId}`);
      const sig = await created.signMessage(msg);
      assert(sig.length === 64, `firma de ${sig.length} bytes`);
      assert(verifyMsg(sig, msg, created.publicKeyRaw()), 'firma inválida');
      assert(!verifyMsg(sig, utf8('otro mensaje'), created.publicKeyRaw()), 'la firma valida un mensaje distinto');
      return 'ok (y rechaza mensaje alterado)';
    });
    await check('Buffer#subarray devuelve Buffer (parche del kit en Hermes)', async () => {
      const raw = Buffer.isBuffer(Uint8Array.prototype.subarray.call(Buffer.alloc(4), 0, 2));
      assert(Buffer.isBuffer(Buffer.alloc(4).subarray(0, 2)), 'subarray devuelve Uint8Array simple');
      const own = Buffer.prototype.subarray === Uint8Array.prototype.subarray ? 'heredado de Uint8Array' : 'propio (parche)';
      return `Uint8Array#subarray.call(Buffer) es Buffer: ${raw}; Buffer#subarray ${own}`;
    });
    await check('signTransaction (XDR del stellar-sdk del kit) verificado', async () => {
      const { Account: KAccount, Networks: KNetworks, Operation: KOperation, TransactionBuilder: KTB } = kitSdk;
      const tx = new KTB(new KAccount(created.publicAddress(), '1'), { fee: '100', networkPassphrase: KNetworks.TESTNET })
        .addOperation(KOperation.manageData({ name: 'cfc-selftest', value: runId }))
        .setTimeout(60)
        .build();
      const xdrText = tx.toXDR();
      assert(/^[A-Za-z0-9+/]+=*$/.test(xdrText), `toXDR no es base64: ${xdrText.slice(0, 24)}…`);
      const back = KTB.fromXDR(xdrText, KNetworks.TESTNET);
      assert(Buffer.from(back.hash()).equals(Buffer.from(tx.hash())), 'ida y vuelta XDR cambió el hash');
      const sig = await created.signTransaction(xdrText, KNetworks.TESTNET);
      assert(ed25519.verify(sig, new Uint8Array(tx.hash()), created.publicKeyRaw()), 'firma de tx inválida');
      assert(Keypair.fromPublicKey(created.publicAddress()).verify(Buffer.from(tx.hash()), Buffer.from(sig)), 'Keypair.verify rechaza la firma');
      return `ok (${xdrText.slice(0, 12)}…)`;
    });
    {
      // Solo informativo: @stellar/stellar-base de la app resuelve a su dist min.js (trae su propio Buffer, sin parche).
      const t = new TransactionBuilder(new Account(created.publicAddress(), '1'), { fee: '100', networkPassphrase: Networks.TESTNET })
        .addOperation(Operation.manageData({ name: 'cfc', value: 'x' }))
        .setTimeout(60)
        .build()
        .toXDR();
      console.log(`${SELFTEST_PREFIX} INFO stellar-base (app, min.js) toXDR=${t.slice(0, 16)}… (la app no arma transacciones con él)`);
    }
    await check('load misma sesión', async () => {
      const k = await kit.WebCryptoControlKey.load({ keyId });
      assert(k && k.publicAddress() === created.publicAddress(), 'load no devuelve la misma llave');
      const msg = utf8('load');
      assert(verifyMsg(await k.signMessage(msg), msg, k.publicKeyRaw()), 'firma inválida');
    });
    await native.setStoredValue(
      LAST_KEY,
      JSON.stringify({ keyId, address: created.publicAddress(), at: new Date().toISOString() }),
    );
  }

  // 3) importFromSeed con semilla conocida: comprueba que el sobre de JS y el Swift hablan el mismo formato.
  await check('importFromSeed = llave pública esperada', async () => {
    const seed = randomBytes(32);
    const expected = ed25519.getPublicKey(seed);
    const kid = `selftest-seed-${runId}`;
    const k = await kit.WebCryptoControlKey.importFromSeed(seed, { keyId: kid });
    assert(bytesToHex(k.publicKeyRaw()) === bytesToHex(expected), 'llave pública distinta a la de la semilla');
    assert(k.publicAddress() === Keypair.fromRawEd25519Seed(Buffer.from(seed)).publicKey(), 'G… distinta a stellar-sdk');
    const msg = utf8('semilla');
    assert(verifyMsg(await k.signMessage(msg), msg, expected), 'firma inválida');
    await kit.WebCryptoControlKey.remove(kid);
    assert((await kit.WebCryptoControlKey.load({ keyId: kid })) === null, 'remove no borró la llave');
    return 'pública, firma y remove ok';
  });
  await check('importFromSeed rechaza semilla corta', async () => {
    try {
      await kit.WebCryptoControlKey.importFromSeed(new Uint8Array(16));
    } catch (e) {
      return String((e as Error).message);
    }
    throw new Error('aceptó 16 bytes');
  });
  await check('load de llave inexistente = null', async () => {
    assert((await kit.WebCryptoControlKey.load({ keyId: `nada-${runId}` })) === null, 'no devolvió null');
  });

  // 4) Caché de direcciones y JWT de respaldo.
  await check('caché de direcciones', async () => {
    const cache = (globalThis as any).__cfcAddressCache;
    const key = { userId: `selftest-${runId}`, appId: 'x', chain: 'stellar', network: 'testnet' };
    assert((await cache.read(key)) === null, 'debía empezar vacío');
    await cache.write(key, 'GTEST');
    assert((await cache.read(key)) === 'GTEST', 'no leyó lo escrito');
    await native.setStoredValue(`cfc-address:${key.userId}:x:stellar:testnet`, null);
  });
  const prevJwt = getNativeCavosJwt();
  await check('token de respaldo (__cfcCavosToken)', async () => {
    setNativeCavosJwt('aaa.bbb.ccc');
    assert((globalThis as any).__cfcCavosToken() === 'aaa.bbb.ccc', 'no devuelve el JWT capturado');
    setNativeCavosJwt(null);
    assert((globalThis as any).__cfcCavosToken() === null, 'no se limpia');
  });
  setNativeCavosJwt(prevJwt);

  // 5) CavosStellar.connect real con identidad falsa y /api/wallets simulado.
  if (STELLAR_NETWORK !== 'testnet') {
    report(false, 'connect simulado', 'omitido: la red no es testnet');
  } else {
    await connectChecks(runId, check, assert);
  }

  console.log(`${SELFTEST_PREFIX} DONE pass=${pass} fail=${fail}`);
  return { pass, fail };
}

type Check = (name: string, fn: () => Promise<string | void>) => Promise<void>;

async function connectChecks(runId: string, check: Check, assert: (c: unknown, m: string) => void) {
  const realFetch = globalThis.fetch;
  const calls: { method: string; url: string; auth: string | null; body?: any }[] = [];
  let lookup: () => Response = () => new Response(JSON.stringify({ found: false }), { status: 200 });
  const blocked: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
    const method = (init?.method ?? 'GET').toUpperCase();
    if (url.includes('/api/wallets')) {
      const h = (init?.headers ?? {}) as Record<string, string>;
      calls.push({ method, url, auth: h.Authorization ?? null, body: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (method === 'GET') return lookup();
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    if (/horizon-testnet\.stellar\.org|soroban-testnet/.test(url) && method === 'GET') return realFetch(input as any, init);
    blocked.push(`${method} ${url}`);
    throw new Error(`autoprueba: red bloqueada ${method} ${url}`);
  }) as typeof fetch;
  const prevJwt = getNativeCavosJwt();
  setNativeCavosJwt('selftest.fake.jwt');
  const identity = { userId: `cfc-selftest-${runId}`, email: 'selftest@example.invalid', provider: 'google' };
  const opts = {
    chain: 'stellar' as const,
    network: 'testnet' as const,
    identity,
    appSalt: APP_SALT,
    appId: CAVOS_APP_ID || 'selftest-app',
    environment: CAVOS_ENVIRONMENT,
  };
  const cache = (globalThis as any).__cfcAddressCache as { write: (k: any, a: string) => Promise<void> };
  const realWrite = cache.write;
  const cacheWrites: { key: any; address: string }[] = [];
  cache.write = async (k: any, a: string) => {
    cacheWrites.push({ key: k, address: a });
    return realWrite.call(cache, k, a);
  };
  const cacheKeyOf = (k: any) => `cfc-address:${k.userId}:${k.appId}:${k.chain}:${k.network}`;
  const native = getCavosNativeModule();
  let address = '';
  const cleanup: string[] = [];
  try {
    await check('connect: cuenta nueva (lookup vacío → registro)', async () => {
      const w: any = await Cavos.connect(opts as any);
      address = w.address;
      cleanup.push(address);
      assert(w.status === 'undeployed', `estado ${w.status}`);
      const get = calls.find((c) => c.method === 'GET');
      const post = calls.find((c) => c.method === 'POST');
      assert(get, 'no consultó /api/wallets');
      assert(get!.auth === 'Bearer selftest.fake.jwt', `GET sin el JWT de respaldo (${get!.auth})`);
      assert(new URL(get!.url).searchParams.get('user_social_id') === identity.userId, 'GET sin user_social_id');
      assert(post && post.body?.address === address, 'no registró la dirección');
      assert(post!.auth === 'Bearer selftest.fake.jwt', 'POST sin JWT');
      const wrote = cacheWrites.find((c) => c.address === address);
      assert(wrote, 'el kit no escribió la dirección en el caché');
      assert((await native.getStoredValue(cacheKeyOf(wrote!.key))) === address, 'el caché nativo no tiene la dirección');
      try {
        const { Account: KAccount, Networks: KNetworks, Operation: KOperation, TransactionBuilder: KTB } = kitSdk;
        const tx = new KTB(new KAccount(address, '1'), { fee: '100', networkPassphrase: KNetworks.TESTNET })
          .addOperation(KOperation.manageData({ name: 'cfc-selftest', value: 'xdr' }))
          .setTimeout(60)
          .build();
        const signed = KTB.fromXDR(await w.signXdr(tx.toXDR()), KNetworks.TESTNET) as any;
        const s0 = signed.signatures[0];
        assert(s0 && Keypair.fromPublicKey(address).verify(Buffer.from(signed.hash()), Buffer.from(s0.signature())), 'firma XDR inválida');
      } catch (e) {
        throw new Error(`wallet.signXdr: ${e instanceof Error ? e.message : e}`);
      }
      const msg = utf8('connect');
      const r = await w.signMessage(msg);
      assert(r.publicKey === address, 'firma con otra llave');
      assert(ed25519.verify(r.signature, kit.prefixedMessageBytes(msg), StrKey.decodeEd25519PublicKey(address)), 'firma inválida');
      return `${short(address)} undeployed, signMessage y signXdr ok`;
    });
    if (address) {
      await check('connect: cuenta existente (lookup encuentra) → misma llave', async () => {
        calls.length = 0;
        lookup = () => new Response(JSON.stringify({ found: true, address }), { status: 200 });
        const w: any = await Cavos.connect(opts as any);
        assert(w.address === address, 'otra dirección');
        assert(w.status === 'undeployed', `estado ${w.status} (esperaba undeployed con la llave guardada)`);
        assert(!calls.some((c) => c.method === 'POST'), 'volvió a registrar');
        const msg = utf8('existente');
        const r = await w.signMessage(msg);
        assert(ed25519.verify(r.signature, kit.prefixedMessageBytes(msg), StrKey.decodeEd25519PublicKey(address)), 'firma inválida');
      });
      await check('connect: registro caído → dirección del caché', async () => {
        calls.length = 0;
        lookup = () => new Response('caído', { status: 503 });
        const w: any = await Cavos.connect(opts as any);
        assert(w.address === address, 'no usó el caché');
        assert(w.status === 'undeployed', `estado ${w.status}`);
      });
      await check('connect: sin JWT → lookup se salta y usa el caché', async () => {
        setNativeCavosJwt(null);
        const w: any = await Cavos.connect(opts as any);
        assert(w.address === address, 'no usó el caché');
        setNativeCavosJwt('selftest.fake.jwt');
      });
    }
    await check('connect: dirección de otro dispositivo → needs-device-approval', async () => {
      const other = Keypair.random().publicKey();
      lookup = () => new Response(JSON.stringify({ found: true, address: other }), { status: 200 });
      const w: any = await Cavos.connect({ ...opts, identity: { ...identity, userId: `${identity.userId}-b` } } as any);
      cleanup.push(other);
      assert(w.address === other, 'otra dirección');
      assert(w.status === 'needs-device-approval', `estado ${w.status}`);
    });
    await check('connect: ninguna llamada de red fuera de lo permitido', async () => {
      assert(blocked.length === 0, blocked.join(', '));
    });
  } finally {
    globalThis.fetch = realFetch;
    cache.write = realWrite;
    for (const c of cacheWrites) await native.setStoredValue(cacheKeyOf(c.key), null).catch(() => void 0);
    setNativeCavosJwt(prevJwt);
    for (const a of cleanup) await kit.WebCryptoControlKey.remove(a).catch(() => void 0);
  }
}
