import { stampMissingRatings } from './mutate';
import { buildSeed } from './seed';
import type { World } from './types';

export const DEMO_STORAGE_KEY = 'campeonesfc.demo.v1';
export const DEMO_SESSION_KEY = 'campeonesfc.session';
export const DEMO_INVITE_KEY = 'campeonesfc.invite';

const channelName = 'campeones-fc-demo';

export function loadDemoWorld(): World {
  if (typeof localStorage === 'undefined') return buildSeed();
  const raw = localStorage.getItem(DEMO_STORAGE_KEY);
  if (!raw) {
    const seed = buildSeed();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    const world = JSON.parse(raw) as World;
    // Demos guardadas antes de que la semilla trajera el cambio Elo de cada partido.
    if (stampMissingRatings(world) > 0) localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(world));
    return world;
  } catch {
    const seed = buildSeed();
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

export function saveDemoWorld(world: World) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(world));
  demoChannel()?.postMessage({ type: 'sync', at: Date.now() });
}

function demoChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null;
  const globalKey = '__campeonesChannel';
  const holder = globalThis as typeof globalThis & { [globalKey]?: BroadcastChannel };
  if (!holder[globalKey]) holder[globalKey] = new BroadcastChannel(channelName);
  return holder[globalKey];
}

export function subscribeDemoStore(listener: () => void): () => void {
  const channel = demoChannel();
  if (!channel) return () => undefined;
  const onMessage = () => listener();
  channel.addEventListener('message', onMessage);
  const onStorage = (event: StorageEvent) => {
    if (event.key === DEMO_STORAGE_KEY) listener();
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    channel.removeEventListener('message', onMessage);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

export function readDemoSession(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(DEMO_SESSION_KEY);
}

export function writeDemoSession(userId: string | null) {
  if (typeof sessionStorage === 'undefined') return;
  if (userId) sessionStorage.setItem(DEMO_SESSION_KEY, userId);
  else sessionStorage.removeItem(DEMO_SESSION_KEY);
}

export function readPendingInvite(): string | null {
  if (typeof sessionStorage === 'undefined') return null;
  return sessionStorage.getItem(DEMO_INVITE_KEY);
}

export function writePendingInvite(code: string | null) {
  if (typeof sessionStorage === 'undefined') return;
  if (code) sessionStorage.setItem(DEMO_INVITE_KEY, code);
  else sessionStorage.removeItem(DEMO_INVITE_KEY);
}
