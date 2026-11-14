import { projectPublicPlayer } from './public-player';
import { branding } from '../../config/branding';
import { projectTrophies } from './project-trophies';
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
  mutateSetLogo,
  mutateSubmit,
  mutateUpdateProfile,
  searchUsers,
} from './mutate';
import {
  projectBillboard,
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
import {
  createRegistrationTournament as createRegistrationTournamentInWorld,
  decideGroupJoin as decideGroupJoinInWorld,
  decideTournamentJoin as decideTournamentJoinInWorld,
  groupsHomeSponsor,
  joinPublicGroup as joinPublicGroupInWorld,
  myTournamentCards,
  oneSponsor,
  registerForTournament as registerForTournamentInWorld,
  requestGroupJoin as requestGroupJoinInWorld,
  requestTournamentJoin as requestTournamentJoinInWorld,
  searchPublicGroups as searchPublicGroupsInWorld,
  searchPublicTournaments as searchPublicTournamentsInWorld,
  setGroupAccess as setGroupAccessInWorld,
  setTournamentAccess as setTournamentAccessInWorld,
  startTournament as startTournamentInWorld,
  tournamentsHomeSponsor,
  visibleSponsors,
} from './public-access';
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
    async billboardSnapshot(userId) {
      return projectBillboard(view(), userId, now());
    },
    async publicPlayer(playerId, me) {
      return projectPublicPlayer(view(), playerId, me);
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
    createGroup(me, name, memberIds, logo, access) {
      return commit((world, at) => {
        const group = mutateCreateGroup(world, me, name, memberIds, at, logo);
        if (access) setGroupAccessInWorld(world, me, group.id, access.visibility, access.joinPolicy);
        return { id: group.id };
      });
    },
    searchPublicGroups(me, q) {
      return Promise.resolve(searchPublicGroupsInWorld(view(), me, q));
    },
    joinPublicGroup(me, groupId) {
      return commit((world, at) => joinPublicGroupInWorld(world, me, groupId, at));
    },
    requestGroupJoin(me, groupId) {
      return commit((world, at) => {
        requestGroupJoinInWorld(world, me, groupId, at);
      });
    },
    decideGroupJoin(me, requestId, approve) {
      return commit((world, at) => decideGroupJoinInWorld(world, me, requestId, approve, at));
    },
    setGroupAccess(me, groupId, visibility, joinPolicy) {
      return commit((world) => setGroupAccessInWorld(world, me, groupId, visibility, joinPolicy));
    },
    searchPublicTournaments(me, q) {
      return Promise.resolve(searchPublicTournamentsInWorld(view(), me, q));
    },
    myTournaments(me) {
      return Promise.resolve(myTournamentCards(view(), me));
    },
    registerForTournament(me, tournamentId) {
      return commit((world, at) => registerForTournamentInWorld(world, me, tournamentId, at));
    },
    requestTournamentJoin(me, tournamentId) {
      return commit((world, at) => {
        requestTournamentJoinInWorld(world, me, tournamentId, at);
      });
    },
    decideTournamentJoin(me, requestId, approve) {
      return commit((world, at) => decideTournamentJoinInWorld(world, me, requestId, approve, at));
    },
    setTournamentAccess(me, tournamentId, patch) {
      return commit((world) => setTournamentAccessInWorld(world, me, tournamentId, patch));
    },
    createRegistrationTournament(input) {
      return commit((world, at) => {
        const cup = createRegistrationTournamentInWorld(world, input, at);
        return { id: cup.id };
      });
    },
    startTournament(me, tournamentId) {
      return commit((world, at) => {
        startTournamentInWorld(world, me, tournamentId, at);
      });
    },
    async visibleSponsor(_me, placement, id) {
      if (placement === 'groups-list') return groupsHomeSponsor(view());
      if (placement === 'tournaments-list') return tournamentsHomeSponsor(view());
      return oneSponsor(visibleSponsors(view(), placement, id));
    },
    async setLogo(kind, targetId, logo, me) {
      await commit((world) => mutateSetLogo(world, kind, targetId, logo, me));
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
            logo: input.logo,
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
      return projectTrophies(view(), me);
    },
    async expireStale() {
      const count = await commit((world, at) => mutateExpire(world, at), true);
      if (count > 0) notify();
      return count;
    },
    async notices() {
      return [];
    },
    async markNoticesRead() {},
    invalidate() {
      notify();
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
