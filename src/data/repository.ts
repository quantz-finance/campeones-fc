import type { Profile } from './types';
import type { ReportDraft } from '../domain/types';
import type { Match } from '../domain/types';
import type {
  FriendsSnapshot,
  GroupSnapshot,
  GroupSummary,
  H2HSnapshot,
  HomeSnapshot,
  MatchSnapshot,
  PersonalSnapshot,
  RankingSnapshot,
  TournamentSnapshot,
  TrophyView,
} from './snapshots';

export type Repository = {
  mode: 'demo' | 'supabase';
  getProfile(userId: string): Promise<Profile | null>;
  updateProfile(
    userId: string,
    patch: { displayName?: string; username?: string; avatarKey?: string },
  ): Promise<Profile>;
  searchProfiles(query: string, me: string): Promise<Profile[]>;
  demoAccounts(): Profile[];
  registerDemo(email: string): Promise<Profile>;
  resetDemo(): Promise<void>;
  friendsSnapshot(userId: string): Promise<FriendsSnapshot>;
  sendFriendRequest(me: string, username: string): Promise<void>;
  respondFriendRequest(me: string, friendshipId: string, accept: boolean): Promise<void>;
  createInvite(me: string): Promise<{ code: string; path: string }>;
  redeemInvite(me: string, code: string): Promise<'friends' | 'already'>;
  homeSnapshot(userId: string): Promise<HomeSnapshot>;
  createMatch(input: { me: string; opponentId: string; groupId?: string | null }): Promise<Match>;
  matchSnapshot(matchId: string, me: string): Promise<MatchSnapshot>;
  acceptMatch(matchId: string, me: string): Promise<Match>;
  declineMatch(matchId: string, me: string): Promise<Match>;
  submitReport(matchId: string, me: string, draft: ReportDraft): Promise<Match>;
  h2hSnapshot(me: string, opponentId: string): Promise<H2HSnapshot>;
  personalSnapshot(me: string): Promise<PersonalSnapshot>;
  rankingSnapshot(me: string): Promise<RankingSnapshot>;
  groupsSnapshot(me: string): Promise<GroupSummary[]>;
  createGroup(me: string, name: string, memberIds: string[]): Promise<{ id: string }>;
  groupSnapshot(groupId: string, me: string): Promise<GroupSnapshot>;
  createTournament(input: {
    me: string;
    groupId: string;
    name: string;
    format: 'single_elim' | 'round_robin';
    playerIds: string[];
  }): Promise<{ id: string }>;
  tournamentSnapshot(tournamentId: string, me: string): Promise<TournamentSnapshot>;
  reopenSlot(slotId: string, me: string): Promise<Match>;
  trophies(me: string): Promise<TrophyView[]>;
  expireStale(): Promise<number>;
  subscribe(listener: () => void): () => void;
};
