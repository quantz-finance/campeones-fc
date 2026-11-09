// "Solo quiero mirar": abre la app sin cuenta, en solo lectura, con el mundo de ejemplo.
// Con Supabase lo trae GET /api/espectador (sin token). En modo demostración usa la semilla local.
import { buildSeed } from '../data/seed';
import { scrubWorld } from '../data/spectator';
import type { World } from '../data/types';
import { ApiError } from './api';
import type { BackendMode } from './env';

export const SPECTATOR_KEY = 'campeonesfc.espectador';

export function readSpectator(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(SPECTATOR_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeSpectator(on: boolean) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (on) localStorage.setItem(SPECTATOR_KEY, '1');
    else localStorage.removeItem(SPECTATOR_KEY);
  } catch {}
}

const FAIL = 'No pudimos abrir el modo espectador. Intenta de nuevo en un momento.';

export async function loadSpectatorWorld(mode: BackendMode): Promise<World> {
  if (mode !== 'supabase') return scrubWorld(buildSeed());
  let res: Response;
  try {
    res = await fetch('/api/espectador', { method: 'GET', headers: { Accept: 'application/json' } });
  } catch {
    throw new ApiError('No hay conexión. Revisa tu internet y vuelve a intentar.', 0, 'network');
  }
  const data = (await res.json().catch(() => ({}))) as { world?: World; error?: string; code?: string };
  if (!res.ok || !data.world) throw new ApiError(data.error ?? FAIL, res.status, data.code ?? 'error');
  return data.world;
}
