// Modo prueba apagado: quita del mundo los datos de demo y todo lo que cuelga de ellos.
import type { World } from './types';

export type DemoIds = { users: Set<string>; matches: Set<string>; groups: Set<string>; tournaments: Set<string> };

export function hideDemo(world: World, ids: DemoIds): World {
  if (!ids.users.size && !ids.matches.size && !ids.groups.size && !ids.tournaments.size) return world;
  const u = ids.users;
  const matches = world.matches.filter((m) => !ids.matches.has(m.id) && !u.has(m.playerAId) && !u.has(m.playerBId));
  const keptMatches = new Set(matches.map((m) => m.id));
  const groups = world.groups.filter((g) => !ids.groups.has(g.id));
  const keptGroups = new Set(groups.map((g) => g.id));
  const tournaments = world.tournaments.filter((t) => !ids.tournaments.has(t.id) && keptGroups.has(t.groupId));
  const keptTournaments = new Set(tournaments.map((t) => t.id));
  return {
    ...world,
    users: world.users.filter((x) => !u.has(x.id)),
    friendships: world.friendships.filter((f) => !u.has(f.requesterId) && !u.has(f.addresseeId)),
    groups,
    groupMembers: world.groupMembers.filter((m) => keptGroups.has(m.groupId) && !u.has(m.userId)),
    matches,
    reports: world.reports.filter((r) => keptMatches.has(r.matchId)),
    tournaments: tournaments.map((t) => ({ ...t, playerIds: t.playerIds.filter((p) => !u.has(p)) })),
    slots: world.slots.filter((s) => keptTournaments.has(s.tournamentId)),
    achievements: world.achievements.filter((a) => !u.has(a.userId) && (!a.refId || !ids.matches.has(a.refId))),
  };
}

// Datos falsos: una cuenta nueva no está vinculada al mundo demo. Solo en memoria (nada se escribe en la base),
// la tratamos como amiga de los jugadores demo y miembro de los grupos demo para que inicio, ranking y listas tengan datos.
export function joinDemo(world: World, me: string, ids: Pick<DemoIds, 'users' | 'groups'>): World {
  const linked = new Set(
    world.friendships.filter((f) => f.requesterId === me || f.addresseeId === me).map((f) => (f.requesterId === me ? f.addresseeId : f.requesterId)),
  );
  const at = new Date(0).toISOString();
  const friendships = [...world.friendships];
  for (const id of ids.users) {
    if (id !== me && !linked.has(id)) {
      friendships.push({ id: `demo-${id}`, requesterId: id, addresseeId: me, status: 'accepted', createdAt: at, respondedAt: at });
    }
  }
  const groupMembers = [...world.groupMembers];
  for (const groupId of ids.groups) {
    if (!groupMembers.some((m) => m.groupId === groupId && m.userId === me)) groupMembers.push({ groupId, userId: me, role: 'member', joinedAt: at });
  }
  return { ...world, friendships, groupMembers };
}
