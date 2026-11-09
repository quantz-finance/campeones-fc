// Parche mínimo del modal de @cavos/kit 0.4.4 (postinstall). Basado en el de Meteorito (0.3.0), reescrito para 0.4.4.
// Revisado en 0.4.4: siguen los dos problemas que Meteorito parchaba.
//  1) Errores crudos: el modal muestra e.message tal cual ("kit/auth: ... 401 {...}"). Ahora todo error pasa por
//     globalThis.__cfcAuthError (src/lib/cavos/auth-ux.ts) y sale en español.
//  2) Autofill del código en iOS: setOtpDigit guarda solo el ÚLTIMO carácter (slice(-1)) y la 1.ª casilla tiene
//     maxLength 1, así que el autofill recortaba el código. Ahora el código entero se reparte (globalThis.__cfcOtpFill)
//     y la 1.ª casilla acepta el largo completo.
//  3) Copy del flujo por correo y de los botones en español (tuteo). Opcional: si un texto cambió, solo se avisa.
//  4) logout() ya no borra la llave del dispositivo (ver REQUIRED 'conservar-llave').
//  5) Sin PRF, la passkey de respaldo se salta en vez de trabar el login (REQUIRED 'passkey-sin-prf').
//  6) Pausa entre códigos por correo que sobrevive a cerrar el modal o recargar (globalThis.__cfcOtpGuard, ver
//     src/lib/cavos/auth-ux.ts): si hay un código vigente no se pide otro, y el contador arranca con lo que falta.
//  7) «Revisa tu carpeta de Spam» en la pantalla del código.
//  8) Medidas aceptadas del enclave de Cavos (PCR0). 0.4.4 solo acepta las imágenes viejas; Cavos publicó y puso en
//     producción la release v2 (cavos-labs/cavos-recovery, 2026-11-05) y el código por correo fallaba con
//     "kit/nitro: enclave image measurement is not accepted". Se agregan v1 y v2 de las releases firmadas de Cavos
//     (las mismas que acepta @cavos/kit 0.5.x) en los chunks del kit. La firma de AWS Nitro se sigue verificando.
// Falla fuerte si 1), 2), 4), 5), 6) o 7) ya no calzan (el kit cambió): hay que revisar el parche antes de subir de versión.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PATCH_MARK = '/* campeones-patch:cavos-kit 0.4.4 v4 */';

export const REQUIRED = [
  {
    name: 'errores',
    done: (s) => s.includes('__setErrorRaw'),
    re: /const \[error, setError\] = ((?:react\.)?useState)\(""\);/g,
    to: (_m, us) =>
      `const [error, __setErrorRaw] = ${us}(""); const setError = (m) => __setErrorRaw(typeof m === "string" && m && globalThis.__cfcAuthError ? globalThis.__cfcAuthError(m) : m);`,
  },
  {
    name: 'autofill',
    done: (s) => s.includes('globalThis.__cfcOtpFill'),
    re: /const digit = normalizeEmailCode\(raw\)\.slice\(-1\);/g,
    to: () =>
      'const __all = normalizeEmailCode(raw); const __fill = globalThis.__cfcOtpFill ? globalThis.__cfcOtpFill(otpCode, i, __all, EMAIL_CODE_LENGTH) : null; if (__fill) { setOtpCode(__fill.code); otpBoxRefs.current[__fill.focus]?.focus(); return; } const digit = __all.slice(-1);',
  },
  { name: 'maxlength', done: (s) => s.includes('maxLength: i === 0 ? EMAIL_CODE_LENGTH : 1,'), re: /maxLength: 1,/g, to: () => 'maxLength: i === 0 ? EMAIL_CODE_LENGTH : 1,' },
  {
    // 4) logout() borraba la llave de la billetera de ESTE navegador (vault.forget). Sin passkey ni respaldo, la
    //    billetera quedaba huérfana: al volver a entrar, "this device is not an authorized signer". Con
    //    globalThis.__cfcKeepDeviceKey la llave se queda; salir de Cavos sigue borrando la identidad y el token.
    name: 'conservar-llave',
    done: (s) => s.includes('globalThis.__cfcKeepDeviceKey'),
    re: /(VaultClient\.attach\(\{ appId: config\.appId, \.\.\.typeof vault === "object" \? vault : \{\} \}\)\.forget\(identity\.userId, config\.appSalt\)\.catch\(\(\) => void 0\);)/g,
    to: (_m, call) => `if (!globalThis.__cfcKeepDeviceKey) ${call}`,
  },
  {
    // 5) Navegador/autenticador sin la extensión PRF: crear la passkey de respaldo fallaba con
    //    "kit/passkey-prf: ... PRF is unsupported here" y el login quedaba ahí. Se salta el respaldo y se sigue
    //    con la llave del dispositivo (la billetera ya existe); otros errores salen en español.
    name: 'passkey-sin-prf',
    done: (s) => s.includes('__cfcPasskeySkip'),
    re: /(\} catch \(e\) \{\n\s*)setPkError\(e instanceof Error \? e\.message : "We couldn't set up your passkey\. Try again\."\);/g,
    to: (_m, head) =>
      `${head}const __m = e instanceof Error ? e.message : ""; if (/prf|not supported|unsupported|NotSupportedError/i.test(__m)) { globalThis.__cfcPasskeySkip = true; finishSecureStep(); return; } setPkError(globalThis.__cfcAuthError ? globalThis.__cfcAuthError(__m || "passkey") : (__m || "We couldn't set up your passkey. Try again."));`,
  },
  {
    // 6a) Antes de pedir el código: respetar la pausa guardada; después: registrar envío o 429.
    name: 'otp-pausa',
    done: (s) => s.includes('__cfcOtpGuard; const __b'),
    re: /await auth\.sendOtp\(email\);/g,
    to: () =>
      `const __g = globalThis.__cfcOtpGuard; const __b = __g ? __g.before(email) : null; if (__b === "skip") return; if (__b) throw new Error(__b); try { await auth.sendOtp(email); } catch (__e) { if (__g) __g.failed(email, __e); throw __e; } if (__g) __g.sent(email);`,
  },
  {
    // 6b) El contador «Reenviar en N s» arranca con lo que falta de la pausa (no siempre 60).
    name: 'otp-contador',
    count: 2,
    done: (s) => s.includes('__cfcOtpGuard.countdown'),
    re: /setResendCountdown\(60\);/g,
    to: () => 'setResendCountdown(globalThis.__cfcOtpGuard ? globalThis.__cfcOtpGuard.countdown(email) : 60);',
  },
  {
    // 6c) Código usado: se borra la pausa (un código sirve una sola vez; la próxima entrada pide uno nuevo).
    name: 'otp-usado',
    done: (s) => s.includes('__cfcOtpGuard.verified'),
    re: /const id = await auth\.verifyOtp\(email, code\);/g,
    to: (m) => `${m} if (globalThis.__cfcOtpGuard) globalThis.__cfcOtpGuard.verified(email);`,
  },
  {
    // 7) Los códigos de Cavos suelen caer en Spam.
    name: 'otp-spam',
    done: (s) => s.includes('__cfcSpamHint'),
    re: /(children: email \}\),\n\s*)"\."/g,
    to: (_m, head) => `${head}".", /* __cfcSpamHint */ " Si no llega en un minuto, revisa tu carpeta de Spam o Correo no deseado."`,
  },
];

const COPY = [
  ['"Enter your code"', '"Ingresa tu código"'],
  ['"We sent a 9-character code to "', '"Solo sirve el último código que pediste. Lo enviamos a "'],
  ['`Resend in ${resendCountdown}s`', '`Reenviar en ${resendCountdown} s`'],
  ['"Resend code"', '"Reenviar código"'],
  ['"Use a different email"', '"Usar otro correo"'],
  ['"Sign in with email"', '"Entra con tu correo"'],
  ['"We\'ll send a secure sign-in code to your inbox."', '"Te enviamos un código de 9 caracteres a tu correo. Funciona con Gmail, Outlook y Proton."'],
  ['"your@email.com"', '"tu@correo.com"'],
  ['"Send code"', '"Enviar código"'],
  ['"Sending\\u2026"', '"Enviando\\u2026"'],
  ['"Verifying\\u2026"', '"Verificando\\u2026"'],
  ['"Continue"', '"Continuar"'],
  ['`Sign in to ${appName}`', '`Entra a ${appName}`'],
  ['"Sign in or sign up"', '"Entra o crea tu cuenta"'],
  ['children: "or" }', 'children: "o" }'],
  ['"By continuing you agree to the"', '"Al continuar aceptas la"'],
  ['"Privacy Policy"', '"Política de privacidad"'],
  ['" & "', '" y los "'],
  ['"Terms"', '"Términos"'],
  ['"Secured by"', '"Protegido por"'],
  ['"Continue with Google"', '"Continuar con Google"'],
  ['"Continue with Apple"', '"Continuar con Apple"'],
  ['"Continue with email"', '"Continuar con correo"'],
];

/** PCR0 de las releases firmadas de cavos-labs/cavos-recovery (ver measurements.json de cada release). */
export const ENCLAVE_PCR0 = {
  v1: '7f32a8b51fabf733339db5425d31851ad2919322581fe21793db17975c44a33702fa9be0c81a391b32049a0daf220cdb',
  v2: '36d3ceb0759af00c1c1b3f055c271b4fe628235036c67b6e3234199454167f41bfc0c6387061481ba3331740891974ea',
};
export const ATTESTATION_MARK = '/* campeones-patch:enclave-pcr0 v2 */';
const PCR0_044 = /(pcr0: \[\n\s*"f388b0bf627bdad34968ebab083688b999da2aaa369a65323a3085725de0fc79d7cf0fab6527d57e06b4b10950a150f9",\n\s*"5ec163560006f105b5448c2db77ecf5ec442e00abd475f65349d6d93e837279652708770c50b3aa2e8676f553f572825")(\n\s*\])/g;

/** Agrega las medidas v1/v2 del enclave a DEFAULT_SOCIAL_RECOVERY_ATTESTATION. null = el archivo no la tiene. */
export function patchAttestationSource(src) {
  if (src.includes(ATTESTATION_MARK)) return { out: src, applied: false };
  PCR0_044.lastIndex = 0;
  const hits = src.match(PCR0_044)?.length ?? 0;
  if (!hits) return null;
  if (hits !== 1) throw new Error(`patch-cavos-kit: "enclave-pcr0" calzó ${hits} veces (esperaba 1). ¿Cambió @cavos/kit?`);
  PCR0_044.lastIndex = 0;
  const out = src.replace(PCR0_044, (_m, head, tail) => `${head}, ${ATTESTATION_MARK} "${ENCLAVE_PCR0.v2}", "${ENCLAVE_PCR0.v1}"${tail}`);
  return { out, applied: true };
}

/** Archivos del kit que llevan su propia copia de la lista (ESM comparte el chunk; CJS la duplica). */
export const ATTESTATION_FILES = ['chunk-T2ZMQHFD.mjs', 'index.js', 'react/index.js', 'vault/index.js', 'react-native/index.js'];

/** Devuelve el fuente parchado. Idempotente; lanza si falta un punto requerido. */
export function patchKitSource(src) {
  if (src.includes(PATCH_MARK)) return { out: src, applied: [], missingCopy: [] };
  // Parche de una versión anterior (p. ej. node_modules del caché de Vercel): quitar la marca y aplicar lo que falte.
  let out = src.replace(/^\/\* campeones-patch:[^\n]*\*\/\n/, '');
  const applied = [];
  for (const r of REQUIRED) {
    if (r.done && r.done(out)) continue;
    r.re.lastIndex = 0;
    const hits = out.match(r.re)?.length ?? 0;
    const want = r.count ?? 1;
    if (hits !== want) throw new Error(`patch-cavos-kit: "${r.name}" calzó ${hits} veces (esperaba ${want}). ¿Cambió @cavos/kit?`);
    r.re.lastIndex = 0;
    out = out.replace(r.re, r.to);
    applied.push(r.name);
  }
  const missingCopy = [];
  for (const [from, to] of COPY) {
    if (out.includes(from)) {
      out = out.split(from).join(to);
      applied.push(`copy:${from.slice(1, 24)}`);
    } else missingCopy.push(from);
  }
  return { out: `${PATCH_MARK}\n${out}`, applied, missingCopy };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const dist = new URL('../node_modules/@cavos/kit/dist/', import.meta.url);
  let pcrHits = 0;
  for (const f of ATTESTATION_FILES) {
    const p = fileURLToPath(new URL(f, dist));
    if (!existsSync(p)) continue;
    const r = patchAttestationSource(readFileSync(p, 'utf8'));
    if (!r) continue;
    pcrHits++;
    if (r.applied) {
      writeFileSync(p, r.out);
      console.log(`[patch-cavos-kit] ${f}: medidas del enclave v1/v2`);
    }
  }
  if (existsSync(fileURLToPath(dist)) && !pcrHits) throw new Error('patch-cavos-kit: no encontré la lista PCR0 del enclave. ¿Cambió @cavos/kit?');
  const base = new URL('../node_modules/@cavos/kit/dist/react/', import.meta.url);
  for (const f of ['index.js', 'index.mjs']) {
    const p = fileURLToPath(new URL(f, base));
    if (!existsSync(p)) {
      console.log(`[patch-cavos-kit] sin ${f} (¿kit no instalado?), se omite`);
      continue;
    }
    const { out, applied, missingCopy } = patchKitSource(readFileSync(p, 'utf8'));
    if (applied.length) {
      writeFileSync(p, out);
      console.log(`[patch-cavos-kit] ${f}: ${applied.length} cambios`);
    } else console.log(`[patch-cavos-kit] ${f}: ya parchado`);
    if (missingCopy.length) console.warn(`[patch-cavos-kit] ${f}: textos no encontrados (se quedan en inglés): ${missingCopy.join(', ')}`);
  }
}
