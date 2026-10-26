// Sesión de Cavos que sobrevive a cerrar la app (mismo enfoque que Meteorito, lib/cavosSession.ts).
//
// @cavos/kit guarda el id_token del login SOLO en sessionStorage (`cavos-kit:token:<appId>`). iOS lo borra al cerrar
// la pestaña o la app instalada; al reabrir, el kit no reconecta la billetera y "Firmar" o "Apostar" vuelven a pedir
// entrar con Cavos. Lo espejamos en localStorage y lo reponemos en sessionStorage ANTES de montar el kit.
// La sesión de la app (Supabase) es aparte y se renueva sola; esto solo evita volver a pedir Cavos para firmar.
// Riesgo acotado: es el mismo token que el kit ya deja legible para esta página; no sale del origen, se descarta
// pasada la ventana de gracia y se borra al cerrar sesión.

export const GRACE_S = 7 * 86400 - 3600;
const FRESH_MARGIN_S = 60;

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export type Stores = { session: Store; local: Store };

export const sdkTokenKey = (appId: string) => `cavos-kit:token:${appId}`;
export const persistKey = (appId: string) => `cfc:cavos-token:${appId}`;

export function jwtExp(token: string | null | undefined): number | null {
  if (!token) return null;
  try {
    const p = token.split('.')[1] ?? '';
    const json = JSON.parse(atob(p.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(p.length / 4) * 4, '=')));
    return typeof json.exp === 'number' ? json.exp : null;
  } catch {
    return null;
  }
}

export type TokenState = 'fresh' | 'renewable' | 'expired' | 'invalid';
export function tokenState(token: string | null | undefined, now = Date.now() / 1000): TokenState {
  const exp = jwtExp(token);
  if (!exp) return 'invalid';
  if (exp > now + FRESH_MARGIN_S) return 'fresh';
  return now - exp < GRACE_S ? 'renewable' : 'expired';
}
const usable = (t: string | null, now?: number): t is string => {
  const s = tokenState(t, now);
  return s === 'fresh' || s === 'renewable';
};

function browserStores(): Stores | null {
  try {
    if (typeof window === 'undefined') return null;
    return { session: window.sessionStorage, local: window.localStorage };
  } catch {
    return null;
  }
}

/** Antes de montar CavosProvider: repone el token guardado si la pestaña no tiene uno (o tiene uno más viejo). */
export function rehydrateCavosToken(appId: string, stores = browserStores(), now?: number): 'present' | 'restored' | 'expired' | 'none' {
  if (!stores || !appId) return 'none';
  try {
    const cur = stores.session.getItem(sdkTokenKey(appId));
    const saved = stores.local.getItem(persistKey(appId));
    if (cur && !(saved && usable(saved, now) && (jwtExp(saved) ?? 0) > (jwtExp(cur) ?? 0))) return 'present';
    if (!saved) return cur ? 'present' : 'none';
    if (usable(saved, now)) {
      stores.session.setItem(sdkTokenKey(appId), saved);
      return 'restored';
    }
    stores.local.removeItem(persistKey(appId));
    return 'expired';
  } catch {
    return 'none';
  }
}

/** Tras cada login/re-login: copia el token del kit a localStorage (si sirve y no es más viejo que el guardado). */
export function persistCavosToken(appId: string, stores = browserStores(), now?: number) {
  if (!stores || !appId) return;
  try {
    const t = stores.session.getItem(sdkTokenKey(appId));
    if (!usable(t, now)) return;
    const saved = stores.local.getItem(persistKey(appId));
    if (saved === t) return;
    if (saved && usable(saved, now) && (jwtExp(saved) ?? 0) > (jwtExp(t) ?? 0)) return;
    stores.local.setItem(persistKey(appId), t);
  } catch {
    /* storage bloqueado */
  }
}

/** Token actual: el de la pestaña o, si iOS lo borró después de cargar, el guardado. */
export function currentCavosToken(appId: string, stores = browserStores(), now?: number): string | null {
  if (!stores || !appId) return null;
  try {
    const t = stores.session.getItem(sdkTokenKey(appId));
    if (t) return t;
    const saved = stores.local.getItem(persistKey(appId));
    if (usable(saved, now)) {
      stores.session.setItem(sdkTokenKey(appId), saved);
      return saved;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearCavosToken(appId: string, stores = browserStores()) {
  if (!stores || !appId) return;
  for (const [s, k] of [
    [stores.local, persistKey(appId)],
    [stores.session, sdkTokenKey(appId)],
  ] as const) {
    try {
      s.removeItem(k);
    } catch {
      /* nada */
    }
  }
}
