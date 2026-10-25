import { buildPendingMatch } from '../domain/match-flow';
import { between, type Match, type ReportDraft } from '../domain/types';
import { rules } from '../domain/rules';
import {
  mutateAccept,
  mutateCreateMatch,
  mutateCreateTournament,
  mutateSubmit,
  stampMissingRatings,
  syncAchievements,
} from './mutate';
import { branding } from '../../config/branding';
import { emptyWorld, type UserAccount, type World } from './types';

export const IDS = {
  andre: 'user_andre',
  vale: 'user_vale',
  mateo: 'user_mateo',
  sofi: 'user_sofi',
  diego: 'user_diego',
  cami: 'user_cami',
  nati: 'user_nati',
  group: 'group_junta',
} as const;

const CREW = [IDS.andre, IDS.vale, IDS.mateo, IDS.sofi, IDS.diego, IDS.cami];

function account(
  id: string,
  username: string,
  displayName: string,
  avatarKey: string,
): UserAccount {
  return {
    id,
    username,
    displayName,
    avatarKey,
    email: `${username}@${branding.demoEmailDomain}`,
  };
}

type ResultSpec = {
  a: string;
  b: string;
  winner: string | null;
  goalsA: number;
  goalsB: number;
  group: boolean;
};

const HISTORY: ResultSpec[] = [
  { a: IDS.andre, b: IDS.vale, winner: IDS.andre, goalsA: 3, goalsB: 1, group: true },
  { a: IDS.vale, b: IDS.mateo, winner: IDS.vale, goalsA: 2, goalsB: 0, group: true },
  { a: IDS.mateo, b: IDS.sofi, winner: IDS.sofi, goalsA: 1, goalsB: 2, group: true },
  { a: IDS.sofi, b: IDS.diego, winner: IDS.diego, goalsA: 0, goalsB: 1, group: true },
  { a: IDS.diego, b: IDS.cami, winner: IDS.cami, goalsA: 1, goalsB: 2, group: true },
  { a: IDS.cami, b: IDS.andre, winner: IDS.andre, goalsA: 0, goalsB: 2, group: true },
  { a: IDS.andre, b: IDS.mateo, winner: IDS.mateo, goalsA: 1, goalsB: 2, group: true },
  { a: IDS.vale, b: IDS.sofi, winner: null, goalsA: 1, goalsB: 1, group: true },
  { a: IDS.mateo, b: IDS.diego, winner: IDS.mateo, goalsA: 3, goalsB: 0, group: true },
  { a: IDS.sofi, b: IDS.cami, winner: IDS.sofi, goalsA: 2, goalsB: 0, group: true },
  { a: IDS.diego, b: IDS.andre, winner: IDS.andre, goalsA: 2, goalsB: 4, group: true },
  { a: IDS.cami, b: IDS.vale, winner: IDS.vale, goalsA: 0, goalsB: 1, group: true },
  { a: IDS.andre, b: IDS.sofi, winner: IDS.sofi, goalsA: 2, goalsB: 3, group: true },
  { a: IDS.vale, b: IDS.diego, winner: IDS.vale, goalsA: 2, goalsB: 0, group: true },
  { a: IDS.mateo, b: IDS.cami, winner: IDS.cami, goalsA: 1, goalsB: 2, group: true },
  { a: IDS.sofi, b: IDS.andre, winner: IDS.andre, goalsA: 0, goalsB: 1, group: true },
  { a: IDS.diego, b: IDS.vale, winner: IDS.diego, goalsA: 2, goalsB: 1, group: true },
  { a: IDS.cami, b: IDS.mateo, winner: IDS.mateo, goalsA: 2, goalsB: 3, group: true },
  { a: IDS.andre, b: IDS.diego, winner: null, goalsA: 0, goalsB: 0, group: true },
  { a: IDS.vale, b: IDS.cami, winner: IDS.vale, goalsA: 4, goalsB: 1, group: true },
  { a: IDS.mateo, b: IDS.andre, winner: IDS.andre, goalsA: 0, goalsB: 2, group: true },
  { a: IDS.sofi, b: IDS.vale, winner: IDS.vale, goalsA: 1, goalsB: 2, group: true },
  { a: IDS.diego, b: IDS.mateo, winner: IDS.diego, goalsA: 1, goalsB: 0, group: true },
  { a: IDS.cami, b: IDS.sofi, winner: null, goalsA: 2, goalsB: 2, group: true },
];

const STREAK: ResultSpec[] = [
  { a: IDS.andre, b: IDS.cami, winner: IDS.andre, goalsA: 2, goalsB: 0, group: true },
  { a: IDS.andre, b: IDS.diego, winner: IDS.andre, goalsA: 3, goalsB: 1, group: true },
  { a: IDS.andre, b: IDS.mateo, winner: IDS.andre, goalsA: 2, goalsB: 0, group: false },
  { a: IDS.andre, b: IDS.sofi, winner: IDS.andre, goalsA: 1, goalsB: 0, group: false },
  { a: IDS.andre, b: IDS.vale, winner: IDS.andre, goalsA: 2, goalsB: 1, group: true },
];

function pushConfirmed(db: World, spec: ResultSpec, when: Date, index: number) {
  const id = `hist_${index}`;
  const draft: ReportDraft = {
    isDraw: spec.winner == null,
    winnerId: spec.winner,
    goalsA: spec.goalsA,
    goalsB: spec.goalsB,
  };
  const match: Match = {
    ...buildPendingMatch(
      {
        id,
        playerAId: spec.a,
        playerBId: spec.b,
        groupId: spec.group ? IDS.group : null,
        ttlMs: rules.acceptTtlMs,
      },
      when,
    ),
    status: 'confirmed',
    winnerId: draft.winnerId,
    isDraw: draft.isDraw,
    goalsA: spec.goalsA,
    goalsB: spec.goalsB,
    acceptedAt: when.toISOString(),
    confirmedAt: when.toISOString(),
  };
  db.matches.push(match);
  const stamp = when.toISOString();
  db.reports.push({ matchId: id, reporterId: spec.a, ...draft, updatedAt: stamp });
  db.reports.push({ matchId: id, reporterId: spec.b, ...draft, updatedAt: stamp });
}

function confirmFixture(
  db: World,
  tournamentId: string,
  a: string,
  b: string,
  winner: string,
  winnerGoals: number,
  loserGoals: number,
  when: Date,
) {
  const match = db.matches.find(
    (item) => item.tournamentId === tournamentId && item.status === 'pending_accept' && between(item, a, b),
  );
  if (!match) throw new Error('La semilla no encontró el cruce del torneo.');
  mutateAccept(db, match.id, match.playerBId, when);
  const aWon = match.playerAId === winner;
  const draft: ReportDraft = {
    isDraw: false,
    winnerId: winner,
    goalsA: aWon ? winnerGoals : loserGoals,
    goalsB: aWon ? loserGoals : winnerGoals,
  };
  mutateSubmit(db, match.id, match.playerAId, draft, when);
  mutateSubmit(db, match.id, match.playerBId, draft, when);
}


// Fotos inventadas del mundo demo (DiceBear Notionists CC0 + escudos propios), en Storage. Ver REGISTRO-PROMPTS.md.
const DEMO_PHOTOS = 'https://ncduberxgrvgbkruhkvr.supabase.co/storage/v1/object/public/photos/demo';
const DEMO_USER_PHOTOS = ["0219793a-6bf8-50f1-b40f-515fa020a13f", "0c47214e-e629-5679-b1a8-5f97806593f8", "0ff3d1b5-7f44-5c98-a081-41d61acb55bf", "17e24e4e-8228-5f7d-a3a6-4cafbc431351", "1ff52c34-1624-5958-9c93-4ecf4933c912", "2025ad15-4f09-54cc-9942-e3cf329e1e85", "379272a2-76c5-5ba0-9514-a68a50509e00", "4895f6c0-71f8-51a8-bad7-4cb6365181da", "4c1e72e8-bacc-5faf-b277-fccc567e001e", "4cc403de-caf8-5563-b361-e4afbd21c463", "54a6e865-cd32-5709-927c-a94f91d91b8e", "58836299-dcd1-5a6f-aabb-8ab1187eb53d"];
const DEMO_GROUP_PHOTOS = ["055d71cd-9d97-531c-ba81-f37ad2ee447a", "1d9a2ea7-3f06-50de-bee6-b93d58337774"];
const DEMO_CUP_PHOTOS = ["0f676ba8-6faf-5196-8b31-e4e3b1b051fa", "4de820ac-add1-55fd-8108-aa014ec3e14d", "5762d60b-df20-55bf-be44-6fbab9071953"];

function withDemoPhotos(db: World): void {
  db.users.forEach((user, i) => {
    const id = DEMO_USER_PHOTOS[i % DEMO_USER_PHOTOS.length];
    user.photoUrl = `${DEMO_PHOTOS}/users/${id}-v1.webp`;
  });
  db.groups.forEach((group, i) => {
    group.photoUrl = `${DEMO_PHOTOS}/groups/${DEMO_GROUP_PHOTOS[i % DEMO_GROUP_PHOTOS.length]}-v1.webp`;
  });
  db.tournaments.forEach((cup, i) => {
    cup.photoUrl = `${DEMO_PHOTOS}/tournaments/${DEMO_CUP_PHOTOS[i % DEMO_CUP_PHOTOS.length]}-v1.webp`;
  });
}

export function buildSeed(now = new Date()): World {
  const db = emptyWorld();
  db.users.push(
    account(IDS.andre, 'andre', 'Andrés Quesada', 'rayo'),
    account(IDS.vale, 'vale', 'Valentina Mora', 'ola'),
    account(IDS.mateo, 'mateo', 'Mateo Solís', 'volcan'),
    account(IDS.sofi, 'sofi', 'Sofía Brenes', 'quetzal'),
    account(IDS.diego, 'diego', 'Diego Chacón', 'estrella'),
    account(IDS.cami, 'cami', 'Camila Rojas', 'luna'),
    account(IDS.nati, 'nati', 'Natalia Vargas', 'fuego'),
  );

  let link = 0;
  for (let left = 0; left < CREW.length; left += 1) {
    for (let right = left + 1; right < CREW.length; right += 1) {
      link += 1;
      db.friendships.push({
        id: `friend_${link}`,
        requesterId: CREW[left],
        addresseeId: CREW[right],
        status: 'accepted',
        createdAt: new Date(now.getTime() - 50 * 86400000).toISOString(),
        respondedAt: new Date(now.getTime() - 50 * 86400000).toISOString(),
      });
    }
  }
  db.friendships.push({
    id: 'friend_nati',
    requesterId: IDS.nati,
    addresseeId: IDS.andre,
    status: 'pending',
    createdAt: new Date(now.getTime() - 3600000).toISOString(),
    respondedAt: null,
  });

  db.groups.push({
    id: IDS.group,
    name: 'La junta del viernes',
    createdBy: IDS.andre,
    createdAt: new Date(now.getTime() - 48 * 86400000).toISOString(),
  });
  for (const userId of CREW) {
    db.groupMembers.push({
      groupId: IDS.group,
      userId,
      role: userId === IDS.andre ? 'owner' : 'member',
      joinedAt: new Date(now.getTime() - 48 * 86400000).toISOString(),
    });
  }
  db.invites.push({
    code: 'junta-andre',
    creatorId: IDS.andre,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + rules.inviteTtlMs).toISOString(),
  });

  let cursor = now.getTime() - 40 * 86400000;
  HISTORY.forEach((spec, index) => {
    pushConfirmed(db, spec, new Date(cursor), index);
    cursor += 86400000;
  });

  const cup = mutateCreateTournament(
    db,
    {
      createdBy: IDS.andre,
      groupId: IDS.group,
      name: 'Copa del barrio',
      format: 'single_elim',
      playerIds: [IDS.andre, IDS.mateo, IDS.vale, IDS.sofi],
    },
    new Date(cursor),
  );
  confirmFixture(db, cup.id, IDS.andre, IDS.mateo, IDS.andre, 2, 0, new Date(cursor + 3600000));
  confirmFixture(db, cup.id, IDS.vale, IDS.sofi, IDS.vale, 1, 0, new Date(cursor + 7200000));
  confirmFixture(db, cup.id, IDS.andre, IDS.vale, IDS.andre, 3, 2, new Date(cursor + 10800000));
  cursor += 2 * 86400000;

  STREAK.forEach((spec, index) => {
    pushConfirmed(db, spec, new Date(cursor), 100 + index);
    cursor += 86400000;
  });

  const disputedAt = new Date(now.getTime() - 3 * 3600000);
  const disputed = mutateCreateMatch(
    db,
    { me: IDS.diego, opponentId: IDS.cami, groupId: IDS.group },
    disputedAt,
  );
  mutateAccept(db, disputed.id, IDS.cami, new Date(disputedAt.getTime() + 600000));
  mutateSubmit(
    db,
    disputed.id,
    IDS.diego,
    { isDraw: false, winnerId: IDS.diego, goalsA: 2, goalsB: 1 },
    new Date(disputedAt.getTime() + 7200000),
  );
  mutateSubmit(
    db,
    disputed.id,
    IDS.cami,
    { isDraw: false, winnerId: IDS.cami, goalsA: 1, goalsB: 2 },
    new Date(disputedAt.getTime() + 7800000),
  );

  mutateCreateMatch(db, { me: IDS.diego, opponentId: IDS.andre }, new Date(now.getTime() - 25 * 60000));

  mutateCreateTournament(
    db,
    {
      createdBy: IDS.vale,
      groupId: IDS.group,
      name: 'Copa relámpago',
      format: 'single_elim',
      playerIds: [IDS.andre, IDS.mateo, IDS.vale, IDS.sofi],
    },
    new Date(now.getTime() - 15 * 60000),
  );

  // Como recompute_ratings(): se repite todo desde 1200 en orden cronológico y cada partido
  // confirmado guarda su rating previo y el cambio Elo (+16 / -16).
  db.matches = db.matches.map(({ ratingABefore, ratingBBefore, ratingDeltaA, ratingDeltaB, ...match }) => match);
  stampMissingRatings(db);
  for (const user of db.users) syncAchievements(db, user.id, now);
  withDemoPhotos(db);
  return db;
}
