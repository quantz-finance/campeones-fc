-- Campeones FC: datos de prueba para grupos y torneos públicos (opción 4).
-- Usa los 50 jugadores de supabase/seed/demo-seed.sql (is_demo / public.demo_seed)
-- y al usuario de prueba 84bc6502-f520-488d-94c9-e0838c4aea99 como dueño y organizador.
-- Idempotente: se puede volver a correr. Limpieza: supabase/seed/public-feature-cleanup.sql.
-- El premio del patrocinio es en especie (una camiseta). No hay marcas de terceros ni dinero.

begin;

create table if not exists public.public_feature_seed (
  kind text not null,
  id uuid not null,
  extra text,
  created_at timestamptz not null default now(),
  primary key (kind, id)
);
alter table public.public_feature_seed enable row level security;
revoke all on public.public_feature_seed from public, anon, authenticated;

-- Limpia una siembra anterior (mismo bloque que public-feature-cleanup.sql).
do $wipe$
declare
  test_user uuid := '84bc6502-f520-488d-94c9-e0838c4aea99';
  prev text;
begin
  if to_regclass('public.public_feature_seed') is null then
    return;
  end if;
  delete from public.sponsors
    where id in (select id from public.public_feature_seed where kind = 'sponsor')
       or tournament_id in (select id from public.public_feature_seed where kind = 'tournament')
       or group_id in (select id from public.public_feature_seed where kind = 'group');
  delete from public.tournament_join_requests
    where id in (select id from public.public_feature_seed where kind = 'request')
       or tournament_id in (select id from public.public_feature_seed where kind = 'tournament');
  delete from public.group_join_requests
    where id in (select id from public.public_feature_seed where kind = 'request')
       or group_id in (select id from public.public_feature_seed where kind = 'group');
  delete from public.tournament_registrations
    where tournament_id in (select id from public.public_feature_seed where kind = 'tournament');
  delete from public.tournament_slots
    where tournament_id in (select id from public.public_feature_seed where kind = 'tournament')
       or id in (select id from public.public_feature_seed where kind = 'slot');
  delete from public.match_reports
    where match_id in (select id from public.public_feature_seed where kind = 'match');
  delete from public.matches
    where id in (select id from public.public_feature_seed where kind = 'match')
       or tournament_id in (select id from public.public_feature_seed where kind = 'tournament');
  delete from public.group_members
    where group_id in (select id from public.public_feature_seed where kind = 'group');
  delete from public.tournaments
    where id in (select id from public.public_feature_seed where kind = 'tournament');
  delete from public.groups
    where id in (select id from public.public_feature_seed where kind = 'group');
  if to_regclass('public.demo_seed') is not null then
    delete from public.demo_seed d
      using public.public_feature_seed s
      where d.id = s.id and d.kind in ('group', 'tournament', 'match');
  end if;
  select extra into prev from public.public_feature_seed
    where kind = 'show_demo_backup' and id = test_user limit 1;
  if prev is not null and exists (select 1 from public.profiles where id = test_user) then
    update public.profiles set show_demo = (prev = 'true') where id = test_user;
  end if;
  delete from public.public_feature_seed;
end
$wipe$;

do $seed$
declare
  test_user uuid := '84bc6502-f520-488d-94c9-e0838c4aea99';
  -- Grupos
  g_open1 uuid := 'cfc10000-2026-4113-a000-000000000001';
  g_open2 uuid := 'cfc10000-2026-4113-a000-000000000002';
  g_invite_mine uuid := 'cfc10000-2026-4113-a000-000000000003';
  g_invite2 uuid := 'cfc10000-2026-4113-a000-000000000004';
  -- Torneos
  t_open uuid := 'cfc20000-2026-4113-a000-000000000001';
  t_invite uuid := 'cfc20000-2026-4113-a000-000000000002';
  t_alive uuid := 'cfc20000-2026-4113-a000-000000000003';
  t_third uuid := 'cfc20000-2026-4113-a000-000000000004';
  t_joinable uuid := 'cfc20000-2026-4113-a000-000000000005';
  spon uuid := 'cfc30000-2026-4113-a000-000000000001';
  prev_demo boolean;
  p uuid[];
  i int;
  rid uuid;
  mid uuid;
  at timestamptz;
  starts timestamptz;
  a uuid;
  b uuid;
  win uuid;
  ga int;
  gb int;
begin
  if to_regclass('public.demo_seed') is null or not exists (select 1 from public.demo_seed where kind = 'user') then
    raise exception 'Primero corre supabase/seed/demo-seed.sql.';
  end if;
  if not exists (select 1 from public.profiles where id = test_user) then
    raise exception 'No está el usuario de prueba.';
  end if;

  select array_agg(x.id order by x.n) into p
  from (
    select pr.id, row_number() over (order by pr.username) as n
    from public.profiles pr
    where pr.is_demo
  ) x;
  if p is null or array_length(p, 1) < 20 then
    raise exception 'Hacen falta al menos 20 jugadores demo.';
  end if;

  select show_demo into prev_demo from public.profiles where id = test_user;
  insert into public.public_feature_seed (kind, id, extra)
  values ('show_demo_backup', test_user, case when prev_demo then 'true' else 'false' end);
  update public.profiles set show_demo = true where id = test_user;

  -- 4 grupos públicos (2 abiertos, 2 con invitación). El de invitación principal lo manda el usuario de prueba.
  insert into public.groups (id, name, created_by, created_at, logo, visibility, join_policy) values
    (g_open1, 'Liga de la 8', p[1], now() - interval '20 days', 'rayo', 'public', 'open'),
    (g_open2, 'Cancha de Hatillo', p[5], now() - interval '12 days', 'tigre', 'public', 'open'),
    (g_invite_mine, 'Club de los jueves', test_user, now() - interval '8 days', 'corona', 'public', 'invite'),
    (g_invite2, 'Veteranos del oeste', p[12], now() - interval '6 days', 'lobo', 'public', 'invite');

  insert into public.demo_seed (kind, id) values
    ('group', g_open1), ('group', g_open2), ('group', g_invite_mine), ('group', g_invite2)
    on conflict do nothing;
  insert into public.public_feature_seed (kind, id) values
    ('group', g_open1), ('group', g_open2), ('group', g_invite_mine), ('group', g_invite2);

  insert into public.group_members (group_id, user_id, role, joined_at)
  select g_open1, p[gs], case when gs = 1 then 'owner' else 'member' end, now() - interval '20 days'
  from generate_series(1, 10) as gs
  on conflict do nothing;

  insert into public.group_members (group_id, user_id, role, joined_at)
  select g_open2, p[gs], case when gs = 5 then 'owner' else 'member' end, now() - interval '12 days'
  from generate_series(5, 14) as gs
  on conflict do nothing;

  insert into public.group_members (group_id, user_id, role, joined_at)
  values (g_invite_mine, test_user, 'owner', now() - interval '8 days')
  on conflict do nothing;
  insert into public.group_members (group_id, user_id, role, joined_at)
  select g_invite_mine, p[gs], 'member', now() - interval '7 days'
  from generate_series(15, 20) as gs
  on conflict do nothing;

  insert into public.group_members (group_id, user_id, role, joined_at)
  select g_invite2, p[gs], case when gs = 12 then 'owner' else 'member' end, now() - interval '6 days'
  from generate_series(12, 18) as gs
  on conflict do nothing;

  -- Solicitudes pendientes al grupo del usuario de prueba (jugadores que no son miembros).
  for i in 21..23 loop
    rid := format('cfc40000-2026-4113-a000-%s', lpad((i - 20)::text, 12, '0'))::uuid;
    insert into public.group_join_requests (id, group_id, user_id, status, created_at)
    values (rid, g_invite_mine, p[i], 'pending', now() - make_interval(hours => i))
    on conflict (group_id, user_id) do update set status = 'pending', decided_at = null, decided_by = null;
    insert into public.public_feature_seed (kind, id) values ('request', rid) on conflict do nothing;
  end loop;

  starts := date_trunc('day', timezone('America/Costa_Rica', now()))::timestamp
            + interval '14 days' + interval '21 hours';
  starts := starts at time zone 'America/Costa_Rica';

  -- Torneo abierto (12/16, fecha futura). Lo organiza un jugador demo; el de prueba está inscrito.
  insert into public.tournaments (
    id, group_id, name, format, size, status, created_by, winner_id, created_at, player_ids,
    logo, visibility, join_policy, starts_at, max_players
  ) values (
    t_open, null, 'Copa relámpago de diciembre', 'single_elim', 16, 'registration', p[1], null,
    now() - interval '4 days', array[]::uuid[], 'copa-grande', 'public', 'open', starts, 16
  );

  -- Invitacional que organiza el usuario de prueba, con solicitudes pendientes.
  insert into public.tournaments (
    id, group_id, name, format, size, status, created_by, winner_id, created_at, player_ids,
    logo, visibility, join_policy, starts_at, max_players
  ) values (
    t_invite, null, 'Invitacional de verano', 'round_robin', null, 'registration', test_user, null,
    now() - interval '3 days', array[]::uuid[], 'laurel', 'public', 'invite', starts + interval '7 days', 8
  );

  -- Eliminación en juego: el usuario de prueba sigue vivo (cuartos aún abiertos para él).
  insert into public.tournaments (
    id, group_id, name, format, size, status, created_by, winner_id, created_at, player_ids,
    logo, visibility, join_policy, starts_at, max_players
  ) values (
    t_alive, null, 'Copa de octavos en juego', 'single_elim', 8, 'in_progress', p[2], null,
    now() - interval '2 days',
    array[test_user, p[1], p[2], p[3], p[4], p[5], p[6], p[7]],
    'copa-asas', 'public', 'open', now() - interval '1 day', 8
  );

  -- Liga en juego: el usuario de prueba va 3º.
  insert into public.tournaments (
    id, group_id, name, format, size, status, created_by, winner_id, created_at, player_ids,
    logo, visibility, join_policy, starts_at, max_players
  ) values (
    t_third, null, 'Liga relámpago de noviembre', 'round_robin', null, 'in_progress', p[8], null,
    now() - interval '5 days',
    array[test_user, p[8], p[9], p[10], p[11]],
    'cinturon', 'public', 'open', now() - interval '4 days', 8
  );

  -- Abierto, el usuario de prueba aún no está: sirve para Inscribirme en la lista pública.
  insert into public.tournaments (
    id, group_id, name, format, size, status, created_by, winner_id, created_at, player_ids,
    logo, visibility, join_policy, starts_at, max_players
  ) values (
    t_joinable, null, 'Copa de barrio', 'round_robin', null, 'registration', p[15], null,
    now() - interval '1 day', array[]::uuid[], 'medalla', 'public', 'open', starts + interval '3 days', 8
  );

  insert into public.demo_seed (kind, id) values
    ('tournament', t_open), ('tournament', t_invite), ('tournament', t_alive), ('tournament', t_third), ('tournament', t_joinable)
    on conflict do nothing;
  insert into public.public_feature_seed (kind, id) values
    ('tournament', t_open), ('tournament', t_invite), ('tournament', t_alive), ('tournament', t_third), ('tournament', t_joinable);

  -- 12 inscritos en la copa abierta (el de prueba + 11 demo).
  insert into public.tournament_registrations (tournament_id, user_id, registered_at)
  values (t_open, test_user, now() - interval '3 days')
  on conflict do nothing;
  insert into public.tournament_registrations (tournament_id, user_id, registered_at)
  select t_open, p[gs], now() - make_interval(days => 3, hours => gs)
  from generate_series(1, 11) as gs
  on conflict do nothing;

  insert into public.tournament_registrations (tournament_id, user_id, registered_at)
  select t_joinable, p[gs], now() - make_interval(hours => gs)
  from generate_series(15, 18) as gs
  on conflict do nothing;

  insert into public.tournament_registrations (tournament_id, user_id, registered_at)
  values (t_invite, test_user, now() - interval '3 days')
  on conflict do nothing;

  for i in 24..26 loop
    rid := format('cfc40000-2026-4113-a000-%s', lpad((10 + (i - 23))::text, 12, '0'))::uuid;
    insert into public.tournament_join_requests (id, tournament_id, user_id, status, created_at)
    values (rid, t_invite, p[i], 'pending', now() - make_interval(hours => i))
    on conflict (tournament_id, user_id) do update set status = 'pending', decided_at = null, decided_by = null;
    insert into public.public_feature_seed (kind, id) values ('request', rid) on conflict do nothing;
  end loop;

  -- Cuadro de 8: el de prueba aún no juega su cuarto; los otros cuartos ya tienen ganador.
  insert into public.tournament_slots (id, tournament_id, round, position, player_a_id, player_b_id, winner_id) values
    ('cfc50000-2026-4113-a000-000000000001', t_alive, 1, 1, test_user, p[1], null),
    ('cfc50000-2026-4113-a000-000000000002', t_alive, 1, 2, p[2], p[3], p[2]),
    ('cfc50000-2026-4113-a000-000000000003', t_alive, 1, 3, p[4], p[5], p[4]),
    ('cfc50000-2026-4113-a000-000000000004', t_alive, 1, 4, p[6], p[7], p[6]),
    ('cfc50000-2026-4113-a000-000000000005', t_alive, 2, 1, null, p[2], null),
    ('cfc50000-2026-4113-a000-000000000006', t_alive, 2, 2, p[4], p[6], null),
    ('cfc50000-2026-4113-a000-000000000007', t_alive, 3, 1, null, null, null)
  on conflict do nothing;
  insert into public.public_feature_seed (kind, id)
  select 'slot', x from unnest(array[
    'cfc50000-2026-4113-a000-000000000001'::uuid,
    'cfc50000-2026-4113-a000-000000000002'::uuid,
    'cfc50000-2026-4113-a000-000000000003'::uuid,
    'cfc50000-2026-4113-a000-000000000004'::uuid,
    'cfc50000-2026-4113-a000-000000000005'::uuid,
    'cfc50000-2026-4113-a000-000000000006'::uuid,
    'cfc50000-2026-4113-a000-000000000007'::uuid
  ]) as x
  on conflict do nothing;

  -- Liga: p[8] 9 pts, p[9] 6 pts, test_user 3 pts (3º), p[10] y p[11] 0.
  -- (p8-p9, p8-p10, p8-p11, p9-p10, p9-p11, me-p11)
  i := 0;
  foreach mid in array array[
    'cfc60000-2026-4113-a000-000000000001'::uuid,
    'cfc60000-2026-4113-a000-000000000002'::uuid,
    'cfc60000-2026-4113-a000-000000000003'::uuid,
    'cfc60000-2026-4113-a000-000000000004'::uuid,
    'cfc60000-2026-4113-a000-000000000005'::uuid,
    'cfc60000-2026-4113-a000-000000000006'::uuid
  ] loop
    i := i + 1;
    if i = 1 then a := p[8]; b := p[9]; win := p[8]; ga := 2; gb := 0;
    elsif i = 2 then a := p[8]; b := p[10]; win := p[8]; ga := 1; gb := 0;
    elsif i = 3 then a := p[8]; b := p[11]; win := p[8]; ga := 3; gb := 1;
    elsif i = 4 then a := p[9]; b := p[10]; win := p[9]; ga := 2; gb := 1;
    elsif i = 5 then a := p[9]; b := p[11]; win := p[9]; ga := 2; gb := 0;
    else a := test_user; b := p[11]; win := test_user; ga := 2; gb := 0;
    end if;
    at := now() - make_interval(days => 4, hours => i);
    insert into public.matches (
      id, player_a_id, player_b_id, status, tournament_id, winner_id, is_draw, goals_a, goals_b,
      created_at, expires_at, accepted_at, confirmed_at
    ) values (
      mid, a, b, 'confirmed', t_third, win, false, ga, gb,
      at - interval '40 minutes', at + interval '12 hours', at - interval '35 minutes', at
    );
    insert into public.match_reports (match_id, reporter_id, winner_id, is_draw, goals_a, goals_b, updated_at)
    values
      (mid, a, win, false, ga, gb, at),
      (mid, b, win, false, ga, gb, at);
    if to_regclass('public.demo_seed') is not null then
      insert into public.demo_seed (kind, id) values ('match', mid) on conflict do nothing;
    end if;
    insert into public.public_feature_seed (kind, id) values ('match', mid) on conflict do nothing;
  end loop;

  insert into public.sponsors (
    id, placement, tournament_id, name, kicker, body, prize, size
  ) values (
    spon, 'tournaments-list', t_open, 'Campeones FC', 'Patrocinio',
    'El premio es una camiseta oficial de Campeones FC.',
    'Camiseta oficial Campeones FC', 'banner'
  );
  insert into public.public_feature_seed (kind, id) values ('sponsor', spon);
end
$seed$;

commit;
