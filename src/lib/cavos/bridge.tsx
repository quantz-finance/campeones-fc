// Chunk perezoso (web): proveedor Cavos + puente hacia cavosStore. Aquí viven @cavos/kit, stellar-sdk, etc.
import '../polyfills';
import { CavosProvider, useCavos } from '@cavos/kit/react';
import { useEffect, useRef } from 'react';
import { colors } from '../../ui/theme';
import { authErrorText, otpFill } from './auth-ux';
import { APP_SALT, CAVOS_APP_ID, CAVOS_ENVIRONMENT, CAVOS_RP_ID, STELLAR_NETWORK } from './config';
import { cavosStore, type CavosBridged } from './store';

// Modal del kit (parche en scripts/patch-cavos-kit.mjs): errores en español y autofill del código.
if (typeof window !== 'undefined') {
  (globalThis as any).__cfcAuthError = authErrorText;
  (globalThis as any).__cfcOtpFill = otpFill;
}

const TOKEN_KEY = `cavos-kit:token:${CAVOS_APP_ID}`;

function b64(u: Uint8Array) {
  let s = '';
  u.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function stellarWallet(c: ReturnType<typeof useCavos>): any {
  const w = c.session?.wallet ? c.session.wallet('stellar') : c.wallet;
  if (!w || (w as any).chain !== 'stellar') throw new Error('Tu billetera de Cavos todavía no está lista.');
  return w;
}

function Bridge() {
  const c = useCavos();
  const ref = useRef(c);
  ref.current = c;
  // Publicar solo cuando cambia algo visible (las funciones leen siempre el contexto más reciente).
  useEffect(() => {
    const value: CavosBridged = {
      isLoading: c.isLoading,
      isAuthenticated: c.isAuthenticated,
      address: c.address,
      email: c.user?.email ?? null,
      error: c.authError ? authErrorText(c.authError) : null,
      openModal: () => {
        ref.current.clearAuthError();
        ref.current.openModal();
      },
      logout: async () => {
        ref.current.logout();
      },
      signMessage: async (m) => {
        try {
          const r = await stellarWallet(ref.current).signMessage(m);
          return { publicKey: r.publicKey, signature: b64(r.signature) };
        } catch (e) {
          console.error('[cavos] signMessage', e);
          throw new Error(authErrorText(e instanceof Error ? e.message : String(e)));
        }
      },
      token: () => {
        try {
          return window.sessionStorage.getItem(TOKEN_KEY);
        } catch {
          return null;
        }
      },
    };
    cavosStore.setBridged(value);
  }, [c.isLoading, c.isAuthenticated, c.address, c.user?.email, c.authError]);
  useEffect(() => () => cavosStore.setBridged(null), []);
  return null;
}

export default function CavosBridge() {
  return (
    <CavosProvider
      config={{
        appId: CAVOS_APP_ID,
        environment: CAVOS_ENVIRONMENT,
        chain: 'stellar',
        network: STELLAR_NETWORK,
        appSalt: APP_SALT,
        rpId: CAVOS_RP_ID,
        persistSession: true,
      }}
      modal={{ appName: 'Campeones FC', providers: ['google', 'apple', 'email'], primaryColor: colors.red, theme: 'dark', secureStep: 'off' }}
    >
      <Bridge />
    </CavosProvider>
  );
}
