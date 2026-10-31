// Entrada con cuenta real por Supabase Auth.
//
// Web (hoy): signInWithOAuth con PKCE; el proveedor vuelve a /auth/callback y supabase-js abre la sesión.
// iOS (más adelante): mismo Supabase, otro "transporte" en native.ts: Google Sign-In (o expo-auth-session)
// entrega un idToken y se llama supabase.auth.signInWithIdToken({ provider: 'google', token }). Apple igual,
// con expo-apple-authentication. Las pantallas solo usan signInWith() y useSignIn(), así que no cambian.
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { track } from '../analytics';
import { backendMode } from '../env';
import { getSupabase } from '../supabase';
import type { AuthProviderId } from './providers';

export { AUTH_PROVIDERS, enabledProviders, type AuthProviderId } from './providers';

/** A dónde vuelve el proveedor: la misma app (producción o preview) en /auth/callback. */
export function callbackUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/auth/callback`;
}

/** Error que trae la URL de vuelta (p. ej. la persona canceló en Google). */
export function oauthErrorFrom(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
  const raw =
    url.searchParams.get('error_description') ?? hash.get('error_description') ?? url.searchParams.get('error') ?? hash.get('error');
  if (!raw) return null;
  if (/access_denied|cancel/i.test(raw)) return 'Cancelaste la entrada con Google. Vuelve a intentarlo cuando quieras.';
  if (/provider is not enabled|unsupported provider/i.test(raw)) return 'La entrada con Google todavía no está activada. Vuelve pronto.';
  return 'No pudimos terminar la entrada con Google. Vuelve a intentarlo.';
}

export async function signInWith(provider: AuthProviderId): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    // Aquí entra native.ts (signInWithIdToken) cuando exista la app de iOS.
    throw new Error('Por ahora la entrada funciona en la versión web. Ábrela desde el navegador.');
  }
  track('sign_in_started', { method: provider });
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider,
    options: { redirectTo: callbackUrl(window.location.origin) },
  });
  if (error) throw error;
  if (data?.url) window.location.assign(data.url);
}

/** Estado del botón de entrada. */
export function useSignIn(provider: AuthProviderId = 'google') {
  const configured = backendMode() === 'supabase';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.location) return;
    const fromUrl = oauthErrorFrom(window.location.href);
    if (fromUrl) setError(fromUrl);
  }, []);

  const signIn = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void signInWith(provider).catch((cause: unknown) => {
      setBusy(false);
      const msg = cause instanceof Error ? cause.message : '';
      setError(/web/.test(msg) ? msg : 'No se pudo abrir Google. Revisa tu conexión y vuelve a intentar.');
    });
  }, [busy, provider]);

  return { configured, busy, error, signIn };
}
