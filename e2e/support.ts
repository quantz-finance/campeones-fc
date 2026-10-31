// Ayudas de las pruebas e2e. Todo lo que escribe datos va SOLO al Supabase local de e2e (e2e/.stack.json).
// La app bajo prueba puede traer otra URL de Supabase incrustada (la preview de Vercel trae la de producción):
// en ese caso cada petición a esa URL se redirige al Supabase local, y nada llega a la base compartida.
import { expect, type APIRequestContext, type BrowserContext, type Page, request as pwRequest } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

type Stack = { url: string; anonKey: string; serviceKey: string };

function loadStack(): Stack {
  const fromEnv = process.env.E2E_SUPABASE_URL;
  const stack: Stack = fromEnv
    ? { url: fromEnv, anonKey: process.env.E2E_SUPABASE_ANON_KEY ?? '', serviceKey: process.env.E2E_SUPABASE_SERVICE_KEY ?? '' }
    : JSON.parse(readFileSync('e2e/.stack.json', 'utf8'));
  const host = new URL(stack.url).hostname;
  // Candado: las pruebas que escriben datos nunca corren contra un Supabase alojado (la base compartida).
  if (!['127.0.0.1', 'localhost'].includes(host) && process.env.E2E_ALLOW_REMOTE_BACKEND !== 'yes-isolated') {
    throw new Error(`e2e: el backend de pruebas tiene que ser local, no ${host}.`);
  }
  return stack;
}

export const stack = loadStack();
/** URL de Supabase incrustada en la app bajo prueba (en el build local es la misma del stack). */
export const appSupabaseUrl = (process.env.E2E_APP_SUPABASE_URL ?? stack.url).replace(/\/+$/, '');
export const RUN = randomBytes(3).toString('hex');

export type TestUser = { id: string; email: string; password: string; username: string; displayName: string };

let api: APIRequestContext | null = null;
async function admin() {
  api ??= await pwRequest.newContext({
    baseURL: stack.url,
    extraHTTPHeaders: { apikey: stack.serviceKey, Authorization: `Bearer ${stack.serviceKey}` },
  });
  return api;
}

const created: string[] = [];
let counter = 0;

/** Crea un usuario de prueba (prefijo e2e_) en el Supabase local. */
export async function createUser(name: string): Promise<TestUser> {
  // handle_new_user recorta el usuario a 12 caracteres: e2e_ + 6 del run + 2 del contador.
  const tag = `${RUN}${(counter++).toString(36).padStart(2, '0')}`;
  const username = `e2e_${tag}`;
  const user = {
    email: `e2e_${tag}@e2e.invalid`,
    password: randomBytes(12).toString('hex'),
    username,
    displayName: `${name} e2e`,
  };
  const res = await (await admin()).post('/auth/v1/admin/users', {
    data: { email: user.email, password: user.password, email_confirm: true, role: 'authenticated', user_metadata: { username, display_name: user.displayName } },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const id = (await res.json()).id as string;
  created.push(id);
  return { id, ...user };
}

/** Borra SOLO los usuarios que crearon estas pruebas (y en cascada sus datos), en el Supabase local. */
export async function cleanupUsers() {
  const a = await admin();
  while (created.length) {
    const id = created.pop()!;
    await a.delete(`/auth/v1/admin/users/${id}`).catch(() => undefined);
  }
}

/** Sesión real del GoTrue local (la que devolvería Google al terminar). */
export async function sessionFor(user: TestUser) {
  const ctx = await pwRequest.newContext({ baseURL: stack.url, extraHTTPHeaders: { apikey: stack.anonKey } });
  const res = await ctx.post('/auth/v1/token?grant_type=password', { data: { email: user.email, password: user.password } });
  expect(res.ok(), await res.text()).toBeTruthy();
  const session = await res.json();
  await ctx.dispose();
  return session as { access_token: string; refresh_token: string; user: { id: string } };
}

/** Cliente REST como el usuario (para preparar datos por las mismas RPC que usa la app). */
export async function asUser(user: TestUser) {
  const s = await sessionFor(user);
  return pwRequest.newContext({
    baseURL: `${stack.url}/rest/v1/`,
    extraHTTPHeaders: { apikey: stack.anonKey, Authorization: `Bearer ${s.access_token}`, 'Content-Type': 'application/json' },
  });
}

export async function rpc(ctx: APIRequestContext, fn: string, args: Record<string, unknown>) {
  const res = await ctx.post(`rpc/${fn}`, { data: args });
  expect(res.ok(), `${fn}: ${await res.text()}`).toBeTruthy();
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function jwtRef(token: string): string | null {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).ref ?? null;
  } catch {
    return null;
  }
}

/**
 * Prepara el navegador: sin analítica externa, sin Realtime remoto y, si la app trae otra URL de Supabase,
 * todo su tráfico redirigido al Supabase local (cambiando la clave pública por la local).
 */
export async function isolate(context: BrowserContext) {
  await context.route(/posthog|googletagmanager|google-analytics/, (r) => r.abort());
  await context.routeWebSocket(/\/realtime\/v1\//, (ws) => ws.close());
  if (appSupabaseUrl === stack.url) return;
  await context.route((url) => url.href.startsWith(appSupabaseUrl + '/'), async (route) => {
    const req = route.request();
    const target = stack.url + req.url().slice(appSupabaseUrl.length);
    const headers = { ...req.headers() };
    const swap = (v?: string) => !v || v.startsWith('sb_') || (jwtRef(v.replace(/^Bearer /, '')) ?? 'e2e-local') !== 'e2e-local';
    if (swap(headers.apikey)) headers.apikey = stack.anonKey;
    if (headers.authorization && swap(headers.authorization)) headers.authorization = `Bearer ${stack.anonKey}`;
    const response = await route.fetch({ url: target, headers });
    await route.fulfill({ response });
  });
}

/**
 * Simula el ida y vuelta de Google: intercepta /auth/v1/authorize (comprueba provider=google, PKCE y redirect_to)
 * y vuelve a /auth/callback con un código; el canje del código (/auth/v1/token?grant_type=pkce) devuelve una
 * sesión real del GoTrue local. Lo demás (perfil, RLS, RPC) es real.
 */
export async function stubGoogle(page: Page, user: TestUser | null, opts: { error?: string } = {}) {
  const seen: { authorize?: URL; exchange?: Record<string, unknown> } = {};
  await page.route((url) => url.href.startsWith(`${appSupabaseUrl}/auth/v1/authorize`), async (route) => {
    const url = new URL(route.request().url());
    seen.authorize = url;
    const back = new URL(url.searchParams.get('redirect_to') ?? '/');
    if (opts.error) {
      back.searchParams.set('error', 'access_denied');
      back.searchParams.set('error_description', opts.error);
    } else back.searchParams.set('code', `e2e-stub-${RUN}`);
    await route.fulfill({ status: 302, headers: { location: back.toString() } });
  });
  await page.route((url) => url.href.startsWith(`${appSupabaseUrl}/auth/v1/token`) && url.search.includes('grant_type=pkce'), async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: corsHeaders(req.headers().origin) });
    seen.exchange = req.postDataJSON();
    if (!user) return route.fulfill({ status: 400, headers: corsHeaders(req.headers().origin), json: { error: 'invalid_grant' } });
    const session = await sessionFor(user);
    await route.fulfill({ status: 200, headers: corsHeaders(req.headers().origin), json: session });
  });
  return seen;
}

function corsHeaders(origin?: string) {
  return {
    'access-control-allow-origin': origin ?? '*',
    'access-control-allow-credentials': 'true',
    'access-control-allow-headers': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
  };
}

/** Rellena la entrada (edad + casillas) y pulsa "Entrar con Google". */
export async function fillConsent(page: Page, opts: { birth?: string; parental?: boolean; terms?: boolean; privacy?: boolean } = {}) {
  await page.getByLabel('Fecha de nacimiento').fill(opts.birth ?? '15/06/1995');
  if (opts.parental) await page.getByRole('checkbox', { name: /madre, padre o tutor/ }).click();
  if (opts.terms ?? true) await page.getByRole('checkbox', { name: /Términos de uso/ }).click();
  if (opts.privacy ?? true) await page.getByRole('checkbox', { name: /Aviso de privacidad/ }).click();
}

export const googleButton = (page: Page) => page.getByRole('button', { name: /Entrar con Google/ });

/** Entra como `user` por la portada, con el ida y vuelta de Google simulado. */
export async function loginAs(page: Page, user: TestUser, consent: Parameters<typeof fillConsent>[1] = {}) {
  await isolate(page.context());
  await stubGoogle(page, user);
  await page.goto('/');
  await fillConsent(page, consent);
  await googleButton(page).click();
  await page.waitForURL(/\/inicio/, { timeout: 30_000 });
}

/** Abre otra ventana (otro jugador) ya con sesión. */
export async function playerPage(browser: import('@playwright/test').Browser, user: TestUser, baseURL: string) {
  const context = await browser.newContext({ ...(await defaultContextOptions()), baseURL });
  const page = await context.newPage();
  await loginAs(page, user);
  return page;
}

async function defaultContextOptions() {
  const { devices } = await import('@playwright/test');
  const { existsSync } = await import('node:fs');
  const storageState = existsSync('e2e/.vercel-state.json') ? 'e2e/.vercel-state.json' : undefined;
  return { ...devices['Pixel 7'], locale: 'es-CR', timezoneId: 'America/Costa_Rica', serviceWorkers: 'block' as const, storageState };
}

/** Pulsa un botón por su texto visible (los de la app son role=button con aria-label). */
export async function tap(page: Page, name: string | RegExp) {
  await page.getByRole('button', { name }).first().click();
}

/** Lectura con la clave de servicio del Supabase LOCAL (para comprobar lo que guardó la app). */
export async function adminSelect(table: string, query: string) {
  const res = await (await admin()).get(`/rest/v1/${table}?${query}`);
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()) as Record<string, unknown>[];
}
