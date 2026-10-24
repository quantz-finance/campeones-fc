import { useEffect, useRef, useState } from 'react';

export function useQuery<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const loadRef = useRef(load);
  loadRef.current = load;
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, loading: current.data == null, error: null }));
    loadRef
      .current()
      .then((data) => {
        if (active) setState({ data, error: null, loading: false });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const message = error instanceof Error ? error.message : 'No se pudo cargar.';
        setState({ data: null, error: message, loading: false });
      });
    return () => {
      active = false;
    };
    // The caller lists the real dependencies. load is kept fresh via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
