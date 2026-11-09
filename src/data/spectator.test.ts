import { describe, expect, it } from 'vitest';
import { spectatorAllows } from '../ui/spectator-routes';
import { buildSeed, IDS } from './seed';
import {
  createSpectatorRepository,
  isSpectatorBlocked,
  SPECTATOR_BLOCKED,
  SPECTATOR_ID,
  spectatorFeed,
  spectatorWorldFromRows,
  scrubWorld,
} from './spectator';
import type { RawRows } from './rows';

const at = '2026-11-01T12:00:00.000Z';
const match = (id: string, a: string, b: string, extra: Record<string, unknown> = {}) => ({
  id,
  player_a_id: a,
  player_b_id: b,
  status: 'confirmed',
  group_id: 'g-demo',
  tournament_id: null,
  tournament_slot_id: null,
  winner_id: a,
  is_draw: false,
  goals_a: 2,
  goals_b: 1,
  created_at: at,
  expires_at: at,
  accepted_at: at,
  confirmed_at: at,
  is_demo: true,
  chain_status: 'anchored',
  chain_tx: 'a'.repeat(64),
  ...extra,
});

function rawRows(): RawRows {
  return {
    profiles: [
      { id: 'd1', username: 'diego', display_name: 'Diego Demo', avatar_key: 'rayo', is_demo: true, show_demo: true, email: 'x@y.z' },
      { id: 'd2', username: 'vale', display_name: 'Vale Demo', avatar_key: 'ola', is_demo: true },
      { id: 'real', username: 'persona', display_name: 'Persona Real', avatar_key: 'luna', is_demo: false },
    ],
    groups: [
      { id: 'g-demo', name: 'Junta demo', created_by: 'd1', created_at: at, is_demo: true },
      { id: 'g-real', name: 'Grupo real', created_by: 'real', created_at: at, is_demo: false },
    ],
    members: [
      { group_id: 'g-demo', user_id: 'd1', role: 'owner', joined_at: at },
      { group_id: 'g-demo', user_id: 'd2', role: 'member', joined_at: at },
      { group_id: 'g-demo', user_id: 'real', role: 'member', joined_at: at },
      { group_id: 'g-real', user_id: 'real', role: 'owner', joined_at: at },
    ],
    tournaments: [
      { id: 't-demo', group_id: 'g-demo', name: 'Copa demo', format: 'single_elim', size: 4, status: 'in_progress', created_by: 'd1', winner_id: null, created_at: at, player_ids: ['d1', 'd2', 'real'], is_demo: true },
      { id: 't-real', group_id: 'g-real', name: 'Copa real', format: 'single_elim', size: 4, status: 'in_progress', created_by: 'real', winner_id: null, created_at: at, player_ids: ['real'], is_demo: false },
    ],
    slots: [
      { id: 's1', tournament_id: 't-demo', round: 1, position: 0, player_a_id: 'd1', player_b_id: 'real', winner_id: 'real', match_id: 'm-mixed' },
      { id: 's2', tournament_id: 't-real', round: 1, position: 0, player_a_id: 'real', player_b_id: null, winner_id: null, match_id: null },
    ],
    matches: [
      match('m1', 'd1', 'd2'),
      match('m-real', 'real', 'd1', { is_demo: false }),
      match('m-mixed', 'd1', 'real', { is_demo: true }),
      match('m-real-group', 'd1', 'd2', { group_id: 'g-real' }),
    ],
    achievements: [
      { id: 'a1', user_id: 'd1', code: 'first_win', earned_at: at, ref_id: null },
      { id: 'a2', user_id: 'real', code: 'first_win', earned_at: at, ref_id: null },
    ],
    friendships: [{ id: 'f1', requester_id: 'd1', addressee_id: 'd2', status: 'accepted', created_at: at }],
    reports: [{ match_id: 'm1', reporter_id: 'd1', winner_id: 'd1', is_draw: false, updated_at: at }],
    invites: [{ code: 'abc', creator_id: 'd1', created_at: at, expires_at: at }],
  };
}

describe('modo espectador: datos públicos', () => {
  it('solo deja el mundo de ejemplo y nada de personas reales', () => {
    const world = spectatorWorldFromRows(rawRows());
    const text = JSON.stringify(world);
    expect(world.users.map((u) => u.id).sort()).toEqual(['d1', 'd2']);
    expect(text).not.toContain('real');
    expect(text).not.toContain('Persona Real');
    expect(world.groups.map((g) => g.id)).toEqual(['g-demo']);
    expect(world.matches.map((m) => m.id)).toEqual(['m1']);
    expect(world.tournaments[0].playerIds).toEqual(['d1', 'd2']);
    expect(world.slots).toHaveLength(1);
    expect(world.slots[0]).toMatchObject({ playerAId: 'd1', playerBId: null, winnerId: null, matchId: null });
    expect(world.achievements.map((a) => a.userId)).toEqual(['d1']);
  });

  it('sin correos, amistades, votos, invitaciones ni datos de cadena', () => {
    const world = spectatorWorldFromRows(rawRows());
    expect(world.users.every((u) => u.email === '' && u.showDemo === undefined)).toBe(true);
    expect(world.friendships).toEqual([]);
    expect(world.reports).toEqual([]);
    expect(world.invites).toEqual([]);
    expect(world.matches.every((m) => m.chainTx == null && m.chainStatus == null)).toBe(true);
    const text = JSON.stringify(world);
    expect(text).not.toContain('x@y.z');
    expect(text).not.toContain('a'.repeat(64));
  });

  it('la semilla local también sale limpia', () => {
    const world = scrubWorld(buildSeed());
    expect(world.users.every((u) => u.email === '')).toBe(true);
    expect(world.friendships).toEqual([]);
    expect(world.invites).toEqual([]);
  });
});

describe('modo espectador: guardia de escritura', () => {
  const writes: [string, (repo: ReturnType<typeof createSpectatorRepository>) => Promise<unknown>][] = [
    ['updateProfile', (r) => r.updateProfile(SPECTATOR_ID, { displayName: 'Hola' })],
    ['registerDemo', (r) => r.registerDemo('a@b.c')],
    ['resetDemo', (r) => r.resetDemo()],
    ['uploadPhoto', (r) => r.uploadPhoto('users', SPECTATOR_ID, { uri: 'x' } as never)],
    ['sendFriendRequest', (r) => r.sendFriendRequest(SPECTATOR_ID, 'andre')],
    ['respondFriendRequest', (r) => r.respondFriendRequest(SPECTATOR_ID, 'f', true)],
    ['createInvite', (r) => r.createInvite(SPECTATOR_ID)],
    ['redeemInvite', (r) => r.redeemInvite(SPECTATOR_ID, 'abc')],
    ['createMatch', (r) => r.createMatch({ me: SPECTATOR_ID, opponentId: IDS.andre })],
    ['acceptMatch', (r) => r.acceptMatch('m', SPECTATOR_ID)],
    ['declineMatch', (r) => r.declineMatch('m', SPECTATOR_ID)],
    ['submitReport', (r) => r.submitReport('m', SPECTATOR_ID, { winnerId: null, isDraw: true, goalsA: null, goalsB: null } as never)],
    ['createGroup', (r) => r.createGroup(SPECTATOR_ID, 'Mi grupo', [IDS.andre])],
    ['createTournament', (r) => r.createTournament({ me: SPECTATOR_ID, groupId: IDS.group, name: 'Copa', format: 'round_robin', playerIds: [IDS.andre, IDS.vale] })],
    ['reopenSlot', (r) => r.reopenSlot('s', SPECTATOR_ID)],
  ];

  it.each(writes)('%s queda bloqueado con la invitación a crear perfil', async (_name, run) => {
    const seed = buildSeed();
    const before = JSON.stringify(seed);
    const repo = createSpectatorRepository(seed);
    const error = await run(repo).then(
      () => null,
      (e: unknown) => e,
    );
    expect(isSpectatorBlocked(error)).toBe(true);
    expect((error as Error).message).toBe(SPECTATOR_BLOCKED);
    expect(JSON.stringify(seed)).toBe(before);
  });

  it('las tareas de fondo no escriben nada', async () => {
    const repo = createSpectatorRepository(buildSeed());
    await expect(repo.expireStale()).resolves.toBe(0);
    await expect(repo.notices(SPECTATOR_ID)).resolves.toEqual([]);
    await expect(repo.markNoticesRead(SPECTATOR_ID)).resolves.toBeUndefined();
    await expect(repo.searchProfiles('and', SPECTATOR_ID)).resolves.toEqual([]);
  });
});

describe('modo espectador: lectura', () => {
  it('ve los grupos sin aparecer como jugador', async () => {
    const seed = buildSeed();
    const repo = createSpectatorRepository(seed);
    const groups = await repo.groupsSnapshot(SPECTATOR_ID);
    expect(groups.length).toBe(seed.groups.length);
    const realCount = seed.groupMembers.filter((m) => m.groupId === groups[0].group.id).length;
    expect(groups[0].memberCount).toBe(realCount);
    expect(groups[0].yourPlace).toBeNull();
    const group = await repo.groupSnapshot(groups[0].group.id, SPECTATOR_ID);
    expect(group.members.some((m) => m.id === SPECTATOR_ID)).toBe(false);
    expect(group.table.some((r) => r.playerId === SPECTATOR_ID)).toBe(false);
    expect(group.matrix[SPECTATOR_ID]).toBeUndefined();
    expect(group.people[SPECTATOR_ID]).toBeUndefined();
  });

  it('abre torneos y partidos del grupo como "otro"', async () => {
    const seed = buildSeed();
    const repo = createSpectatorRepository(seed);
    const cup = seed.tournaments[0];
    await expect(repo.tournamentSnapshot(cup.id, SPECTATOR_ID)).resolves.toMatchObject({ tournament: { id: cup.id } });
    const played = seed.matches.find((m) => m.groupId && m.status === 'confirmed')!;
    const snap = await repo.matchSnapshot(played.id, SPECTATOR_ID);
    expect(snap.youAre).toBe('other');
    expect(snap.canReopen).toBe(false);
    const friendly = seed.matches.find((m) => !m.groupId && m.status === 'confirmed')!;
    await expect(repo.matchSnapshot(friendly.id, SPECTATOR_ID)).resolves.toMatchObject({ youAre: 'other' });
  });

  it('cada partido de la portada se puede abrir', async () => {
    const seed = buildSeed();
    const repo = createSpectatorRepository(seed);
    for (const m of repo.feed().recent) await expect(repo.matchSnapshot(m.id, SPECTATOR_ID)).resolves.toBeTruthy();
  });

  it('portada: grupos reñidos por diferencia de puntos, copas en juego primero y últimos resultados', () => {
    const world = scrubWorld(buildSeed());
    const feed = spectatorFeed(world);
    expect(feed.contested.length).toBeGreaterThan(0);
    for (let i = 1; i < feed.contested.length; i++) expect(feed.contested[i].gap).toBeGreaterThanOrEqual(feed.contested[i - 1].gap);
    for (const item of feed.contested) expect(item.gap).toBe(item.leaderPoints - item.chaserPoints);
    expect(feed.cups[0].tournament.status).toBe('in_progress');
    expect(feed.recent.every((m) => m.status === 'confirmed')).toBe(true);
    for (const m of feed.recent) {
      expect(feed.people[m.playerAId]).toBeDefined();
      expect(feed.people[m.playerBId]).toBeDefined();
    }
    expect(feed.people[SPECTATOR_ID]).toBeUndefined();
  });
});

describe('modo espectador: rutas', () => {
  it('deja mirar pestañas, grupos, torneos y partidos', () => {
    expect(spectatorAllows(['(app)', '(tabs)', 'inicio'])).toBe(true);
    expect(spectatorAllows(['(app)', '(tabs)', 'perfil'])).toBe(true);
    expect(spectatorAllows(['(app)', 'grupo', '[id]'])).toBe(true);
    expect(spectatorAllows(['(app)', 'torneo', '[id]'])).toBe(true);
    expect(spectatorAllows(['(app)', 'partido', '[id]'])).toBe(true);
  });
  it('bloquea crear, amigos, avisos y lo personal', () => {
    for (const route of [['grupo', 'nuevo'], ['torneo', 'nuevo'], ['amigos'], ['avisos'], ['versus', '[id]'], ['estadisticas'], ['ranking'], ['trofeos']]) {
      expect(spectatorAllows(['(app)', ...route])).toBe(false);
    }
  });
});
