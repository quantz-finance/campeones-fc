// Estado del puente Cavos fuera de React: el chunk perezoso (bridge.tsx) publica aquí y la app lee.
import { useSyncExternalStore } from 'react';

export type CavosSignature = { publicKey: string; signature: string };

export type CavosBridged = {
  isLoading: boolean;
  isAuthenticated: boolean;
  address: string | null;
  email: string | null;
  /** Estado de la billetera en ESTE navegador. needsApproval: la llave no está aquí (otro dispositivo). */
  wallet: { ready: boolean; undeployed: boolean; needsApproval: boolean; hasPasskey: boolean; deploying: boolean };
  /** Restaura la llave en este navegador con la passkey (necesita un toque de la persona). */
  approveDevice: () => Promise<void>;
  error: string | null;
  openModal: () => void;
  logout: () => Promise<void>;
  signMessage: (message: string) => Promise<CavosSignature>;
  /** id_token del login (lo guarda el kit en sessionStorage). Solo sirve ~1 h. */
  token: () => string | null;
};

/** signedOut: tras "Cerrar sesión" no se re-entra solo con el estado viejo del kit; hace falta tocar "Entrar". */
type State = { wanted: boolean; bridged: CavosBridged | null; signedOut: boolean };
let state: State = { wanted: false, bridged: null, signedOut: false };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const cavosStore = {
  get: () => state,
  /** Pide cargar el SDK (chunk perezoso). Idempotente. */
  want() {
    if (state.wanted) return;
    state = { ...state, wanted: true };
    emit();
  },
  setSignedOut(v: boolean) {
    if (state.signedOut === v) return;
    state = { ...state, signedOut: v };
    emit();
  },
  setBridged(b: CavosBridged | null) {
    state = { ...state, bridged: b };
    emit();
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

/** Solo el flag (primitivo): no re-renderiza cuando cambia el estado del SDK. */
export function useCavosWanted(): boolean {
  return useSyncExternalStore(cavosStore.subscribe, () => state.wanted, () => state.wanted);
}

export function useCavosState(): State {
  return useSyncExternalStore(cavosStore.subscribe, cavosStore.get, cavosStore.get);
}

/** Espera hasta que el SDK cumpla una condición (o vence). */
export function waitForCavos(pred: (b: CavosBridged) => boolean, timeoutMs = 45_000): Promise<CavosBridged> {
  cavosStore.want();
  return new Promise((resolve, reject) => {
    const check = () => {
      const b = state.bridged;
      if (b && pred(b)) {
        done();
        resolve(b);
        return true;
      }
      return false;
    };
    const timer = setTimeout(() => {
      done();
      reject(new Error('Cavos tardó demasiado en responder. Revisa tu conexión y vuelve a intentar.'));
    }, timeoutMs);
    const unsub = cavosStore.subscribe(() => void check());
    const done = () => {
      clearTimeout(timer);
      unsub();
    };
    check();
  });
}
