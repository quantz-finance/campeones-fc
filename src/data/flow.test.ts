import { describe, expect, it } from 'vitest';
import { rules } from '../domain/rules';
import { createMemoryRepository } from './memory-repository';
import { emptyWorld, type World } from './types';

function world(): World {
  const db = emptyWorld();
  const ids = ['a', 'b', 'c', 'd'];
  for (const id of ids) {
    db.users.push({
      id,
      username: id,
      displayName: id.toUpperCase(),
      avatarKey: 'rayo',
      email: `${id}@demo.campeonesfc`,
    });
  }
  let n = 0;
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
  let now = new Date('2026-10-24T12:00:00.000Z');
  const repo = createMemoryRepository(world(), { now: () => now });
  return {
    repo,
    at: (iso: string) => {
      now = new Date(iso);
    },
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  };
}

describe('flujo de partido', () => {
  it('cuenta el resultado solo cuando los dos coinciden', async () => {
    const { repo } = harness();
    const match = await repo.createMatch({ me: 'a', opponentId: 'b' });
    await expect(repo.submitReport(match.id, 'a', { isDraw: false, winnerId: 'a', goalsA: 1, goalsB: 0 })).rejects.toThrow(
      /no está esperando/,
    );
    await repo.acceptMatch(match.id, 'b');
    await repo.submitReport(match.id, 'a', { isDraw: false, winnerId: 'a', goalsA: 2, goalsB: 0 });
    let detail = await repo.matchSnapshot(match.id, 'a');
    expect(detail.match.status).toBe('in_progress');
    await repo.submitReport(match.id, 'b', { isDraw: false, winnerId: 'b', goalsA: 0, goalsB: 1 });
    detail = await repo.matchSnapshot(match.id, 'a');
    expect(detail.match.status).toBe('disputed');
    expect((await repo.personalSnapshot('a')).record.played).toBe(0);
    await repo.submitReport(match.id, 'b', { isDraw: false, winnerId: 'a', goalsA: 2, goalsB: 0 });
    detail = await repo.matchSnapshot(match.id, 'b');
    expect(detail.match.status).toBe('confirmed');
    expect(detail.match.goalsA).toBe(2);
    const personal = await repo.personalSnapshot('a');
    expect(personal.record.wins).toBe(1);
    const h2h = await repo.h2hSnapshot('a', 'b');
    expect(h2h.youRecord.wins).toBe(1);
    expect(h2h.evolution).toHaveLength(1);
    const trophies = await repo.trophies('a');
    expect(trophies.find((trophy) => trophy.code === 'first_win')?.earned).toBe(true);
  });

  it('expira la propuesta y permite cancelarla antes', async () => {
    const { repo, advance } = harness();
    const match = await repo.createMatch({ me: 'a', opponentId: 'b' });
    await repo.declineMatch(match.id, 'a');
    expect((await repo.matchSnapshot(match.id, 'a')).match.status).toBe('cancelled');
    const second = await repo.createMatch({ me: 'a', opponentId: 'b' });
    advance(rules.acceptTtlMs);
    await expect(repo.acceptMatch(second.id, 'b')).rejects.toThrow(/expiró/);
    expect((await repo.matchSnapshot(second.id, 'a')).match.status).toBe('expired');
    expect(await repo.expireStale()).toBe(0);
  });

  it('juega una eliminatoria de 4, avanza el bracket y corona al campeón', async () => {
    const { repo, advance } = harness();
    const group = await repo.createGroup('a', 'Junta', ['b', 'c', 'd']);
    const cup = await repo.createTournament({
      me: 'a',
      groupId: group.id,
      name: 'Copa test',
      format: 'single_elim',
      playerIds: ['a', 'b', 'c', 'd'],
    });
    let view = await repo.tournamentSnapshot(cup.id, 'a');
    expect(view.slots.filter((slot) => slot.round === 1 && slot.matchId)).toHaveLength(2);
    expect(view.slots.find((slot) => slot.round === 2)?.matchId).toBeNull();

    async function close(playerA: string, playerB: string, winner: string) {
      view = await repo.tournamentSnapshot(cup.id, 'a');
      const match = view.matches.find(
        (item) =>
          item.status === 'pending_accept' &&
          ((item.playerAId === playerA && item.playerBId === playerB) ||
            (item.playerAId === playerB && item.playerBId === playerA)),
      );
      if (!match) throw new Error('falta el cruce');
      advance(60_000);
      await repo.acceptMatch(match.id, match.playerBId);
      const goalsA = match.playerAId === winner ? 2 : 0;
      const goalsB = match.playerBId === winner ? 2 : 0;
      const draft = { isDraw: false, winnerId: winner, goalsA, goalsB };
      advance(60_000);
      await repo.submitReport(match.id, match.playerAId, draft);
      await repo.submitReport(match.id, match.playerBId, { isDraw: true, winnerId: null, goalsA: null, goalsB: null }).catch(
        () => undefined,
      );
      await expect(
        repo.submitReport(match.id, match.playerBId, { isDraw: true, winnerId: null, goalsA: 1, goalsB: 1 }),
      ).rejects.toThrow(/eliminación directa/);
      advance(60_000);
      await repo.submitReport(match.id, match.playerBId, draft);
    }

    await close('a', 'b', 'a');
    view = await repo.tournamentSnapshot(cup.id, 'a');
    expect(view.tournament.status).toBe('in_progress');
    expect(view.slots.find((slot) => slot.round === 2)?.playerAId).toBe('a');
    expect(view.slots.find((slot) => slot.round === 2)?.matchId).toBeNull();

    const semi = view.matches.find((match) => match.playerAId === 'c' || match.playerBId === 'c');
    if (!semi) throw new Error('falta la otra semi');
    const other = semi.playerAId === 'c' ? semi.playerBId : semi.playerAId;
    const goalsFor = (winner: string) => ({
      isDraw: false as const,
      winnerId: winner,
      goalsA: semi.playerAId === winner ? 1 : 0,
      goalsB: semi.playerBId === winner ? 1 : 0,
    });
    advance(60_000);
    await repo.acceptMatch(semi.id, semi.playerBId);
    await repo.submitReport(semi.id, 'c', goalsFor('c'));
    await repo.submitReport(semi.id, other, goalsFor(other));
    view = await repo.tournamentSnapshot(cup.id, 'a');
    expect(view.matches.find((match) => match.id === semi.id)?.status).toBe('disputed');
    expect(view.slots.find((slot) => slot.round === 2)?.playerBId).toBeNull();

    await repo.submitReport(semi.id, 'c', goalsFor('d'));
    view = await repo.tournamentSnapshot(cup.id, 'a');
    const finalSlot = view.slots.find((slot) => slot.round === 2);
    expect(finalSlot?.playerAId).toBe('a');
    expect(finalSlot?.playerBId).toBe('d');
    expect(finalSlot?.matchId).toBeTruthy();

    await close('a', 'd', 'd');
    view = await repo.tournamentSnapshot(cup.id, 'a');
    expect(view.tournament.status).toBe('completed');
    expect(view.tournament.winnerId).toBe('d');
    expect((await repo.trophies('d')).find((trophy) => trophy.code === 'tournament_champion')?.earned).toBe(true);
    const table = await repo.groupSnapshot(group.id, 'a');
    expect(table.table.find((row) => row.playerId === 'd')?.wins).toBe(2);
    expect(table.ranking).toHaveLength(0);
  });

  it('corona la liga cuando todos los cruces cierran', async () => {
    const { repo, advance } = harness();
    const group = await repo.createGroup('a', 'Liga', ['b', 'c']);
    const league = await repo.createTournament({
      me: 'a',
      groupId: group.id,
      name: 'Todos',
      format: 'round_robin',
      playerIds: ['a', 'b', 'c'],
    });
    let view = await repo.tournamentSnapshot(league.id, 'a');
    expect(view.matches).toHaveLength(3);
    for (const match of view.matches) {
      advance(1000);
      await repo.acceptMatch(match.id, match.playerBId);
      const winner = match.playerAId === 'c' || match.playerBId === 'c' ? 'c' : 'a';
      const draft = {
        isDraw: false,
        winnerId: winner,
        goalsA: match.playerAId === winner ? 1 : 0,
        goalsB: match.playerBId === winner ? 1 : 0,
      };
      await repo.submitReport(match.id, match.playerAId, draft);
      await repo.submitReport(match.id, match.playerBId, draft);
    }
    view = await repo.tournamentSnapshot(league.id, 'a');
    expect(view.tournament.status).toBe('completed');
    expect(view.tournament.winnerId).toBe('c');
  });

  it('reabre un cruce expirado sin borrar el bracket', async () => {
    const { repo, advance } = harness();
    const group = await repo.createGroup('a', 'Relámpago', ['b', 'c', 'd']);
    const cup = await repo.createTournament({
      me: 'a',
      groupId: group.id,
      name: 'Corta',
      format: 'single_elim',
      playerIds: ['a', 'b', 'c', 'd'],
    });
    const first = (await repo.tournamentSnapshot(cup.id, 'a')).matches[0];
    advance(rules.tournamentAcceptTtlMs);
    await expect(repo.acceptMatch(first.id, first.playerBId)).rejects.toThrow(/expiró/);
    const reopened = await repo.reopenSlot(first.tournamentSlotId!, first.playerAId);
    expect(reopened.status).toBe('pending_accept');
    expect(reopened.id).not.toBe(first.id);
  });
});
