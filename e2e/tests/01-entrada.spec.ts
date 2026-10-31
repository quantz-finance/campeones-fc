// Portada y entrada sin sesión: solo Google, nada de cripto, edad y consentimiento obligatorios.
import { expect, test } from '@playwright/test';
import { adminSelect, asUser, cleanupUsers, createUser, fillConsent, googleButton, isolate, stubGoogle } from '../support';

test.afterAll(cleanupUsers);

test.beforeEach(async ({ context }) => {
  await isolate(context);
});

for (const path of ['/', '/entrar']) {
  test(`sin sesión ${path} muestra solo la entrada con Google`, async ({ page }) => {
    await page.goto(path);
    await expect(googleButton(page)).toBeVisible();
    const body = page.locator('body');
    await expect(body).not.toContainText(/Cavos|Stellar|billetera|wallet|apuesta|USDC|passkey|Apple|Crear cuenta|código al correo/i);
    // Ninguna otra forma de entrar.
    await expect(page.getByRole('button', { name: /Entrar/ })).toHaveCount(1);
    // Sin edad ni casillas, el botón no deja seguir.
    await expect(googleButton(page)).toBeDisabled();
  });
}

test('/verificar ya no existe', async ({ page }) => {
  await page.goto('/verificar/00000000-0000-0000-0000-000000000000');
  await expect(page.locator('body')).not.toContainText(/Stellar|Verificado/i);
});

test('los Términos y el Aviso de privacidad están marcados como borrador y citan la Ley 8968', async ({ page }) => {
  await page.goto('/terminos');
  await expect(page.getByText('Términos de uso').first()).toBeVisible();
  await expect(page.getByText(/BORRADOR/)).toBeVisible();
  await page.goto('/privacidad');
  await expect(page.getByText(/BORRADOR/)).toBeVisible();
  await expect(page.locator('body')).toContainText('Ley N.° 8968');
  await expect(page.locator('body')).toContainText('PRODHAB');
});

test('el consentimiento es obligatorio: sin las dos casillas no se puede entrar', async ({ page }) => {
  await page.goto('/');
  await fillConsent(page, { terms: false, privacy: false });
  await expect(googleButton(page)).toBeDisabled();
  await page.getByRole('checkbox', { name: /Términos de uso/ }).click();
  await expect(googleButton(page)).toBeDisabled();
  await page.getByRole('checkbox', { name: /Aviso de privacidad/ }).click();
  await expect(googleButton(page)).toBeEnabled();
});

test('menores de 13 quedan bloqueados y no ven el botón de Google', async ({ page }) => {
  const seen = await stubGoogle(page, null);
  await page.goto('/');
  const twelve = new Date();
  twelve.setFullYear(twelve.getFullYear() - 12);
  const birth = `${String(twelve.getDate()).padStart(2, '0')}/${String(twelve.getMonth() + 1).padStart(2, '0')}/${twelve.getFullYear()}`;
  await page.getByLabel('Fecha de nacimiento').fill(birth);
  await expect(page.getByText('Todavía no puedes entrar')).toBeVisible();
  await expect(page.getByText(/al menos 13 años/)).toBeVisible();
  await expect(googleButton(page)).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  expect(seen.authorize).toBeUndefined();
});

test('de 13 a 17 años se muestra el aviso de permiso y hay que confirmarlo', async ({ page }) => {
  await page.goto('/');
  await fillConsent(page, { birth: '01/01/' + (new Date().getFullYear() - 15) });
  await expect(page.getByText('Necesitas permiso')).toBeVisible();
  await expect(page.getByText(/permiso de tu madre, padre o tutor/)).toBeVisible();
  await expect(googleButton(page)).toBeDisabled();
  await page.getByRole('checkbox', { name: /madre, padre o tutor/ }).click();
  await expect(googleButton(page)).toBeEnabled();
});

test('entrar con Google: pide provider=google con PKCE, vuelve a /auth/callback, guarda el consentimiento y llega a Inicio', async ({ page }) => {
  const ana = await createUser('Ana');
  const seen = await stubGoogle(page, ana);
  await page.goto('/');
  await fillConsent(page);
  await googleButton(page).click();
  await page.waitForURL(/\/inicio/, { timeout: 30_000 });
  expect(seen.authorize?.searchParams.get('provider')).toBe('google');
  expect(seen.authorize?.searchParams.get('code_challenge')).toBeTruthy();
  expect(seen.authorize?.searchParams.get('code_challenge_method')?.toLowerCase()).toBe('s256');
  expect(new URL(seen.authorize!.searchParams.get('redirect_to')!).pathname).toBe('/auth/callback');
  expect(seen.exchange?.auth_code).toBe(new URL(page.url()).searchParams.get('code') ?? seen.exchange?.auth_code);
  await expect(page.getByText('Tu ficha')).toBeVisible();
  await expect(page.getByText('Ana', { exact: true }).first()).toBeVisible();
  // El consentimiento quedó en el servidor con su fecha y hora, solo con el año de nacimiento.
  const [row] = await adminSelect('user_consents', `user_id=eq.${ana.id}`);
  expect(row).toMatchObject({ age_band: '18_plus', birth_year: 1995, parental_ack_at: null });
  expect(Date.parse(String(row.terms_accepted_at))).toBeGreaterThan(Date.now() - 5 * 60_000);
  expect(row).not.toHaveProperty('birth_date');
});

test('de 13 a 17 años: con el permiso confirmado entra y queda guardada la hora del permiso', async ({ page }) => {
  const teen = await createUser('Teen');
  await stubGoogle(page, teen);
  await page.goto('/');
  await fillConsent(page, { birth: '01/01/' + (new Date().getFullYear() - 15), parental: true });
  await googleButton(page).click();
  await page.waitForURL(/\/inicio/, { timeout: 30_000 });
  const [row] = await adminSelect('user_consents', `user_id=eq.${teen.id}`);
  expect(row.age_band).toBe('13_17');
  expect(row.parental_ack_at).toBeTruthy();
});

test('el servidor también rechaza: menores de 13, sin permiso parental o sin casillas', async () => {
  const eve = await createUser('Eve');
  const api = await asUser(eve);
  const year = new Date().getFullYear();
  const call = (birth: string, terms: boolean, privacy: boolean, parental: boolean) =>
    api.post('rpc/record_consent', {
      data: { p_birth_date: birth, p_terms: terms, p_privacy: privacy, p_parental_ack: parental, p_terms_version: 't', p_privacy_version: 'p' },
    });
  expect((await call(`${year - 10}-01-01`, true, true, true)).status()).toBe(400);
  expect((await call(`${year - 15}-01-01`, true, true, false)).status()).toBe(400);
  expect((await call('1990-01-01', true, false, false)).status()).toBe(400);
  expect(await adminSelect('user_consents', `user_id=eq.${eve.id}`)).toHaveLength(0);
  expect((await call('1990-01-01', true, true, false)).ok()).toBeTruthy();
});

test('menor de 13 que llega con sesión (sin pasar por la portada) queda bloqueado en /consentimiento', async ({ page }) => {
  const kid = await createUser('Kid');
  await stubGoogle(page, kid);
  // Entra directo por /entrar con una fecha de adulto pero SIN guardar consentimiento (simula otro dispositivo):
  await page.goto('/entrar');
  await fillConsent(page);
  await page.evaluate(() => localStorage.setItem('campeonesfc.consent.pending', 'null'));
  await page.evaluate(() => localStorage.removeItem('campeonesfc.consent.pending'));
  await page.route('**/rest/v1/rpc/record_consent', (r) => r.abort());
  await googleButton(page).click();
  await page.waitForURL(/\/consentimiento/, { timeout: 30_000 });
  await page.unroute('**/rest/v1/rpc/record_consent');
  const birth = `01/01/${new Date().getFullYear() - 10}`;
  await page.getByLabel('Fecha de nacimiento').fill(birth);
  await expect(page.getByText('Todavía no puedes entrar')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aceptar y seguir' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Salir' }).click();
  await page.waitForURL((u) => !/consentimiento/.test(u.pathname), { timeout: 15_000 });
});

test('si cancelas en Google, la app lo dice', async ({ page }) => {
  await stubGoogle(page, null, { error: 'access_denied' });
  await page.goto('/');
  await fillConsent(page);
  await googleButton(page).click();
  await expect(page.getByText(/Cancelaste la entrada con Google/)).toBeVisible();
});
