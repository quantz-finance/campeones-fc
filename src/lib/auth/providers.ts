// Proveedores de entrada. Hoy solo Google. Apple queda previsto (App Store, guía 4.8, lo pedirá en iOS
// junto a Google): agregarlo es poner enabled: true aquí y activarlo en Supabase Auth.
export type AuthProviderId = 'google' | 'apple';

export type AuthProviderInfo = {
  id: AuthProviderId;
  label: string;
  icon: 'logo-google' | 'logo-apple';
  enabled: boolean;
};

export const AUTH_PROVIDERS: AuthProviderInfo[] = [
  { id: 'google', label: 'Entrar con Google', icon: 'logo-google', enabled: true },
  { id: 'apple', label: 'Entrar con Apple', icon: 'logo-apple', enabled: false },
];

export const enabledProviders = () => AUTH_PROVIDERS.filter((p) => p.enabled);
