// GET /api/jugador?id=<uuid> (público, sin sesión): la ficha pública de un jugador para compartirla.
// Solo datos de partidos confirmados, nombre, @usuario, avatar/foto y las redes que el jugador escribió.
// Nunca correos, billeteras ni nombres de grupos (un espectador no ve grupos).
import { projectPublicPlayer } from '../src/data/public-player';
import { emptyWorld, type UserAccount, type World } from '../src/data/types';
import type { AchievementCode, Match } from '../src/domain/types';
import { adminClient } from './_lib/db';
import { fail, HttpError } from './_lib/http';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MATCH_COLS =
  'id,player_a_id,player_b_id,status,winner_id,is_draw,goals_a,goals_b,created_at,confirmed_at,rating_a_before,rating_b_before,rating_delta_a,rating_delta_b';

type Row = Record<string, any>;
const num = (v: unknown) => (typeof v === 'number' ? v : v == null ? null : Number(v));

function send(res: any, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', status === 200 ? 'public, max-age=0, s-maxage=30, stale-while-revalidate=300' : 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.end(JSON.stringify(body));
}

function toUser(row: Row): UserAccount {
  return {
    id: String(row.id),
    username: String(row.username ?? ''),
    displayName: String(row.display_name ?? ''),
    avatarKey: String(row.avatar_key || 'rayo'),
    photoUrl: row.photo_url ?? null,
    // Sin la migración de redes, la columna no viene y queda vacío.
    socialLinks: row.social_links ?? null,
    email: '',
  };
}

function toMatch(row: Row): Match {
  return {
    id: String(row.id),
    playerAId: String(row.player_a_id),
    playerBId: String(row.player_b_id),
    status: row.status,
    groupId: null,
    tournamentId: null,
    tournamentSlotId: null,
    winnerId: row.winner_id ?? null,
    isDraw: row.is_draw === true,
    goalsA: num(row.goals_a),
    goalsB: num(row.goals_b),
    createdAt: String(row.created_at),
    expiresAt: String(row.created_at),
    acceptedAt: null,
    confirmedAt: row.confirmed_at ?? null,
    ratingABefore: num(row.rating_a_before),
    ratingBBefore: num(row.rating_b_before),
    ratingDeltaA: num(row.rating_delta_a),
    ratingDeltaB: num(row.rating_delta_b),
  };
}

export async function loadPublicPlayer(id: string) {
  const db = adminClient();
  const { data: me, error } = await db.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!me || me.deleted_at) throw new HttpError(404, 'No encontramos a ese jugador.', 'not_found');
  // El mundo de ejemplo y el real no se mezclan: un jugador demo se compara con demos y uno real con reales.
  const demo = me.is_demo === true;
  const [matches, cups, wins] = await Promise.all([
    db.from('matches').select(MATCH_COLS).eq('status', 'confirmed').eq('is_demo', demo).limit(5000),
    db.from('tournaments').select('id,name,status,winner_id').eq('winner_id', id).eq('status', 'completed'),
    db.from('achievements').select('id,code,earned_at,ref_id').eq('user_id', id),
  ]);
  for (const r of [matches, cups, wins]) if (r.error) throw new Error(r.error.message);
  const rows = ((matches.data ?? []) as Row[]).map(toMatch);
  const opponentIds = [...new Set(rows.filter((m) => m.playerAId === id || m.playerBId === id).flatMap((m) => [m.playerAId, m.playerBId]))].filter((x) => x !== id);
  const people = opponentIds.length
    ? await db.from('profiles').select('id,username,display_name,avatar_key,photo_url').in('id', opponentIds.slice(0, 500))
    : { data: [], error: null };
  if (people.error) throw new Error(people.error.message);
  const world: World = emptyWorld();
  world.users = [toUser(me), ...((people.data ?? []) as Row[]).map(toUser)];
  world.matches = rows;
  world.tournaments = ((cups.data ?? []) as Row[]).map((c) => ({
    id: String(c.id),
    groupId: '',
    name: String(c.name),
    format: 'single_elim',
    size: null,
    status: 'completed',
    createdBy: '',
    winnerId: id,
    createdAt: '',
    playerIds: [],
  }));
  world.achievements = ((wins.data ?? []) as Row[]).map((a) => ({
    id: String(a.id),
    userId: id,
    code: a.code as AchievementCode,
    earnedAt: String(a.earned_at),
    refId: a.ref_id ?? null,
  }));
  return projectPublicPlayer(world, id, null);
}

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'method' });
    const id = String(req.query?.id ?? '');
    if (!UUID.test(id)) throw new HttpError(400, 'Ese enlace de jugador no es válido.', 'bad_id');
    return send(res, 200, await loadPublicPlayer(id));
  } catch (e) {
    return fail(res, e, req);
  }
}
