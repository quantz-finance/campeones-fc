import { EXIT_TOTAL_MS } from './motion-tokens';

export type TransitResult = 'immediate' | 'started' | 'queued';

type Job = () => void;
type Listener = (exiting: boolean) => void;
type Schedule = (run: Job, ms: number) => void;

/**
 * Máquina de la transición entre pantallas, sin React ni el router:
 * si hay quien escuche y el movimiento no está reducido, espera la salida
 * y se queda con el último destino si el usuario pulsa otra vez.
 */
export function createTransitController(exitMs: number) {
  let reduced = false;
  let locked = false;
  let pending: Job | null = null;
  const listeners = new Set<Listener>();

  function emit(exiting: boolean) {
    listeners.forEach((listener) => listener(exiting));
  }

  return {
    bindReduced(value: boolean) {
      reduced = value;
    },
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset() {
      reduced = false;
      locked = false;
      pending = null;
      listeners.clear();
    },
    request(run: Job, schedule: Schedule): TransitResult {
      if (reduced || listeners.size === 0) {
        run();
        return 'immediate';
      }
      if (locked) {
        pending = run;
        return 'queued';
      }
      locked = true;
      emit(true);
      schedule(() => {
        const job = pending ?? run;
        pending = null;
        emit(false);
        try {
          job();
        } finally {
          locked = false;
        }
      }, exitMs);
      return 'started';
    },
  };
}

export const transitController = createTransitController(EXIT_TOTAL_MS);
