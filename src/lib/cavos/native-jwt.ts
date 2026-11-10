// En kit 0.4.4 el CavosProvider nativo no expone el JWT. Si el callback trae auth_data,
// lo guardamos en memoria para /api/auth. El flujo moderno (cavos_auth_code) no incluye
// el token en la URL: eso hay que resolverlo con Cavos (ver docs/cavos-native.md).

let current: string | null = null;

export function setNativeCavosJwt(token: string | null) {
  current = token && token.includes('.') ? token : null;
}

export function getNativeCavosJwt(): string | null {
  return current;
}

export function extractJwtFromCallbackUrl(url: string): string | null {
  let authData: string | null = null;
  try {
    const params = new URL(url).searchParams;
    if (params.get('cavos_auth_code')) return null; // el token queda dentro del kit, no en la URL
    authData = params.get('auth_data') ?? params.get('zk_auth_data');
  } catch {
    return null;
  }
  if (!authData) return null;
  try {
    const parsed = JSON.parse(authData) as Record<string, unknown>;
    const token = parsed.id_token ?? parsed.jwt ?? parsed.token;
    return typeof token === 'string' && token.includes('.') ? token : null;
  } catch {
    return authData.includes('.') ? authData : null;
  }
}
