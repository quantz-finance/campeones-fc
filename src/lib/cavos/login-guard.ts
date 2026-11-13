// Una sola entrada a la vez. Dos toques seguidos en «Continuar con Google» abrían dos sesiones del navegador:
// expo-web-browser rechaza la segunda con "Another web browser is already open" mientras la primera sigue viva
// (el kit primero pide la URL de OAuth a Cavos, así que durante ~1 s el botón parecía no hacer nada).
// El segundo toque ahora recibe la MISMA promesa: no abre nada ni muestra error.
export type SingleFlight<A extends unknown[]> = ((...args: A) => Promise<void>) & { busy: () => boolean };

export function singleFlight<A extends unknown[]>(fn: (...args: A) => Promise<void>): SingleFlight<A> {
  let current: Promise<void> | null = null;
  const run = ((...args: A) => {
    if (current) return current;
    const p = Promise.resolve()
      .then(() => fn(...args))
      .finally(() => {
        if (current === p) current = null;
      });
    current = p;
    return p;
  }) as SingleFlight<A>;
  run.busy = () => current !== null;
  return run;
}

/** ¿El error es el de expo-web-browser por una sesión anterior que quedó abierta? */
export const isBrowserAlreadyOpen = (raw: string) => /another web browser is already open|already open/i.test(raw);
