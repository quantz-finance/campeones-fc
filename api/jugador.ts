// GET /api/jugador?id=<uuid> (público, sin sesión): la ficha pública de un jugador para compartirla.
// Solo datos de partidos confirmados, nombre, @usuario, avatar/foto y las redes que el jugador escribió.
// Nunca correos, billeteras ni nombres de grupos (un espectador no ve grupos).
import { projectPublicPlayer } from '../src/data/public-player';
import { emptyWorld, type UserAccount, type World } from '../src/data/types';
import { normalizeAchievementCode, type Match } from '../src/domain/types';
import { adminClient } from './_lib/db';
import { fail, HttpError } from './_lib/http';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MATCH_COLS =
  'id,player_a_id,player_b_id,status,winner_id,is_draw,goals_a,goals_b,created_at,confirmed_at,group_id,tournament_id,tournament_slot_id,rating_a_before,rating_b_before,rating_delta_a,rating_delta_b';

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
    groupId: row.group_id ? String(row.group_id) : null,
    tournamentId: row.tournament_id ? String(row.tournament_id) : null,
    tournamentSlotId: row.tournament_slot_id ? String(row.tournament_slot_id) : null,
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
  const [matches, myMemberships, createdGroups, wins] = await Promise.all([
    db.from('matches').select(MATCH_COLS).eq('status', 'confirmed').eq('is_demo', demo).limit(5000),
    db.from('group_members').select('group_id,user_id,role,joined_at').eq('user_id', id),
    db.from('groups').select('id,created_by,created_at,is_demo').eq('created_by', id).eq('is_demo', demo),
    db.from('achievements').select('id,code,earned_at,ref_id').eq('user_id', id),
  ]);
  for (const r of [matches, myMemberships, createdGroups, wins]) if (r.error) throw new Error(r.error.message);
  const rows = ((matches.data ?? []) as Row[]).map(toMatch);
  const myGroupIds = [...new Set(((myMemberships.data ?? []) as Row[]).map((row) => String(row.group_id)))];
  const createdRows = ((createdGroups.data ?? []) as Row[]);
  const groupIds = [...new Set([...myGroupIds, ...createdRows.map((row) => String(row.id))])];
  const matchCupIds = [...new Set(rows.filter((m) => m.playerAId === id || m.playerBId === id).map((m) => m.tournamentId).filter(Boolean))] as string[];

  const [allMembers, groupRows, cups] = await Promise.all([
    groupIds.length
      ? db.from('group_members').select('group_id,user_id,role,joined_at').in('group_id', groupIds)
      : Promise.resolve({ data: myMemberships.data ?? [], error: null }),
    groupIds.length
      ? db.from('groups').select('id,created_by,created_at,is_demo').in('id', groupIds)
      : Promise.resolve({ data: createdRows, error: null }),
    groupIds.length
      ? db.from('tournaments').select('id,group_id,name,format,size,status,winner_id,created_by,created_at,player_ids,is_demo').eq('is_demo', demo).or(`winner_id.eq.${id},group_id.in.(${groupIds.join(',')})`)
      : db.from('tournaments').select('id,group_id,name,format,size,status,winner_id,created_by,created_at,player_ids,is_demo').eq('is_demo', demo).eq('winner_id', id),
  ]);
  for (const r of [allMembers, groupRows, cups]) if (r.error) throw new Error(r.error.message);

  let cupRows = ((cups.data ?? []) as Row[]).filter((c) => c.is_demo === demo);
  const missingCups = matchCupIds.filter((cupId) => !cupRows.some((c) => String(c.id) === cupId));
  if (missingCups.length) {
    const extra = await db.from('tournaments').select('id,group_id,name,format,size,status,winner_id,created_by,created_at,player_ids,is_demo').in('id', missingCups);
    if (extra.error) throw new Error(extra.error.message);
    cupRows = cupRows.concat(((extra.data ?? []) as Row[]).filter((c) => c.is_demo === demo));
  }
  const cupIds = cupRows.map((c) => String(c.id));
  const slotsRes = cupIds.length
    ? await db.from('tournament_slots').select('id,tournament_id,round,position,player_a_id,player_b_id,winner_id,match_id').in('tournament_id', cupIds)
    : { data: [], error: null };
  if (slotsRes.error) throw new Error(slotsRes.error.message);

  const opponentIds = [...new Set(rows.filter((m) => m.playerAId === id || m.playerBId === id).flatMap((m) => [m.playerAId, m.playerBId]))].filter((x) => x !== id);
  const people = opponentIds.length
    ? await db.from('profiles').select('id,username,display_name,avatar_key,photo_url').in('id', opponentIds.slice(0, 500))
    : { data: [], error: null };
  if (people.error) throw new Error(people.error.message);

  const world: World = emptyWorld();
  world.users = [toUser(me), ...((people.data ?? []) as Row[]).map(toUser)];
  world.matches = rows;
  // Nombres de grupo no se cargan: un espectador no los ve (projectPublicPlayer los oculta si viewer es null).
  world.groups = ((groupRows.data ?? createdRows) as Row[]).map((g) => ({
    id: String(g.id),
    name: '',
    createdBy: String(g.created_by),
    createdAt: String(g.created_at ?? ''),
    photoUrl: null,
    logo: null,
  }));
  world.groupMembers = ((allMembers.data ?? []) as Row[]).map((m) => ({
    groupId: String(m.group_id),
    userId: String(m.user_id),
    role: (m.role === 'owner' ? 'owner' : 'member'),
    joinedAt: String(m.joined_at ?? ''),
  }));
  world.tournaments = cupRows.map((c) => ({
    id: String(c.id),
    groupId: String(c.group_id ?? ''),
    name: String(c.name ?? ''),
    format: (c.format ?? 'single_elim') as 'single_elim' | 'round_robin',
    size: typeof c.size === 'number' ? c.size : c.size == null ? null : Number(c.size),
    status: c.status,
    createdBy: String(c.created_by ?? ''),
    winnerId: c.winner_id ?? null,
    createdAt: String(c.created_at ?? ''),
    playerIds: Array.isArray(c.player_ids) ? c.player_ids.map(String) : [],
  }));
  world.slots = ((slotsRes.data ?? []) as Row[]).map((s) => ({
    id: String(s.id),
    tournamentId: String(s.tournament_id),
    round: Number(s.round ?? 1),
    position: Number(s.position ?? 0),
    playerAId: s.player_a_id ?? null,
    playerBId: s.player_b_id ?? null,
    winnerId: s.winner_id ?? null,
    matchId: s.match_id ?? null,
  }));
  world.achievements = ((wins.data ?? []) as Row[]).flatMap((a) => {
    const code = normalizeAchievementCode(String(a.code ?? ''));
    if (!code) return [];
    return [{ id: String(a.id), userId: id, code, earnedAt: String(a.earned_at), refId: a.ref_id ?? null }];
  });
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
