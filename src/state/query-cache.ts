/**
 * Caché de consultas compartida entre pantallas (sin React, se puede probar en Node).
 * Cada entrada guarda la firma de dependencias con que se calculó: si la firma coincide, el dato
 * está al día; si no, se muestra igual (viejo) y se revalida.
 */
type Entry = { sig: string; data: unknown };

const cache = new Map<string, Entry>();
const inflight = new Map<string, { sig: string; promise: Promise<unknown> }>();
const objectIds = new WeakMap<object, number>();
let nextObjectId = 1;

/** Firma estable de una lista de dependencias: primitivos por valor, objetos por identidad. */
export function depsSignature(deps: readonly unknown[]): string {
  return deps
    .map((dep) => {
      if (dep !== null && (typeof dep === 'object' || typeof dep === 'function')) {
        let id = objectIds.get(dep as object);
        if (id == null) {
          id = nextObjectId++;
          objectIds.set(dep as object, id);
        }
        return `#${id}`;
      }
      return `${typeof dep}:${String(dep)}`;
    })
    .join('|');
}

/** Igualdad estructural barata para resultados de proyección (JSON plano). */
export function sameData(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

export function readCached<T>(key: string): { sig: string; data: T } | undefined {
  return cache.get(key) as { sig: string; data: T } | undefined;
}

/**
 * Corre `run` una sola vez por (llave, firma) aunque lo pidan varias pantallas a la vez.
 * Si el resultado es igual al guardado, devuelve la misma referencia (React no vuelve a pintar).
 */
export function fetchShared<T>(key: string, sig: string, run: () => Promise<T>): Promise<T> {
  const running = inflight.get(key);
  if (running && running.sig === sig) return running.promise as Promise<T>;
  const promise: Promise<T> = run().then((data) => {
    const prev = cache.get(key);
    const kept = prev && sameData(prev.data, data) ? (prev.data as T) : data;
    cache.set(key, { sig, data: kept });
    return kept;
  });
  inflight.set(key, { sig, promise });
  const clear = () => {
    if (inflight.get(key)?.promise === promise) inflight.delete(key);
  };
  promise.then(clear, clear);
  return promise;
}

/** Calcula por adelantado (p. ej. el Perfil al abrir la app) si no está al día. */
export function prefetchQuery<T>(key: string, deps: readonly unknown[], load: () => Promise<T>): Promise<void> {
  const sig = depsSignature(deps);
  const hit = cache.get(key);
  if (hit && hit.sig === sig) return Promise.resolve();
  return fetchShared(key, sig, load).then(
    () => undefined,
    () => undefined,
  );
}

export function clearQueryCache() {
  cache.clear();
  inflight.clear();
}
