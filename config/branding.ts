/**
 * Identidad de Campeones FC. Cambia el nombre, la frase y los colores aquí:
 * el resto de la app, el manifest y los metadatos salen de este archivo.
 *
 * Paleta "Voltaje Nocturno": naranja turbo contra cobalto con un lima eléctrico,
 * sobre un azul noche. Títulos en Anton, texto en Archivo y etiquetas en Archivo
 * angosto (78 %).
 *
 * Los nombres red/blue/yellow se mantienen como roles para no tocar cada pantalla:
 * red = Naranja turbo (tú / local), blue = Cobalto (rival), yellow = Lima voltio (acento).
 * Sobre naranja y lima va texto oscuro (redInk, accentInk); sobre cobalto, blanco.
 */
export const branding = {
  name: 'Campeones FC',
  slug: 'campeones-fc',
  scheme: 'campeones-fc',
  demoEmailDomain: 'demo.campeonesfc',
  company: 'Quantz',
  country: 'Costa Rica',
  tagline:
    'El marcador oficial del pique con tus amigos: cada partido, cada serie y cada trofeo, en un solo lugar.',
  shortPitch: 'Cada partido, cada serie y cada trofeo, en un solo lugar.',
  disclaimer: 'No afiliado a EA, Warner Bros., FIFA ni UEFA.',
  description:
    'Lleva el marcador de tus partidos con amigos: series, grupos, torneos y trofeos.',
  locale: 'es-CR',
  lang: 'es',
  /**
   * Redes sociales. PLACEHOLDER: el repo no tiene cuentas reales de Instagram ni de X.
   * Sustituye cada URL por la cuenta verdadera. No inventar un handle.
   */
  social: {
    instagram: 'https://instagram.com/REPLACE_WITH_REAL_INSTAGRAM_HANDLE',
    x: 'https://x.com/REPLACE_WITH_REAL_X_HANDLE',
  },
  colors: {
    bg: '#080B13',
    ink: '#0A0D14',
    navy: '#0E1320',
    bgElevated: '#0E1320',
    surface: '#131A2A',
    surface2: '#0E1320',
    line: 'rgba(255,255,255,0.10)',
    text: '#FFFFFF',
    muted: '#9BA4BA',
    faint: '#6B7590',
    naranja: '#FF5A1F',
    cobalto: '#2E4BF0',
    lima: '#C9FF2F',
    red: '#FF5A1F',
    redInk: '#0A0D14',
    red2: '#C23A0C',
    blue: '#2E4BF0',
    blueInk: '#FFFFFF',
    blue2: '#1A2FB0',
    yellow: '#C9FF2F',
    cyan: '#C9FF2F',
    up: '#2EE08A',
    win: '#2EE08A',
    accent: '#C9FF2F',
    accentInk: '#0A0D14',
    violet: '#C9FF2F',
    gold: '#C9FF2F',
    danger: '#FF4D6D',
    warn: '#C9FF2F',
    draw: '#8E97AD',
    loss: '#FF4D6D',
  },
} as const;

export const avatars = [
  { key: 'rayo', label: 'Rayo', icon: 'flash', background: '#FF5A1F', wash: '#C23A0C', foreground: '#0A0D14' },
  { key: 'ola', label: 'Ola', icon: 'water', background: '#2E4BF0', wash: '#1A2FB0', foreground: '#ffffff' },
  { key: 'volcan', label: 'Volcán', icon: 'triangle', background: '#C9FF2F', wash: '#8FC40A', foreground: '#0A0D14' },
  { key: 'quetzal', label: 'Quetzal', icon: 'diamond', background: '#2EE08A', wash: '#0E9A58', foreground: '#0A0D14' },
  { key: 'estrella', label: 'Estrella', icon: 'ellipse', background: '#FF9A6B', wash: '#E0531F', foreground: '#0A0D14' },
  { key: 'luna', label: 'Luna', icon: 'moon', background: '#7C8CF8', wash: '#3B4FD1', foreground: '#ffffff' },
  { key: 'fuego', label: 'Fuego', icon: 'flame', background: '#FF4D6D', wash: '#B3203F', foreground: '#ffffff' },
  { key: 'montana', label: 'Montaña', icon: 'home', background: '#8E97AD', wash: '#4F5872', foreground: '#0A0D14' },
] as const;

export type AvatarKey = (typeof avatars)[number]['key'];

export function avatarByKey(key: string) {
  return avatars.find((avatar) => avatar.key === key) ?? avatars[0];
}
