// Entrada con Google por Supabase Auth (signInWithOAuth). Es la única forma de entrar con cuenta real.
import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { track } from './analytics';
import { backendMode } from './env';
import { getSupabase } from './supabase';

/** A dónde vuelve Google: la misma app (producción o preview) en /auth/callback. */
export function callbackUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/auth/callback`;
}

/** Error que trae la URL de vuelta (p. ej. el usuario canceló en Google). */
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

export async function signInWithGoogle(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    throw new Error('Por ahora la entrada con Google funciona en la versión web. Ábrela desde el navegador.');
  }
  track('sign_in_started', { method: 'google' });
  const { data, error } = await getSupabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: callbackUrl(window.location.origin) },
  });
  if (error) throw error;
  // supabase-js ya redirige; esto cubre el caso en que no lo haga.
  if (data?.url) window.location.assign(data.url);
}

/** Estado del botón "Entrar con Google". */
export function useGoogleEntry() {
  const configured = backendMode() === 'supabase';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const fromUrl = oauthErrorFrom(window.location.href);
    if (fromUrl) setError(fromUrl);
  }, []);

  const signIn = useCallback(() => {
    if (busy) return;
    setBusy(true);
    setError(null);
    void signInWithGoogle().catch((cause: unknown) => {
      setBusy(false);
      const msg = cause instanceof Error ? cause.message : '';
      setError(/web/.test(msg) ? msg : 'No se pudo abrir Google. Revisa tu conexión y vuelve a intentar.');
    });
  }, [busy]);

  return { configured, busy, error, signIn };
}
