import { defineConfig, devices } from '@playwright/test';

// Por defecto prueba el build local (dist-e2e) contra el Supabase local de e2e.
// Con E2E_BASE_URL prueba esa URL (p. ej. la preview de Vercel); el backend igual se redirige al Supabase local.
const remote = process.env.E2E_BASE_URL;
const port = Number(process.env.E2E_PORT ?? 8431);

export default defineConfig({
  testDir: 'e2e/tests',
  globalSetup: './e2e/global-setup.ts',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: remote ?? `http://127.0.0.1:${port}`,
    ...devices['Pixel 7'],
    locale: 'es-CR',
    timezoneId: 'America/Costa_Rica',
    // El service worker podría saltarse las rutas de Playwright: fuera durante las pruebas.
    serviceWorkers: 'block',
    // Cookie de acceso a la preview, si global-setup la creó.
    storageState: process.env.E2E_VERCEL_SHARE_URL ? 'e2e/.vercel-state.json' : undefined,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: remote
    ? undefined
    : { command: `node e2e/serve.mjs dist-e2e`, port, reuseExistingServer: !process.env.CI, env: { PORT: String(port) } },
});
