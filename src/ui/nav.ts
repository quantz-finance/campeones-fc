import { router, type Href } from 'expo-router';
import { transitController } from './transit';

function schedule(run: () => void, ms: number) {
  setTimeout(run, ms);
}

/** Sale la pantalla actual y, al terminar, corre la navegación. */
export function transit(run: () => void) {
  transitController.request(run, schedule);
}

export function push(href: Href) {
  transit(() => router.push(href));
}

export function replace(href: Href) {
  transit(() => router.replace(href));
}

export function back() {
  transit(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/inicio');
  });
}

export function navigate(href: Href) {
  transit(() => router.navigate(href));
}
