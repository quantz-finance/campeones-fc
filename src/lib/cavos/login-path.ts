// Puro (con tests): qué camino de entrada toca según la billetera de Cavos en ESTE navegador.
import type { CavosBridged } from './store';

/** ¿Qué camino de entrada toca con el estado actual de la billetera? null = todavía cargando. */
export function loginPath(w: CavosBridged['wallet']): 'sign' | 'approve' | 'token' | null {
  if (w.deploying) return null;
  if (w.ready || w.undeployed) return 'sign';
  if (w.needsApproval) return w.hasPasskey ? 'approve' : 'token';
  return null;
}

/** ¿El token de Cavos (JWT) ya venció o vence en menos de `skewS`? Malformado = vencido. Solo lee `exp`, no verifica. */
export function tokenExpired(token: string, nowS = Math.floor(Date.now() / 1000), skewS = 30): boolean {
  try {
    const part = token.split('.')[1] ?? '';
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.exp !== 'number' || json.exp - skewS <= nowS;
  } catch {
    return true;
  }
}
