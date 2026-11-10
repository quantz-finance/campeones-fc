const { execFileSync } = require('node:child_process');
const { withEntitlementsPlist } = require('@expo/config-plugins');

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

const CAVOS_RP_ID = (process.env.EXPO_PUBLIC_CAVOS_RP_ID || 'campeones-fc.vercel.app').trim();

/**
 * Associated Domains (y el webcredentials del rpId de Cavos) obligan a firmar incluso en el simulador.
 * Sin membresía de Apple Developer activa no hay certificados, así que en el build local van apagados.
 * Para TestFlight / App Store: CFC_IOS_ASSOCIATED_DOMAINS=1 (y el Team ID en la AASA).
 * Importante: hay que borrar la clave del entitlements, no dejarla en array vacío; Expo exige firma si la clave existe.
 */
const enableAssociatedDomains = /^(1|true)$/i.test(process.env.CFC_IOS_ASSOCIATED_DOMAINS ?? '');
const ASSOCIATED_DOMAINS = [
  'applinks:partido.campeonesfc.app',
  'webcredentials:partido.campeonesfc.app',
];

function withOptionalAssociatedDomains(config) {
  if (enableAssociatedDomains) return config;
  return withEntitlementsPlist(config, (result) => {
    delete result.modResults['com.apple.developer.associated-domains'];
    return result;
  });
}

/** @param {{ config: import('expo/config').ExpoConfig }} ctx */
module.exports = ({ config }) => {
  const ios = { ...config.ios };
  if (enableAssociatedDomains) ios.associatedDomains = ASSOCIATED_DOMAINS;
  else delete ios.associatedDomains;

  return withOptionalAssociatedDomains({
    ...config,
    name: branding.name,
    slug: branding.slug,
    scheme: branding.scheme,
    description: branding.description,
    userInterfaceStyle: 'dark',
    ios,
    plugins: [
      ...(config.plugins ?? []),
      [
        '@cavos/kit',
        {
          rpId: CAVOS_RP_ID,
          scheme: branding.scheme,
          enableAssociatedDomains,
          associatedDomains: enableAssociatedDomains ? ASSOCIATED_DOMAINS : [],
        },
      ],
    ],
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
};
