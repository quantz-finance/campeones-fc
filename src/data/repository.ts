import type { PublicPlayer } from './public-player';
import type { SocialLinks } from '../domain/social';
import type { Profile } from './types';
import type { Notice } from './notices';
import type { PhotoKind, PhotoPayload } from '../lib/photos';
import type { LogoKind } from '../content/crest-ids';
import type { ReportDraft } from '../domain/types';
import type { Match } from '../domain/types';
import type { PublicGroupCard, PublicTournamentCard, MyTournamentCard, RegistrationTournamentInput } from './public-access';
import type { JoinPolicy, Sponsor, Visibility } from './types';
import type {
  BillboardSnapshot,
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
    patch: { displayName?: string; username?: string; avatarKey?: string; showDemo?: boolean; socialLinks?: SocialLinks | null },
  ): Promise<Profile>;
  searchProfiles(query: string, me: string): Promise<Profile[]>;
  demoAccounts(): Profile[];
  registerDemo(email: string): Promise<Profile>;
  resetDemo(): Promise<void>;
  /** Sube una foto (ya comprimida) y la guarda en el jugador, grupo o torneo. Devuelve la URL pública versionada. */
  uploadPhoto(kind: PhotoKind, targetId: string, photo: PhotoPayload): Promise<string>;
  friendsSnapshot(userId: string): Promise<FriendsSnapshot>;
  sendFriendRequest(me: string, username: string): Promise<void>;
  respondFriendRequest(me: string, friendshipId: string, accept: boolean): Promise<void>;
  createInvite(me: string): Promise<{ code: string; path: string }>;
  redeemInvite(me: string, code: string): Promise<'friends' | 'already'>;
  homeSnapshot(userId: string): Promise<HomeSnapshot>;
  /** Portada del inicio (estrella, top, rachas, resultados, torneos). */
  billboardSnapshot(userId: string): Promise<BillboardSnapshot>;
  /** Ficha pública de un jugador. me = null para espectadores sin cuenta. */
  publicPlayer(playerId: string, me: string | null): Promise<PublicPlayer>;
  createMatch(input: { me: string; opponentId: string; groupId?: string | null }): Promise<Match>;
  matchSnapshot(matchId: string, me: string): Promise<MatchSnapshot>;
  acceptMatch(matchId: string, me: string): Promise<Match>;
  declineMatch(matchId: string, me: string): Promise<Match>;
  submitReport(matchId: string, me: string, draft: ReportDraft): Promise<Match>;
  h2hSnapshot(me: string, opponentId: string): Promise<H2HSnapshot>;
  personalSnapshot(me: string): Promise<PersonalSnapshot>;
  rankingSnapshot(me: string): Promise<RankingSnapshot>;
  groupsSnapshot(me: string): Promise<GroupSummary[]>;
  searchPublicGroups(me: string, q?: string): Promise<PublicGroupCard[]>;
  joinPublicGroup(me: string, groupId: string): Promise<void>;
  requestGroupJoin(me: string, groupId: string): Promise<void>;
  decideGroupJoin(me: string, requestId: string, approve: boolean): Promise<void>;
  setGroupAccess(me: string, groupId: string, visibility: Visibility, joinPolicy: JoinPolicy): Promise<void>;
  searchPublicTournaments(me: string, q?: string): Promise<PublicTournamentCard[]>;
  myTournaments(me: string): Promise<MyTournamentCard[]>;
  registerForTournament(me: string, tournamentId: string): Promise<void>;
  requestTournamentJoin(me: string, tournamentId: string): Promise<void>;
  decideTournamentJoin(me: string, requestId: string, approve: boolean): Promise<void>;
  setTournamentAccess(
    me: string,
    tournamentId: string,
    patch: { visibility: Visibility; joinPolicy: JoinPolicy; maxPlayers?: number | null; startsAt?: string | null },
  ): Promise<void>;
  createRegistrationTournament(input: RegistrationTournamentInput): Promise<{ id: string }>;
  startTournament(me: string, tournamentId: string): Promise<void>;
  visibleSponsor(me: string, placement: Sponsor['placement'], id?: string | null): Promise<Sponsor | null>;
  /** logo: id del set de escudos (opcional; si la base aún no tiene la columna, se ignora y queda el de por defecto). */
  createGroup(me: string, name: string, memberIds: string[], logo?: string | null, access?: { visibility: Visibility; joinPolicy: JoinPolicy }): Promise<{ id: string }>;
  /** Elige el escudo (grupo) o trofeo (torneo) del set. Quita la foto subida. Solo dueño del grupo / creador del torneo. */
  setLogo(kind: LogoKind, targetId: string, logo: string, me: string): Promise<void>;
  groupSnapshot(groupId: string, me: string): Promise<GroupSnapshot>;
  createTournament(input: {
    me: string;
    groupId: string;
    name: string;
    format: 'single_elim' | 'round_robin';
    playerIds: string[];
    logo?: string | null;
  }): Promise<{ id: string }>;
  tournamentSnapshot(tournamentId: string, me: string): Promise<TournamentSnapshot>;
  reopenSlot(slotId: string, me: string): Promise<Match>;
  trophies(me: string): Promise<TrophyView[]>;
  expireStale(): Promise<number>;
  /** Últimos avisos del usuario (amistad, retos, resultados). */
  notices(me: string): Promise<Notice[]>;
  /** Marca como leídos (todos si no hay ids). */
  markNoticesRead(me: string, ids?: string[]): Promise<void>;
  /** Descarta la caché y avisa a las pantallas (al volver a la app, o como respaldo de Realtime). */
  invalidate(): void;
  subscribe(listener: () => void): () => void;
};
