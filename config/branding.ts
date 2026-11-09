/**
 * Identidad de Campeones FC. Cambia el nombre, la frase y los colores aquí:
 * el resto de la app, el manifest y los metadatos salen de este archivo.
 *
 * Paleta "Morado de liga" (igual que la landing): morado #37003C de fondo, lila #953BFF,
 * verde #00FF87 para las acciones y cian #05F0FF. Letra Outfit (OFL, autoalojada).
 * `colors` es el tema oscuro (por defecto) y `lightColors` el claro; la app los cambia en vivo
 * con variables CSS (src/ui/theme.ts).
 *
 * Los nombres red/blue/yellow se mantienen como roles para no tocar cada pantalla:
 * red = Cian (tú / local), blue = Lila (rival), yellow = Verde (acento y botones).
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
    naranja: '#05F0FF',
    cobalto: '#953BFF',
    lima: '#00FF87',
    red: '#05F0FF',
    redInk: '#1A0A1C',
    red2: '#00B8C4',
    blue: '#953BFF',
    blueInk: '#FFFFFF',
    blue2: '#6A1FD0',
    yellow: '#00FF87',
    cyan: '#05F0FF',
    up: '#00FF87',
    win: '#00FF87',
    accent: '#00FF87',
    accentInk: '#1A0A1C',
    violet: '#953BFF',
    gold: '#EBFF00',
    danger: '#FF2882',
    warn: '#EBFF00',
    draw: '#B99BC6',
    loss: '#FF2882',
  },
  /** Tema claro: mismo morado de marca sobre fondo #FAF9FA, como la landing en modo claro. */
  lightColors: {
    bg: '#FAF9FA',
    ink: '#1A0A1C',
    navy: '#FFFFFF',
    bgElevated: '#FFFFFF',
    bgDeep: '#FFFFFF',
    surface: '#FFFFFF',
    surface2: '#F3EDF5',
    card: '#FFFFFF',
    cardSoft: '#FFFFFF',
    paper: '#FFFFFF',
    line: 'rgba(55,0,60,0.12)',
    lineStrong: 'rgba(55,0,60,0.30)',
    wash: 'rgba(55,0,60,0.05)',
    text: '#1A0A1C',
    muted: '#5C4A62',
    faint: '#8A7590',
    accentText: '#7A1FE0',
    naranja: '#00C8D6',
    cobalto: '#7A1FE0',
    lima: '#00E07A',
    red: '#00C8D6',
    redInk: '#1A0A1C',
    red2: '#0097A3',
    blue: '#7A1FE0',
    blueInk: '#FFFFFF',
    blue2: '#5A12B0',
    yellow: '#00FF87',
    cyan: '#0097A3',
    up: '#00A85A',
    win: '#00A85A',
    accent: '#00FF87',
    accentInk: '#1A0A1C',
    violet: '#7A1FE0',
    gold: '#D4E600',
    danger: '#E0145F',
    warn: '#D4E600',
    draw: '#8A7590',
    loss: '#E0145F',
  },
} as const;

export const avatars = [
  { key: 'rayo', label: 'Rayo', icon: 'flash', background: '#05F0FF', wash: '#00A8C4', foreground: '#1A0A1C' },
  { key: 'ola', label: 'Ola', icon: 'water', background: '#953BFF', wash: '#5A12B0', foreground: '#ffffff' },
  { key: 'volcan', label: 'Volcán', icon: 'triangle', background: '#00FF87', wash: '#00B85F', foreground: '#1A0A1C' },
  { key: 'quetzal', label: 'Quetzal', icon: 'diamond', background: '#EBFF00', wash: '#B8C800', foreground: '#1A0A1C' },
  { key: 'estrella', label: 'Estrella', icon: 'ellipse', background: '#FF6900', wash: '#C24F00', foreground: '#1A0A1C' },
  { key: 'luna', label: 'Luna', icon: 'moon', background: '#5A1A6E', wash: '#37003C', foreground: '#ffffff' },
  { key: 'fuego', label: 'Fuego', icon: 'flame', background: '#FF2882', wash: '#B3105A', foreground: '#ffffff' },
  { key: 'montana', label: 'Montaña', icon: 'home', background: '#D2FF41', wash: '#9CC400', foreground: '#1A0A1C' },
] as const;

export type AvatarKey = (typeof avatars)[number]['key'];

export function avatarByKey(key: string) {
  return avatars.find((avatar) => avatar.key === key) ?? avatars[0];
}
