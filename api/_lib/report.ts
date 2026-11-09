// Reporte de errores del servidor a PostHog (Error tracking), con la misma llave pública del cliente.
// Sin EXPO_PUBLIC_POSTHOG_KEY no hace nada. Nunca lanza y espera como mucho 1.5 s.

export function exceptionEvent(e: unknown, context: Record<string, unknown>, key: string) {
  const err = e instanceof Error ? e : new Error(String(e));
  return {
    api_key: key,
    event: '$exception',
    distinct_id: 'cfc-server',
    properties: {
      $process_person_profile: false,
      $exception_list: [{ type: err.name || 'Error', value: String(err.message).slice(0, 500), mechanism: { handled: true, synthetic: false } }],
      $exception_source: 'server',
      stack: String(err.stack ?? '').slice(0, 2000),
      ...context,
    },
  };
}

export async function reportServerError(e: unknown, context: Record<string, unknown> = {}): Promise<void> {
  const key = (process.env.POSTHOG_KEY ?? process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '').trim();
  if (!key) return;
  const host = (process.env.POSTHOG_HOST ?? process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com').replace(/\/$/, '');
  try {
    await fetch(`${host}/i/v0/e/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exceptionEvent(e, { ...context, vercel_env: process.env.VERCEL_ENV ?? 'local' }, key)),
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    // reportar no puede romper la respuesta
  }
}
