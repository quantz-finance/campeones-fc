// Puro (con tests): qué camino de entrada toca según la billetera de Cavos en ESTE navegador.
import type { CavosBridged } from './store';

/** ¿Qué camino de entrada toca con el estado actual de la billetera? null = todavía cargando. */
export function loginPath(w: CavosBridged['wallet']): 'sign' | 'approve' | 'token' | null {
  if (w.deploying) return null;
  if (w.ready || w.undeployed) return 'sign';
  if (w.needsApproval) return w.hasPasskey ? 'approve' : 'token';
  return null;
}
