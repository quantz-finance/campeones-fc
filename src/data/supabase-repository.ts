import { hideDemo, joinDemo } from './demo-filter';
import { trophyCatalog } from '../content/trophies';
import { DomainError } from '../domain/errors';
import type { ReportDraft } from '../domain/types';
import { asNullable, asString, mapMatch, mapUser, worldFromRows, type Row } from './rows';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '../lib/supabase';
import type { Notice } from './notices';
import {
  projectFriends,
  projectGroup,
  projectGroups,
  projectH2H,
  projectHome,
  projectMatch,
  projectPersonal,
  projectRanking,
  projectTournament,
} from './project';
import type { Repository } from './repository';
import type { TrophyView } from './snapshots';
import type { World } from './types';

function fail(error: { message: string } | null): void {
  if (error) throw new DomainError('remote', error.message);
}

async function pullWorld(userId: string): Promise<World> {
  const supabase = getSupabase();
  const [profiles, friendships, matches, reports, groups, members, tournaments, slots, achievements, invites] =
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
    ]);
  for (const result of [profiles, friendships, matches, reports, groups, members, tournaments, slots, achievements, invites]) {
    fail(result.error);
  }
  const world = worldFromRows({
    profiles: profiles.data as Row[] | null,
    friendships: friendships.data as Row[] | null,
    matches: matches.data as Row[] | null,
    reports: reports.data as Row[] | null,
    groups: groups.data as Row[] | null,
    members: members.data as Row[] | null,
    tournaments: tournaments.data as Row[] | null,
    slots: slots.data as Row[] | null,
    achievements: achievements.data as Row[] | null,
    invites: invites.data as Row[] | null,
  });
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
      const { data, error } = await supabase.from('profiles').update(payload).eq('id', userId).select('*').single();
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
    async createGroup(_me, name, memberIds) {
      const { data, error } = await supabase.rpc('create_group', { group_name: name, member_ids: memberIds });
      fail(error);
      notify();
      return { id: asString(data) };
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
      notify();
      return { id: asString(data) };
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
      const world = await worldFor(me);
      const earned = world.achievements.filter((item) => item.userId === me);
      return trophyCatalog.map((trophy) => {
        const hit = earned.find((item) => item.code === trophy.code);
        return { ...trophy, earned: Boolean(hit), earnedAt: hit?.earnedAt ?? null };
      });
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
