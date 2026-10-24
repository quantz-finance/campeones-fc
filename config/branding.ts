/**
 * Identidad de Campeones FC. Cambia el nombre, la frase y los colores aquí:
 * el resto de la app, el manifest y los metadatos salen de este archivo.
 *
 * Paleta "Broadcast": gráficos de transmisión sobre azul marino.
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
  colors: {
    bg: '#05071a',
    ink: '#05071a',
    navy: '#0b1033',
    bgElevated: '#0b1033',
    surface: '#12183f',
    surface2: '#0c1233',
    line: 'rgba(255,255,255,0.10)',
    text: '#ffffff',
    muted: '#8d94c4',
    faint: '#6b72a3',
    red: '#ff2b4a',
    red2: '#c4002a',
    blue: '#2f6bff',
    blue2: '#0b2fb0',
    yellow: '#ffd400',
    cyan: '#22e1ff',
    up: '#1fa85a',
    accent: '#ffd400',
    accentInk: '#0a0a0a',
    violet: '#b98cff',
    gold: '#ffd400',
    danger: '#ff2b4a',
    warn: '#ffd400',
    draw: '#2f6bff',
    loss: '#ff5a72',
  },
} as const;

export const avatars = [
  { key: 'rayo', label: 'Rayo', icon: 'flash', background: '#ff5a72', wash: '#b30024', foreground: '#ffffff' },
  { key: 'ola', label: 'Ola', icon: 'water', background: '#5b8cff', wash: '#1031b5', foreground: '#ffffff' },
  { key: 'volcan', label: 'Volcán', icon: 'triangle', background: '#ffb04a', wash: '#b84d00', foreground: '#1a0d00' },
  { key: 'quetzal', label: 'Quetzal', icon: 'diamond', background: '#3ff0e0', wash: '#0a7f8a', foreground: '#042226' },
  { key: 'estrella', label: 'Estrella', icon: 'ellipse', background: '#ffe14a', wash: '#c9a000', foreground: '#1a1400' },
  { key: 'luna', label: 'Luna', icon: 'moon', background: '#b98cff', wash: '#5320b8', foreground: '#ffffff' },
  { key: 'fuego', label: 'Fuego', icon: 'flame', background: '#ff79c6', wash: '#9a0f63', foreground: '#ffffff' },
  { key: 'montana', label: 'Montaña', icon: 'home', background: '#7aa2ff', wash: '#1a3fbf', foreground: '#ffffff' },
] as const;

export type AvatarKey = (typeof avatars)[number]['key'];

export function avatarByKey(key: string) {
  return avatars.find((avatar) => avatar.key === key) ?? avatars[0];
}
