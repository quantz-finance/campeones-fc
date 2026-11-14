import type { AvatarKey } from '../../config/branding';
import type { SocialLinks } from '../domain/social';
import type {
  AchievementCode,
  Match,
  MatchReport,
  Slot,
  TournamentFormat,
} from '../domain/types';

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  avatarKey: string;
  /** Foto subida (Storage, ruta versionada). */
  photoUrl?: string | null;
  /** Jugador de los datos de demo. */
  isDemo?: boolean;
  /** Modo prueba: ve los datos de demo (apagado por defecto). */
  showDemo?: boolean;
  /** Redes que el jugador escribió (enlaces https canónicos; discord = usuario). */
  socialLinks?: SocialLinks | null;
};

export type UserAccount = Profile & { email: string };

export type Friendship = {
  id: string;
  requesterId: string;
  addresseeId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  respondedAt: string | null;
};

export type Invite = {
  code: string;
  creatorId: string;
  createdAt: string;
  expiresAt: string;
};

export type Visibility = 'private' | 'public';
export type JoinPolicy = 'open' | 'invite';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type TournamentStatus = 'registration' | 'in_progress' | 'completed';

export type Group = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  photoUrl?: string | null;
  /** Escudo elegido del set (id de GROUP_CRESTS). null/ausente = escudo por defecto según el id. */
  logo?: string | null;
  /** Ausente o private = solo para miembros. */
  visibility?: Visibility;
  joinPolicy?: JoinPolicy;
};

export type GroupMember = {
  groupId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
};

export type Tournament = {
  id: string;
  /** Null si el torneo público no cuelga de un grupo. */
  groupId: string | null;
  name: string;
  format: TournamentFormat;
  size: number | null;
  status: TournamentStatus;
  createdBy: string;
  winnerId: string | null;
  createdAt: string;
  playerIds: string[];
  photoUrl?: string | null;
  /** Trofeo elegido del set (id de TOURNAMENT_TROPHIES). null/ausente = trofeo por defecto según el id. */
  logo?: string | null;
  visibility?: Visibility;
  joinPolicy?: JoinPolicy;
  startsAt?: string | null;
  maxPlayers?: number | null;
};

export type JoinRequest = {
  id: string;
  userId: string;
  status: JoinRequestStatus;
  createdAt: string;
  decidedAt?: string | null;
  decidedBy?: string | null;
};

export type GroupJoinRequest = JoinRequest & { groupId: string };
export type TournamentJoinRequest = JoinRequest & { tournamentId: string };

export type TournamentRegistration = {
  tournamentId: string;
  userId: string;
  registeredAt: string;
};

export type SponsorPlacement = 'home' | 'group' | 'tournament' | 'groups-list' | 'tournaments-list';

/** Patrocinio real (nunca se siembra en producción). El premio, si hay, es en especie. */
export type Sponsor = {
  id: string;
  placement: SponsorPlacement;
  groupId?: string | null;
  tournamentId?: string | null;
  name: string;
  kicker?: string | null;
  body?: string | null;
  cta?: string | null;
  href?: string | null;
  imageUrl?: string | null;
  prize?: string | null;
  size?: 'banner' | 'tile';
};

export type Achievement = {
  id: string;
  userId: string;
  code: AchievementCode;
  earnedAt: string;
  refId: string | null;
};

export type World = {
  users: UserAccount[];
  friendships: Friendship[];
  invites: Invite[];
  groups: Group[];
  groupMembers: GroupMember[];
  matches: Match[];
  reports: MatchReport[];
  tournaments: Tournament[];
  slots: Slot[];
  achievements: Achievement[];
  groupJoinRequests: GroupJoinRequest[];
  tournamentRegistrations: TournamentRegistration[];
  tournamentJoinRequests: TournamentJoinRequest[];
  sponsors: Sponsor[];
};

export function emptyWorld(): World {
  return {
    users: [],
    friendships: [],
    invites: [],
    groups: [],
    groupMembers: [],
    matches: [],
    reports: [],
    tournaments: [],
    slots: [],
    achievements: [],
    groupJoinRequests: [],
    tournamentRegistrations: [],
    tournamentJoinRequests: [],
    sponsors: [],
  };
}

export function toProfile(user: UserAccount): Profile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarKey: user.avatarKey,
    photoUrl: user.photoUrl ?? null,
    socialLinks: user.socialLinks ?? null,
  };
}

export function isAvatarKey(value: string): value is AvatarKey {
  return [
    'rayo',
    'ola',
    'volcan',
    'quetzal',
    'estrella',
    'luna',
    'fuego',
    'montana',
  ].includes(value);
}


export function visibilityOf(item: { visibility?: Visibility }): Visibility {
  return item.visibility === 'public' ? 'public' : 'private';
}

export function joinPolicyOf(item: { joinPolicy?: JoinPolicy }): JoinPolicy {
  return item.joinPolicy === 'open' ? 'open' : 'invite';
}
