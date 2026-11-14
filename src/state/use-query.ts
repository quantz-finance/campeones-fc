import { useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { depsSignature, fetchShared, readCached, sameData } from './query-cache';

export { clearQueryCache, prefetchQuery } from './query-cache';

type QueryState<T> = { data: T | null; error: string | null; loading: boolean };

/** Solo para capturas/QA: window.__cfcSlowMs simula una red lenta (nunca se define en producción). */
function withSlow<T>(run: () => Promise<T>): () => Promise<T> {
  const slow = typeof globalThis !== 'undefined' ? Number((globalThis as { __cfcSlowMs?: number }).__cfcSlowMs ?? 0) : 0;
  if (!(slow > 0)) return run;
  return () => new Promise<T>((resolve, reject) => setTimeout(() => run().then(resolve, reject), slow));
}

function initial<T>(key: string | undefined): { state: QueryState<T>; sig: string | null } {
  const hit = key ? readCached<T>(key) : undefined;
  return hit
    ? { state: { data: hit.data, error: null, loading: false }, sig: hit.sig }
    : { state: { data: null, error: null, loading: true }, sig: null };
}

/**
 * Carga datos de una pantalla con caché compartida (stale-while-revalidate):
 * - Con `key`, al volver a una pantalla se pinta al instante lo último que se vio y se revalida
 *   detrás solo si cambió algo (las dependencias, p. ej. `version`).
 * - Una pantalla que no está enfocada no recalcula: se marca vieja y se pone al día al enfocarla.
 * - Si el resultado nuevo es igual al anterior, no hay render.
 */
export function useQuery<T>(load: () => Promise<T>, deps: readonly unknown[], key?: string) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const focused = useIsFocused();
  const sig = depsSignature(deps);

  const [state, setState] = useState<QueryState<T>>(() => initial<T>(key).state);
  const doneSig = useRef<string | null>(null);
  const keyRef = useRef<{ key: string | undefined } | null>(null);
  if (keyRef.current === null) {
    keyRef.current = { key };
    doneSig.current = initial<T>(key).sig;
  } else if (keyRef.current.key !== key) {
    // Cambió la llave (otro id en la misma pantalla): se arranca de su caché o de cero.
    keyRef.current = { key };
    const next = initial<T>(key);
    doneSig.current = next.sig;
    setState(next.state);
  }

  useEffect(() => {
    // Sin enfocar y ya con algo en pantalla: espera a que la vuelvan a mirar.
    if (!focused && doneSig.current !== null) return;
    if (doneSig.current === sig) return;
    let active = true;
    setState((current) => (current.error === null && current.loading === (current.data == null) ? current : { ...current, loading: current.data == null, error: null }));
    const run = withSlow(() => loadRef.current());
    (key ? fetchShared<T>(key, sig, run) : run())
      .then((data) => {
        if (!active) return;
        doneSig.current = sig;
        setState((current) => {
          if (current.data === data && !current.loading && current.error === null) return current;
          if (!key && sameData(current.data, data)) {
            return current.loading || current.error ? { data: current.data, error: null, loading: false } : current;
          }
          return { data, error: null, loading: false };
        });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'No se pudo cargar.';
        setState((current) => ({ data: current.data, error: message, loading: false }));
      });
    return () => {
      active = false;
    };
  }, [sig, focused, key]);

  return state;
}
