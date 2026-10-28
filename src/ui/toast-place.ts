/** Misma cuenta que tabBarSpace: 64 + el inset, con un mínimo de 10. */
function tabBarHeight(insetBottom: number): number {
  return 64 + Math.max(Math.round(insetBottom), 10);
}

/** Hay barra inferior en las pestañas y en el detalle de grupo o torneo. */
export function tabBarVisible(path: string): boolean {
  if (/^\/(inicio|grupos|jugar|torneos|perfil)\/?$/.test(path)) return true;
  if (/^\/grupo\/(?!nuevo$)[^/]+$/.test(path)) return true;
  if (/^\/torneo\/(?!nuevo$)[^/]+$/.test(path)) return true;
  return false;
}

/** Píxeles enteros desde el borde inferior: sobre la barra si existe, si no sobre el home indicator. */
export function toastBottom(path: string, insetBottom: number): number {
  const inset = Math.max(0, Math.round(insetBottom));
  return tabBarVisible(path) ? tabBarHeight(inset) + 8 : Math.max(inset, 12) + 8;
}
