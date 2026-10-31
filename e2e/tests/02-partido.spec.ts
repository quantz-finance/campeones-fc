// Amistad, partido 1 vs 1 de punta a punta (reto, aviso al rival, marcador, confirmación de los dos) y Elo.
import { expect, test } from '@playwright/test';
import { adminSelect, cleanupUsers, createUser, playerPage, type TestUser } from '../support';

test.afterAll(cleanupUsers);

export async function makeFriends(a: import('@playwright/test').Page, b: import('@playwright/test').Page, userA: TestUser) {
  await b.goto('/amigos');
  await b.getByLabel('Usuario').fill(userA.username);
  await b.getByRole('button', { name: 'Invitar' }).first().click();
  await expect(b.getByText('Esperando respuesta')).toBeVisible();
  await a.goto('/amigos');
  await expect(a.getByText('Te invitaron')).toBeVisible();
  await a.getByRole('button', { name: 'Aceptar' }).first().click();
  await expect(a.getByText('Tus amigos')).toBeVisible();
}

test('reto, aceptación, marcador, confirmación de los dos y cambio de Elo', async ({ browser, baseURL }) => {
  const ana = await createUser('Ana');
  const beto = await createUser('Beto');
  const a = await playerPage(browser, ana, baseURL!);
  const b = await playerPage(browser, beto, baseURL!);

  await makeFriends(a, b, ana);

  // Ana reta a Beto.
  await a.goto('/jugar');
  await a.getByText(beto.displayName).click();
  await a.getByRole('button', { name: 'Proponer partido' }).click();
  await a.waitForURL(/\/partido\//);
  const matchUrl = new URL(a.url()).pathname;
  const matchId = matchUrl.split('/').pop()!;

  // Beto recibe el aviso y acepta.
  await b.goto('/avisos');
  await expect(b.getByText(/te ret/i).first()).toBeVisible();
  await b.goto(matchUrl);
  await b.getByRole('button', { name: 'Aceptar partido' }).click();
  await expect(b.getByText('Partido en juego')).toBeVisible();

  // Ana registra 3–1 a su favor.
  await a.reload();
  await a.getByLabel('Subir', { exact: true }).first().click();
  await a.getByLabel('Subir', { exact: true }).first().click();
  await a.getByLabel('Subir', { exact: true }).nth(1).click();
  await a.getByRole('button', { name: 'Registrar resultado' }).click();
  await expect(a.getByText(/Esperando que .* confirme/)).toBeVisible();

  // Beto confirma lo que registró Ana.
  await b.reload();
  await expect(b.getByText('Te toca confirmar').first()).toBeVisible();
  await b.getByRole('button', { name: 'Confirmar resultado' }).click();

  // Resultado cerrado para los dos.
  for (const p of [a, b]) {
    await p.goto(matchUrl);
    await expect(p.getByText(/3\s*:\s*1/).first()).toBeVisible();
  }
  const [match] = await adminSelect('matches', `id=eq.${matchId}&select=status,winner_id,goals_a,goals_b,rating_delta_a,rating_delta_b`);
  expect(match).toMatchObject({ status: 'confirmed', winner_id: ana.id, goals_a: 3, goals_b: 1 });
  expect(Number(match.rating_delta_a)).toBeGreaterThan(0);
  expect(Number(match.rating_delta_b)).toBeLessThan(0);
  const ratings = await adminSelect('player_ratings', `user_id=in.(${ana.id},${beto.id})&select=user_id,rating`);
  const r = Object.fromEntries(ratings.map((x) => [x.user_id, Number(x.rating)]));
  expect(r[ana.id]).toBeGreaterThan(1200);
  expect(r[beto.id]).toBeLessThan(1200);

  // La app muestra el cambio de Elo en el historial de Ana.
  await a.goto('/inicio');
  await expect(a.getByText(new RegExp(`\\+${match.rating_delta_a} Elo`)).first()).toBeVisible();
  await a.context().close();
  await b.context().close();
});
