import { router, type Href } from 'expo-router';
import { transitController } from './transit';

function schedule(run: () => void, ms: number) {
  setTimeout(run, ms);
}

type Prefetcher = (path: string) => void;
let prefetcher: Prefetcher | null = null;

/** El AppProvider registra aquí cómo precargar los datos de una ruta (con su repo y usuario). */
export function setNavPrefetcher(next: Prefetcher | null) {
  prefetcher = next;
}

/** Arranca los datos del destino mientras corre la salida (~190 ms que antes se esperaban sin hacer nada). */
function warm(href: Href) {
  if (typeof href !== 'string' || !prefetcher) return;
  try {
    prefetcher(href);
  } catch {
    // La precarga nunca rompe la navegación.
  }
}

/** Sale la pantalla actual y, al terminar, corre la navegación. */
export function transit(run: () => void) {
  transitController.request(run, schedule);
}

export function push(href: Href) {
  warm(href);
  transit(() => router.push(href));
}

export function replace(href: Href) {
  warm(href);
  transit(() => router.replace(href));
}

export function back() {
  transit(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/inicio');
  });
}

export function navigate(href: Href) {
  warm(href);
  transit(() => router.navigate(href));
}
