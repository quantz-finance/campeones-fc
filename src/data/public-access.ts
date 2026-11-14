// Acceso público a grupos y torneos: búsqueda, unirse, colas de solicitudes e inscripciones.
// El premio de un patrocinio, si existe, es en especie (nunca dinero).
import { buildRoundRobin, buildSingleElim, roundLabel, totalRounds } from '../domain/bracket';
import { rankPlayers } from '../domain/stats';
import { DomainError } from '../domain/errors';
import { buildPendingMatch } from '../domain/match-flow';
import { rules } from '../domain/rules';
import { between, isOpenStatus } from '../domain/types';
import { isLogoId } from '../content/crest-ids';
import { createId } from './ids';
import { isMember } from './mutate';
import type { Profile } from './types';
import {
  joinPolicyOf,
  toProfile,
  visibilityOf,
  type Group,
  type GroupJoinRequest,
  type JoinPolicy,
  type Sponsor,
  type Tournament,
  type TournamentJoinRequest,
  type TournamentRegistration,
  type Visibility,
  type World,
} from './types';

export type PublicGroupCard = {
  group: Group;
  memberCount: number;
  joinPolicy: JoinPolicy;
  requested: boolean;
};

export type PublicTournamentCard = {
  tournament: Tournament;
  groupName: string | null;
  registeredCount: number;
  requested: boolean;
  registered: boolean;
};

export type MyTournamentCard = {
  tournament: Tournament;
  groupName: string | null;
  registeredCount: number;
  /** Etiqueta real: Sigues vivo, Vas 3º, Campeón. */
  yourLabel: string | null;
  phase: string | null;
};

export function searchPublicGroups(db: World, me: string, q = ''): PublicGroupCard[] {
  const needle = q.trim().toLowerCase();
  const mine = new Set(db.groupMembers.filter((m) => m.userId === me).map((m) => m.groupId));
  return db.groups
    .filter((group) => visibilityOf(group) === 'public' && !mine.has(group.id))
    .filter((group) => !needle || group.name.toLowerCase().includes(needle))
    .map((group) => ({
      group,
      memberCount: db.groupMembers.filter((m) => m.groupId === group.id).length,
      joinPolicy: joinPolicyOf(group),
      requested: (db.groupJoinRequests ?? []).some((r) => r.groupId === group.id && r.userId === me && r.status === 'pending'),
    }))
    .sort((a, b) => b.group.createdAt.localeCompare(a.group.createdAt));
}

export function joinPublicGroup(db: World, me: string, groupId: string, now: Date): void {
  const group = db.groups.find((item) => item.id === groupId);
  if (!group || visibilityOf(group) !== 'public' || joinPolicyOf(group) !== 'open') {
    throw new DomainError('forbidden', 'Este grupo no es de entrada libre.');
  }
  if (isMember(db, groupId, me)) throw new DomainError('conflict', 'Ya estás en este grupo.');
  db.groupMembers.push({ groupId, userId: me, role: 'member', joinedAt: now.toISOString() });
  db.groupJoinRequests = (db.groupJoinRequests ?? []).filter((r) => !(r.groupId === groupId && r.userId === me));
}

export function requestGroupJoin(db: World, me: string, groupId: string, now: Date): GroupJoinRequest {
  const group = db.groups.find((item) => item.id === groupId);
  if (!group || visibilityOf(group) !== 'public') {
    throw new DomainError('forbidden', 'Este grupo no acepta solicitudes públicas.');
  }
  if (isMember(db, groupId, me)) throw new DomainError('conflict', 'Ya estás en este grupo.');
  const requests = db.groupJoinRequests ?? (db.groupJoinRequests = []);
  const existing = requests.find((r) => r.groupId === groupId && r.userId === me);
  if (existing?.status === 'pending') throw new DomainError('conflict', 'Ya pediste unirte a este grupo.');
  const at = now.toISOString();
  if (existing) {
    existing.status = 'pending';
    existing.createdAt = at;
    existing.decidedAt = null;
    existing.decidedBy = null;
    return existing;
  }
  const row: GroupJoinRequest = { id: createId(), groupId, userId: me, status: 'pending', createdAt: at };
  requests.push(row);
  return row;
}

export function decideGroupJoin(db: World, me: string, requestId: string, approve: boolean, now: Date): void {
  const row = (db.groupJoinRequests ?? []).find((item) => item.id === requestId);
  if (!row) throw new DomainError('not_found', 'No está esa solicitud.');
  const owner = db.groupMembers.some((m) => m.groupId === row.groupId && m.userId === me && m.role === 'owner');
  if (!owner) throw new DomainError('forbidden', 'Solo quien manda el grupo puede decidir.');
  if (row.status !== 'pending') throw new DomainError('conflict', 'Esa solicitud ya se resolvió.');
  row.status = approve ? 'approved' : 'rejected';
  row.decidedAt = now.toISOString();
  row.decidedBy = me;
  if (approve && !isMember(db, row.groupId, row.userId)) {
    db.groupMembers.push({ groupId: row.groupId, userId: row.userId, role: 'member', joinedAt: now.toISOString() });
  }
}

export function setGroupAccess(db: World, me: string, groupId: string, visibility: Visibility, joinPolicy: JoinPolicy): void {
  const group = db.groups.find((item) => item.id === groupId);
  if (!group) throw new DomainError('not_found', 'No encontramos ese grupo.');
  const owner = db.groupMembers.some((m) => m.groupId === groupId && m.userId === me && m.role === 'owner');
  if (!owner) throw new DomainError('forbidden', 'Solo quien manda el grupo puede cambiar el acceso.');
  group.visibility = visibility;
  group.joinPolicy = joinPolicy;
}

export function searchPublicTournaments(db: World, me: string, q = ''): PublicTournamentCard[] {
  const needle = q.trim().toLowerCase();
  const regs = db.tournamentRegistrations ?? [];
  const requests = db.tournamentJoinRequests ?? [];
  return db.tournaments
    .filter((cup) => visibilityOf(cup) === 'public')
    .filter((cup) => {
      if (!needle) return true;
      const groupName = cup.groupId ? db.groups.find((g) => g.id === cup.groupId)?.name ?? '' : '';
      return cup.name.toLowerCase().includes(needle) || groupName.toLowerCase().includes(needle);
    })
    .map((cup) => ({
      tournament: cup,
      groupName: cup.groupId ? db.groups.find((g) => g.id === cup.groupId)?.name ?? null : null,
      registeredCount: regs.filter((r) => r.tournamentId === cup.id).length || cup.playerIds.length,
      requested: requests.some((r) => r.tournamentId === cup.id && r.userId === me && r.status === 'pending'),
      registered: regs.some((r) => r.tournamentId === cup.id && r.userId === me) || cup.playerIds.includes(me),
    }))
    .sort((a, b) => b.tournament.createdAt.localeCompare(a.tournament.createdAt));
}

export function registerForTournament(db: World, me: string, tournamentId: string, now: Date): void {
  const cup = db.tournaments.find((item) => item.id === tournamentId);
  if (!cup || cup.status !== 'registration' || visibilityOf(cup) !== 'public' || joinPolicyOf(cup) !== 'open') {
    throw new DomainError('forbidden', 'Este torneo no es de inscripción libre.');
  }
  const regs = db.tournamentRegistrations ?? (db.tournamentRegistrations = []);
  if (regs.some((r) => r.tournamentId === tournamentId && r.userId === me)) {
    throw new DomainError('conflict', 'Ya estás inscrito.');
  }
  if (cup.maxPlayers != null && regs.filter((r) => r.tournamentId === tournamentId).length >= cup.maxPlayers) {
    throw new DomainError('bad_size', 'Este torneo ya no tiene cupos.');
  }
  regs.push({ tournamentId, userId: me, registeredAt: now.toISOString() });
  db.tournamentJoinRequests = (db.tournamentJoinRequests ?? []).filter((r) => !(r.tournamentId === tournamentId && r.userId === me));
}

export function requestTournamentJoin(db: World, me: string, tournamentId: string, now: Date): TournamentJoinRequest {
  const cup = db.tournaments.find((item) => item.id === tournamentId);
  if (!cup || visibilityOf(cup) !== 'public' || cup.status !== 'registration') {
    throw new DomainError('forbidden', 'Este torneo no acepta solicitudes públicas.');
  }
  const regs = db.tournamentRegistrations ?? [];
  if (regs.some((r) => r.tournamentId === tournamentId && r.userId === me)) {
    throw new DomainError('conflict', 'Ya estás inscrito.');
  }
  const requests = db.tournamentJoinRequests ?? (db.tournamentJoinRequests = []);
  const existing = requests.find((r) => r.tournamentId === tournamentId && r.userId === me);
  if (existing?.status === 'pending') throw new DomainError('conflict', 'Ya pediste inscribirte en este torneo.');
  const at = now.toISOString();
  if (existing) {
    existing.status = 'pending';
    existing.createdAt = at;
    existing.decidedAt = null;
    existing.decidedBy = null;
    return existing;
  }
  const row: TournamentJoinRequest = { id: createId(), tournamentId, userId: me, status: 'pending', createdAt: at };
  requests.push(row);
  return row;
}

export function decideTournamentJoin(db: World, me: string, requestId: string, approve: boolean, now: Date): void {
  const row = (db.tournamentJoinRequests ?? []).find((item) => item.id === requestId);
  if (!row) throw new DomainError('not_found', 'No está esa solicitud.');
  const cup = db.tournaments.find((item) => item.id === row.tournamentId);
  if (!cup || cup.createdBy !== me) throw new DomainError('forbidden', 'Solo el organizador puede decidir.');
  if (row.status !== 'pending') throw new DomainError('conflict', 'Esa solicitud ya se resolvió.');
  const regs = db.tournamentRegistrations ?? (db.tournamentRegistrations = []);
  if (approve) {
    if (cup.status !== 'registration') throw new DomainError('conflict', 'Las inscripciones de este torneo no están abiertas.');
    if (cup.maxPlayers != null && regs.filter((r) => r.tournamentId === cup.id).length >= cup.maxPlayers) {
      throw new DomainError('bad_size', 'Este torneo ya no tiene cupos.');
    }
    if (!regs.some((r) => r.tournamentId === cup.id && r.userId === row.userId)) {
      regs.push({ tournamentId: cup.id, userId: row.userId, registeredAt: now.toISOString() });
    }
  }
  row.status = approve ? 'approved' : 'rejected';
  row.decidedAt = now.toISOString();
  row.decidedBy = me;
}

export function setTournamentAccess(
  db: World,
  me: string,
  tournamentId: string,
  patch: { visibility: Visibility; joinPolicy: JoinPolicy; maxPlayers?: number | null; startsAt?: string | null },
): void {
  const cup = db.tournaments.find((item) => item.id === tournamentId);
  if (!cup) throw new DomainError('not_found', 'No encontramos ese torneo.');
  if (cup.createdBy !== me) throw new DomainError('forbidden', 'Solo el organizador puede cambiar el acceso.');
  if (!cup.groupId && patch.visibility !== 'public') {
    throw new DomainError('bad_name', 'Un torneo sin grupo tiene que ser público.');
  }
  cup.visibility = patch.visibility;
  cup.joinPolicy = patch.joinPolicy;
  if (patch.maxPlayers !== undefined) {
    if (cup.status !== 'registration') throw new DomainError('conflict', 'Los cupos solo se cambian mientras hay inscripciones abiertas.');
    cup.maxPlayers = patch.maxPlayers;
  }
  if (patch.startsAt !== undefined) cup.startsAt = patch.startsAt;
}

export function visibleSponsors(db: World, placement: Sponsor['placement'], id?: string | null): Sponsor[] {
  return (db.sponsors ?? []).filter((item) => {
    if (item.placement !== placement) return false;
    if (placement === 'group') return item.groupId === id;
    if (placement === 'tournament') return item.tournamentId === id;
    return true;
  });
}

/** Como máximo un patrocinio visible por pantalla. */
export function oneSponsor(items: Sponsor[]): Sponsor | null {
  return items[0] ?? null;
}

export function requestProfiles(db: World, requests: { userId: string }[]): { request: (typeof requests)[number]; profile: Profile }[] {
  return requests
    .map((request) => {
      const user = db.users.find((item) => item.id === request.userId);
      return user ? { request, profile: toProfile(user) } : null;
    })
    .filter((row): row is { request: (typeof requests)[number]; profile: Profile } => Boolean(row));
}

export function registrationsOf(db: World, tournamentId: string): TournamentRegistration[] {
  const cup = db.tournaments.find((item) => item.id === tournamentId);
  const regs = (db.tournamentRegistrations ?? []).filter((r) => r.tournamentId === tournamentId);
  if (regs.length) return regs;
  return (cup?.playerIds ?? []).map((userId) => ({ tournamentId, userId, registeredAt: cup?.createdAt ?? '' }));
}

export { isMember };


export type RegistrationTournamentInput = {
  me: string;
  name: string;
  format: 'single_elim' | 'round_robin';
  groupId?: string | null;
  visibility: Visibility;
  joinPolicy: JoinPolicy;
  maxPlayers?: number | null;
  startsAt?: string | null;
  logo?: string | null;
};

export function createRegistrationTournament(db: World, input: RegistrationTournamentInput, now: Date): Tournament {
  const name = input.name.trim();
  if (name.length < 3 || name.length > rules.maxTournamentName) {
    throw new DomainError('bad_name', 'Ponle un nombre de 3 a 40 caracteres.');
  }
  const groupId = input.groupId || null;
  if (groupId) {
    if (!isMember(db, groupId, input.me)) throw new DomainError('forbidden', 'No estás en ese grupo.');
  } else if (input.visibility !== 'public') {
    throw new DomainError('bad_name', 'Un torneo sin grupo tiene que ser público.');
  }
  const maxPlayers = input.maxPlayers ?? (input.format === 'single_elim' ? 8 : 8);
  if (input.format === 'single_elim' && ![4, 8, 16].includes(maxPlayers)) {
    throw new DomainError('bad_size', 'La eliminación directa es de 4, 8 o 16 jugadores.');
  }
  if (input.format === 'round_robin' && (maxPlayers < 3 || maxPlayers > 16)) {
    throw new DomainError('bad_size', 'La liga necesita entre 3 y 16 jugadores.');
  }
  const cup: Tournament = {
    id: createId(),
    groupId,
    name,
    format: input.format,
    size: input.format === 'single_elim' ? maxPlayers : null,
    status: 'registration',
    createdBy: input.me,
    winnerId: null,
    createdAt: now.toISOString(),
    playerIds: [],
    logo: isLogoId('tournaments', input.logo) ? input.logo : null,
    visibility: input.visibility,
    joinPolicy: input.joinPolicy,
    startsAt: input.startsAt ?? null,
    maxPlayers,
  };
  db.tournaments.push(cup);
  db.tournamentRegistrations = db.tournamentRegistrations ?? [];
  db.tournamentRegistrations.push({ tournamentId: cup.id, userId: input.me, registeredAt: now.toISOString() });
  return cup;
}

export function startTournament(db: World, me: string, tournamentId: string, now: Date): Tournament {
  const cup = db.tournaments.find((item) => item.id === tournamentId);
  if (!cup) throw new DomainError('not_found', 'No encontramos ese torneo.');
  if (cup.createdBy !== me) throw new DomainError('forbidden', 'Solo el organizador puede empezar el torneo.');
  if (cup.status !== 'registration') throw new DomainError('conflict', 'Este torneo ya no está en inscripciones.');
  const ids = [...new Set((db.tournamentRegistrations ?? []).filter((r) => r.tournamentId === cup.id).map((r) => r.userId))];
  if (cup.format === 'single_elim' && ![4, 8, 16].includes(ids.length)) {
    throw new DomainError('bad_size', 'La eliminación directa es de 4, 8 o 16 jugadores.');
  }
  if (cup.format === 'round_robin' && (ids.length < 3 || ids.length > 16)) {
    throw new DomainError('bad_size', 'La liga necesita entre 3 y 16 jugadores.');
  }
  const slots = cup.format === 'single_elim' ? buildSingleElim(cup.id, ids, createId) : buildRoundRobin(cup.id, ids, createId);
  for (const slot of slots) {
    if (slot.playerAId && slot.playerBId && db.matches.some((m) => between(m, slot.playerAId!, slot.playerBId!) && isOpenStatus(m.status))) {
      throw new DomainError('open_match', 'Hay un partido abierto entre dos jugadores del torneo. Ciérrenlo primero.');
    }
  }
  cup.playerIds = ids;
  cup.size = cup.format === 'single_elim' ? ids.length : cup.size;
  cup.status = 'in_progress';
  for (const slot of slots) {
    db.slots.push(slot);
    if (!slot.playerAId || !slot.playerBId) continue;
    const match = buildPendingMatch(
      {
        id: createId(),
        playerAId: slot.playerAId,
        playerBId: slot.playerBId,
        groupId: cup.groupId,
        tournamentId: cup.id,
        tournamentSlotId: slot.id,
        ttlMs: rules.tournamentAcceptTtlMs,
      },
      now,
    );
    db.matches.push(match);
    slot.matchId = match.id;
  }
  return cup;
}


function ordinal(place: number): string {
  return `${place}º`;
}

export function tournamentYourLabel(db: World, cup: Tournament, me: string): string | null {
  if (cup.status === 'registration') {
    const inReg = (db.tournamentRegistrations ?? []).some((r) => r.tournamentId === cup.id && r.userId === me);
    return inReg || cup.createdBy === me ? 'Inscrito' : null;
  }
  if (cup.winnerId === me) return 'Campeón';
  const games = db.matches.filter((m) => m.tournamentId === cup.id && m.status === 'confirmed');
  if (cup.format === 'round_robin') {
    const ranking = rankPlayers(cup.playerIds, games).qualified;
    const idx = ranking.findIndex((row) => row.playerId === me);
    if (idx < 0) return null;
    const place = idx + 1;
    return cup.status === 'completed' ? `Quedaste ${ordinal(place)}` : `Vas ${ordinal(place)}`;
  }
  const slots = (db.slots ?? []).filter((s) => s.tournamentId === cup.id);
  const lost = slots.some((s) => s.winnerId && (s.playerAId === me || s.playerBId === me) && s.winnerId !== me);
  if (!lost && cup.playerIds.includes(me) && cup.status === 'in_progress') return 'Sigues vivo';
  if (lost && cup.status === 'completed') return 'Eliminado';
  return lost ? 'Eliminado' : null;
}

export function tournamentPhase(db: World, cup: Tournament): string | null {
  if (cup.status === 'registration') return 'Inscripciones abiertas';
  if (cup.status === 'completed') return 'Finalizado';
  const size = cup.size ?? cup.playerIds.length;
  const rounds = totalRounds(cup.format, size || 2);
  if (cup.format === 'round_robin') return 'Todos contra todos';
  const slots = (db.slots ?? []).filter((s) => s.tournamentId === cup.id);
  const open = slots.filter((s) => !s.winnerId && s.playerAId && s.playerBId);
  const round = open.length ? Math.min(...open.map((s) => s.round)) : (slots.length ? Math.max(...slots.map((s) => s.round)) : 1);
  return roundLabel(round, rounds, cup.format);
}

export function myTournamentCards(db: World, me: string): MyTournamentCard[] {
  const regs = new Set((db.tournamentRegistrations ?? []).filter((r) => r.userId === me).map((r) => r.tournamentId));
  return db.tournaments
    .filter((cup) => isMember(db, cup.groupId, me) || cup.playerIds.includes(me) || cup.createdBy === me || regs.has(cup.id))
    .map((cup) => ({
      tournament: cup,
      groupName: cup.groupId ? db.groups.find((g) => g.id === cup.groupId)?.name ?? null : null,
      registeredCount: registrationsOf(db, cup.id).length,
      yourLabel: tournamentYourLabel(db, cup, me),
      phase: tournamentPhase(db, cup),
    }))
    .sort((a, b) => b.tournament.createdAt.localeCompare(a.tournament.createdAt));
}

export function groupsHomeSponsor(db: World): Sponsor | null {
  return oneSponsor(visibleSponsors(db, 'groups-list'));
}

export function tournamentsHomeSponsor(db: World): Sponsor | null {
  return oneSponsor(visibleSponsors(db, 'tournaments-list'));
}
