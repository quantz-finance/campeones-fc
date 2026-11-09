// Modo claro / oscuro. Oscuro por defecto (como la landing). Se guarda en este navegador.
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { palettes } from './theme';

export type ThemeMode = 'dark' | 'light';
const KEY = 'cfc-theme';
const listeners = new Set<() => void>();
const web = Platform.OS === 'web' && typeof document !== 'undefined';

function read(): ThemeMode {
  if (!web) return 'dark';
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  try {
    return localStorage.getItem(KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

let current: ThemeMode = read();

export function applyTheme(mode: ThemeMode) {
  current = mode;
  if (web) {
    const root = document.documentElement;
    root.setAttribute('data-theme', mode);
    const bg = palettes[mode].bg;
    root.style.backgroundColor = bg;
    document.body.style.backgroundColor = bg;
    root.style.colorScheme = mode;
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', mode === 'dark' ? palettes.dark.bg : '#37003C'));
    try {
      localStorage.setItem(KEY, mode);
    } catch {}
  }
  listeners.forEach((l) => l());
}

if (web) applyTheme(current);

export function themeMode(): ThemeMode {
  return current;
}

export function toggleTheme() {
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

export function useThemeMode(): ThemeMode {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => 'dark',
  );
}

const byVar: Record<string, string> = {};
for (const key of Object.keys(palettes.dark)) byVar[`var(--c-${key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`)})`] = key;

/** Hex del color para el tema actual (los fills de SVG no leen variables CSS). */
export function useResolvedColor(color: string): string {
  const mode = useThemeMode();
  const key = byVar[color] as keyof typeof palettes.dark | undefined;
  return key ? palettes[mode][key] : color;
}
