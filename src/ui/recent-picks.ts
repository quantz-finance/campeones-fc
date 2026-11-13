// Últimos rivales y grupos que elegiste, para ponerlos primero como accesos rápidos en los selectores.
// Se guardan en el dispositivo (AsyncStorage en iPhone, localStorage en la web). Nada va a la base.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

export type RecentKind = 'rivals' | 'groups';
const KEY = 'cfc-recent-picks';
const MAX = 8;

let state: Record<RecentKind, string[]> = { rivals: [], groups: [] };
const listeners = new Set<() => void>();

void AsyncStorage.getItem(KEY)
  .then((raw) => {
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Record<RecentKind, string[]>>;
    state = { rivals: saved.rivals ?? [], groups: saved.groups ?? [] };
    listeners.forEach((l) => l());
  })
  .catch(() => {});

/** Pone `id` al frente de los recientes de `kind` (sin repetir, máximo 8). */
export function rememberPick(kind: RecentKind, id: string) {
  state = { ...state, [kind]: [id, ...state[kind].filter((x) => x !== id)].slice(0, MAX) };
  listeners.forEach((l) => l());
  void AsyncStorage.setItem(KEY, JSON.stringify(state)).catch(() => {});
}

export function useRecentPicks(kind: RecentKind): string[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state[kind],
  );
}

