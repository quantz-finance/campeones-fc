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
  /** Partidos donde el rival ya registró el resultado y te toca confirmar. */
  toConfirm: string[];
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
  joinRequests: { id: string; userId: string; createdAt: string; profile: Profile }[];
};

export type TournamentSnapshot = {
  tournament: Tournament;
  group: Group | null;
  slots: Slot[];
  matches: Match[];
  people: People;
  totalRounds: number;
  registrations: { userId: string; registeredAt: string; profile: Profile }[];
  joinRequests: { id: string; userId: string; createdAt: string; profile: Profile }[];
  isOrganizer: boolean;
  /** El usuario actual tiene una solicitud pendiente. */
  requested: boolean;
};

export type TrophyView = {
  code: AchievementCode;
  title: string;
  description: string;
  section: import('../content/trophies').TrophySectionId;
  rarity: import('../content/trophies').TrophyRarity;
  earned: boolean;
  earnedAt: string | null;
  progress: { current: number; target: number } | null;
};

/** Un jugador en la portada (inicio): solo datos que salen de partidos confirmados. */
export type BillboardPlayer = {
  profile: Profile;
  rating: number;
  /** Puesto en el ranking del círculo (null si todavía no califica). */
  place: number | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  streak: { type: 'win' | 'loss' | 'draw' | 'none'; count: number };
  bestWinStreak: number;
  /** Ventana reciente (últimos `windowDays` días). */
  windowPlayed: number;
  windowWins: number;
  windowDelta: number;
  /** Últimos resultados, del más nuevo al más viejo. */
  form: ('win' | 'loss' | 'draw')[];
};

export type BillboardTournament = {
  tournament: Tournament;
  groupName: string;
  played: number;
  lastAt: string | null;
  leader: Profile | null;
  champion: Profile | null;
};

export type BillboardRivalry = {
  group: Group;
  first: BillboardPlayer;
  second: BillboardPlayer;
  gap: number;
};

export type BillboardSnapshot = {
  windowDays: number;
  /** Estrella: la de la semana (o del mes) si alguien ganó en la ventana; si no, el número 1 del ranking. */
  star: { player: BillboardPlayer; reason: 'week' | 'month' | 'top' } | null;
  /** Las estrellas: hasta 5 (semana → mes → ranking), cada una con los datos de su ventana. */
  stars: { player: BillboardPlayer; reason: 'week' | 'month' | 'top' }[];
  top: BillboardPlayer[];
  movers: BillboardPlayer[];
  streaks: BillboardPlayer[];
  results: { match: Match; label: string | null }[];
  tournaments: BillboardTournament[];
  rivalries: BillboardRivalry[];
  people: People;
  minMatches: number;
};
