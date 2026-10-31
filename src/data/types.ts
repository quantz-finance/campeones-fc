import type { AvatarKey } from '../../config/branding';
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
};

export type UserAccount = Profile & { email: string };

/** Consentimiento guardado al crear la cuenta (Términos, Aviso de privacidad y edad). */
export type Consent = {
  termsVersion: string;
  privacyVersion: string;
  acceptedAt: string;
  ageBand: '13_17' | '18_plus';
  parentalAckAt: string | null;
};

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

export type Group = {
  id: string;
  name: string;
  createdBy: string;
  createdAt: string;
  photoUrl?: string | null;
};

export type GroupMember = {
  groupId: string;
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
};

export type Tournament = {
  id: string;
  groupId: string;
  name: string;
  format: TournamentFormat;
  size: number | null;
  status: 'in_progress' | 'completed';
  createdBy: string;
  winnerId: string | null;
  createdAt: string;
  playerIds: string[];
  photoUrl?: string | null;
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
  };
}

export function toProfile(user: UserAccount): Profile {
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarKey: user.avatarKey,
    photoUrl: user.photoUrl ?? null,
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
