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
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: typeof window !== 'undefined',
      },
    },
  );
  return client;
}
