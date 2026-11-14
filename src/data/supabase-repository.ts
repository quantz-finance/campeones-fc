import { fetchPublicPlayer } from '../lib/api';
import { projectPublicPlayer } from './public-player';
import { cleanSocialLinks } from '../domain/social';
import { hideDemo, joinDemo } from './demo-filter';
import { projectTrophies } from './project-trophies';
import { normalizeAchievementCode } from '../domain/types';
import { DomainError, remoteError } from '../domain/errors';
import type { Match, MatchReport, ReportDraft, Slot } from '../domain/types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import type { Notice } from './notices';
import {
  projectFriends,
  projectGroup,
  projectGroups,
  projectH2H,
  projectHome,
  projectBillboard,
  projectMatch,
  projectPersonal,
  projectRanking,
  projectTournament,
} from './project';
import type { Repository } from './repository';
import type { TrophyView } from './snapshots';
import {
  emptyWorld,
  type Achievement,
  type Friendship,
  type Group,
  type GroupJoinRequest,
  type GroupMember,
  type Invite,
  type Sponsor,
  type Tournament,
  type TournamentJoinRequest,
  type TournamentRegistration,
  type UserAccount,
  type World,
} from './types';
import { groupsHomeSponsor, myTournamentCards, oneSponsor, searchPublicGroups as searchPublicGroupsInWorld, searchPublicTournaments as searchPublicTournamentsInWorld, tournamentsHomeSponsor, visibleSponsors } from './public-access';

type Row = Record<string, unknown>;

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asNullable(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function asBool(value: unknown): boolean {
  return value === true;
}

function fail(error: { message: string } | null): void {
  if (error) throw remoteError(error.message);
}

function mapUser(row: Row): UserAccount {
  return {
    id: asString(row.id),
    username: asString(row.username),
    displayName: asString(row.display_name),
    avatarKey: asString(row.avatar_key || 'rayo'),
    photoUrl: asNullable(row.photo_url),
    isDemo: row.is_demo === true,
    showDemo: row.show_demo === true,
    // Si la columna todavía no existe (migración sin aplicar), queda vacío.
    socialLinks: (() => {
      const links = cleanSocialLinks(row.social_links);
      return Object.keys(links).length ? links : null;
    })(),
    email: '',
  };
}

function mapMatch(row: Row): Match {
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

/** ¿La base todavía no tiene set_logo / la columna logo? (migración 20261113000000_entity_logos sin aplicar) */
function logoRpcMissing(error: { code?: string; message?: string }): boolean {
  return error.code === 'PGRST202' || error.code === '42883' || error.code === '42703' || /set_logo|column .*logo/i.test(error.message ?? '');
}

/** Al crear: guarda el logo si la base ya lo admite; si no, sigue sin error (se ve el de por defecto). */
async function saveLogoSoft(kind: 'groups' | 'tournaments', id: string, logo: string): Promise<void> {
  if (!id) return;
  const { error } = await getSupabase().rpc('set_logo', { kind, target: id, logo });
  if (error && !logoRpcMissing(error)) console.warn('[logo]', error.message);
}

async function pullWorld(userId: string): Promise<World> {
  const supabase = getSupabase();
  const [profiles, friendships, matches, reports, groups, members, tournaments, slots, achievements, invites, groupReqs, cupRegs, cupReqs, sponsors] =
    await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('friendships').select('*'),
      supabase.from('matches').select('*'),
      supabase.from('match_reports').select('*'),
      supabase.from('groups').select('*'),
      supabase.from('group_members').select('*'),
      supabase.from('tournaments').select('*'),
      supabase.from('tournament_slots').select('*'),
      supabase.from('achievements').select('*'),
      supabase.from('invite_links').select('*').eq('creator_id', userId),
      supabase.from('group_join_requests').select('*'),
      supabase.from('tournament_registrations').select('*'),
      supabase.from('tournament_join_requests').select('*'),
      supabase.from('sponsors').select('*'),
    ]);
  function missingRelation(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false;
    return error.code === '42P01' || error.code === 'PGRST205' || /does not exist|schema cache/i.test(error.message ?? '');
  }
  for (const result of [profiles, friendships, matches, reports, groups, members, tournaments, slots, achievements, invites]) {
    fail(result.error);
  }
  for (const result of [groupReqs, cupRegs, cupReqs, sponsors]) {
    if (result.error && !missingRelation(result.error)) fail(result.error);
  }
  const world = emptyWorld();
  world.users = ((profiles.data ?? []) as Row[]).map(mapUser);
  world.friendships = ((friendships.data ?? []) as Row[]).map(
    (row): Friendship => ({
      id: asString(row.id),
      requesterId: asString(row.requester_id),
      addresseeId: asString(row.addressee_id),
      status: asString(row.status) as Friendship['status'],
      createdAt: asString(row.created_at),
      respondedAt: asNullable(row.responded_at),
    }),
  );
  world.matches = ((matches.data ?? []) as Row[]).map(mapMatch);
  world.reports = ((reports.data ?? []) as Row[]).map(
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
  world.groups = ((groups.data ?? []) as Row[]).map(
    (row): Group => ({
      id: asString(row.id),
      name: asString(row.name),
      createdBy: asString(row.created_by),
      createdAt: asString(row.created_at),
      photoUrl: asNullable(row.photo_url),
      // Sin la migración entity_logos la columna no viene: queda null y se usa el escudo por defecto.
      logo: asNullable(row.logo),
      visibility: row.visibility === 'public' ? 'public' : 'private',
      joinPolicy: row.join_policy === 'open' ? 'open' : 'invite',
    }),
  );
  world.groupMembers = ((members.data ?? []) as Row[]).map(
    (row): GroupMember => ({
      groupId: asString(row.group_id),
      userId: asString(row.user_id),
      role: asString(row.role) as GroupMember['role'],
      joinedAt: asString(row.joined_at),
    }),
  );
  world.tournaments = ((tournaments.data ?? []) as Row[]).map(
    (row): Tournament => ({
      id: asString(row.id),
      groupId: asString(row.group_id) || null,
      name: asString(row.name),
      format: asString(row.format) as Tournament['format'],
      size: asNumber(row.size),
      status: asString(row.status) as Tournament['status'],
      createdBy: asString(row.created_by),
      winnerId: asNullable(row.winner_id),
      createdAt: asString(row.created_at),
      playerIds: Array.isArray(row.player_ids) ? row.player_ids.map(asString) : [],
      photoUrl: asNullable(row.photo_url),
      logo: asNullable(row.logo),
      visibility: row.visibility === 'public' ? 'public' : 'private',
      joinPolicy: row.join_policy === 'open' ? 'open' : 'invite',
      startsAt: asNullable(row.starts_at),
      maxPlayers: asNumber(row.max_players),
    }),
  );
  world.slots = ((slots.data ?? []) as Row[]).map(
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
  world.achievements = ((achievements.data ?? []) as Row[]).flatMap((row): Achievement[] => {
    const code = normalizeAchievementCode(asString(row.code));
    if (!code) return [];
    return [
      {
        id: asString(row.id),
        userId: asString(row.user_id),
        code,
        earnedAt: asString(row.earned_at),
        refId: asNullable(row.ref_id),
      },
    ];
  });
  world.invites = ((invites.data ?? []) as Row[]).map(
    (row): Invite => ({
      code: asString(row.code),
      creatorId: asString(row.creator_id),
      createdAt: asString(row.created_at),
      expiresAt: asString(row.expires_at),
    }),
  );
  world.groupJoinRequests = groupReqs.error ? [] : ((groupReqs.data ?? []) as Row[]).map(
    (row): GroupJoinRequest => ({
      id: asString(row.id),
      groupId: asString(row.group_id),
      userId: asString(row.user_id),
      status: (asString(row.status) as GroupJoinRequest['status']) || 'pending',
      createdAt: asString(row.created_at),
      decidedAt: asNullable(row.decided_at),
      decidedBy: asNullable(row.decided_by),
    }),
  );
  world.tournamentRegistrations = cupRegs.error ? [] : ((cupRegs.data ?? []) as Row[]).map(
    (row): TournamentRegistration => ({
      tournamentId: asString(row.tournament_id),
      userId: asString(row.user_id),
      registeredAt: asString(row.registered_at),
    }),
  );
  world.tournamentJoinRequests = cupReqs.error ? [] : ((cupReqs.data ?? []) as Row[]).map(
    (row): TournamentJoinRequest => ({
      id: asString(row.id),
      tournamentId: asString(row.tournament_id),
      userId: asString(row.user_id),
      status: (asString(row.status) as TournamentJoinRequest['status']) || 'pending',
      createdAt: asString(row.created_at),
      decidedAt: asNullable(row.decided_at),
      decidedBy: asNullable(row.decided_by),
    }),
  );
  world.sponsors = sponsors.error ? [] : ((sponsors.data ?? []) as Row[]).map(
    (row): Sponsor => ({
      id: asString(row.id),
      placement: asString(row.placement) as Sponsor['placement'],
      groupId: asNullable(row.group_id),
      tournamentId: asNullable(row.tournament_id),
      name: asString(row.name),
      kicker: asNullable(row.kicker),
      body: asNullable(row.body),
      cta: asNullable(row.cta),
      href: asNullable(row.href),
      imageUrl: asNullable(row.image_url),
      prize: asNullable(row.prize),
      size: row.size === 'tile' ? 'tile' : 'banner',
    }),
  );
  // Modo prueba apagado (default): sin jugadores, partidos, grupos ni torneos de demo.
  const me = ((profiles.data ?? []) as Row[]).find((row) => row.id === userId);
  const ids = (rows: unknown[] | null) => new Set(((rows ?? []) as Row[]).filter((row) => row.is_demo === true).map((row) => asString(row.id)));
  if (me?.show_demo !== true) {
    return hideDemo(world, { users: ids(profiles.data), matches: ids(matches.data), groups: ids(groups.data), tournaments: ids(tournaments.data) });
  }
  // Datos falsos: el mundo demo visible para cualquier cuenta (RLS lo permite con show_demo).
  return joinDemo(world, userId, { users: ids(profiles.data), groups: ids(groups.data) });
}

export function createSupabaseRepository(): Repository {
  const supabase = getSupabase();
  const listeners = new Set<() => void>();
  let generation = 0;
  const notify = () => {
    generation += 1;
    for (const listener of listeners) listener();
  };
  // Realtime por usuario: se (re)conecta con la sesión ya puesta, y al reconectar se vuelve a leer todo
  // (los eventos que pasaron con la pestaña dormida o sin red no llegan solos).
  let channel: RealtimeChannel | null = null;
  let channelUser: string | null = null;
  let retry: ReturnType<typeof setTimeout> | null = null;
  function connect(userId: string) {
    if (channel && channelUser === userId) return;
    if (channel) void supabase.removeChannel(channel);
    channelUser = userId;
    let joined = false;
    const watch = (table: string, filter?: string) =>
      ({ event: '*', schema: 'public', table, ...(filter ? { filter } : {}) }) as const;
    const next = supabase
      .channel(`cfc-${userId}-${Date.now().toString(36)}`)
      .on('postgres_changes', watch('matches'), notify)
      .on('postgres_changes', watch('match_reports'), notify)
      .on('postgres_changes', watch('friendships'), notify)
      .on('postgres_changes', watch('tournaments'), notify)
      .on('postgres_changes', watch('tournament_slots'), notify)
      .on('postgres_changes', watch('achievements'), notify)
      .on('postgres_changes', watch('match_stakes'), notify)
      .on('postgres_changes', watch('notifications', `user_id=eq.${userId}`), notify);
    channel = next;
    next.subscribe((status) => {
      if (channel !== next) return;
      if (status === 'SUBSCRIBED') {
        if (joined) notify();
        joined = true;
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (retry) return;
        retry = setTimeout(() => {
          retry = null;
          if (channel !== next || !channelUser) return;
          channel = null;
          void supabase.removeChannel(next);
          connect(channelUser);
          notify();
        }, 4000);
      }
    });
  }

  // Un solo pull por cambio: inicio, grupos y perfil piden snapshots a la vez y comparten el mismo mundo.
  let cache: { userId: string; gen: number; world: Promise<World> } | null = null;
  async function worldFor(userId: string) {
    connect(userId);
    if (cache && cache.userId === userId && cache.gen === generation) return cache.world;
    const entry = { userId, gen: generation, world: pullWorld(userId) };
    cache = entry;
    entry.world.catch(() => {
      if (cache === entry) cache = null;
    });
    return entry.world;
  }

  return {
    mode: 'supabase',
    async getProfile(userId) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
      fail(error);
      return data ? mapUser(data as Row) : null;
    },
    async uploadPhoto(kind, targetId, photo) {
      // La versión en la ruta rompe la caché: una foto nueva se ve al instante en todos lados.
      const path = `${kind}/${targetId}/${Date.now().toString(36)}.${photo.ext}`;
      const bucket = supabase.storage.from('photos');
      const { error } = await bucket.upload(path, photo.body, { contentType: photo.type, cacheControl: '31536000', upsert: false });
      fail(error);
      const url = bucket.getPublicUrl(path).data.publicUrl;
      const saved = await supabase.rpc('set_photo', { kind, target: targetId, url });
      fail(saved.error);
      notify();
      return url;
    },
    async updateProfile(userId, patch) {
      const payload: Row = {};
      if (patch.displayName != null) payload.display_name = patch.displayName.trim();
      if (patch.username != null) payload.username = patch.username.trim().toLowerCase();
      if (patch.avatarKey != null) payload.avatar_key = patch.avatarKey;
      if (patch.showDemo != null) payload.show_demo = patch.showDemo;
      if (patch.socialLinks !== undefined) {
        const clean = cleanSocialLinks(patch.socialLinks);
        payload.social_links = Object.keys(clean).length ? clean : null;
      }
      const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select('*').single();
      if (error && 'social_links' in payload && /social_links/.test(error.message ?? '')) {
        throw new DomainError('social_unavailable', 'Las redes sociales todavía no están activadas. Pronto vas a poder guardarlas.');
      }
      fail(error);
      notify();
      return mapUser(data as Row);
    },
    async searchProfiles(query, me) {
      const q = query.trim().replace(/[%_,.()]/g, '');
      if (q.length < 2) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', me)
        .limit(8);
      fail(error);
      return ((data ?? []) as Row[]).map(mapUser);
    },
    demoAccounts() {
      return [];
    },
    async registerDemo() {
      throw new DomainError('demo_only', 'El registro de demostración solo existe sin Supabase.');
    },
    async resetDemo() {
      throw new DomainError('demo_only', 'Restablecer datos solo existe en el modo demostración.');
    },
    async friendsSnapshot(userId) {
      return projectFriends(await worldFor(userId), userId);
    },
    async sendFriendRequest(_me, username) {
      const { error } = await supabase.rpc('send_friend_request', { target_username: username.trim().toLowerCase() });
      fail(error);
      notify();
    },
    async respondFriendRequest(_me, friendshipId, accept) {
      const { error } = await supabase.rpc('respond_friend_request', { friendship_id: friendshipId, accept });
      fail(error);
      notify();
    },
    async createInvite() {
      const { data, error } = await supabase.rpc('create_invite');
      fail(error);
      notify();
      const code = asString(data);
      return { code, path: `/i/${code}` };
    },
    async redeemInvite(_me, code) {
      const { data, error } = await supabase.rpc('redeem_invite', { invite_code: code });
      fail(error);
      notify();
      return asString(data) === 'already' ? 'already' : 'friends';
    },
    async homeSnapshot(userId) {
      return projectHome(await worldFor(userId), userId);
    },
    async billboardSnapshot(userId) {
      return projectBillboard(await worldFor(userId), userId);
    },
    async publicPlayer(playerId, me) {
      if (me) {
        const world = await worldFor(me);
        if (world.users.some((user) => user.id === playerId)) return projectPublicPlayer(world, playerId, me);
      }
      // Espectador sin cuenta (o jugador fuera de su vista): la ficha pública del servidor.
      return fetchPublicPlayer(playerId);
    },
    async createMatch(input) {
      const { data, error } = await supabase.rpc('create_match', {
        opponent_id: input.opponentId,
        group_id: input.groupId ?? null,
      });
      fail(error);
      notify();
      return mapMatch(data as Row);
    },
    async matchSnapshot(matchId, me) {
      return projectMatch(await worldFor(me), matchId, me);
    },
    async acceptMatch(matchId) {
      const { data, error } = await supabase.rpc('accept_match', { match_id: matchId });
      fail(error);
      notify();
      return mapMatch(data as Row);
    },
    async declineMatch(matchId) {
      const { data, error } = await supabase.rpc('decline_match', { match_id: matchId });
      fail(error);
      notify();
      return mapMatch(data as Row);
    },
    async submitReport(matchId, _me, draft: ReportDraft) {
      const { data, error } = await supabase.rpc('submit_match_report', {
        match_id: matchId,
        is_draw: draft.isDraw,
        winner_id: draft.winnerId,
        goals_a: draft.goalsA,
        goals_b: draft.goalsB,
      });
      fail(error);
      notify();
      return mapMatch(data as Row);
    },
    async h2hSnapshot(me, opponentId) {
      return projectH2H(await worldFor(me), me, opponentId);
    },
    async personalSnapshot(me) {
      return projectPersonal(await worldFor(me), me);
    },
    async rankingSnapshot(me) {
      return projectRanking(await worldFor(me), me);
    },
    async groupsSnapshot(me) {
      return projectGroups(await worldFor(me), me);
    },
    async createGroup(_me, name, memberIds, logo, access) {
      const { data, error } = await supabase.rpc('create_group', { group_name: name, member_ids: memberIds });
      fail(error);
      const id = asString(data);
      if (logo) await saveLogoSoft('groups', id, logo);
      if (access) {
        const accessRes = await supabase.rpc('set_group_access', {
          gid: id,
          new_visibility: access.visibility,
          new_join_policy: access.joinPolicy,
        });
        fail(accessRes.error);
      }
      notify();
      return { id };
    },
    async searchPublicGroups(me, q) {
      const { data, error } = await supabase.rpc('search_public_groups', { q: q ?? '' });
      if (error) return searchPublicGroupsInWorld(await worldFor(me), me, q);
      const rows = (data ?? []) as Row[];
      const world = await worldFor(me);
      const byId = new Map(world.groups.map((g) => [g.id, g]));
      const mine = new Set(world.groupMembers.filter((m) => m.userId === me).map((m) => m.groupId));
      return rows.filter((row) => !mine.has(asString(row.id))).map((row) => {
        const id = asString(row.id);
        const joinPolicy = row.join_policy === 'open' ? 'open' as const : 'invite' as const;
        const group = byId.get(id) ?? {
          id,
          name: asString(row.name),
          createdBy: '',
          createdAt: '',
          logo: asNullable(row.logo),
          photoUrl: asNullable(row.photo_url),
          visibility: 'public' as const,
          joinPolicy,
        };
        return {
          group,
          memberCount: asNumber(row.member_count) ?? 0,
          joinPolicy,
          requested: Boolean(row.requested),
        };
      });
    },
    async joinPublicGroup(_me, groupId) {
      const { error } = await supabase.rpc('join_public_group', { gid: groupId });
      fail(error);
      notify();
    },
    async requestGroupJoin(_me, groupId) {
      const { error } = await supabase.rpc('request_group_join', { gid: groupId });
      fail(error);
      notify();
    },
    async decideGroupJoin(_me, requestId, approve) {
      const { error } = await supabase.rpc('decide_group_join', { request_id: requestId, approve });
      fail(error);
      notify();
    },
    async setGroupAccess(_me, groupId, visibility, joinPolicy) {
      const { error } = await supabase.rpc('set_group_access', { gid: groupId, new_visibility: visibility, new_join_policy: joinPolicy });
      fail(error);
      notify();
    },
    async searchPublicTournaments(me, q) {
      const { data, error } = await supabase.rpc('search_public_tournaments', { q: q ?? '' });
      if (error) return searchPublicTournamentsInWorld(await worldFor(me), me, q);
      const world = await worldFor(me);
      const byId = new Map(world.tournaments.map((c) => [c.id, c]));
      return ((data ?? []) as Row[]).map((row) => {
        const id = asString(row.id);
        const cup = byId.get(id) ?? {
          id,
          groupId: asString(row.group_id) || null,
          name: asString(row.name),
          format: (asString(row.format) === 'round_robin' ? 'round_robin' : 'single_elim') as 'single_elim' | 'round_robin',
          size: asNumber(row.max_players),
          status: (asString(row.status) as 'registration' | 'in_progress' | 'completed') || 'registration',
          createdBy: '',
          winnerId: null,
          createdAt: '',
          playerIds: [],
          logo: asNullable(row.logo),
          photoUrl: asNullable(row.photo_url),
          visibility: 'public' as const,
          joinPolicy: row.join_policy === 'invite' ? 'invite' as const : 'open' as const,
          startsAt: asNullable(row.starts_at),
          maxPlayers: asNumber(row.max_players),
        };
        return {
          tournament: cup,
          groupName: asNullable(row.group_name),
          // Un torneo ya arrancado guarda a sus jugadores en player_ids (no en inscripciones).
          registeredCount: asNumber(row.registered_count) || cup.playerIds.length,
          requested: Boolean(row.requested),
          registered: Boolean(row.registered),
        };
      });
    },
    async myTournaments(me) {
      return myTournamentCards(await worldFor(me), me);
    },
    async registerForTournament(_me, tournamentId) {
      const { error } = await supabase.rpc('register_for_tournament', { tid: tournamentId });
      fail(error);
      notify();
    },
    async requestTournamentJoin(_me, tournamentId) {
      const { error } = await supabase.rpc('request_tournament_join', { tid: tournamentId });
      fail(error);
      notify();
    },
    async decideTournamentJoin(_me, requestId, approve) {
      const { error } = await supabase.rpc('decide_tournament_join', { request_id: requestId, approve });
      fail(error);
      notify();
    },
    async setTournamentAccess(_me, tournamentId, patch) {
      const { error } = await supabase.rpc('set_tournament_access', {
        tid: tournamentId,
        new_visibility: patch.visibility,
        new_join_policy: patch.joinPolicy,
        new_max_players: patch.maxPlayers ?? null,
        new_starts_at: patch.clearStarts ? null : patch.startsAt ?? null,
        clear_starts: Boolean(patch.clearStarts),
      });
      fail(error);
      notify();
    },
    async createRegistrationTournament(input) {
      const { data, error } = await supabase.rpc('create_registration_tournament', {
        tournament_name: input.name,
        tournament_format: input.format,
        cup_max_players: input.maxPlayers ?? (input.format === 'single_elim' ? 8 : 8),
        cup_visibility: input.visibility,
        cup_join_policy: input.joinPolicy,
        cup_starts_at: input.startsAt ?? null,
        cup_group_id: input.groupId ?? null,
      });
      fail(error);
      const id = asString(data);
      if (input.logo) await saveLogoSoft('tournaments', id, input.logo);
      notify();
      return { id };
    },
    async startTournament(_me, tournamentId) {
      const { error } = await supabase.rpc('start_tournament', { tid: tournamentId });
      fail(error);
      notify();
    },
    async visibleSponsor(me, placement, id) {
      const world = await worldFor(me);
      if (placement === 'groups-list') return groupsHomeSponsor(world);
      if (placement === 'tournaments-list') return tournamentsHomeSponsor(world);
      return oneSponsor(visibleSponsors(world, placement, id));
    },
    async setLogo(kind, targetId, logo) {
      const { error } = await supabase.rpc('set_logo', { kind, target: targetId, logo });
      if (error && logoRpcMissing(error)) {
        throw new DomainError('logo_unavailable', 'Elegir escudo todavía no está activado. Mientras tanto se ve el de por defecto.');
      }
      fail(error);
      notify();
    },
    async groupSnapshot(groupId, me) {
      return projectGroup(await worldFor(me), groupId, me);
    },
    async createTournament(input) {
      const { data, error } = await supabase.rpc('create_tournament', {
        group_id: input.groupId,
        tournament_name: input.name,
        tournament_format: input.format,
        player_ids: input.playerIds,
      });
      fail(error);
      const id = asString(data);
      if (input.logo) await saveLogoSoft('tournaments', id, input.logo);
      notify();
      return { id };
    },
    async tournamentSnapshot(tournamentId, me) {
      return projectTournament(await worldFor(me), tournamentId, me);
    },
    async reopenSlot(slotId) {
      const { data, error } = await supabase.rpc('reopen_tournament_match', { slot_id: slotId });
      fail(error);
      notify();
      return mapMatch(data as Row);
    },
    async trophies(me): Promise<TrophyView[]> {
      return projectTrophies(await worldFor(me), me);
    },
    async expireStale() {
      const { data, error } = await supabase.rpc('expire_pending_matches');
      fail(error);
      const count = typeof data === 'number' ? data : 0;
      if (count > 0) notify();
      return count;
    },
    async notices(me) {
      connect(me);
      const { data, error } = await supabase
        .from('notifications')
        .select('id, kind, actor_id, match_id, created_at, read_at')
        .eq('user_id', me)
        .order('created_at', { ascending: false })
        .limit(30);
      fail(error);
      const rows = (data ?? []) as Row[];
      const actorIds = [...new Set(rows.map((row) => asNullable(row.actor_id)).filter((id): id is string => Boolean(id)))];
      const names = new Map<string, string>();
      if (actorIds.length) {
        const people = await supabase.from('profiles').select('id, display_name').in('id', actorIds);
        fail(people.error);
        for (const row of (people.data ?? []) as Row[]) names.set(asString(row.id), asString(row.display_name));
      }
      return rows.map(
        (row): Notice => ({
          id: asString(row.id),
          kind: asString(row.kind) as Notice['kind'],
          actorId: asNullable(row.actor_id),
          actorName: names.get(asString(row.actor_id)) ?? 'Tu rival',
          matchId: asNullable(row.match_id),
          createdAt: asString(row.created_at),
          readAt: asNullable(row.read_at),
        }),
      );
    },
    async markNoticesRead(_me, ids) {
      const { error } = await supabase.rpc('mark_notifications_read', { ids: ids?.length ? ids : null });
      fail(error);
    },
    invalidate() {
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
