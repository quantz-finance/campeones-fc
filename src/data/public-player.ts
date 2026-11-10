// Ficha pública de un jugador (/jugador/[id]). La arma el cliente (con su mundo visible) o el servidor
// (api/jugador, para quien no tiene cuenta). Solo datos de partidos confirmados y lo que el jugador escribió.
import { trophyCatalog } from '../content/trophies';
import { replayRatings } from '../domain/elo';
import { DomainError } from '../domain/errors';
import { rules } from '../domain/rules';
import { cleanSocialLinks, type SocialLinks } from '../domain/social';
import { rankPlayers, resultOf, summarize } from '../domain/stats';
import { byTime, involves, opponentOf, type AchievementCode, type Outcome } from '../domain/types';
import { isMember } from './mutate';
import type { World } from './types';

export type PublicPerson = { id: string; username: string; displayName: string; avatarKey: string; photoUrl: string | null };

export type PublicPlayer = {
  profile: PublicPerson & { socialLinks: SocialLinks };
  rating: number;
  peak: number;
  place: number | null;
  rankedPlayers: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  winRate: number;
  goalsFor: number;
  goalsAgainst: number;
  bestWinStreak: number;
  streak: { type: Outcome | 'none'; count: number };
  form: Outcome[];
  achievements: { code: AchievementCode; title: string; earnedAt: string }[];
  titles: { id: string; name: string }[];
  groups: { id: string; name: string; photoUrl: string | null }[];
  recent: {
    id: string;
    opponent: PublicPerson | null;
    outcome: Outcome;
    goalsFor: number | null;
    goalsAgainst: number | null;
    delta: number | null;
    at: string;
  }[];
};

function publicPerson(db: World, id: string): PublicPerson | null {
  const user = db.users.find((item) => item.id === id);
  if (!user) return null;
  return { id: user.id, username: user.username, displayName: user.displayName, avatarKey: user.avatarKey, photoUrl: user.photoUrl ?? null };
}

/**
 * @param viewer quién mira (null = espectador sin cuenta). Los grupos solo se muestran si el que mira
 * también es miembro: un espectador no ve nombres de grupos.
 */
export function projectPublicPlayer(db: World, playerId: string, viewer: string | null): PublicPlayer {
  const user = db.users.find((item) => item.id === playerId);
  if (!user) throw new DomainError('not_found', 'No encontramos a ese jugador.');
  const confirmed = db.matches.filter((match) => match.status === 'confirmed' && match.confirmedAt).slice().sort(byTime);
  const mine = confirmed.filter((match) => involves(match, playerId));
  const record = summarize(mine, playerId);
  const replay = replayRatings(confirmed);
  const history = replay.history.filter((row) => row.userId === playerId);
  const rating = replay.ratings[playerId] ?? rules.initialRating;
  const peak = history.reduce((max, row) => Math.max(max, row.rating), rating);
  const ids = [...new Set(confirmed.flatMap((match) => [match.playerAId, match.playerBId]))];
  const { qualified } = rankPlayers(ids, confirmed);
  const index = qualified.findIndex((row) => row.playerId === playerId);
  const newest = mine.slice().reverse();
  const catalog = new Map(trophyCatalog.map((trophy) => [trophy.code, trophy.title]));
  return {
    profile: {
      ...publicPerson(db, playerId)!,
      socialLinks: cleanSocialLinks(user.socialLinks),
    },
    rating,
    peak,
    place: index >= 0 ? index + 1 : null,
    rankedPlayers: qualified.length,
    played: record.played,
    wins: record.wins,
    draws: record.draws,
    losses: record.losses,
    winRate: record.winRate,
    goalsFor: record.goalsFor,
    goalsAgainst: record.goalsAgainst,
    bestWinStreak: record.bestWinStreak,
    streak: record.currentStreak,
    form: newest.slice(0, 5).map((match) => resultOf(match, playerId)),
    achievements: db.achievements
      .filter((item) => item.userId === playerId)
      .slice()
      .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
      .filter((item, i, all) => all.findIndex((other) => other.code === item.code) === i)
      .map((item) => ({ code: item.code, title: catalog.get(item.code) ?? item.code, earnedAt: item.earnedAt })),
    titles: db.tournaments
      .filter((cup) => cup.winnerId === playerId && cup.status === 'completed')
      .map((cup) => ({ id: cup.id, name: cup.name })),
    groups: viewer
      ? db.groups
          .filter((group) => isMember(db, group.id, playerId) && isMember(db, group.id, viewer))
          .map((group) => ({ id: group.id, name: group.name, photoUrl: group.photoUrl ?? null }))
      : [],
    recent: newest.slice(0, 6).map((match) => {
      const aSide = match.playerAId === playerId;
      return {
        id: match.id,
        opponent: publicPerson(db, opponentOf(match, playerId)),
        outcome: resultOf(match, playerId),
        goalsFor: aSide ? match.goalsA : match.goalsB,
        goalsAgainst: aSide ? match.goalsB : match.goalsA,
        delta: replay.history.find((row) => row.matchId === match.id && row.userId === playerId)?.delta ?? null,
        at: match.confirmedAt!,
      };
    }),
  };
}
