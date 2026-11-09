// Consentimiento de la cuenta: hasta que esté 'ok', la app manda a /consentimiento.
// Estado compartido a nivel de módulo para que /consentimiento lo refresque al guardar.
import { useEffect, useSyncExternalStore } from 'react';
import { useApp } from './app-provider';

export type ConsentState = 'loading' | 'ok' | 'missing';

let state: { userId: string | null; value: ConsentState; error: string | null } = { userId: null, value: 'loading', error: null };
let tick = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(next: typeof state) {
  state = next;
  emit();
}

/** Vuelve a leer el consentimiento (p. ej. después de guardarlo). */
export function refreshConsent() {
  tick += 1;
  set({ ...state, value: 'loading' });
}

export function useConsent(): { consent: ConsentState; consentError: string | null } {
  const app = useApp();
  const snap = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
  const currentTick = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => tick,
    () => tick,
  );

  useEffect(() => {
    const userId = app.userId;
    if (!userId) {
      if (state.userId !== null || state.value !== 'loading') set({ userId: null, value: 'loading', error: null });
      return;
    }
    let active = true;
    void app.repo
      .getConsent(userId)
      .then((c) => {
        if (active) set({ userId, value: c ? 'ok' : 'missing', error: null });
      })
      .catch((cause: unknown) => {
        if (active) set({ userId, value: 'missing', error: cause instanceof Error ? cause.message : 'No pudimos revisar tu consentimiento.' });
      });
    return () => {
      active = false;
    };
  }, [app.repo, app.userId, currentTick]);

  const mine = snap.userId === app.userId;
  return { consent: mine ? snap.value : 'loading', consentError: mine ? snap.error : null };
}
