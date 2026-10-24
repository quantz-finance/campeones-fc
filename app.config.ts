import type { ConfigContext, ExpoConfig } from 'expo/config';
import { branding } from './config/branding';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: branding.name,
  slug: branding.slug,
  scheme: branding.scheme,
  description: branding.description,
  userInterfaceStyle: 'dark',
  web: {
    ...config.web,
    favicon: './assets/favicon.png',
    bundler: 'metro',
    output: 'single',
    lang: branding.lang,
    name: branding.name,
    shortName: branding.name,
    description: branding.description,
    themeColor: branding.colors.bg,
    backgroundColor: branding.colors.bg,
    display: 'standalone',
    startUrl: '/',
  },
});
