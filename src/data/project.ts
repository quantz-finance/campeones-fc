import { totalRounds } from '../domain/bracket';
import { DomainError } from '../domain/errors';
import { rules } from '../domain/rules';
import { faceMatrix, headToHead, personalStats, rankPlayers, resultOf, standings, summarize, type SideRecord } from '../domain/stats';
import { replayRatings } from '../domain/elo';
import { between, byTime, involves, isOpenStatus, type Match } from '../domain/types';
import { acceptedFriendIds, areFriends, isMember } from './mutate';
import type {
  BillboardPlayer,
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
} from './snapshots';
import { toProfile, type Profile, type World } from './types';

function person(db: World, id: string): Profile {
  const user = db.users.find((item) => item.id === id);
  if (!user) throw new DomainError('not_found', 'No encontramos a ese jugador.');
  return toProfile(user);
}

function people(db: World, ids: Iterable<string>): Record<string, Profile> {
  const out: Record<string, Profile> = {};
  for (const id of ids) {
    const user = db.users.find((item) => item.id === id);
    if (user) out[id] = toProfile(user);
  }
  return out;
}

function canSeeMatch(db: World, userId: string, match: Match): boolean {
  if (involves(match, userId)) return true;
  if (match.groupId && isMember(db, match.groupId, userId)) return true;
  const friends = new Set(acceptedFriendIds(db, userId));
  return friends.has(match.playerAId) && friends.has(match.playerBId);
}

function needsYou(db: World, match: Match, userId: string): boolean {
  if (match.status === 'pending_accept') return match.playerBId === userId;
  if (match.status === 'in_progress') {
    return !db.reports.some((report) => report.matchId === match.id && report.reporterId === userId);
  }
  return match.status === 'disputed' && involves(match, userId);
}

export function projectHome(db: World, userId: string): HomeSnapshot {
  const profile = person(db, userId);
  const friends = acceptedFriendIds(db, userId);
  const rating =
    rankPlayers([userId, ...friends], db.matches).everyone.find((row) => row.playerId === userId)?.rating ??
    rules.initialRating;
  const own = db.matches.filter((match) => involves(match, userId));
  const record = summarize(
    own.filter((match) => match.status === 'confirmed'),
    userId,
  );
  const live = own.filter((match) => isOpenStatus(match.status));
  const ids = new Set<string>([userId, ...friends]);
  for (const match of own) {
    ids.add(match.playerAId);
    ids.add(match.playerBId);
  }
  return {
    profile,
    rating,
    record,
    actionMatches: live.filter((match) => needsYou(db, match, userId)),
    waitingMatches: live.filter((match) => !needsYou(db, match, userId)),
    toConfirm: live
      .filter(
        (match) =>
          match.status === 'in_progress' &&
          db.reports.some((report) => report.matchId === match.id && report.reporterId !== userId) &&
          !db.reports.some((report) => report.matchId === match.id && report.reporterId === userId),
      )
      .map((match) => match.id),
    recent: own
      .filter((match) => match.status === 'confirmed')
      .slice()
      .sort(byTime)
      .reverse()
      .slice(0, 8),
    trophies: db.achievements.filter((item) => item.userId === userId),
    people: people(db, ids),
  };
}

export function projectFriends(db: World, userId: string): FriendsSnapshot {
  const friends = acceptedFriendIds(db, userId);
  const ranked = rankPlayers([userId, ...friends], db.matches).everyone;
  const rows = friends
    .map((id) => {
      const pair = db.matches.filter((match) => match.status === 'confirmed' && between(match, userId, id));
      return {
        profile: person(db, id),
        record: summarize(pair, userId),
        rating: ranked.find((row) => row.playerId === id)?.rating ?? rules.initialRating,
      };
    })
    .sort((a, b) => b.rating - a.rating || a.profile.displayName.localeCompare(b.profile.displayName, 'es'));
  const incoming = db.friendships
    .filter((friendship) => friendship.addresseeId === userId && friendship.status === 'pending')
    .map((friendship) => ({ friendship, profile: person(db, friendship.requesterId) }));
  const outgoing = db.friendships
    .filter((friendship) => friendship.requesterId === userId && friendship.status === 'pending')
    .map((friendship) => ({ friendship, profile: person(db, friendship.addresseeId) }));
  return { friends: rows, incoming, outgoing };
}

export function projectMatch(db: World, matchId: string, userId: string): MatchSnapshot {
  const match = db.matches.find((item) => item.id === matchId);
  if (!match || !canSeeMatch(db, userId, match)) {
    throw new DomainError('not_found', 'No encontramos ese partido.');
  }
  const reports = db.reports.filter((report) => report.matchId === match.id);
  const yourReport = reports.find((report) => report.reporterId === userId) ?? null;
  const opponentId = match.playerAId === userId ? match.playerBId : match.playerAId;
  const opponentReport =
    involves(match, userId) ? (reports.find((report) => report.reporterId === opponentId) ?? null) : null;
  const tournament = match.tournamentId
    ? db.tournaments.find((item) => item.id === match.tournamentId)
    : undefined;
  const existing = match.tournamentSlotId
    ? db.slots.find((slot) => slot.id === match.tournamentSlotId)
    : undefined;
  const canReopen = Boolean(
    tournament &&
      tournament.status === 'in_progress' &&
      existing &&
      (match.status === 'expired' || match.status === 'cancelled') &&
      (userId === match.playerAId || userId === match.playerBId),
  );
  return {
    match,
    reports,
    people: people(db, [match.playerAId, match.playerBId]),
    youAre: match.playerAId === userId ? 'a' : match.playerBId === userId ? 'b' : 'other',
    yourReport,
    opponentReport,
    groupName: match.groupId ? (db.groups.find((group) => group.id === match.groupId)?.name ?? null) : null,
    tournamentName: tournament?.name ?? null,
    slotId: match.tournamentSlotId,
    canReopen,
    allowDraw: tournament?.format !== 'single_elim',
  };
}

export function projectH2H(db: World, userId: string, opponentId: string): H2HSnapshot {
  if (!db.users.some((user) => user.id === opponentId)) {
    throw new DomainError('not_found', 'No encontramos a ese jugador.');
  }
  const visible = db.matches.filter((match) => canSeeMatch(db, userId, match));
  const stats = headToHead(visible, userId, opponentId);
  return {
    you: person(db, userId),
    opponent: person(db, opponentId),
    youRecord: stats.you,
    opponentRecord: stats.them,
    recent: stats.recent,
    evolution: stats.evolution,
  };
}

export function projectPersonal(db: World, userId: string): PersonalSnapshot {
  const visible = db.matches.filter((match) => canSeeMatch(db, userId, match));
  const stats = personalStats(visible, userId);
  const friends = acceptedFriendIds(db, userId);
  const circleRating =
    rankPlayers([userId, ...friends], visible).everyone.find((row) => row.playerId === userId)?.rating ??
    stats.rating;
  const ids = [userId, ...stats.byOpponent.map((row) => row.opponentId)];
  const map = people(db, ids);
  const withProfile = (row: { opponentId: string; record: SideRecord } | null) =>
    row && map[row.opponentId] ? { profile: map[row.opponentId], record: row.record } : null;
  return {
    profile: person(db, userId),
    rating: circleRating,
    record: stats.record,
    bestRival: withProfile(stats.best),
    worstRival: withProfile(stats.worst),
    rivalsProvisional: stats.provisional,
    byOpponent: stats.byOpponent
      .filter((row) => map[row.opponentId])
      .map((row) => ({ profile: map[row.opponentId], record: row.record })),
    evolution: stats.evolution,
    recent: stats.recent,
    people: map,
  };
}

export function projectRanking(db: World, userId: string): RankingSnapshot {
  const friends = acceptedFriendIds(db, userId);
  const ids = [userId, ...friends];
  const { qualified, everyone } = rankPlayers(ids, db.matches);
  const map = people(db, ids);
  const youBase = everyone.find((row) => row.playerId === userId);
  const you = youBase && map[userId] ? { ...youBase, profile: map[userId] } : null;
  return {
    rows: qualified
      .filter((row) => map[row.playerId])
      .map((row) => ({ ...row, profile: map[row.playerId] })),
    you,
    qualified: Boolean(youBase && youBase.played >= rules.minMatchesForRanking),
    missing: Math.max(0, rules.minMatchesForRanking - (youBase?.played ?? 0)),
    minMatches: rules.minMatchesForRanking,
  };
}

export function projectGroups(db: World, userId: string): GroupSummary[] {
  return db.groups
    .filter((group) => isMember(db, group.id, userId))
    .map((group) => {
      const memberIds = db.groupMembers.filter((member) => member.groupId === group.id).map((member) => member.userId);
      const matches = db.matches.filter((match) => match.groupId === group.id);
      const ranking = rankPlayers(memberIds, matches).qualified;
      const leaderId = ranking[0]?.playerId;
      const yourPlace = ranking.findIndex((row) => row.playerId === userId);
      return {
        group,
        memberCount: memberIds.length,
        leader: leaderId ? person(db, leaderId) : null,
        yourPlace: yourPlace >= 0 ? yourPlace + 1 : null,
      };
    })
    .sort((a, b) => a.group.name.localeCompare(b.group.name, 'es'));
}

export function projectGroup(db: World, groupId: string, userId: string): GroupSnapshot {
  const group = db.groups.find((item) => item.id === groupId);
  if (!group || !isMember(db, groupId, userId)) {
    throw new DomainError('not_found', 'No encontramos ese grupo.');
  }
  const members = db.groupMembers
    .filter((member) => member.groupId === groupId)
    .map((member) => person(db, member.userId))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
  const memberIds = members.map((member) => member.id);
  const matches = db.matches.filter((match) => match.groupId === groupId);
  const table = standings(memberIds, matches).map((row) => ({ ...row, profile: person(db, row.playerId) }));
  const ranking = rankPlayers(memberIds, matches).qualified.map((row) => ({
    ...row,
    profile: person(db, row.playerId),
  }));
  const role = db.groupMembers.find((member) => member.groupId === groupId && member.userId === userId)?.role ?? 'member';
  return {
    group,
    members,
    yourRole: role,
    table,
    leader: ranking[0]?.profile ?? null,
    matrix: faceMatrix(memberIds, matches),
    recent: matches
      .filter((match) => match.status === 'confirmed')
      .slice()
      .sort(byTime)
      .reverse()
      .slice(0, 8),
    ranking,
    tournaments: db.tournaments
      .filter((tournament) => tournament.groupId === groupId)
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    people: people(db, memberIds),
    minMatches: rules.minMatchesForRanking,
    joinRequests:
      role === 'owner'
        ? (db.groupJoinRequests ?? [])
            .filter((item) => item.groupId === groupId && item.status === 'pending')
            .map((item) => {
              const user = db.users.find((row) => row.id === item.userId);
              return user
                ? { id: item.id, userId: item.userId, createdAt: item.createdAt, profile: toProfile(user) }
                : null;
            })
            .filter((row): row is { id: string; userId: string; createdAt: string; profile: import('./types').Profile } => Boolean(row))
        : [],
  };
}

export function projectTournament(db: World, tournamentId: string, userId: string): TournamentSnapshot {
  const tournament = db.tournaments.find((item) => item.id === tournamentId);
  const registered = (db.tournamentRegistrations ?? []).some((r) => r.tournamentId === tournamentId && r.userId === userId);
  const canSee =
    Boolean(tournament) &&
    (isMember(db, tournament!.groupId, userId) ||
      tournament!.playerIds.includes(userId) ||
      tournament!.createdBy === userId ||
      registered ||
      tournament!.visibility === 'public');
  if (!tournament || !canSee) {
    throw new DomainError('not_found', 'No encontramos ese torneo.');
  }
  const group = tournament.groupId ? db.groups.find((item) => item.id === tournament.groupId) ?? null : null;
  const slots = db.slots
    .filter((slot) => slot.tournamentId === tournament.id)
    .slice()
    .sort((a, b) => a.round - b.round || a.position - b.position);
  const matches = db.matches.filter((match) => match.tournamentId === tournament.id);
  const ids = new Set<string>(tournament.playerIds);
  for (const slot of slots) {
    if (slot.playerAId) ids.add(slot.playerAId);
    if (slot.playerBId) ids.add(slot.playerBId);
  }
  const isOrganizer = tournament.createdBy === userId;
  const profileOf = (userId: string) => {
    const user = db.users.find((row) => row.id === userId);
    return user ? toProfile(user) : null;
  };
  const registrations = (db.tournamentRegistrations ?? [])
    .filter((item) => item.tournamentId === tournament.id)
    .map((item) => {
      const profile = profileOf(item.userId);
      return profile ? { userId: item.userId, registeredAt: item.registeredAt, profile } : null;
    })
    .filter((row): row is { userId: string; registeredAt: string; profile: import('./types').Profile } => Boolean(row));
  for (const id of registrations.map((r) => r.userId)) ids.add(id);
  const joinRequests = isOrganizer
    ? (db.tournamentJoinRequests ?? [])
        .filter((item) => item.tournamentId === tournament.id && item.status === 'pending')
        .map((item) => {
          const profile = profileOf(item.userId);
          return profile ? { id: item.id, userId: item.userId, createdAt: item.createdAt, profile } : null;
        })
        .filter((row): row is { id: string; userId: string; createdAt: string; profile: import('./types').Profile } => Boolean(row))
    : [];
  return {
    tournament,
    group,
    slots,
    matches,
    people: people(db, ids),
    totalRounds: totalRounds(tournament.format, tournament.size ?? tournament.playerIds.length),
    registrations,
    joinRequests,
    isOrganizer,
  };
}

export function visibleFriend(db: World, userId: string, otherId: string): boolean {
  return userId === otherId || areFriends(db, userId, otherId);
}

const DAY = 86400000;

/**
 * Portada del inicio: la estrella, el top, quién más subió, rachas, resultados, torneos y grupos
 * más reñidos. Todo sale de los partidos confirmados que el usuario puede ver (los suyos, los de
 * sus grupos y los de sus amigos), igual que el resto de las pantallas.
 */
export function projectBillboard(db: World, userId: string, now: Date = new Date(), windows: number[] = [7, 30]): BillboardSnapshot {
  const myGroups = db.groups.filter((group) => isMember(db, group.id, userId));
  const circle = new Set<string>([userId, ...acceptedFriendIds(db, userId)]);
  for (const group of myGroups) {
    for (const member of db.groupMembers) if (member.groupId === group.id) circle.add(member.userId);
  }
  const ids = [...circle].filter((id) => db.users.some((user) => user.id === id));
  const visible = db.matches.filter((match) => canSeeMatch(db, userId, match));
  const confirmed = visible.filter((match) => match.status === 'confirmed').slice().sort(byTime);
  const { qualified, everyone } = rankPlayers(ids, visible);
  const replay = replayRatings(confirmed);
  const place = new Map(qualified.map((row, index) => [row.playerId, index + 1]));

  const card = (playerId: string, cutoff: string): BillboardPlayer => {
    const row = everyone.find((item) => item.playerId === playerId);
    const record = summarize(confirmed, playerId);
    const own = confirmed.filter((match) => involves(match, playerId));
    const recent = own.filter((match) => (match.confirmedAt ?? match.createdAt) >= cutoff);
    const windowDelta = replay.history
      .filter((entry) => entry.userId === playerId && entry.at >= cutoff)
      .reduce((sum, entry) => sum + entry.delta, 0);
    return {
      profile: person(db, playerId),
      rating: row?.rating ?? rules.initialRating,
      place: place.get(playerId) ?? null,
      played: record.played,
      wins: record.wins,
      draws: record.draws,
      losses: record.losses,
      winRate: record.winRate,
      streak: record.currentStreak,
      bestWinStreak: record.bestWinStreak,
      windowPlayed: recent.length,
      windowWins: recent.filter((match) => resultOf(match, playerId) === 'win').length,
      windowDelta,
      form: own.slice().reverse().slice(0, 5).map((match) => resultOf(match, playerId)),
    };
  };

  // Ventana: la semana; si en la semana nadie ganó, el mes.
  let windowDays = windows[0] ?? 7;
  let cards: BillboardPlayer[] = [];
  for (const days of windows.length ? windows : [7]) {
    windowDays = days;
    const cutoff = new Date(now.getTime() - days * DAY).toISOString();
    cards = ids.map((id) => card(id, cutoff)).filter((item) => item.played > 0);
    if (cards.some((item) => item.windowWins > 0)) break;
  }
  const byId = new Map(cards.map((item) => [item.profile.id, item]));
  const top = qualified.map((row) => byId.get(row.playerId)).filter((item): item is BillboardPlayer => Boolean(item));
  const weekly = cards
    .filter((item) => item.windowPlayed > 0)
    .sort(
      (a, b) =>
        b.windowWins - a.windowWins ||
        b.windowDelta - a.windowDelta ||
        b.rating - a.rating ||
        a.profile.id.localeCompare(b.profile.id),
    );
  const fallback = top[0] ?? cards.slice().sort((a, b) => b.rating - a.rating || a.profile.id.localeCompare(b.profile.id))[0];
  const star = weekly[0] && weekly[0].windowWins > 0
    ? { player: weekly[0], reason: windowDays <= 7 ? ('week' as const) : ('month' as const) }
    : fallback
      ? { player: fallback, reason: 'top' as const }
      : null;

  // Las estrellas (hasta 5): primero quienes más ganaron en la semana, luego en el mes, luego el ranking.
  // Cada puesto trae los datos de su propia ventana.
  const stars: BillboardSnapshot['stars'] = [];
  const taken = new Set<string>();
  const winners = (days: number) => {
    const cutoff = new Date(now.getTime() - days * DAY).toISOString();
    return ids
      .map((id) => card(id, cutoff))
      .filter((item) => item.played > 0 && item.windowWins > 0)
      .sort(
        (a, b) =>
          b.windowWins - a.windowWins ||
          b.windowDelta - a.windowDelta ||
          b.rating - a.rating ||
          a.profile.id.localeCompare(b.profile.id),
      );
  };
  const take = (list: BillboardPlayer[], reason: 'week' | 'month' | 'top') => {
    for (const player of list) {
      if (stars.length >= 5) return;
      if (taken.has(player.profile.id)) continue;
      taken.add(player.profile.id);
      stars.push({ player, reason });
    }
  };
  take(winners(7), 'week');
  take(winners(30), 'month');
  take(top, 'top');
  take(cards.slice().sort((a, b) => b.rating - a.rating || a.profile.id.localeCompare(b.profile.id)), 'top');

  const movers = cards
    .filter((item) => item.windowDelta > 0)
    .sort((a, b) => b.windowDelta - a.windowDelta || a.profile.id.localeCompare(b.profile.id))
    .slice(0, 3);
  const streaks = cards
    .filter((item) => item.streak.type === 'win' && item.streak.count >= 2)
    .sort((a, b) => b.streak.count - a.streak.count || b.rating - a.rating || a.profile.id.localeCompare(b.profile.id))
    .slice(0, 5);

  const groupName = new Map(db.groups.map((group) => [group.id, group.name]));
  const cupName = new Map(db.tournaments.map((cup) => [cup.id, cup.name]));
  const results = confirmed
    .slice()
    .reverse()
    .slice(0, 4)
    .map((match) => ({
      match,
      label: (match.tournamentId ? cupName.get(match.tournamentId) : null) ?? (match.groupId ? groupName.get(match.groupId) : null) ?? null,
    }));

  const tournaments = db.tournaments
    .filter((cup) => isMember(db, cup.groupId, userId))
    .map((cup) => {
      const games = confirmed.filter((match) => match.tournamentId === cup.id);
      const lastAt = games.length ? (games[games.length - 1].confirmedAt ?? null) : null;
      const table = games.length ? standings(cup.playerIds, games) : [];
      const leaderId = cup.status === 'in_progress' && table[0] && table[0].played > 0 ? table[0].playerId : null;
      const known = (id: string | null) => (id && db.users.some((user) => user.id === id) ? person(db, id) : null);
      return {
        tournament: cup,
        groupName: (cup.groupId ? groupName.get(cup.groupId) : undefined) ?? '',
        played: games.length,
        lastAt,
        leader: known(leaderId),
        champion: known(cup.winnerId),
      };
    })
    .sort(
      (a, b) =>
        Number(b.tournament.status === 'in_progress') - Number(a.tournament.status === 'in_progress') ||
        (b.lastAt ?? b.tournament.createdAt).localeCompare(a.lastAt ?? a.tournament.createdAt) ||
        b.played - a.played,
    )
    .slice(0, 8);

  const rivalries = myGroups
    .map((group) => {
      const memberIds = db.groupMembers.filter((member) => member.groupId === group.id).map((member) => member.userId);
      const ranked = rankPlayers(memberIds, visible.filter((match) => match.groupId === group.id)).qualified;
      const first = ranked[0] ? byId.get(ranked[0].playerId) : undefined;
      const second = ranked[1] ? byId.get(ranked[1].playerId) : undefined;
      if (!first || !second) return null;
      return { group, first, second, gap: Math.abs(ranked[0].rating - ranked[1].rating) };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.gap - b.gap || a.group.name.localeCompare(b.group.name, 'es'))
    .slice(0, 3);

  const peopleIds = new Set<string>(ids);
  for (const { match } of results) {
    peopleIds.add(match.playerAId);
    peopleIds.add(match.playerBId);
  }
  return {
    windowDays,
    star,
    stars,
    top: top.slice(0, 5),
    movers,
    streaks,
    results,
    tournaments,
    rivalries,
    people: people(db, peopleIds),
    minMatches: rules.minMatchesForRanking,
  };
}
