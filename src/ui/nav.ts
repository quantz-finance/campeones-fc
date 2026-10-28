import { router, type Href } from 'expo-router';
import { playWhoosh, unlockAudio } from './audio';
import { transitController } from './transit';

function schedule(run: () => void, ms: number) {
  setTimeout(run, ms);
}

/** Sale la pantalla actual y, al terminar, corre la navegación. */
export function transit(run: () => void) {
  unlockAudio();
  const result = transitController.request(run, schedule);
  if (result === 'started') playWhoosh();
}

export function push(href: Href) {
  transit(() => router.push(href));
}

export function replace(href: Href) {
  transit(() => router.replace(href));
}

export function back() {
  transit(() => router.back());
}

export function navigate(href: Href) {
  transit(() => router.navigate(href));
}
