import { backendMode } from '../lib/env';
import { loadDemoWorld, saveDemoWorld, subscribeDemoStore } from './demo-store';
import { buildSeed } from './seed';
import { createMemoryRepository } from './memory-repository';
import type { Repository } from './repository';
import { createSupabaseRepository } from './supabase-repository';

export function createRepository(): Repository {
  if (backendMode() === 'supabase') return createSupabaseRepository();
  const memory = createMemoryRepository(loadDemoWorld(), {
    reload: () => loadDemoWorld(),
    persist: (world) => saveDemoWorld(world),
    reset: () => buildSeed(),
  });
  return {
    ...memory,
    subscribe(listener) {
      const offMemory = memory.subscribe(listener);
      const offChannel = subscribeDemoStore(listener);
      return () => {
        offMemory();
        offChannel();
      };
    },
  };
}

export type { Repository } from './repository';
