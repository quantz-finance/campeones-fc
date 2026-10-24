/**
 * Identidad de Piquemos. Cambia el nombre, la frase y los colores aquí:
 * el resto de la app, el manifest y los metadatos salen de este archivo.
 */
export const branding = {
  name: 'Piquemos',
  slug: 'piquemos',
  scheme: 'piquemos',
  company: 'Quantz',
  country: 'Costa Rica',
  tagline:
    'El marcador oficial del pique con tus amigos: cada partido, cada serie y cada trofeo, en un solo lugar.',
  shortPitch: 'Cada partido, cada serie y cada trofeo, en un solo lugar.',
  description:
    'Lleva el marcador de tus partidos con amigos: series, grupos, torneos y trofeos.',
  locale: 'es-CR',
  lang: 'es',
  colors: {
    bg: '#07080d',
    bgElevated: '#10131c',
    surface: '#161b27',
    surface2: '#1e2533',
    line: '#2a3346',
    text: '#f4f6fb',
    muted: '#93a0b8',
    faint: '#66758d',
    accent: '#3dff9a',
    accentInk: '#062114',
    violet: '#7c5cff',
    gold: '#f5c16c',
    danger: '#ff5d73',
    warn: '#ffb020',
    draw: '#7eb6ff',
    loss: '#ff8a9a',
  },
} as const;

export const avatars = [
  { key: 'rayo', label: 'Rayo', icon: 'flash', background: '#123524', foreground: '#3dff9a' },
  { key: 'ola', label: 'Ola', icon: 'water', background: '#10243a', foreground: '#7eb6ff' },
  { key: 'volcan', label: 'Volcán', icon: 'triangle', background: '#3a1c12', foreground: '#ff8a5b' },
  { key: 'quetzal', label: 'Quetzal', icon: 'diamond', background: '#12322a', foreground: '#5ee0b5' },
  { key: 'estrella', label: 'Estrella', icon: 'star', background: '#2a2412', foreground: '#f5c16c' },
  { key: 'luna', label: 'Luna', icon: 'moon', background: '#241832', foreground: '#c4b5fd' },
  { key: 'fuego', label: 'Fuego', icon: 'flame', background: '#3a1218', foreground: '#ff5d73' },
  { key: 'montana', label: 'Montaña', icon: 'home', background: '#1b2430', foreground: '#d5deea' },
] as const;

export type AvatarKey = (typeof avatars)[number]['key'];

export function avatarByKey(key: string) {
  return avatars.find((avatar) => avatar.key === key) ?? avatars[0];
}
