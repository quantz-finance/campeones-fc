export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'DomainError';
  }
}

// Fallas de red (sin internet, servidor inalcanzable, tiempo agotado). No son errores de la app:
// la UI muestra «Sin conexión» y reintenta sola cuando vuelve la red. Nunca cierran la sesión.
const NETWORK =
  /fetch failed|failed to fetch|network request failed|network ?error|load failed|internet connection appears to be offline|not connected to the internet|the network connection was lost|could not connect to the server|request timed out|timed out|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ENOTFOUND|EAI_AGAIN|ENETUNREACH|socket hang up/i;

export function isNetworkMessage(message: string): boolean {
  return NETWORK.test(message);
}

/** True si la causa es una falla de red (ya clasificada como 'network' o con un mensaje típico de red). */
export function isNetworkError(cause: unknown): boolean {
  if (cause instanceof DomainError && cause.code === 'network') return true;
  if (typeof cause === 'string') return isNetworkMessage(cause);
  if (cause && typeof cause === 'object') {
    const { message, name } = cause as { message?: unknown; name?: unknown };
    if (name === 'AbortError') return true;
    if (typeof message === 'string' && isNetworkMessage(message)) return true;
  }
  return false;
}

/** Error del servidor ya clasificado: 'network' si no hubo conexión, 'remote' para el resto. */
export function remoteError(message: string): DomainError {
  return new DomainError(isNetworkMessage(message) ? 'network' : 'remote', message);
}
