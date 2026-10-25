// Textos amables para errores del kit Cavos (nunca "kit/auth: ... 401") y autofill del código por correo.
// Puro: lo usan el parche del modal (scripts/patch-cavos-kit.mjs) y las pantallas.

export const OTP_INVALID = 'El código no es válido o ya venció. Pide uno nuevo: solo sirve el último que te enviamos.';
export const OTP_STALE = 'Ese código ya no sirve porque pediste otro o la app se recargó. Toca «Reenviar código» y usa el más reciente.';
export const OTP_RATE = 'Pediste varios códigos seguidos. Espera un minuto y vuelve a intentar.';
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
