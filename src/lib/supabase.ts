import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { backendMode } from './env';

let client: SupabaseClient | null = null;

function authStorage() {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : undefined;
  }
  return AsyncStorage;
}

export function getSupabase(): SupabaseClient {
  if (backendMode() !== 'supabase') {
    throw new Error('Supabase no está configurado.');
  }
  if (client) return client;
  const storage = authStorage();
  client = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL!.trim(),
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      auth: {
        // Web: localStorage (Safari/PWA en iPhone). Nativo: AsyncStorage, si no la sesión se pierde al cerrar la app.
        // Se renueva sola con el refresh token; no depende del token de Cavos (~1 h).
        ...(storage ? { storage } : {}),
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: Platform.OS === 'web',
      },
    },
  );
  return client;
}
