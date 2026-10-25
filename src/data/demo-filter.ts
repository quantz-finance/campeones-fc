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
