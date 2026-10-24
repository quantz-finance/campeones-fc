export type BackendMode = 'demo' | 'supabase' | 'invalid';

export function backendMode(): BackendMode {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url && !key) return 'demo';
  if (url && key) return 'supabase';
  return 'invalid';
}
