// Filas de Supabase (snake_case) -> tipos de la app. Sin dependencias de cliente: lo usan la app y /api.
import type { Match, MatchReport, Slot } from '../domain/types';
import {
  emptyWorld,
  type Achievement,
  type Friendship,
  type Group,
  type GroupMember,
  type Invite,
  type Tournament,
  type UserAccount,
  type World,
} from './types';

export type Row = Record<string, unknown>;

export function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export function asNullable(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

export function asBool(value: unknown): boolean {
  return value === true;
}


export function mapUser(row: Row): UserAccount {
  return {
    id: asString(row.id),
    username: asString(row.username),
    displayName: asString(row.display_name),
    avatarKey: asString(row.avatar_key || 'rayo'),
    photoUrl: asNullable(row.photo_url),
    isDemo: row.is_demo === true,
    showDemo: row.show_demo === true,
    email: '',
  };
}

export function mapMatch(row: Row): Match {
  return {
    id: asString(row.id),
    playerAId: asString(row.player_a_id),
    playerBId: asString(row.player_b_id),
    status: asString(row.status) as Match['status'],
    groupId: asNullable(row.group_id),
    tournamentId: asNullable(row.tournament_id),
    tournamentSlotId: asNullable(row.tournament_slot_id),
    winnerId: asNullable(row.winner_id),
    isDraw: asBool(row.is_draw),
    goalsA: asNumber(row.goals_a),
    goalsB: asNumber(row.goals_b),
    createdAt: asString(row.created_at),
    expiresAt: asString(row.expires_at),
    acceptedAt: asNullable(row.accepted_at),
    confirmedAt: asNullable(row.confirmed_at),
    ratingABefore: asNumber(row.rating_a_before),
    ratingBBefore: asNumber(row.rating_b_before),
    ratingDeltaA: asNumber(row.rating_delta_a),
    ratingDeltaB: asNumber(row.rating_delta_b),
    chainStatus: asNullable(row.chain_status) as Match['chainStatus'],
    chainTx: asNullable(row.chain_tx),
    chainNetwork: asNullable(row.chain_network) as Match['chainNetwork'],
  };
}

export type RawRows = {
  profiles?: Row[] | null;
  friendships?: Row[] | null;
  matches?: Row[] | null;
  reports?: Row[] | null;
  groups?: Row[] | null;
  members?: Row[] | null;
  tournaments?: Row[] | null;
  slots?: Row[] | null;
  achievements?: Row[] | null;
  invites?: Row[] | null;
};

export function worldFromRows(raw: RawRows): World {
  const world = emptyWorld();
  world.users = ((raw.profiles ?? []) as Row[]).map(mapUser);
  world.friendships = ((raw.friendships ?? []) as Row[]).map(
    (row): Friendship => ({
      id: asString(row.id),
      requesterId: asString(row.requester_id),
      addresseeId: asString(row.addressee_id),
      status: asString(row.status) as Friendship['status'],
      createdAt: asString(row.created_at),
      respondedAt: asNullable(row.responded_at),
    }),
  );
  world.matches = ((raw.matches ?? []) as Row[]).map(mapMatch);
  world.reports = ((raw.reports ?? []) as Row[]).map(
    (row): MatchReport => ({
      matchId: asString(row.match_id),
      reporterId: asString(row.reporter_id),
      winnerId: asNullable(row.winner_id),
      isDraw: asBool(row.is_draw),
      goalsA: asNumber(row.goals_a),
      goalsB: asNumber(row.goals_b),
      updatedAt: asString(row.updated_at),
    }),
  );
  world.groups = ((raw.groups ?? []) as Row[]).map(
    (row): Group => ({
      id: asString(row.id),
      name: asString(row.name),
      createdBy: asString(row.created_by),
      createdAt: asString(row.created_at),
      photoUrl: asNullable(row.photo_url),
    }),
  );
  world.groupMembers = ((raw.members ?? []) as Row[]).map(
    (row): GroupMember => ({
      groupId: asString(row.group_id),
      userId: asString(row.user_id),
      role: asString(row.role) as GroupMember['role'],
      joinedAt: asString(row.joined_at),
    }),
  );
  world.tournaments = ((raw.tournaments ?? []) as Row[]).map(
    (row): Tournament => ({
      id: asString(row.id),
      groupId: asString(row.group_id),
      name: asString(row.name),
      format: asString(row.format) as Tournament['format'],
      size: asNumber(row.size),
      status: asString(row.status) as Tournament['status'],
      createdBy: asString(row.created_by),
      winnerId: asNullable(row.winner_id),
      createdAt: asString(row.created_at),
      playerIds: Array.isArray(row.player_ids) ? row.player_ids.map(asString) : [],
      photoUrl: asNullable(row.photo_url),
    }),
  );
  world.slots = ((raw.slots ?? []) as Row[]).map(
    (row): Slot => ({
      id: asString(row.id),
      tournamentId: asString(row.tournament_id),
      round: asNumber(row.round) ?? 1,
      position: asNumber(row.position) ?? 0,
      playerAId: asNullable(row.player_a_id),
      playerBId: asNullable(row.player_b_id),
      winnerId: asNullable(row.winner_id),
      matchId: asNullable(row.match_id),
    }),
  );
  world.achievements = ((raw.achievements ?? []) as Row[]).map(
    (row): Achievement => ({
      id: asString(row.id),
      userId: asString(row.user_id),
      code: asString(row.code) as Achievement['code'],
      earnedAt: asString(row.earned_at),
      refId: asNullable(row.ref_id),
    }),
  );
  world.invites = ((raw.invites ?? []) as Row[]).map(
    (row): Invite => ({
      code: asString(row.code),
      creatorId: asString(row.creator_id),
      createdAt: asString(row.created_at),
      expiresAt: asString(row.expires_at),
    }),
  );
  return world;
}
