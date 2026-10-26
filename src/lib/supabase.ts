import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { backendMode } from './env';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (backendMode() !== 'supabase') {
    throw new Error('Supabase no está configurado.');
  }
  if (client) return client;
  client = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!.trim(),
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      auth: {
        // localStorage explícito (Safari/PWA en iPhone): la sesión de la app sobrevive a cerrar y reabrir.
        // Se renueva sola con el refresh token; no depende del token de Cavos (~1 h).
        ...(typeof window !== 'undefined' && window.localStorage ? { storage: window.localStorage } : {}),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: typeof window !== 'undefined',
      },
    },
  );
  return client;
}
