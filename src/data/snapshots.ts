import type { RankRow, SideRecord, TableRow } from '../domain/stats';
import type { AchievementCode, Match, MatchReport, Slot } from '../domain/types';
import type { Achievement, Friendship, Group, Invite, Profile, Tournament } from './types';

export type People = Record<string, Profile>;

export type HomeSnapshot = {
  profile: Profile;
  rating: number;
  record: SideRecord;
  actionMatches: Match[];
  waitingMatches: Match[];
  recent: Match[];
  trophies: Achievement[];
  people: People;
};

export type FriendsSnapshot = {
  friends: { profile: Profile; record: SideRecord; rating: number }[];
  incoming: { friendship: Friendship; profile: Profile }[];
  outgoing: { friendship: Friendship; profile: Profile }[];
};

export type MatchSnapshot = {
  match: Match;
  reports: MatchReport[];
  people: People;
  youAre: 'a' | 'b' | 'other';
  yourReport: MatchReport | null;
  opponentReport: MatchReport | null;
  groupName: string | null;
  tournamentName: string | null;
  slotId: string | null;
  canReopen: boolean;
  allowDraw: boolean;
};

export type H2HSnapshot = {
  you: Profile;
  opponent: Profile;
  youRecord: SideRecord;
  opponentRecord: SideRecord;
  recent: Match[];
  evolution: {
    matchId: string;
    at: string;
    pointsYou: number;
    pointsThem: number;
    ratingYou: number;
    ratingThem: number;
  }[];
};

export type PersonalSnapshot = {
  profile: Profile;
  rating: number;
  record: SideRecord;
  bestRival: { profile: Profile; record: SideRecord } | null;
  worstRival: { profile: Profile; record: SideRecord } | null;
  rivalsProvisional: boolean;
  byOpponent: { profile: Profile; record: SideRecord }[];
  evolution: { matchId: string; at: string; points: number; rating: number }[];
  recent: Match[];
  people: People;
};

export type RankingSnapshot = {
  rows: (RankRow & { profile: Profile })[];
  you: (RankRow & { profile: Profile }) | null;
  qualified: boolean;
  missing: number;
  minMatches: number;
};

export type GroupSummary = {
  group: Group;
  memberCount: number;
  leader: Profile | null;
  yourPlace: number | null;
};

export type GroupSnapshot = {
  group: Group;
  members: Profile[];
  yourRole: 'owner' | 'member';
  table: (TableRow & { profile: Profile })[];
  leader: Profile | null;
  matrix: Record<string, Record<string, { wins: number; draws: number; losses: number }>>;
  recent: Match[];
  ranking: (RankRow & { profile: Profile })[];
  tournaments: Tournament[];
  people: People;
  minMatches: number;
};

export type TournamentSnapshot = {
  tournament: Tournament;
  group: Group;
  slots: Slot[];
  matches: Match[];
  people: People;
  totalRounds: number;
};

export type TrophyView = {
  code: AchievementCode;
  title: string;
  description: string;
  earned: boolean;
  earnedAt: string | null;
};
