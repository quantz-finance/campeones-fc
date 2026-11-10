import { Platform } from 'react-native';
import { branding } from '../../config/branding';

export type ColorKey = keyof typeof branding.colors;
type Palette = Record<ColorKey, string>;

/** Paletas en hex: oscura (por defecto) y clara. Para SVG y otros lugares que no aceptan variables CSS. */
export const palettes: { dark: Palette; light: Palette } = {
  dark: branding.colors,
  light: branding.lightColors,
};

const web = Platform.OS === 'web';
const keys = Object.keys(branding.colors) as ColorKey[];
const cssVar = (key: string) => `--c-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)}`;

/**
 * Colores de la app. En web son variables CSS (var(--c-bg), ...), así el modo claro/oscuro
 * cambia en vivo en todas las pantallas sin volver a montar nada. En nativo, el tema oscuro en hex.
 */
export const colors: Palette = web
  ? (Object.fromEntries(keys.map((k) => [k, `var(${cssVar(k)})`])) as Palette)
  : palettes.dark;

/** Hex del tema oscuro (fills de SVG, gráficos). */
export const hex = palettes.dark;

/** Hoja de estilos con las variables de los dos temas. */
export function themeCss(): string {
  const block = (p: Palette) => keys.map((k) => `${cssVar(k)}:${p[k]}`).join(';');
  const washDark =
    'radial-gradient(70% 42% at 100% 0%, rgba(149,59,255,.38), transparent 70%), radial-gradient(60% 36% at 0% 100%, rgba(0,255,135,.10), transparent 70%)';
  const washLight = 'radial-gradient(70% 42% at 100% 0%, rgba(149,59,255,.10), transparent 70%)';
  return `:root{${block(palettes.dark)};--bg-wash:${washDark};color-scheme:dark}:root[data-theme="light"]{${block(palettes.light)};--bg-wash:${washLight};color-scheme:light}`;
}

if (web && typeof document !== 'undefined' && !document.getElementById('cfc-theme-vars')) {
  const style = document.createElement('style');
  style.id = 'cfc-theme-vars';
  style.textContent = themeCss();
  document.head.appendChild(style);
}

/** Escala de espacios (px). Todo margen o gap de la app sale de aquí. */
export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

/**
 * Reglas de espacio entre elementos (los paddings no se tocan):
 * - stack: entre hermanos de una pantalla (bloque a bloque).
 * - section: de una sección a la siguiente = stack + el aire extra arriba de cada título de sección.
 * - title: de un título de sección a su contenido.
 * - card: de tarjeta a tarjeta en listas y cuadrículas (también fichas del mosaico).
 * - inCard: entre elementos dentro de una tarjeta.
 * - button / field: de botón a botón y de campo a campo.
 * - inline: ícono ↔ texto, chips pequeños.
 * - bottom: aire mínimo sobre la barra de pestañas / cinta / borde seguro.
 */
export const layout = {
  stack: space.md,
  section: space.xl,
  title: space.md,
  card: space.sm,
  inCard: space.sm,
  button: space.sm,
  field: space.md,
  inline: space.xs,
  bottom: space.lg,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  card: 16,
  pill: 999,
};

/**
 * Outfit (OFL, autoalojada en /fonts). Cada familia fija un peso de la fuente variable
 * (ver public/index.html: @font-face con font-weight por familia).
 */
export const font = {
  display: 'Outfit_800',
  heading: 'Outfit_700',
  label: 'Outfit_700',
  labelSoft: 'Outfit_600',
  body: 'Outfit_400',
  medium: 'Outfit_500',
  strong: 'Outfit_600',
  bold: 'Outfit_700',
};
