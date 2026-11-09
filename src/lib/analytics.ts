// Analítica y reporte de errores propios de Campeones (PostHog). Sin EXPO_PUBLIC_POSTHOG_KEY no hace nada.
// Sin grabación de sesión y sin perfiles de personas anónimas; los errores se capturan solos (capture_exceptions).
type Client = {
  capture: (event: string, properties?: Record<string, unknown>) => void;
  captureException?: (error: unknown, properties?: Record<string, unknown>) => void;
};

let ready: Promise<Client | null> | null = null;

export function analyticsKey(): string {
  return process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() ?? '';
}

export function initAnalytics() {
  const key = analyticsKey();
  if (!key || typeof window === 'undefined' || ready) return;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';
  ready = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, {
        api_host: host,
        capture_pageview: false,
        persistence: 'localStorage',
        person_profiles: 'identified_only',
        disable_session_recording: true,
        capture_exceptions: true,
      });
      return posthog as unknown as Client;
    })
    .catch(() => null);
}

export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  void ready?.then((client) => client?.capture(event, properties));
}

/** Manda un error a PostHog (Error tracking). Nunca lanza: reportar no puede romper la app. */
export function reportError(error: unknown, context?: Record<string, string | number | boolean | null>) {
  try {
    console.error('[cfc]', error);
  } catch {}
  if (!ready) initAnalytics();
  void ready
    ?.then((client) => {
      if (!client) return;
      if (client.captureException) client.captureException(error, context);
      else client.capture('$exception', { message: String((error as any)?.message ?? error), ...context });
    })
    .catch(() => undefined);
}
