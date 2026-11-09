// rpId de las passkeys según el dominio donde corre la app (puro, sin react-native: lo prueba vitest).
// WebAuthn exige que el rpId sea el host de la página o un sufijo registrable de él. La app vive en
// campeones-fc.vercel.app (rpId del entorno) y en partido.campeonesfc.app; en el dominio propio se usa
// el dominio registrable 'campeonesfc.app' para que sirva en cualquier subdominio.
// Nota: con el vault de Cavos (activo cuando hay appId) las passkeys se crean dentro del iframe del vault,
// así que este valor solo aplica al camino sin vault y al nativo.

export const OWN_DOMAIN = 'campeonesfc.app';

/** Host de la página -> rpId. Sin host (nativo/SSR) o en otro dominio se queda el del entorno. */
export function resolveRpId(hostname: string | null | undefined, envRpId: string): string {
  const h = String(hostname ?? '').trim().toLowerCase().replace(/\.$/, '');
  if (h === OWN_DOMAIN || h.endsWith(`.${OWN_DOMAIN}`)) return OWN_DOMAIN;
  return envRpId;
}
