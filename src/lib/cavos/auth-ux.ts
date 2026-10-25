// Textos amables para errores del kit Cavos (nunca "kit/auth: ... 401") y autofill del código por correo.
// Puro: lo usan el parche del modal (scripts/patch-cavos-kit.mjs) y las pantallas.

export const OTP_INVALID = 'El código no es válido o ya venció. Pide uno nuevo: solo sirve el último que te enviamos.';
export const OTP_STALE = 'Ese código ya no sirve porque pediste otro o la app se recargó. Toca «Reenviar código» y usa el más reciente.';
export const OTP_RATE = 'Pediste varios códigos seguidos. Espera unos minutos y vuelve a intentar. Mientras, revisa tu carpeta de Spam: puede que el código ya esté ahí.';
export const OTP_COOLDOWN = 'Ya te enviamos un código hace poco. Revisa tu bandeja y la carpeta de Spam, o espera un minuto para pedir otro.';
export const SPAM_HINT = ' Si no llega en un minuto, revisa tu carpeta de Spam o Correo no deseado.';
export const EMAIL_INVALID = 'Revisa tu correo: parece que tiene un error.';
export const EMAIL_UNSUPPORTED = 'Todavía no podemos enviar códigos a ese proveedor de correo. Usa Gmail, Outlook o Proton, o entra con Google o Apple.';
export const ORIGIN_NOT_ALLOWED = 'Este sitio todavía no está habilitado en Cavos. Avísale al equipo de Campeones FC.';
export const NETWORK = 'No hay conexión con Cavos. Revisa tu internet y vuelve a intentar.';
export const POPUP_CLOSED = 'Cerraste la ventana antes de terminar. Vuelve a intentarlo.';
export const RELOGIN = 'Tu sesión de Cavos terminó. Vuelve a entrar con la misma cuenta.';
export const PASSKEY = 'No pudimos crear tu passkey en este navegador. Puedes saltar este paso y seguir.';
export const GENERIC = 'No pudimos completar la entrada con Cavos. Vuelve a intentarlo en un momento.';

/** Error del kit (o nuestro) -> texto para la persona. */
export function authErrorText(raw: string | null | undefined): string {
  const m = String(raw ?? '');
  if (!m) return GENERIC;
  if (/invalid_nonce/i.test(m)) return OTP_STALE;
  // Los de Cavos van antes que OTP_INVALID: «Too many attempts. Try again in a few minutes.» es su rate_limited.
  if (/code_cooldown|code was just sent|wait a minute/i.test(m)) return OTP_COOLDOWN;
  if (/rate_limited|try again in a few minutes/i.test(m)) return OTP_RATE;
  if (/invalid_code|code_expired|expired_code|otp_expired|invalid or expired code|too many attempts/i.test(m)) return OTP_INVALID;
  if (/\b429\b|too_many|rate.?limit/i.test(m)) return OTP_RATE;
  if (/email_undeliverable|provider is not supported/i.test(m)) return EMAIL_UNSUPPORTED;
  if (/invalid_email|valid email/i.test(m)) return EMAIL_INVALID;
  if (/allowed web origins|origin/i.test(m) && /vault|cavos/i.test(m)) return ORIGIN_NOT_ALLOWED;
  if (/passkey|webauthn|prf|NotAllowedError|not allowed|timed out or was not allowed/i.test(m)) return PASSKEY;
  if (/popup|closed by user|cancel/i.test(m)) return POPUP_CLOSED;
  if (/Failed to fetch|NetworkError|network|timed? ?out|ECONN/i.test(m)) return NETWORK;
  if (/token|401|unauthori[sz]ed|sign in again|no login/i.test(m)) return RELOGIN;
  // Un texto ya en español (nuestro) pasa tal cual; lo técnico en inglés nunca.
  if (/[áéíóúñ¿¡]/i.test(m) && !/kit\/|\{|\}/.test(m)) return m;
  return GENERIC;
}

/**
 * Autofill de iOS o pegado: llega el código entero en una casilla -> repartir desde ahí.
 * null = una tecla normal (el kit sigue con su lógica de un carácter).
 */
export function otpFill(prev: string, i: number, chars: string, length: number): { code: string; focus: number } | null {
  const c = String(chars ?? '');
  if (c.length < 3) return null;
  const code = (String(prev ?? '').slice(0, i) + c).slice(0, length);
  return { code, focus: Math.min(code.length, length - 1) };
}

// ── Pausa entre códigos por correo ──────────────────────────────────────────────────────────────────────────
// Cavos responde 429 (code_cooldown / rate_limited) si se piden códigos seguidos, y el contador del modal se
// reinicia al cerrarlo o recargar. Guardamos por correo cuándo se envió el último y hasta cuándo esperar, y el
// modal (parche en scripts/patch-cavos-kit.mjs) lo consulta antes de pedir otro: si hay un código vigente se
// salta el envío y va directo a «Ingresa tu código» (el código no está atado al navegador: sirve el último).

export const OTP_RESEND_S = 60;
export const OTP_RATE_S = 180;
/** Un código de Cavos vence a los 10 minutos. */
export const OTP_TTL_S = 600;

type KV = { getItem(k: string): string | null; setItem(k: string, v: string): void };
type OtpRecord = { sentAt?: number; until?: number };

const otpKey = (email: string) => `cfc:otp:${String(email ?? '').trim().toLowerCase()}`;

function readOtp(store: KV, email: string): OtpRecord {
  try {
    const v = JSON.parse(store.getItem(otpKey(email)) ?? '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
function writeOtp(store: KV, email: string, r: OtpRecord) {
  try {
    store.setItem(otpKey(email), JSON.stringify(r));
  } catch {
    /* almacenamiento lleno o bloqueado: sin pausa persistente */
  }
}

/** Segundos que faltan para poder pedir otro código a este correo (0 = ya se puede). */
export function otpWait(store: KV, email: string, nowMs = Date.now()): number {
  const { until } = readOtp(store, email);
  return typeof until === 'number' && until > nowMs ? Math.ceil((until - nowMs) / 1000) : 0;
}

/** ¿Hay un código enviado hace menos de 10 min? (se puede ir directo a escribirlo). */
export function otpHasLiveCode(store: KV, email: string, nowMs = Date.now()): boolean {
  const { sentAt } = readOtp(store, email);
  return typeof sentAt === 'number' && nowMs - sentAt < OTP_TTL_S * 1000;
}

export function otpRecordSent(store: KV, email: string, nowMs = Date.now()) {
  writeOtp(store, email, { sentAt: nowMs, until: nowMs + OTP_RESEND_S * 1000 });
}

/** Tras un error de Cavos al pedir el código: si fue por pedir muy seguido, esperar antes del próximo. */
export function otpRecordFailure(store: KV, email: string, raw: string, nowMs = Date.now()) {
  const m = String(raw ?? '');
  const secs = /rate_limited|try again in a few minutes|too_many|\b429\b/i.test(m)
    ? OTP_RATE_S
    : /code_cooldown|code was just sent|wait a minute/i.test(m)
      ? OTP_RESEND_S
      : 0;
  if (!secs) return;
  const prev = readOtp(store, email);
  writeOtp(store, email, { ...prev, until: Math.max(prev.until ?? 0, nowMs + secs * 1000) });
}

export const otpWaitText = (s: number) =>
  `Espera ${s} s antes de pedir otro código. Mientras, revisa tu bandeja y la carpeta de Spam.`;

/** Lo que usa el modal parchado (globalThis.__cfcOtpGuard). */
export function otpGuard(store: KV) {
  return {
    /** null = pedir el código; 'skip' = ya hay uno vigente, ir a escribirlo; string = error para mostrar. */
    before(email: string): null | 'skip' | string {
      const wait = otpWait(store, email);
      if (!wait) return null;
      return otpHasLiveCode(store, email) ? 'skip' : otpWaitText(wait);
    },
    sent: (email: string) => otpRecordSent(store, email),
    /** El código ya se usó: la próxima entrada pide uno nuevo (sin esperar). */
    verified: (email: string) => writeOtp(store, email, {}),
    failed: (email: string, e: unknown) => otpRecordFailure(store, email, e instanceof Error ? e.message : String(e)),
    /** Segundos para el contador «Reenviar en N s» (mínimo 1 para que arranque). */
    countdown: (email: string) => Math.max(1, otpWait(store, email) || OTP_RESEND_S),
  };
}
