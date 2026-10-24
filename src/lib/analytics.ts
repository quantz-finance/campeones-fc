type Client = { capture: (event: string, properties?: Record<string, unknown>) => void };

let ready: Promise<Client | null> | null = null;

export function initAnalytics() {
  const key = process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim();
  if (!key || typeof window === 'undefined' || ready) return;
  const host = process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com';
  ready = import('posthog-js')
    .then(({ default: posthog }) => {
      posthog.init(key, { api_host: host, capture_pageview: false, persistence: 'localStorage' });
      return posthog;
    })
    .catch(() => null);
}

export function track(event: string, properties?: Record<string, string | number | boolean | null>) {
  void ready?.then((client) => client?.capture(event, properties));
}
