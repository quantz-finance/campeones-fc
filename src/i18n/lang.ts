import { useSyncExternalStore } from 'react';
import { en } from './en';
import { enPatterns } from './patterns';

// Idioma de la app: 'es' (base, español neutro con tú) o 'en'. Se guarda en localStorage
// con la misma clave que usa la landing (cfc-lang).
export type Lang = 'es' | 'en';
export const LANG_KEY = 'cfc-lang';

function readInitial(): Lang {
  try {
    if (typeof localStorage !== 'undefined') {
      const v = localStorage.getItem(LANG_KEY);
      if (v === 'en' || v === 'es') return v;
    }
  } catch {}
  return 'es';
}

let current: Lang = readInitial();
const listeners = new Set<() => void>();

function syncDocument() {
  if (typeof document !== 'undefined') document.documentElement.lang = current;
}
syncDocument();

export function getLang(): Lang {
  return current;
}

export function setLang(next: Lang) {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(LANG_KEY, next);
  } catch {}
  syncDocument();
  listeners.forEach((l) => l());
}

export function toggleLang() {
  setLang(current === 'es' ? 'en' : 'es');
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}

const COUNTS: Record<string, string> = { victorias: 'wins', victoria: 'win', derrotas: 'losses', derrota: 'loss', empates: 'draws', empate: 'draw', partidos: 'matches', partido: 'match' };

/** "8 victorias" dentro de una frase ya traducida → "8 wins". */
function fixCounts(s: string): string {
  return s.replace(/(\d+) (victorias?|derrotas?|empates?|partidos?)\b/g, (_, n: string, w: string) => `${n} ${COUNTS[w]}`);
}

function translatePiece(s: string): string | null {
  const hit = en[s];
  if (hit !== undefined) return hit;
  for (const [re, out] of enPatterns) {
    if (re.test(s)) return fixCounts(s.replace(re, out));
  }
  return null;
}

/** Traduce un texto en español al idioma activo. Sin traducción conocida, deja el original. */
export function translate(text: string, lang: Lang = current): string {
  if (lang === 'es' || !text) return text;
  const lead = text.match(/^\s*/)![0];
  const tail = text.match(/\s*$/)![0];
  const core = text.trim();
  if (!core) return text;
  const exact = en[core];
  if (exact !== undefined) return lead + exact + tail;
  // Con separadores " · " se traduce cada tramo (así un patrón no se traga la frase entera).
  if (core.includes(' · ')) {
    return lead + core.split(' · ').map((p) => translatePiece(p) ?? p).join(' · ') + tail;
  }
  const whole = translatePiece(core);
  return whole !== null ? lead + whole + tail : text;
}

export const tr = (text: string) => translate(text);
