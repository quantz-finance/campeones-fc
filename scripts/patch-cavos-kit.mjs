// Parche mínimo del modal de @cavos/kit 0.4.4 (postinstall). Basado en el de Meteorito (0.3.0), reescrito para 0.4.4.
// Revisado en 0.4.4: siguen los dos problemas que Meteorito parchaba.
//  1) Errores crudos: el modal muestra e.message tal cual ("kit/auth: ... 401 {...}"). Ahora todo error pasa por
//     globalThis.__cfcAuthError (src/lib/cavos/auth-ux.ts) y sale en español.
//  2) Autofill del código en iOS: setOtpDigit guarda solo el ÚLTIMO carácter (slice(-1)) y la 1.ª casilla tiene
//     maxLength 1, así que el autofill recortaba el código. Ahora el código entero se reparte (globalThis.__cfcOtpFill)
//     y la 1.ª casilla acepta el largo completo.
//  3) Copy del flujo por correo y de los botones en español (tuteo). Opcional: si un texto cambió, solo se avisa.
//  4) logout() ya no borra la llave del dispositivo (ver REQUIRED 'conservar-llave').
// Falla fuerte si 1), 2) o 4) ya no calzan (el kit cambió): hay que revisar el parche antes de subir de versión.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PATCH_MARK = '/* campeones-patch:cavos-kit 0.4.4 v2 */';

export const REQUIRED = [
  {
    name: 'errores',
    re: /const \[error, setError\] = ((?:react\.)?useState)\(""\);/g,
    to: (_m, us) =>
      `const [error, __setErrorRaw] = ${us}(""); const setError = (m) => __setErrorRaw(typeof m === "string" && m && globalThis.__cfcAuthError ? globalThis.__cfcAuthError(m) : m);`,
  },
  {
    name: 'autofill',
    re: /const digit = normalizeEmailCode\(raw\)\.slice\(-1\);/g,
    to: () =>
      'const __all = normalizeEmailCode(raw); const __fill = globalThis.__cfcOtpFill ? globalThis.__cfcOtpFill(otpCode, i, __all, EMAIL_CODE_LENGTH) : null; if (__fill) { setOtpCode(__fill.code); otpBoxRefs.current[__fill.focus]?.focus(); return; } const digit = __all.slice(-1);',
  },
  { name: 'maxlength', re: /maxLength: 1,/g, to: () => 'maxLength: i === 0 ? EMAIL_CODE_LENGTH : 1,' },
  {
    // 4) logout() borraba la llave de la billetera de ESTE navegador (vault.forget). Sin passkey ni respaldo, la
    //    billetera quedaba huérfana: al volver a entrar, "this device is not an authorized signer". Con
    //    globalThis.__cfcKeepDeviceKey la llave se queda; salir de Cavos sigue borrando la identidad y el token.
    name: 'conservar-llave',
    re: /(VaultClient\.attach\(\{ appId: config\.appId, \.\.\.typeof vault === "object" \? vault : \{\} \}\)\.forget\(identity\.userId, config\.appSalt\)\.catch\(\(\) => void 0\);)/g,
    to: (_m, call) => `if (!globalThis.__cfcKeepDeviceKey) ${call}`,
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

/** Devuelve el fuente parchado. Idempotente; lanza si falta un punto requerido. */
export function patchKitSource(src) {
  if (src.includes(PATCH_MARK)) return { out: src, applied: [], missingCopy: [] };
  if (src.startsWith('/* campeones-patch:')) throw new Error('patch-cavos-kit: el kit tiene un parche viejo; reinstala @cavos/kit (rm -rf node_modules/@cavos/kit && npm i).');
  let out = src;
  const applied = [];
  for (const r of REQUIRED) {
    r.re.lastIndex = 0;
    const hits = out.match(r.re)?.length ?? 0;
    if (hits !== 1) throw new Error(`patch-cavos-kit: "${r.name}" calzó ${hits} veces (esperaba 1). ¿Cambió @cavos/kit?`);
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
