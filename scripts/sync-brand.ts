import { readFileSync, writeFileSync } from 'node:fs';
import { branding } from '../config/branding.ts';

const manifest = {
  name: branding.name,
  short_name: branding.name,
  description: branding.description,
  lang: branding.lang,
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  background_color: branding.colors.bg,
  theme_color: branding.colors.bg,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
  ],
};

writeFileSync('public/manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

const app = JSON.parse(readFileSync('app.json', 'utf8')) as {
  expo: {
    name: string;
    slug: string;
    scheme: string;
    description: string;
    android: { adaptiveIcon: { backgroundColor: string } };
    web: Record<string, unknown>;
  };
};

app.expo.name = branding.name;
app.expo.slug = branding.slug;
app.expo.scheme = branding.scheme;
app.expo.description = branding.description;
app.expo.android.adaptiveIcon.backgroundColor = branding.colors.bg;
app.expo.web = {
  ...app.expo.web,
  lang: branding.lang,
  name: branding.name,
  shortName: branding.name,
  description: branding.description,
  themeColor: branding.colors.bg,
  backgroundColor: branding.colors.bg,
};

writeFileSync('app.json', `${JSON.stringify(app, null, 2)}\n`);
console.log(`Marca sincronizada: ${branding.name}`);
