/**
 * Identidad de Campeones FC. Cambia el nombre, la frase y los colores aquí:
 * el resto de la app, el manifest y los metadatos salen de este archivo.
 *
 * Paleta "Morado de liga" (igual que la landing): morado #37003C de fondo, lila #953BFF,
 * verde #00FF87 para las acciones y blanco. Sin cian (paleta de Rolando: morado, verde y blanco;
 * el dorado solo para logros, trofeos, bordes de fichas/cromos y los mejores jugadores). Letra Outfit (OFL, autoalojada).
 * Un solo tema: `colors` (fondo morado). Sin modo claro.
 *
 * Los nombres red/blue/yellow se mantienen como roles para no tocar cada pantalla:
 * red = Blanco (local), blue = Lila (visita), yellow = Verde (acento y botones).
 * Sobre cian y verde va texto oscuro (redInk, accentInk); sobre lila, blanco.
 */
export const branding = {
  name: 'Campeones FC',
  slug: 'campeones-fc',
  scheme: 'campeones-fc',
  demoEmailDomain: 'demo.campeonesfc',
  company: 'Quantz',
  country: 'Costa Rica',
  tagline:
    'El marcador oficial de tus partidos con amigos: cada partido, cada serie y cada trofeo, en un solo lugar.',
  shortPitch: 'Cada partido, cada serie y cada trofeo, en un solo lugar.',
  disclaimer: 'No afiliado a EA, Warner Bros., FIFA ni UEFA.',
  disclaimerEn: 'Not affiliated with EA, Warner Bros., FIFA or UEFA.',
  description:
    'Lleva el marcador de tus partidos con amigos: series, grupos, torneos y trofeos.',
  locale: 'es-CR',
  lang: 'es',
  /** Cuentas oficiales. Instagram: campeones.app. X: campeonesapp. */
  social: {
    instagram: 'https://instagram.com/campeones.app',
    x: 'https://x.com/campeonesapp',
  },
  colors: {
    bg: '#37003C',
    ink: '#1A0A1C',
    navy: '#2A0030',
    bgElevated: '#2A0030',
    bgDeep: '#24002A',
    surface: '#4A0A55',
    surface2: '#2A0030',
    card: '#2A0030',
    cardSoft: 'rgba(42,0,48,0.72)',
    paper: '#FFFFFF',
    line: 'rgba(255,255,255,0.14)',
    lineStrong: 'rgba(255,255,255,0.32)',
    wash: 'rgba(255,255,255,0.06)',
    text: '#FFFFFF',
    muted: '#E4D4EE',
    faint: '#B99BC6',
    accentText: '#00FF87',
    naranja: '#FFFFFF',
    cobalto: '#953BFF',
    lima: '#00FF87',
    red: '#FFFFFF',
    redInk: '#1A0A1C',
    red2: '#E4D4EE',
    blue: '#953BFF',
    blueInk: '#FFFFFF',
    blue2: '#6A1FD0',
    yellow: '#00FF87',
    cyan: '#FFFFFF',
    up: '#00FF87',
    win: '#00FF87',
    accent: '#00FF87',
    accentInk: '#1A0A1C',
    violet: '#953BFF',
    gold: '#F1D27A',
    danger: '#FF2882',
    warn: '#FFFFFF',
    draw: '#B99BC6',
    loss: '#FF2882',
  },
} as const;

export const avatars = [
  { key: 'rayo', label: 'Rayo', icon: 'flash', background: '#FFFFFF', wash: '#E4D4EE', foreground: '#37003C' },
  { key: 'ola', label: 'Ola', icon: 'water', background: '#953BFF', wash: '#5A12B0', foreground: '#ffffff' },
  { key: 'volcan', label: 'Volcán', icon: 'triangle', background: '#00FF87', wash: '#00B85F', foreground: '#1A0A1C' },
  { key: 'quetzal', label: 'Quetzal', icon: 'diamond', background: '#C9A2FF', wash: '#953BFF', foreground: '#1A0A1C' },
  { key: 'estrella', label: 'Estrella', icon: 'ellipse', background: '#FF6900', wash: '#C24F00', foreground: '#1A0A1C' },
  { key: 'luna', label: 'Luna', icon: 'moon', background: '#5A1A6E', wash: '#37003C', foreground: '#ffffff' },
  { key: 'fuego', label: 'Fuego', icon: 'flame', background: '#FF2882', wash: '#B3105A', foreground: '#ffffff' },
  { key: 'montana', label: 'Montaña', icon: 'home', background: '#7CFFC4', wash: '#00B85F', foreground: '#1A0A1C' },
] as const;

export type AvatarKey = (typeof avatars)[number]['key'];

export function avatarByKey(key: string) {
  return avatars.find((avatar) => avatar.key === key) ?? avatars[0];
}
