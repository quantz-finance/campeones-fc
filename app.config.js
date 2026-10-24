const { execFileSync } = require('node:child_process');

const raw = execFileSync(
  process.execPath,
  [
    '--experimental-strip-types',
    '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON',
    '--input-type=module',
    '-e',
    "import { branding } from './config/branding.ts'; process.stdout.write(JSON.stringify(branding));",
  ],
  { cwd: __dirname, encoding: 'utf8' },
);
const branding = JSON.parse(raw);

/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => ({
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
