// Almacenamiento clave/valor pequeño y síncrono detrás de un adaptador.
// Web: localStorage. Nativo (iOS más adelante): cambiar este archivo por uno con expo-sqlite/kv-store o
// AsyncStorage; el resto de la app no cambia.
export type KeyValueStore = {
  get(key: string): string | null;
  set(key: string, value: string | null): void;
};

function webStore(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const ls = window.localStorage;
    return {
      get: (k) => ls.getItem(k),
      set: (k, v) => (v == null ? ls.removeItem(k) : ls.setItem(k, v)),
    };
  } catch {
    return null;
  }
}

function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return { get: (k) => map.get(k) ?? null, set: (k, v) => (v == null ? map.delete(k) : map.set(k, v)) };
}

export const storage: KeyValueStore = webStore() ?? memoryStore();

/** Lo que necesita supabase-js para guardar la sesión (misma interfaz en web y nativo). */
export const authStorage = {
  getItem: (key: string) => storage.get(key),
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.set(key, null),
};
