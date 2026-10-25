import { branding } from '../../config/branding';
import { trophyCatalog } from '../content/trophies';
import type { ReportDraft } from '../domain/types';
import {
  mutateAccept,
  mutateCreateGroup,
  mutateCreateInvite,
  mutateCreateMatch,
  mutateCreateTournament,
  mutateDecline,
  mutateExpire,
  mutateRedeem,
  mutateRegisterDemo,
  mutateReopen,
  mutateRespondFriend,
  mutateSendFriend,
  mutateSubmit,
  mutateUpdateProfile,
  searchUsers,
} from './mutate';
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
import { toProfile, type Profile, type World } from './types';

export type MemoryOptions = {
  now?: () => Date;
  persist?: (db: World) => void;
  reload?: () => World;
  reset?: () => World;
};

export function createMemoryRepository(initial: World, options: MemoryOptions = {}): Repository {
  let db = structuredClone(initial);
  const listeners = new Set<() => void>();
  const now = () => options.now?.() ?? new Date();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  async function commit<T>(fn: (world: World, at: Date) => T, silent = false): Promise<T> {
    const run = () => {
      if (options.reload) db = options.reload();
      const result = fn(db, now());
      options.persist?.(db);
      return result;
    };
    const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
    const result = locks?.request ? await locks.request('campeones-fc-demo', async () => run()) : run();
    if (!silent) notify();
    return result;
  }

  function view(): World {
    return options.reload ? options.reload() : db;
  }

  return {
    mode: 'demo',
    async getProfile(userId) {
      const user = view().users.find((item) => item.id === userId);
      return user ? toProfile(user) : null;
    },
    updateProfile(userId, patch) {
      return commit((world) => mutateUpdateProfile(world, userId, patch));
    },
    async searchProfiles(query, me) {
      return searchUsers(view(), query, me);
    },
    demoAccounts() {
      return view()
        .users.filter((user) => user.email.endsWith(`@${branding.demoEmailDomain}`))
        .map(toProfile);
    },
    registerDemo(email) {
      return commit((world, at) => mutateRegisterDemo(world, email, at));
    },
    async uploadPhoto() {
      throw new Error('Las fotos necesitan una cuenta real (no el modo demostración local).');
    },
    async resetDemo() {
      db = options.reset ? options.reset() : structuredClone(initial);
      options.persist?.(db);
      notify();
    },
    async friendsSnapshot(userId) {
      return projectFriends(view(), userId);
    },
    sendFriendRequest(me, username) {
      return commit((world, at) => mutateSendFriend(world, me, username, at));
    },
    respondFriendRequest(me, friendshipId, accept) {
      return commit((world, at) => mutateRespondFriend(world, me, friendshipId, accept, at));
    },
    createInvite(me) {
      return commit((world, at) => {
        const invite = mutateCreateInvite(world, me, at);
        return { code: invite.code, path: `/i/${invite.code}` };
      });
    },
    redeemInvite(me, code) {
      return commit((world, at) => mutateRedeem(world, me, code, at));
    },
    async homeSnapshot(userId) {
      return projectHome(view(), userId);
    },
    createMatch(input) {
      return commit((world, at) => mutateCreateMatch(world, input, at));
    },
    async matchSnapshot(matchId, me) {
      return projectMatch(view(), matchId, me);
    },
    acceptMatch(matchId, me) {
      return commit((world, at) => mutateAccept(world, matchId, me, at));
    },
    declineMatch(matchId, me) {
      return commit((world, at) => mutateDecline(world, matchId, me, at));
    },
    submitReport(matchId, me, draft: ReportDraft) {
      return commit((world, at) => mutateSubmit(world, matchId, me, draft, at));
    },
    async h2hSnapshot(me, opponentId) {
      return projectH2H(view(), me, opponentId);
    },
    async personalSnapshot(me) {
      return projectPersonal(view(), me);
    },
    async rankingSnapshot(me) {
      return projectRanking(view(), me);
    },
    async groupsSnapshot(me) {
      return projectGroups(view(), me);
    },
    createGroup(me, name, memberIds) {
      return commit((world, at) => {
        const group = mutateCreateGroup(world, me, name, memberIds, at);
        return { id: group.id };
      });
    },
    async groupSnapshot(groupId, me) {
      return projectGroup(view(), groupId, me);
    },
    createTournament(input) {
      return commit((world, at) => {
        const tournament = mutateCreateTournament(
          world,
          {
            createdBy: input.me,
            groupId: input.groupId,
            name: input.name,
            format: input.format,
            playerIds: input.playerIds,
          },
          at,
        );
        return { id: tournament.id };
      });
    },
    async tournamentSnapshot(tournamentId, me) {
      return projectTournament(view(), tournamentId, me);
    },
    reopenSlot(slotId, me) {
      return commit((world, at) => mutateReopen(world, slotId, me, at));
    },
    async trophies(me): Promise<TrophyView[]> {
      const earned = view().achievements.filter((item) => item.userId === me);
      return trophyCatalog.map((trophy) => {
        const hit = earned.find((item) => item.code === trophy.code);
        return { ...trophy, earned: Boolean(hit), earnedAt: hit?.earnedAt ?? null };
      });
    },
    async expireStale() {
      const count = await commit((world, at) => mutateExpire(world, at), true);
      if (count > 0) notify();
      return count;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function readMemory(repo: Repository, initial: World): World {
  void repo;
  return initial;
}

export type { Profile };
