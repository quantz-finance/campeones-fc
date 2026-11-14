import { describe, expect, it } from 'vitest';
import { createMemoryRepository } from './memory-repository';
import { emptyWorld, type World } from './types';

function world(): World {
  const db = emptyWorld();
  for (const id of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
    db.users.push({
      id,
      username: id,
      displayName: id.toUpperCase(),
      avatarKey: 'rayo',
      email: `${id}@demo.campeonesfc`,
    });
  }
  let n = 0;
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  for (let left = 0; left < ids.length; left += 1) {
    for (let right = left + 1; right < ids.length; right += 1) {
      n += 1;
      db.friendships.push({
        id: `f${n}`,
        requesterId: ids[left],
        addresseeId: ids[right],
        status: 'accepted',
        createdAt: '2026-10-01T00:00:00.000Z',
        respondedAt: '2026-10-01T00:00:00.000Z',
      });
    }
  }
  return db;
}

function harness() {
  let now = new Date('2026-11-13T20:00:00.000Z');
  const repo = createMemoryRepository(world(), { now: () => now });
  return { repo };
}

describe('grupos públicos', () => {
  it('crea un grupo sin amigos y deja al creador como dueño', async () => {
    const { repo } = harness();
    const solo = await repo.createGroup('e', 'Solo mío', []);
    const snap = await repo.groupSnapshot(solo.id, 'e');
    expect(snap.yourRole).toBe('owner');
    expect(snap.members).toHaveLength(1);
    expect(snap.members[0].id).toBe('e');
    const pub = await repo.createGroup('e', 'Solo público', [], null, { visibility: 'public', joinPolicy: 'open' });
    expect((await repo.searchPublicGroups('a', 'público'))[0].group.id).toBe(pub.id);
  });

  it('no lista un grupo privado y sí uno público si no eres miembro', async () => {
    const { repo } = harness();
    const closed = await repo.createGroup('a', 'Cancha privada', ['b']);
    const open = await repo.createGroup('a', 'Cancha abierta', ['b'], null, { visibility: 'public', joinPolicy: 'open' });
    const invite = await repo.createGroup('a', 'Cancha con invitación', ['b'], null, { visibility: 'public', joinPolicy: 'invite' });
    const found = await repo.searchPublicGroups('e', '');
    expect(found.map((row) => row.group.id)).toEqual(expect.arrayContaining([open.id, invite.id]));
    expect(found.map((row) => row.group.id)).not.toContain(closed.id);
    expect(found.find((row) => row.group.id === open.id)?.joinPolicy).toBe('open');
    expect(await repo.searchPublicGroups('e', 'invitación')).toHaveLength(1);
  });

  it('entra de una a un grupo abierto y pide invitación en uno cerrado', async () => {
    const { repo } = harness();
    const open = await repo.createGroup('a', 'Grupo abierto', ['b'], null, { visibility: 'public', joinPolicy: 'open' });
    const invite = await repo.createGroup('a', 'Grupo con invitación', ['b'], null, { visibility: 'public', joinPolicy: 'invite' });
    await repo.joinPublicGroup('e', open.id);
    const mine = await repo.groupsSnapshot('e');
    expect(mine.some((row) => row.group.id === open.id)).toBe(true);
    await expect(repo.joinPublicGroup('e', invite.id)).rejects.toThrow(/entrada libre/);
    await repo.requestGroupJoin('e', invite.id);
    const pending = (await repo.searchPublicGroups('e', 'invitación'))[0];
    expect(pending.requested).toBe(true);
    const snap = await repo.groupSnapshot(invite.id, 'a');
    expect(snap.joinRequests).toHaveLength(1);
    expect(snap.joinRequests[0].userId).toBe('e');
    await repo.decideGroupJoin('a', snap.joinRequests[0].id, true);
    expect((await repo.groupsSnapshot('e')).some((row) => row.group.id === invite.id)).toBe(true);
    expect((await repo.groupSnapshot(invite.id, 'a')).joinRequests).toHaveLength(0);
  });

  it('rechaza una solicitud y no deja entrar', async () => {
    const { repo } = harness();
    const invite = await repo.createGroup('a', 'Solo con invitación', ['b'], null, { visibility: 'public', joinPolicy: 'invite' });
    await repo.requestGroupJoin('e', invite.id);
    const rid = (await repo.groupSnapshot(invite.id, 'a')).joinRequests[0].id;
    await repo.decideGroupJoin('a', rid, false);
    expect((await repo.groupsSnapshot('e')).some((row) => row.group.id === invite.id)).toBe(false);
    await expect(repo.decideGroupJoin('a', rid, true)).rejects.toThrow(/ya se resolvió/);
  });
});

describe('torneos públicos', () => {
  it('abre inscripciones, se inscribe y el organizador arranca el cuadro', async () => {
    const { repo } = harness();
    const cup = await repo.createRegistrationTournament({
      me: 'a',
      name: 'Copa de la esquina',
      format: 'single_elim',
      visibility: 'public',
      joinPolicy: 'open',
      maxPlayers: 4,
    });
    await repo.registerForTournament('b', cup.id);
    await repo.registerForTournament('c', cup.id);
    await repo.registerForTournament('d', cup.id);
    const listed = await repo.searchPublicTournaments('e', 'esquina');
    expect(listed[0].registeredCount).toBe(4);
    expect(listed[0].registered).toBe(false);
    await repo.startTournament('a', cup.id);
    const snap = await repo.tournamentSnapshot(cup.id, 'a');
    expect(snap.tournament.status).toBe('in_progress');
    expect(snap.tournament.playerIds.sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(snap.slots.length).toBeGreaterThan(0);
    const mine = await repo.myTournaments('b');
    expect(mine[0].yourLabel).toBe('Sigues vivo');
    expect(mine[0].phase).toMatch(/Final|Semifinal|Cuartos|Ronda/);
  });

  it('pide invitación y el organizador aprueba o rechaza', async () => {
    const { repo } = harness();
    const cup = await repo.createRegistrationTournament({
      me: 'a',
      name: 'Copa con invitación',
      format: 'round_robin',
      visibility: 'public',
      joinPolicy: 'invite',
      maxPlayers: 8,
    });
    await expect(repo.registerForTournament('e', cup.id)).rejects.toThrow(/inscripción libre/);
    await repo.requestTournamentJoin('e', cup.id);
    const snap = await repo.tournamentSnapshot(cup.id, 'a');
    expect(snap.joinRequests).toHaveLength(1);
    await repo.decideTournamentJoin('a', snap.joinRequests[0].id, true);
    const after = await repo.tournamentSnapshot(cup.id, 'a');
    expect(after.registrations.some((r) => r.userId === 'e')).toBe(true);
    expect(after.joinRequests).toHaveLength(0);
    await repo.requestTournamentJoin('f', cup.id);
    const rid = (await repo.tournamentSnapshot(cup.id, 'a')).joinRequests[0].id;
    await repo.decideTournamentJoin('a', rid, false);
    expect((await repo.tournamentSnapshot(cup.id, 'a')).registrations.some((r) => r.userId === 'f')).toBe(false);
  });

  it('no enseña un patrocinio inventado', async () => {
    const { repo } = harness();
    expect(await repo.visibleSponsor('a', 'tournaments-list')).toBeNull();
    expect(await repo.visibleSponsor('a', 'groups-list')).toBeNull();
  });
});

describe('acceso del torneo', () => {
  it('puede borrar la fecha de inicio', async () => {
    const { repo } = harness();
    const cup = await repo.createRegistrationTournament({
      me: 'a',
      name: 'Copa con fecha',
      format: 'round_robin',
      visibility: 'public',
      joinPolicy: 'open',
      maxPlayers: 8,
      startsAt: '2026-11-29T03:00:00.000Z',
    });
    expect((await repo.tournamentSnapshot(cup.id, 'a')).tournament.startsAt).toBe('2026-11-29T03:00:00.000Z');
    await repo.setTournamentAccess('a', cup.id, { visibility: 'public', joinPolicy: 'open', clearStarts: true });
    expect((await repo.tournamentSnapshot(cup.id, 'a')).tournament.startsAt).toBeNull();
  });

  it('no repite Inscripciones abiertas como fase del mini-póster', async () => {
    const { repo } = harness();
    const cup = await repo.createRegistrationTournament({
      me: 'a',
      name: 'Copa de noviembre',
      format: 'round_robin',
      visibility: 'public',
      joinPolicy: 'open',
      maxPlayers: 8,
    });
    const mine = await repo.myTournaments('a');
    const row = mine.find((item) => item.tournament.id === cup.id);
    expect(row?.yourLabel).toBe('Inscrito');
    expect(row?.phase).toBeNull();
  });

  it('no deja bajar los cupos por debajo de los inscritos ni pedir invitación en uno abierto o lleno', async () => {
    const { repo } = harness();
    const cup = await repo.createRegistrationTournament({
      me: 'a',
      name: 'Copa de cupos',
      format: 'single_elim',
      visibility: 'public',
      joinPolicy: 'open',
      maxPlayers: 8,
    });
    for (const id of ['b', 'c', 'd', 'e']) await repo.registerForTournament(id, cup.id);
    await expect(repo.requestTournamentJoin('f', cup.id)).rejects.toThrow(/inscripción libre/);
    await expect(
      repo.setTournamentAccess('a', cup.id, { visibility: 'public', joinPolicy: 'open', maxPlayers: 5 }),
    ).rejects.toThrow(/4, 8 o 16/);
    await repo.setTournamentAccess('a', cup.id, { visibility: 'public', joinPolicy: 'invite', maxPlayers: 8 });
    await expect(
      repo.setTournamentAccess('a', cup.id, { visibility: 'public', joinPolicy: 'invite', maxPlayers: 4 }),
    ).rejects.toThrow(/no pueden ser menos/);
    for (const id of ['f', 'g', 'h']) {
      await repo.requestTournamentJoin(id, cup.id);
    }
    const snap = await repo.tournamentSnapshot(cup.id, 'a');
    expect(snap.joinRequests).toHaveLength(3);
  });

  it('no deja pedir invitación en un grupo abierto', async () => {
    const { repo } = harness();
    const open = await repo.createGroup('a', 'Grupo libre', ['b'], null, { visibility: 'public', joinPolicy: 'open' });
    await expect(repo.requestGroupJoin('e', open.id)).rejects.toThrow(/entrada libre/);
  });
});
