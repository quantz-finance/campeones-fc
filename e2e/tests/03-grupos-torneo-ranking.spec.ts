// Grupos, torneo (liga) y ranking, más el "Modo prueba" con el mundo demo.
import { expect, test, type APIRequestContext } from '@playwright/test';
import { adminSelect, asUser, cleanupUsers, createUser, playerPage, rpc, type TestUser } from '../support';

test.afterAll(cleanupUsers);

/** Amistad por las mismas RPC que usa la app (la amistad por pantalla ya la cubre 02-partido). */
async function befriend(from: TestUser, fromApi: APIRequestContext, to: TestUser, toApi: APIRequestContext) {
  await rpc(fromApi, 'send_friend_request', { target_username: to.username });
  const res = await toApi.get(`friendships?select=id&requester_id=eq.${from.id}&addressee_id=eq.${to.id}`);
  const [row] = await res.json();
  await rpc(toApi, 'respond_friend_request', { friendship_id: row.id, accept: true });
}

/** Juega un partido completo (aceptar, los dos votos iguales) por RPC. */
async function play(matchId: string, aApi: APIRequestContext, bApi: APIRequestContext, winner: string, ga: number, gb: number) {
  const [m] = await adminSelect('matches', `id=eq.${matchId}&select=player_a_id,player_b_id,status`);
  if (m.status === 'pending_accept') await rpc(bApi, 'accept_match', { match_id: matchId }).catch(async () => rpc(aApi, 'accept_match', { match_id: matchId }));
  for (const api of [aApi, bApi]) {
    await rpc(api, 'submit_match_report', { match_id: matchId, is_draw: false, winner_id: winner, goals_a: ga, goals_b: gb });
  }
}

test('grupo y torneo de liga: se crean por pantalla y la tabla suma el partido confirmado', async ({ browser, baseURL }) => {
  const [ana, beto, caro] = [await createUser('Ana'), await createUser('Beto'), await createUser('Caro')];
  const [aApi, bApi, cApi] = [await asUser(ana), await asUser(beto), await asUser(caro)];
  await befriend(beto, bApi, ana, aApi);
  await befriend(caro, cApi, ana, aApi);

  const a = await playerPage(browser, ana, baseURL!);
  const groupName = `Grupo e2e ${Date.now().toString(36)}`;
  await a.goto('/grupo/nuevo');
  await a.getByLabel('Nombre').fill(groupName);
  await a.getByText(beto.displayName).click();
  await a.getByText(caro.displayName).click();
  await a.getByRole('button', { name: 'Crear grupo' }).click();
  await a.waitForURL(/\/grupo\/[0-9a-f-]{36}/);
  const groupId = a.url().split('/grupo/')[1].split(/[?#]/)[0];
  await expect(a.getByText(groupName).first()).toBeVisible();
  const members = await adminSelect('group_members', `group_id=eq.${groupId}&select=user_id`);
  expect(members.map((m) => m.user_id).sort()).toEqual([ana.id, beto.id, caro.id].sort());

  await a.goto('/grupos');
  await expect(a.getByText(groupName).first()).toBeVisible();

  // Torneo de liga con los tres.
  const cupName = `Liga e2e ${Date.now().toString(36)}`;
  await a.goto(`/torneo/nuevo?grupo=${groupId}`);
  await a.getByLabel('Nombre').fill(cupName);
  await a.getByText('Liga', { exact: true }).click();
  for (const u of [ana, beto, caro]) await a.getByText(u.displayName, { exact: true }).click();
  await a.getByRole('button', { name: 'Crear torneo' }).click();
  await a.waitForURL(/\/torneo\/[0-9a-f-]{36}/);
  const cupId = a.url().split('/torneo/')[1].split(/[?#]/)[0];
  await expect(a.getByText(cupName).first()).toBeVisible();

  const cupMatches = await adminSelect('matches', `tournament_id=eq.${cupId}&select=id,player_a_id,player_b_id`);
  expect(cupMatches).toHaveLength(3);

  // Se juega Ana contra Beto (gana Ana 2–0) y la liga lo refleja.
  const ab = cupMatches.find((m) => [m.player_a_id, m.player_b_id].sort().join() === [ana.id, beto.id].sort().join())!;
  const aIsA = ab.player_a_id === ana.id;
  await play(String(ab.id), aIsA ? aApi : bApi, aIsA ? bApi : aApi, ana.id, aIsA ? 2 : 0, aIsA ? 0 : 2);
  const [done] = await adminSelect('matches', `id=eq.${ab.id}&select=status,winner_id`);
  expect(done).toMatchObject({ status: 'confirmed', winner_id: ana.id });

  await a.goto(`/torneo/${cupId}`);
  await a.reload();
  // Tabla: Ana primera con 3 puntos; el cruce muestra el 2–0.
  await expect(a.getByText('Tabla')).toBeVisible();
  await expect(a.getByText('3 pts')).toHaveCount(1);
  await expect(a.getByText('0 pts')).toHaveCount(2);
  const first = a.getByText('3 pts');
  const anaName = a.getByText('Ana', { exact: true }).first();
  expect(Math.abs((await first.boundingBox())!.y - (await anaName.boundingBox())!.y)).toBeLessThan(12);
  await expect(a.getByText(/Ana · 2 goles/)).toBeVisible();
  await a.context().close();
});

test('ranking: con 3 partidos confirmados aparecen los dos, en orden; el Modo prueba muestra el mundo demo', async ({ browser, baseURL }) => {
  const [ana, beto] = [await createUser('Ana'), await createUser('Beto')];
  const [aApi, bApi] = [await asUser(ana), await asUser(beto)];
  await befriend(beto, bApi, ana, aApi);
  for (let i = 0; i < 3; i++) {
    const match = await rpc(aApi, 'create_match', { opponent_id: beto.id, group_id: null });
    const id = typeof match === 'string' ? match : (match.id ?? match);
    await rpc(bApi, 'accept_match', { match_id: id });
    for (const api of [aApi, bApi]) await rpc(api, 'submit_match_report', { match_id: id, is_draw: false, winner_id: ana.id, goals_a: 1, goals_b: 0 });
  }

  const a = await playerPage(browser, ana, baseURL!);
  await a.goto('/ranking');
  const anaRow = a.getByText(ana.displayName).first();
  const betoRow = a.getByText(beto.displayName).first();
  await expect(anaRow).toBeVisible();
  await expect(betoRow).toBeVisible();
  expect((await anaRow.boundingBox())!.y).toBeLessThan((await betoRow.boundingBox())!.y);
  await expect(a.getByText('Diego Rojas')).toHaveCount(0);

  // Modo prueba (show_demo): se ve el mundo demo; al volver a Real desaparece.
  await a.goto('/perfil');
  await a.getByRole('radio', { name: 'Modo prueba' }).click();
  await expect.poll(async () => (await adminSelect('profiles', `id=eq.${ana.id}&select=show_demo`))[0].show_demo).toBe(true);
  await a.goto('/inicio');
  await expect(a.getByText('MODO PRUEBA')).toBeVisible();
  await a.goto('/ranking');
  await expect(a.getByText('Diego Rojas').first()).toBeVisible();
  await a.goto('/perfil');
  await a.getByRole('radio', { name: 'Real' }).click();
  await expect.poll(async () => (await adminSelect('profiles', `id=eq.${ana.id}&select=show_demo`))[0].show_demo).toBe(false);
  await a.goto('/ranking');
  await expect(a.getByText(ana.displayName).first()).toBeVisible();
  await expect(a.getByText('Diego Rojas')).toHaveCount(0);
  await a.context().close();
});
