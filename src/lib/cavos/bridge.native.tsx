// Puente nativo de Cavos (iOS/Android). Metro elige este archivo en nativo y deja
// bridge.tsx para la web, así el export web no carga @cavos/kit/react-native.
// Solo se monta si EXPO_PUBLIC_CAVOS_NATIVE=1 (ver config.ts). No contacta a Cavos
// por su cuenta: el kit abre el navegador de OAuth cuando la persona entra.
import { CavosProvider, useCavos } from '@cavos/kit/react-native';
import { installNativeJwtCapture } from './install-native-jwt-capture';

installNativeJwtCapture();
import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { colors } from '../../ui/theme';
import { authErrorText, sanitizeAuthError, shouldReportAuthError } from './auth-ux';
import {
  APP_SALT,
  CAVOS_APP_ID,
  CAVOS_ENVIRONMENT,
  CAVOS_NATIVE_REDIRECT,
  CAVOS_NATIVE_RP_ID,
  STELLAR_NETWORK,
} from './config';
import { extractJwtFromCallbackUrl, getNativeCavosJwt, setNativeCavosJwt } from './native-jwt';
import { cavosStore, type CavosBridged } from './store';

function reportAuthError(raw: string) {
  const message = sanitizeAuthError(raw);
  if (!message) return;
  console.error('[cavos] error de entrada', message);
}

function b64(u: Uint8Array) {
  let s = '';
  u.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

function stellarWallet(c: ReturnType<typeof useCavos>): any {
  const session = (c as { session?: { wallet: (chain: string) => unknown } }).session;
  const w = session?.wallet ? session.wallet('stellar') : c.wallet;
  if (!w || (w as { chain?: string }).chain !== 'stellar') throw new Error('Tu billetera de Cavos todavía no está lista.');
  return w;
}

function walletFlags(c: ReturnType<typeof useCavos>) {
  const status = c.walletStatus as {
    isReady?: boolean;
    isUndeployed?: boolean;
    needsDeviceApproval?: boolean;
    hasPasskey?: boolean;
    isDeploying?: boolean;
  } | null;
  const undeployed = !!status?.isUndeployed || c.wallet?.status === 'undeployed';
  return {
    ready: !!status?.isReady,
    undeployed,
    needsApproval: !!status?.needsDeviceApproval,
    hasPasskey: !!status?.hasPasskey,
    deploying: !!status?.isDeploying,
  };
}

function Bridge() {
  const c = useCavos();
  const ref = useRef(c);
  ref.current = c;

  useEffect(() => {
    const onUrl = (url: string) => {
      const jwt = extractJwtFromCallbackUrl(url);
      if (jwt) setNativeCavosJwt(jwt);
      void ref.current.handleCallback(url).catch((e) => {
        const raw = e instanceof Error ? e.message : String(e);
        if (shouldReportAuthError(raw, authErrorText(raw))) reportAuthError(raw);
      });
    };
    const sub = Linking.addEventListener('url', ({ url }) => onUrl(url));
    void Linking.getInitialURL().then((url) => {
      if (url) onUrl(url);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const value: CavosBridged = {
      isLoading: c.isLoading,
      isAuthenticated: c.isAuthenticated,
      address: c.address,
      email: c.user?.email ?? null,
      wallet: walletFlags(c),
      approveDevice: async () => {
        try {
          await ref.current.approveDeviceWithPasskey();
        } catch (e) {
          console.error('[cavos] approveDevice', e);
          throw new Error(authErrorText(e instanceof Error ? e.message : String(e)));
        }
      },
      error: c.authError ? authErrorText(c.authError) : null,
      openModal: () => {
        ref.current.clearAuthError();
        ref.current.openModal();
      },
      loginWith: async (provider) => {
        ref.current.clearAuthError();
        try {
          await ref.current.login(provider);
        } catch (e) {
          throw new Error(authErrorText(e instanceof Error ? e.message : String(e)));
        }
      },
      logout: async () => {
        setNativeCavosJwt(null);
        await ref.current.logout();
      },
      signMessage: async (m) => {
        try {
          const r = await stellarWallet(ref.current).signMessage(m);
          return { publicKey: r.publicKey, signature: b64(r.signature) };
        } catch (e) {
          console.error('[cavos] signMessage', e);
          const raw = e instanceof Error ? e.message : String(e);
          const err = new Error(authErrorText(raw)) as Error & { raw?: string; code?: string };
          err.raw = raw;
          if (/not an authorized signer/i.test(raw)) err.code = 'not_signer';
          throw err;
        }
      },
      signXdr: async (x) => {
        try {
          return await stellarWallet(ref.current).signXdr(x);
        } catch (e) {
          console.error('[cavos] signXdr', e);
          const raw = e instanceof Error ? e.message : String(e);
          const err = new Error(authErrorText(raw)) as Error & { raw?: string; code?: string };
          err.raw = raw;
          if (/not an authorized signer/i.test(raw)) err.code = 'not_signer';
          throw err;
        }
      },
      token: () => getNativeCavosJwt(),
    };
    cavosStore.setBridged(value);
  }, [
    c.isLoading,
    c.isAuthenticated,
    c.address,
    c.user?.email,
    c.authError,
    c.walletStatus?.isReady,
    c.walletStatus?.needsDeviceApproval,
    c.walletStatus?.hasPasskey,
    c.walletStatus?.isDeploying,
    c.wallet,
  ]);

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
        rpId: CAVOS_NATIVE_RP_ID,
        redirectUri: CAVOS_NATIVE_REDIRECT,
      }}
      modal={{ appName: 'Campeones FC', providers: ['google', 'apple'], primaryColor: colors.red, secureStep: 'optional' }}
    >
      <Bridge />
    </CavosProvider>
  );
}
