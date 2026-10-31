// Errores en palabras de la cancha: qué pasó y qué hacer.
export function humanError(cause: unknown): string {
  const raw = cause instanceof Error ? cause.message : typeof cause === 'string' ? cause : '';
  const text = raw.trim();
  if (!text) return 'No se pudo completar. Vuelve a intentar.';
  if (/failed to fetch|network|load failed|timeout/i.test(text)) return 'Sin conexión. Revisa tu internet y vuelve a intentar.';
  if (/jwt|token|session|sesión venci/i.test(text)) return 'Tu sesión venció. Sal y vuelve a entrar con Google.';
  if (/duplicate key|unique constraint|matches_one_open_pair/i.test(text)) return 'Ya tienen un partido abierto entre los dos. Termínalo o cancélalo antes de crear otro.';
  if (/permission denied|row-level security/i.test(text)) return 'No tienes permiso para hacer eso en este partido.';
  return text;
}
