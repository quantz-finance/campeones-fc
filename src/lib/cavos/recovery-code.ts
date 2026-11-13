// Puro (con tests): el código de recuperación de Cavos (Stellar) son 16 palabras en minúscula separadas por espacio.
// El kit lanza "kit/stellar: recovery code is empty" si llega vacío; aquí se valida antes de llamarlo.

/** Palabras del código que genera el kit (CODE_WORDS en @cavos/kit 0.4.4). */
export const RECOVERY_WORDS = 16;

/** Igual que el kit (trim, espacios colapsados, minúsculas). También acepta saltos de línea, comas o guiones al pegar. */
export function normalizeRecoveryCode(raw: string | null | undefined): string {
  return String(raw ?? '')
    .replace(/[,;·•\-–—_]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function recoveryWordCount(raw: string | null | undefined): number {
  const code = normalizeRecoveryCode(raw);
  return code ? code.split(' ').length : 0;
}

/** null = listo para enviar; si no, el texto que se muestra bajo el campo. */
export function recoveryCodeProblem(raw: string | null | undefined): string | null {
  const n = recoveryWordCount(raw);
  if (n === 0) return 'Escribe tu código de recuperación.';
  if (n !== RECOVERY_WORDS) return `Tu código tiene ${RECOVERY_WORDS} palabras y aquí van ${n}. Revísalo.`;
  return null;
}
