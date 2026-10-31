import { Platform } from 'react-native';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { backendMode } from './env';
import { authStorage } from './storage';

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
        // Adaptador de almacenamiento (web: localStorage; nativo: ver lib/storage.ts). La sesión sobrevive a cerrar y reabrir.
        // Se renueva sola con el refresh token.
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web' && typeof window !== 'undefined',
        // Google vuelve a /auth/callback con ?code=…; supabase-js lo canjea por la sesión (PKCE).
        flowType: 'pkce',
      },
    },
  );
  return client;
}
