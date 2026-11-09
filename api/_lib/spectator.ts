// Datos para el modo espectador (GET /api/espectador): solo el mundo de ejemplo (is_demo), columnas públicas.
// El filtro va dos veces: en la consulta (is_demo / ids de demo) y otra vez en spectatorWorldFromRows.
import type { RawRows, Row } from '../../src/data/rows';
import { spectatorWorldFromRows } from '../../src/data/spectator';
import type { World } from '../../src/data/types';

export const SPECTATOR_COLUMNS = {
  profiles: 'id,username,display_name,avatar_key,photo_url,is_demo',
  groups: 'id,name,created_by,created_at,photo_url,is_demo',
  tournaments: 'id,group_id,name,format,size,status,created_by,winner_id,created_at,player_ids,photo_url,is_demo',
  matches:
    'id,player_a_id,player_b_id,status,group_id,tournament_id,tournament_slot_id,winner_id,is_draw,goals_a,goals_b,created_at,expires_at,accepted_at,confirmed_at,rating_a_before,rating_b_before,rating_delta_a,rating_delta_b,is_demo',
  group_members: 'group_id,user_id,role,joined_at',
  tournament_slots: 'id,tournament_id,round,position,player_a_id,player_b_id,winner_id,match_id',
  achievements: 'id,user_id,code,earned_at,ref_id',
} as const;

export type SpectatorTable = keyof typeof SPECTATOR_COLUMNS;

/** Lectura mínima: o filas con is_demo = true, o filas cuyo `column` está en `values`. */
export type SpectatorSource = {
  demoRows(table: 'profiles' | 'groups' | 'tournaments' | 'matches', columns: string): Promise<Row[]>;
  rowsIn(table: 'group_members' | 'tournament_slots' | 'achievements', columns: string, column: string, values: string[]): Promise<Row[]>;
};

export function spectatorEnabled(v: string | undefined): boolean {
  return !/^(0|off|false|no)$/i.test((v ?? '').trim());
}

export async function loadSpectatorWorld(source: SpectatorSource): Promise<World> {
  const [profiles, groups, tournaments, matches] = await Promise.all([
    source.demoRows('profiles', SPECTATOR_COLUMNS.profiles),
    source.demoRows('groups', SPECTATOR_COLUMNS.groups),
    source.demoRows('tournaments', SPECTATOR_COLUMNS.tournaments),
    source.demoRows('matches', SPECTATOR_COLUMNS.matches),
  ]);
  const idsOf = (rows: Row[]) => rows.filter((row) => row.is_demo === true).map((row) => String(row.id));
  const [members, slots, achievements] = await Promise.all([
    source.rowsIn('group_members', SPECTATOR_COLUMNS.group_members, 'group_id', idsOf(groups)),
    source.rowsIn('tournament_slots', SPECTATOR_COLUMNS.tournament_slots, 'tournament_id', idsOf(tournaments)),
    source.rowsIn('achievements', SPECTATOR_COLUMNS.achievements, 'user_id', idsOf(profiles)),
  ]);
  const raw: RawRows = { profiles, groups, tournaments, matches, members, slots, achievements };
  return spectatorWorldFromRows(raw);
}
