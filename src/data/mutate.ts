import { avatars } from '../../config/branding';
import { earnedAchievementCodes } from '../domain/achievements';
import { buildRoundRobin, buildSingleElim } from '../domain/bracket';
import { DomainError } from '../domain/errors';
import {
  acceptMatch,
  buildPendingMatch,
  expireIfDue,
  normalizeDraft,
  resolveStatus,
} from '../domain/match-flow';
import { replayRatings } from '../domain/elo';
import { rules } from '../domain/rules';
import { standings, uniqueLeader } from '../domain/stats';
import { between, isOpenStatus, type Match, type ReportDraft } from '../domain/types';
import { createCode, createId } from './ids';
import { toProfile, type Friendship, type Group, type Invite, type Profile, type Tournament, type UserAccount, type World } from './types';

function mustUser(db: World, userId: string): UserAccount {
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw new DomainError('not_found', 'No encontramos a ese jugador.');
  return user;
}

function mustMatch(db: World, matchId: string): Match {
  const match = db.matches.find((item) => item.id === matchId);
  if (!match) throw new DomainError('not_found', 'No encontramos ese partido.');
  return match;
}

function replaceMatch(db: World, match: Match) {
  const index = db.matches.findIndex((item) => item.id === match.id);
  if (index === -1) db.matches.push(match);
  else db.matches[index] = match;
}

export function areFriends(db: World, a: string, b: string): boolean {
  return db.friendships.some(
    (friendship) =>
      friendship.status === 'accepted' &&
      ((friendship.requesterId === a && friendship.addresseeId === b) ||
        (friendship.requesterId === b && friendship.addresseeId === a)),
  );
}

export function acceptedFriendIds(db: World, userId: string): string[] {
  const ids: string[] = [];
  for (const friendship of db.friendships) {
    if (friendship.status !== 'accepted') continue;
    if (friendship.requesterId === userId) ids.push(friendship.addresseeId);
    else if (friendship.addresseeId === userId) ids.push(friendship.requesterId);
  }
  return ids;
}

export function isMember(db: World, groupId: string, userId: string): boolean {
  return db.groupMembers.some((member) => member.groupId === groupId && member.userId === userId);
}

function samePair(friendship: Friendship, a: string, b: string): boolean {
  return (
    (friendship.requesterId === a && friendship.addresseeId === b) ||
    (friendship.requesterId === b && friendship.addresseeId === a)
  );
}

function findOpen(db: World, a: string, b: string): Match | undefined {
  return db.matches.find((match) => between(match, a, b) && isOpenStatus(match.status));
}

function assertNoOpen(db: World, a: string, b: string) {
  if (findOpen(db, a, b)) {
    throw new DomainError('open_match', 'Ya tienen un partido abierto. Ciérrenlo antes de abrir otro.');
  }
}

export function assertUsername(username: string) {
  if (!/^[a-z0-9_]{3,16}$/.test(username)) {
    throw new DomainError('bad_username', 'El usuario usa de 3 a 16 letras minúsculas, números o _.');
  }
}

export function syncAchievements(db: World, userId: string, now: Date) {
  const codes = earnedAchievementCodes({
    playerId: userId,
    matches: db.matches,
    tournamentWins: db.tournaments.filter((tournament) => tournament.winnerId === userId).length,
  });
  for (const code of codes) {
    if (db.achievements.some((item) => item.userId === userId && item.code === code)) continue;
    const tournament = db.tournaments.find((item) => item.winnerId === userId);
    db.achievements.push({
      id: createId(),
      userId,
      code,
      earnedAt: now.toISOString(),
      refId: code === 'tournament_champion' ? (tournament?.id ?? null) : null,
    });
  }
}

function settleTournament(db: World, match: Match, now: Date) {
  if (!match.tournamentId || !match.tournamentSlotId || match.status !== 'confirmed') return;
  const tournament = db.tournaments.find((item) => item.id === match.tournamentId);
  const slot = db.slots.find((item) => item.id === match.tournamentSlotId);
  if (!tournament || !slot || tournament.status === 'completed') return;
  if (!match.isDraw && match.winnerId) slot.winnerId = match.winnerId;

  if (tournament.format === 'single_elim') {
    if (match.isDraw || !match.winnerId) return;
    const rounds = Math.log2(tournament.size || tournament.playerIds.length);
    if (slot.round >= rounds) {
      tournament.status = 'completed';
      tournament.winnerId = match.winnerId;
      return;
    }
    const next = db.slots.find(
      (item) =>
        item.tournamentId === tournament.id &&
        item.round === slot.round + 1 &&
        item.position === Math.floor(slot.position / 2),
    );
    if (!next) return;
    if (slot.position % 2 === 0) next.playerAId = match.winnerId;
    else next.playerBId = match.winnerId;
    if (next.playerAId && next.playerBId && !next.matchId && !findOpen(db, next.playerAId, next.playerBId)) {
      const created = buildPendingMatch(
        {
          id: createId(),
          playerAId: next.playerAId,
          playerBId: next.playerBId,
          groupId: tournament.groupId,
          tournamentId: tournament.id,
          tournamentSlotId: next.id,
          ttlMs: rules.tournamentAcceptTtlMs,
        },
        now,
      );
      db.matches.push(created);
      next.matchId = created.id;
    }
    return;
  }

  const slots = db.slots.filter((item) => item.tournamentId === tournament.id);
  const confirmed = slots.every((item) => {
    const linked = db.matches.find((candidate) => candidate.id === item.matchId);
    return linked?.status === 'confirmed';
  });
  if (!confirmed) return;
  const matches = slots
    .map((item) => db.matches.find((candidate) => candidate.id === item.matchId))
    .filter((item): item is Match => Boolean(item));
  tournament.status = 'completed';
  tournament.winnerId = uniqueLeader(standings(tournament.playerIds, matches));
}

export function mutateExpire(db: World, now: Date): number {
  let count = 0;
  db.matches = db.matches.map((match) => {
    const next = expireIfDue(match, now);
    if (next.status !== match.status) count += 1;
    return next;
  });
  return count;
}

export function mutateCreateMatch(
  db: World,
  input: { me: string; opponentId: string; groupId?: string | null },
  now: Date,
): Match {
  if (input.me === input.opponentId) throw new DomainError('self', 'No puedes jugar contra ti.');
  mustUser(db, input.me);
  mustUser(db, input.opponentId);
  if (!areFriends(db, input.me, input.opponentId)) {
    throw new DomainError('not_friend', 'Solo puedes proponer un partido a un amigo.');
  }
  if (input.groupId) {
    if (!isMember(db, input.groupId, input.me) || !isMember(db, input.groupId, input.opponentId)) {
      throw new DomainError('forbidden', 'Los dos tienen que estar en el grupo.');
    }
  }
  assertNoOpen(db, input.me, input.opponentId);
  const match = buildPendingMatch(
    {
      id: createId(),
      playerAId: input.me,
      playerBId: input.opponentId,
      groupId: input.groupId ?? null,
      ttlMs: rules.acceptTtlMs,
    },
    now,
  );
  db.matches.push(match);
  return match;
}

export function mutateAccept(db: World, matchId: string, userId: string, now: Date): Match {
  const due = expireIfDue(mustMatch(db, matchId), now);
  replaceMatch(db, due);
  if (due.status === 'expired') {
    throw new DomainError('expired', 'Este partido expiró sin que lo aceptaran.');
  }
  const next = acceptMatch(due, userId, now);
  replaceMatch(db, next);
  return next;
}

export function mutateDecline(db: World, matchId: string, userId: string, now: Date): Match {
  const due = expireIfDue(mustMatch(db, matchId), now);
  replaceMatch(db, due);
  if (due.status === 'expired') throw new DomainError('expired', 'Este partido ya expiró.');
  if (due.status !== 'pending_accept') {
    throw new DomainError('bad_status', 'Este partido ya no se puede cancelar.');
  }
  if (userId !== due.playerAId && userId !== due.playerBId) {
    throw new DomainError('not_player', 'No juegas este partido.');
  }
  const next: Match = { ...due, status: 'cancelled' };
  replaceMatch(db, next);
  return next;
}

/** Igual que el servidor: guarda el rating previo y el cambio Elo de cada jugador en el partido. */
function stampRating(db: World, match: Match) {
  const history = replayRatings(db.matches).history.filter((row) => row.matchId === match.id);
  const a = history.find((row) => row.userId === match.playerAId);
  const b = history.find((row) => row.userId === match.playerBId);
  if (!a || !b) return;
  replaceMatch(db, {
    ...match,
    ratingABefore: a.rating - a.delta,
    ratingBBefore: b.rating - b.delta,
    ratingDeltaA: a.delta,
    ratingDeltaB: b.delta,
  });
}

export function mutateSubmit(db: World, matchId: string, userId: string, draft: ReportDraft, now: Date): Match {
  const current = mustMatch(db, matchId);
  const due = expireIfDue(current, now);
  replaceMatch(db, due);
  if (due.status === 'expired') throw new DomainError('expired', 'Este partido expiró.');
  if (due.status === 'confirmed') {
    throw new DomainError('bad_status', 'Ese resultado ya quedó confirmado.');
  }
  const tournament = due.tournamentId
    ? db.tournaments.find((item) => item.id === due.tournamentId)
    : undefined;
  const normalized = normalizeDraft(due, userId, draft, tournament?.format !== 'single_elim');
  const report = { matchId, ...normalized, updatedAt: now.toISOString() };
  const index = db.reports.findIndex((item) => item.matchId === matchId && item.reporterId === userId);
  if (index >= 0) db.reports[index] = report;
  else db.reports.push(report);
  const next = resolveStatus(
    due,
    db.reports.filter((item) => item.matchId === matchId),
    now,
  );
  replaceMatch(db, next);
  if (next.status === 'confirmed') {
    stampRating(db, next);
    settleTournament(db, next, now);
    syncAchievements(db, next.playerAId, now);
    syncAchievements(db, next.playerBId, now);
    const updated = db.tournaments.find((item) => item.id === next.tournamentId);
    if (updated?.winnerId) syncAchievements(db, updated.winnerId, now);
  }
  return db.matches.find((item) => item.id === matchId) ?? next;
}

export function mutateSendFriend(db: World, me: string, username: string, now: Date) {
  const target = db.users.find((user) => user.username === username.trim().toLowerCase());
  if (!target) throw new DomainError('not_found', 'No hay un jugador con ese usuario.');
  if (target.id === me) throw new DomainError('self', 'Ese usuario eres tú.');
  const existing = db.friendships.find((friendship) => samePair(friendship, me, target.id));
  if (existing?.status === 'accepted') throw new DomainError('already_friends', 'Ya son amigos.');
  if (existing?.status === 'pending') {
    if (existing.addresseeId === me) {
      existing.status = 'accepted';
      existing.respondedAt = now.toISOString();
      return;
    }
    throw new DomainError('already_pending', 'Ya enviaste esa invitación.');
  }
  if (existing?.status === 'rejected') {
    existing.requesterId = me;
    existing.addresseeId = target.id;
    existing.status = 'pending';
    existing.createdAt = now.toISOString();
    existing.respondedAt = null;
    return;
  }
  db.friendships.push({
    id: createId(),
    requesterId: me,
    addresseeId: target.id,
    status: 'pending',
    createdAt: now.toISOString(),
    respondedAt: null,
  });
}

export function mutateRespondFriend(
  db: World,
  me: string,
  friendshipId: string,
  accept: boolean,
  now: Date,
) {
  const friendship = db.friendships.find((item) => item.id === friendshipId);
  if (!friendship) throw new DomainError('not_found', 'No está esa invitación.');
  if (friendship.addresseeId !== me) throw new DomainError('forbidden', 'Esa invitación no es tuya.');
  if (friendship.status !== 'pending') {
    throw new DomainError('bad_status', 'Esa invitación ya fue respondida.');
  }
  friendship.status = accept ? 'accepted' : 'rejected';
  friendship.respondedAt = now.toISOString();
}

export function mutateCreateInvite(db: World, me: string, now: Date): Invite {
  mustUser(db, me);
  const active = db.invites.find(
    (invite) => invite.creatorId === me && Date.parse(invite.expiresAt) > now.getTime(),
  );
  if (active) return active;
  const invite: Invite = {
    code: createCode(),
    creatorId: me,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + rules.inviteTtlMs).toISOString(),
  };
  db.invites.push(invite);
  return invite;
}

export function mutateRedeem(db: World, me: string, code: string, now: Date): 'friends' | 'already' {
  const invite = db.invites.find((item) => item.code.toLowerCase() === code.trim().toLowerCase());
  if (!invite || Date.parse(invite.expiresAt) <= now.getTime()) {
    throw new DomainError('not_found', 'Ese enlace no sirve o ya venció.');
  }
  if (invite.creatorId === me) {
    throw new DomainError('self', 'Ese enlace es tuyo. Compártelo con quien quieres retar.');
  }
  if (areFriends(db, me, invite.creatorId)) return 'already';
  const existing = db.friendships.find((friendship) => samePair(friendship, me, invite.creatorId));
  if (existing) {
    existing.requesterId = invite.creatorId;
    existing.addresseeId = me;
    existing.status = 'accepted';
    existing.respondedAt = now.toISOString();
    return 'friends';
  }
  db.friendships.push({
    id: createId(),
    requesterId: invite.creatorId,
    addresseeId: me,
    status: 'accepted',
    createdAt: now.toISOString(),
    respondedAt: now.toISOString(),
  });
  return 'friends';
}

export function mutateUpdateProfile(
  db: World,
  me: string,
  patch: { displayName?: string; username?: string; avatarKey?: string },
): Profile {
  const user = mustUser(db, me);
  if (patch.displayName != null) {
    const name = patch.displayName.trim();
    if (name.length < 2 || name.length > 32) {
      throw new DomainError('bad_name', 'Tu nombre va de 2 a 32 caracteres.');
    }
    user.displayName = name;
  }
  if (patch.username != null) {
    const username = patch.username.trim().toLowerCase();
    assertUsername(username);
    if (db.users.some((item) => item.id !== me && item.username === username)) {
      throw new DomainError('username_taken', 'Ese usuario ya existe.');
    }
    user.username = username;
  }
  if (patch.avatarKey != null) {
    if (!avatars.some((avatar) => avatar.key === patch.avatarKey)) {
      throw new DomainError('bad_avatar', 'Elige un avatar de la lista.');
    }
    user.avatarKey = patch.avatarKey;
  }
  return toProfile(user);
}

export function mutateRegisterDemo(db: World, email: string, now: Date): Profile {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new DomainError('bad_email', 'Ese correo no se ve bien.');
  }
  const existing = db.users.find((user) => user.email.toLowerCase() === normalized);
  if (existing) return toProfile(existing);
  const raw = normalized.split('@')[0] ?? 'jugador';
  const base = raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 12);
  let username = base.length >= 3 ? base : 'jugador';
  let suffix = 1;
  while (db.users.some((user) => user.username === username)) {
    suffix += 1;
    username = `${base || 'jugador'}${suffix}`.slice(0, 16);
  }
  const display = username.charAt(0).toUpperCase() + username.slice(1);
  const user: UserAccount = {
    id: createId(),
    email: normalized,
    username,
    displayName: display,
    avatarKey: avatars[db.users.length % avatars.length]?.key ?? 'rayo',
  };
  db.users.push(user);
  void now;
  return toProfile(user);
}

export function mutateCreateGroup(db: World, me: string, name: string, memberIds: string[], now: Date): Group {
  const trimmed = name.trim();
  if (trimmed.length < 3 || trimmed.length > rules.maxGroupName) {
    throw new DomainError('bad_name', 'El grupo necesita un nombre de 3 a 32 caracteres.');
  }
  const unique = [...new Set(memberIds.filter((id) => id !== me))];
  if (unique.length < 1) throw new DomainError('bad_size', 'Invita al menos a un amigo al grupo.');
  for (const id of unique) {
    if (!areFriends(db, me, id)) throw new DomainError('not_friend', 'Solo puedes sumar a tus amigos.');
  }
  const group: Group = { id: createId(), name: trimmed, createdBy: me, createdAt: now.toISOString() };
  db.groups.push(group);
  const joinedAt = now.toISOString();
  db.groupMembers.push({ groupId: group.id, userId: me, role: 'owner', joinedAt });
  for (const id of unique) db.groupMembers.push({ groupId: group.id, userId: id, role: 'member', joinedAt });
  return group;
}

export function mutateCreateTournament(
  db: World,
  input: {
    createdBy: string;
    groupId: string;
    name: string;
    format: 'single_elim' | 'round_robin';
    playerIds: string[];
  },
  now: Date,
): Tournament {
  const name = input.name.trim();
  if (name.length < 3 || name.length > rules.maxTournamentName) {
    throw new DomainError('bad_name', 'Ponle un nombre de 3 a 40 caracteres.');
  }
  const group = db.groups.find((item) => item.id === input.groupId);
  if (!group) throw new DomainError('not_found', 'No encontramos el grupo.');
  if (!isMember(db, group.id, input.createdBy)) throw new DomainError('forbidden', 'No estás en ese grupo.');
  if (new Set(input.playerIds).size !== input.playerIds.length) {
    throw new DomainError('bad_size', 'Un jugador no puede salir dos veces.');
  }
  for (const id of input.playerIds) {
    if (!isMember(db, group.id, id)) {
      throw new DomainError('forbidden', 'Todos los jugadores tienen que estar en el grupo.');
    }
  }
  if (input.format === 'single_elim' && ![4, 8, 16].includes(input.playerIds.length)) {
    throw new DomainError('bad_size', 'La eliminación directa es de 4, 8 o 16 jugadores.');
  }
  if (input.format === 'round_robin' && (input.playerIds.length < 3 || input.playerIds.length > 16)) {
    throw new DomainError('bad_size', 'La liga necesita entre 3 y 16 jugadores.');
  }
  const tournament: Tournament = {
    id: createId(),
    groupId: group.id,
    name,
    format: input.format,
    size: input.format === 'single_elim' ? input.playerIds.length : null,
    status: 'in_progress',
    createdBy: input.createdBy,
    winnerId: null,
    createdAt: now.toISOString(),
    playerIds: [...input.playerIds],
  };
  const slots =
    input.format === 'single_elim'
      ? buildSingleElim(tournament.id, input.playerIds, createId)
      : buildRoundRobin(tournament.id, input.playerIds, createId);
  for (const slot of slots) {
    if (slot.playerAId && slot.playerBId && findOpen(db, slot.playerAId, slot.playerBId)) {
      throw new DomainError(
        'open_match',
        'Hay un partido abierto entre dos jugadores del torneo. Ciérrenlo primero.',
      );
    }
  }
  db.tournaments.push(tournament);
  for (const slot of slots) {
    db.slots.push(slot);
    if (!slot.playerAId || !slot.playerBId) continue;
    const match = buildPendingMatch(
      {
        id: createId(),
        playerAId: slot.playerAId,
        playerBId: slot.playerBId,
        groupId: group.id,
        tournamentId: tournament.id,
        tournamentSlotId: slot.id,
        ttlMs: rules.tournamentAcceptTtlMs,
      },
      now,
    );
    db.matches.push(match);
    slot.matchId = match.id;
  }
  return tournament;
}

export function mutateReopen(db: World, slotId: string, userId: string, now: Date): Match {
  const slot = db.slots.find((item) => item.id === slotId);
  if (!slot) throw new DomainError('not_found', 'No está ese cruce.');
  const tournament = db.tournaments.find((item) => item.id === slot.tournamentId);
  if (!tournament || tournament.status !== 'in_progress') {
    throw new DomainError('bad_status', 'El torneo no está en juego.');
  }
  if (!slot.playerAId || !slot.playerBId) {
    throw new DomainError('bad_status', 'Este cruce todavía no tiene a los dos jugadores.');
  }
  if (userId !== slot.playerAId && userId !== slot.playerBId) {
    throw new DomainError('not_player', 'Solo quien juega este cruce puede proponerlo.');
  }
  const existing = slot.matchId ? db.matches.find((match) => match.id === slot.matchId) : undefined;
  if (existing && isOpenStatus(existing.status)) {
    throw new DomainError('open_match', 'Ese cruce ya tiene un partido en curso.');
  }
  if (existing?.status === 'confirmed') {
    throw new DomainError('bad_status', 'Ese cruce ya tiene resultado.');
  }
  assertNoOpen(db, slot.playerAId, slot.playerBId);
  const opponent = userId === slot.playerAId ? slot.playerBId : slot.playerAId;
  const match = buildPendingMatch(
    {
      id: createId(),
      playerAId: userId,
      playerBId: opponent,
      groupId: tournament.groupId,
      tournamentId: tournament.id,
      tournamentSlotId: slot.id,
      ttlMs: rules.tournamentAcceptTtlMs,
    },
    now,
  );
  db.matches.push(match);
  slot.matchId = match.id;
  slot.winnerId = null;
  return match;
}

export function searchUsers(db: World, query: string, me: string): Profile[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return db.users
    .filter(
      (user) =>
        user.id !== me &&
        (user.username.includes(q) || user.displayName.toLowerCase().includes(q)),
    )
    .slice(0, 8)
    .map(toProfile);
}
