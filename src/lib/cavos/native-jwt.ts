// En kit 0.4.4 / 0.5.2 el CavosProvider nativo no expone el JWT. Lo capturamos en
// identityFromAuthData (el kit ya intercambió cavos_auth_code o parseó auth_data)
// y lo guardamos en memoria para /api/auth. Ver docs/cavos-native.md.

let current: string | null = null;

export function setNativeCavosJwt(token: string | null) {
  current = token && isJwt(token) ? token : null;
}

export function getNativeCavosJwt(): string | null {
  return current;
}

function isJwt(token: string): boolean {
  return token.includes('.') && token.split('.').length >= 3;
}

function tokenFromObject(parsed: Record<string, unknown>): string | null {
  const token = parsed.id_token ?? parsed.jwt ?? parsed.token;
  return typeof token === 'string' && isJwt(token) ? token : null;
}

/** Lee un JWT del cuerpo que devuelve /api/oauth/callback/exchange o de auth_data. */
export function extractJwtFromAuthPayload(data: unknown): string | null {
  if (data == null) return null;
  if (typeof data === 'object' && !Array.isArray(data)) {
    return tokenFromObject(data as Record<string, unknown>);
  }
  if (typeof data !== 'string') return null;
  const trimmed = data.trim();
  if (!trimmed) return null;
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const fromObj = tokenFromObject(parsed as Record<string, unknown>);
      if (fromObj) return fromObj;
    }
  } catch {
    /* no era JSON: puede ser el JWT crudo */
  }
  return isJwt(trimmed) ? trimmed : null;
}

/** Si el payload trae un JWT, lo deja listo para token() / /api/auth. */
export function captureJwtFromIdentityAuthData(data: unknown): string | null {
  const jwt = extractJwtFromAuthPayload(data);
  if (jwt) setNativeCavosJwt(jwt);
  return jwt;
}

export function extractJwtFromCallbackUrl(url: string): string | null {
  let authData: string | null = null;
  try {
    const params = new URL(url).searchParams;
    if (params.get('cavos_auth_code')) return null; // el token llega al kit por el intercambio, no en la URL
    authData = params.get('auth_data') ?? params.get('zk_auth_data');
  } catch {
    return null;
  }
  if (!authData) return null;
  return extractJwtFromAuthPayload(authData);
}
