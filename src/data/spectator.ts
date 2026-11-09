// Modo espectador: mirar sin cuenta. Solo lee el mundo de ejemplo (is_demo), nunca datos de personas reales.
// No hay sesión de Supabase: el servidor no recibe ningún token y cualquier acción de escritura se bloquea aquí.
import { DomainError } from '../domain/errors';
import { standings } from '../domain/stats';
import { byTime, type Match } from '../domain/types';
import { createMemoryRepository } from './memory-repository';
import type { Repository } from './repository';
import { asString, worldFromRows, type RawRows, type Row } from './rows';
import type { GroupSnapshot, People } from './snapshots';
import { toProfile, type Group, type Profile, type Tournament, type World } from './types';

export const SPECTATOR_ID = 'espectador';

/** Perfil virtual del espectador: no existe en la base ni en el mundo de ejemplo. */
export const SPECTATOR_PROFILE: Profile = {
  id: SPECTATOR_ID,
  username: 'espectador',
  displayName: 'Espectador',
  avatarKey: 'rayo',
  photoUrl: null,
  showDemo: true,
};

export const SPECTATOR_BLOCKED = 'Crea tu perfil para jugar. Como espectador solo puedes mirar.';

export class SpectatorBlockedError extends DomainError {
  constructor() {
    super('spectator', SPECTATOR_BLOCKED);
    this.name = 'SpectatorBlockedError';
  }
}

export function isSpectatorBlocked(error: unknown): boolean {
  return error instanceof DomainError && error.code === 'spectator';
}

const isDemo = (row: Row) => row.is_demo === true;
const ids = (rows: Row[]) => new Set(rows.map((row) => asString(row.id)));

/**
 * Filas crudas (service_role en /api/espectador) -> mundo público para mirar.
 * Regla: solo lo marcado is_demo. Nada de amistades, invitaciones, votos, correos, billeteras ni datos de cadena.
 */
export function spectatorWorldFromRows(raw: RawRows): World {
  const profiles = (raw.profiles ?? []).filter(isDemo);
  const users = ids(profiles);
  const groups = (raw.groups ?? []).filter(isDemo);
  const groupIds = ids(groups);
  const tournaments = (raw.tournaments ?? [])
    .filter((row) => isDemo(row) && groupIds.has(asString(row.group_id)))
    .map((row) => ({
      ...row,
      player_ids: Array.isArray(row.player_ids) ? row.player_ids.filter((id) => users.has(asString(id))) : [],
      winner_id: users.has(asString(row.winner_id)) ? row.winner_id : null,
    }));
  const tournamentIds = ids(tournaments);
  const matches = (raw.matches ?? []).filter(
    (row) =>
      isDemo(row) &&
      users.has(asString(row.player_a_id)) &&
      users.has(asString(row.player_b_id)) &&
      (row.group_id == null || groupIds.has(asString(row.group_id))) &&
      (row.tournament_id == null || tournamentIds.has(asString(row.tournament_id))),
  );
  const matchIds = ids(matches);
  const keepUser = (value: unknown) => (users.has(asString(value)) ? value : null);
  const world = worldFromRows({
    profiles: profiles.map((row) => ({
      id: row.id,
      username: row.username,
      display_name: row.display_name,
      avatar_key: row.avatar_key,
      photo_url: row.photo_url,
      is_demo: true,
    })),
    groups: groups.map((row) => ({ id: row.id, name: row.name, created_by: row.created_by, created_at: row.created_at, photo_url: row.photo_url })),
    members: (raw.members ?? []).filter((row) => groupIds.has(asString(row.group_id)) && users.has(asString(row.user_id))),
    tournaments,
    slots: (raw.slots ?? [])
      .filter((row) => tournamentIds.has(asString(row.tournament_id)))
      .map((row) => ({
        ...row,
        player_a_id: keepUser(row.player_a_id),
        player_b_id: keepUser(row.player_b_id),
        winner_id: keepUser(row.winner_id),
        match_id: matchIds.has(asString(row.match_id)) ? row.match_id : null,
      })),
    matches: matches.map((row) => ({ ...row, chain_status: null, chain_tx: null, chain_network: null })),
    achievements: (raw.achievements ?? []).filter((row) => users.has(asString(row.user_id))),
  });
  return scrubWorld(world);
}

/** Quita lo privado de un mundo ya armado (también para la semilla local del modo demostración). */
export function scrubWorld(world: World): World {
  return {
    ...world,
    users: world.users.map((user) => ({ ...toProfile(user), isDemo: true, email: '' })),
    friendships: [],
    invites: [],
    reports: [],
    matches: world.matches.map((match) => ({ ...match, chainStatus: null, chainTx: null, chainNetwork: null })),
  };
}

/**
 * El espectador entra (solo en memoria) como miembro de cada grupo y "amigo" de cada jugador de ejemplo, para que las
 * pantallas de siempre le dejen ver grupos, copas y partidos. Nada de esto se guarda ni sale del navegador.
 */
function viewerWorld(world: World): World {
  const at = new Date(0).toISOString();
  return {
    ...world,
    users: [...world.users.filter((user) => user.id !== SPECTATOR_ID), { ...SPECTATOR_PROFILE, email: '' }],
    friendships: world.users
      .filter((user) => user.id !== SPECTATOR_ID)
      .map((user) => ({ id: `espectador-${user.id}`, requesterId: SPECTATOR_ID, addresseeId: user.id, status: 'accepted' as const, createdAt: at, respondedAt: at })),
    groupMembers: [
      ...world.groupMembers.filter((member) => member.userId !== SPECTATOR_ID),
      ...world.groups.map((group) => ({ groupId: group.id, userId: SPECTATOR_ID, role: 'member' as const, joinedAt: at })),
    ],
  };
}

function withoutViewer(snapshot: GroupSnapshot): GroupSnapshot {
  const matrix = { ...snapshot.matrix };
  delete matrix[SPECTATOR_ID];
  for (const key of Object.keys(matrix)) {
    const row = { ...matrix[key] };
    delete row[SPECTATOR_ID];
    matrix[key] = row;
  }
  const people = { ...snapshot.people };
  delete people[SPECTATOR_ID];
  return {
    ...snapshot,
    members: snapshot.members.filter((member) => member.id !== SPECTATOR_ID),
    yourRole: 'member',
    table: snapshot.table.filter((row) => row.playerId !== SPECTATOR_ID),
    ranking: snapshot.ranking.filter((row) => row.playerId !== SPECTATOR_ID),
    matrix,
    people,
  };
}

export type SpectatorRepository = Repository & { spectator: true; feed(): SpectatorFeed };

/** Repositorio de solo lectura: las lecturas usan las proyecciones de siempre y toda escritura lanza SpectatorBlockedError. */
export function createSpectatorRepository(world: World): SpectatorRepository {
  const clean = scrubWorld(world);
  const memory = createMemoryRepository(viewerWorld(clean));
  const blocked = async (): Promise<never> => {
    throw new SpectatorBlockedError();
  };
  return {
    ...memory,
    spectator: true,
    feed: () => spectatorFeed(clean),
    async getProfile(userId) {
      return userId === SPECTATOR_ID ? SPECTATOR_PROFILE : memory.getProfile(userId);
    },
    updateProfile: blocked,
    async searchProfiles() {
      return [];
    },
    demoAccounts: () => [],
    registerDemo: blocked,
    resetDemo: blocked,
    uploadPhoto: blocked,
    async friendsSnapshot() {
      return { friends: [], incoming: [], outgoing: [] };
    },
    sendFriendRequest: blocked,
    respondFriendRequest: blocked,
    createInvite: blocked,
    redeemInvite: blocked,
    createMatch: blocked,
    acceptMatch: blocked,
    declineMatch: blocked,
    submitReport: blocked,
    async matchSnapshot(matchId) {
      return memory.matchSnapshot(matchId, SPECTATOR_ID);
    },
    async groupsSnapshot() {
      const list = await memory.groupsSnapshot(SPECTATOR_ID);
      return list.map((item) => ({ ...item, memberCount: Math.max(0, item.memberCount - 1), yourPlace: null }));
    },
    createGroup: blocked,
    async groupSnapshot(groupId) {
      return withoutViewer(await memory.groupSnapshot(groupId, SPECTATOR_ID));
    },
    createTournament: blocked,
    async tournamentSnapshot(tournamentId) {
      return memory.tournamentSnapshot(tournamentId, SPECTATOR_ID);
    },
    reopenSlot: blocked,
    async expireStale() {
      return 0;
    },
    async notices() {
      return [];
    },
    async markNoticesRead() {
      return undefined;
    },
  };
}

export function isSpectatorRepository(repo: Repository): repo is SpectatorRepository {
  return (repo as Partial<SpectatorRepository>).spectator === true;
}

// ---------------------------------------------------------------------------
// Portada del espectador: grupos más reñidos, copas y últimos resultados.
// ---------------------------------------------------------------------------

export type ContestedGroup = {
  group: Group;
  memberCount: number;
  leader: Profile;
  chaser: Profile;
  leaderPoints: number;
  chaserPoints: number;
  /** Puntos de diferencia entre el 1.º y el 2.º de la tabla. */
  gap: number;
  played: number;
};

export type CupCard = {
  tournament: Tournament;
  groupName: string;
  /** Cruces con resultado confirmado / cruces del cuadro. */
  decided: number;
  total: number;
  winner: Profile | null;
};

export type SpectatorFeed = {
  contested: ContestedGroup[];
  cups: CupCard[];
  recent: Match[];
  groupNames: Record<string, string>;
  people: People;
};

export function spectatorFeed(world: World, limits = { groups: 3, cups: 4, recent: 8 }): SpectatorFeed {
  const people: People = {};
  const person = (id: string) => {
    const user = world.users.find((item) => item.id === id);
    if (!user) return null;
    people[id] ??= toProfile(user);
    return people[id];
  };
  const groupNames: Record<string, string> = {};
  for (const group of world.groups) groupNames[group.id] = group.name;

  const contested: ContestedGroup[] = [];
  for (const group of world.groups) {
    const memberIds = world.groupMembers.filter((m) => m.groupId === group.id && m.userId !== SPECTATOR_ID).map((m) => m.userId);
    const matches = world.matches.filter((match) => match.groupId === group.id);
    const table = standings(memberIds, matches).filter((row) => row.played > 0);
    if (table.length < 2) continue;
    const leader = person(table[0].playerId);
    const chaser = person(table[1].playerId);
    if (!leader || !chaser) continue;
    contested.push({
      group,
      memberCount: memberIds.length,
      leader,
      chaser,
      leaderPoints: table[0].points,
      chaserPoints: table[1].points,
      gap: table[0].points - table[1].points,
      played: matches.filter((match) => match.status === 'confirmed').length,
    });
  }
  contested.sort((a, b) => a.gap - b.gap || b.played - a.played || a.group.name.localeCompare(b.group.name, 'es'));

  const cups: CupCard[] = world.tournaments
    .map((tournament) => {
      const slots = world.slots.filter((slot) => slot.tournamentId === tournament.id);
      const decided = slots.filter((slot) => {
        if (slot.winnerId) return true;
        const match = slot.matchId ? world.matches.find((item) => item.id === slot.matchId) : null;
        return match?.status === 'confirmed';
      }).length;
      return {
        tournament,
        groupName: groupNames[tournament.groupId] ?? '',
        decided,
        total: slots.length,
        winner: tournament.winnerId ? person(tournament.winnerId) : null,
      };
    })
    .sort(
      (a, b) =>
        Number(a.tournament.status === 'completed') - Number(b.tournament.status === 'completed') ||
        b.tournament.createdAt.localeCompare(a.tournament.createdAt),
    );

  const recent = world.matches
    .filter((match) => match.status === 'confirmed')
    .slice()
    .sort((a, b) => (b.confirmedAt ?? b.createdAt).localeCompare(a.confirmedAt ?? a.createdAt) || byTime(b, a))
    .slice(0, limits.recent);
  for (const match of recent) {
    person(match.playerAId);
    person(match.playerBId);
  }

  return { contested: contested.slice(0, limits.groups), cups: cups.slice(0, limits.cups), recent, groupNames, people };
}
