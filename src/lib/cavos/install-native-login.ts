// Envuelve NativeCavosAuth.prototype.login (kit 0.4.4) en iOS/Android. Solo lo importa bridge.native.tsx.
//  1) Antes de abrir el navegador cierra cualquier sesión de autenticación que haya quedado viva de antes
//     (un intento previo, o un reload de JS con la hoja abierta: el módulo nativo la recuerda y rechaza la nueva con
//     "Another web browser is already open"). Si aun así llega ese error, cierra y reintenta UNA vez.
//     Lo de dos toques seguidos lo evita singleFlight en el puente (no llega aquí).
//  2) provider 'email': entrada por correo con la página web de producción (ver email-handoff.ts).
import { NativeCavosAuth } from '@cavos/kit/react-native';
import * as WebBrowser from 'expo-web-browser';
import { DEFAULT_NATIVE_API_BASE } from '../api';
import { handoffStartUrl, makeHandoffState, parseHandoffReturn } from './email-handoff';
import { isBrowserAlreadyOpen } from './login-guard';

type AuthLike = {
  opts: { redirectUri: string };
  loginSecret: string | null;
  identityFromAuthData: (data: string, provider: string, email?: string) => Promise<unknown>;
};
type Login = ((this: AuthLike, provider: string) => Promise<unknown>) & { __cfcLogin?: boolean };

/** Origen https de la página de correo. Fijo a producción salvo override explícito https. */
export function emailHandoffBase(): string {
  const raw = (process.env.EXPO_PUBLIC_CAVOS_EMAIL_HANDOFF_BASE ?? '').trim();
  return /^https:\/\//i.test(raw) ? raw.replace(/\/$/, '') : DEFAULT_NATIVE_API_BASE;
}

function closeStaleSessions() {
  try {
    WebBrowser.dismissAuthSession();
  } catch {
    /* no había sesión */
  }
  try {
    void WebBrowser.dismissBrowser().catch(() => undefined);
  } catch {
    /* no había navegador */
  }
}

const messageOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function emailLogin(this: AuthLike) {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const state = makeHandoffState(random);
  // Efímera: no comparte cookies con Safari y no muestra el aviso «quiere usar … para iniciar sesión».
  const result = await WebBrowser.openAuthSessionAsync(handoffStartUrl(emailHandoffBase(), state), this.opts.redirectUri, {
    preferEphemeralSession: true,
  });
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    throw new Error(result.type === 'cancel' ? 'kit/native-auth: login cancelled' : 'kit/native-auth: login failed');
  }
  const { token, secret } = parseHandoffReturn(result.url, state);
  // El kit comprueba otra vez que el nonce del token sea sha256(secret) (assertLoginBinding) y lo consume.
  this.loginSecret = secret;
  return this.identityFromAuthData(token, 'email');
}

export function installNativeLogin(): boolean {
  const proto = NativeCavosAuth.prototype as unknown as { login?: Login };
  const orig = proto.login;
  if (typeof orig !== 'function') {
    console.warn('[cavos] no pude envolver NativeCavosAuth.login');
    return false;
  }
  if (orig.__cfcLogin) return true;
  const wrapped: Login = async function (this: AuthLike, provider: string) {
    closeStaleSessions();
    const run = () => (provider === 'email' ? emailLogin.call(this) : orig.call(this, provider));
    try {
      return await run();
    } catch (e) {
      if (!isBrowserAlreadyOpen(messageOf(e))) throw e;
      closeStaleSessions();
      return await run();
    }
  };
  wrapped.__cfcLogin = true;
  proto.login = wrapped;
  return true;
}
