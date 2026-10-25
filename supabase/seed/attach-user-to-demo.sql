-- Campeones FC: liga a un usuario real con la demo para que sus pantallas no salgan vacías.
-- Requiere haber corrido supabase/seed/demo-seed.sql. Idempotente: correrla dos veces no duplica nada.
-- Lo agrega a "Los del barrio" y "La U", le hace 10 amistades, 14 partidos confirmados en los
-- últimos dos meses, uno esperando su confirmación y uno por aceptar. Todo queda en public.demo_seed
-- y supabase/seed/demo-cleanup.sql lo quita (el usuario real se queda).
--
-- Uso (SQL editor o MCP, como service role):
--   select public.attach_user_to_demo('<user-id>');

create or replace function public.attach_user_to_demo(p_user uuid)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  grp record;
  opp uuid;
  opps uuid[];
  g uuid;
  mid uuid;
  fid uuid;
  i int := 0;
  at timestamptz;
  ga int;
  gb int;
  win uuid;
  draw boolean;
  r double precision;
begin
  if to_regclass('public.demo_seed') is null or not exists (select 1 from public.demo_seed where kind = 'user') then
    raise exception 'Primero corre supabase/seed/demo-seed.sql.';
  end if;
  if not exists (select 1 from public.profiles where id = p_user) then
    raise exception 'No existe un perfil con ese id.';
  end if;
  if exists (select 1 from public.demo_seed where kind = 'user' and id = p_user) then
    raise exception 'Ese usuario es de la demo.';
  end if;
  if exists (select 1 from public.demo_seed where kind = 'attached_user' and id = p_user) then
    return 'Ya estaba ligado a la demo.';
  end if;

  -- Grupos.
  for grp in
    select gr.id from public.groups gr
    join public.demo_seed d on d.kind = 'group' and d.id = gr.id
    where gr.name in ('Los del barrio', 'La U')
  loop
    insert into public.group_members (group_id, user_id, role, joined_at)
    values (grp.id, p_user, 'member', now() - interval '70 days')
    on conflict do nothing;
  end loop;

  -- Rivales: los 10 jugadores demo más activos de esos grupos.
  select array_agg(x.user_id order by x.n desc, x.user_id) into opps
  from (
    select gm.user_id, count(m.id) as n
    from public.group_members gm
    join public.groups gr on gr.id = gm.group_id and gr.name in ('Los del barrio', 'La U')
    join public.demo_seed d on d.kind = 'user' and d.id = gm.user_id
    left join public.matches m on m.status = 'confirmed' and (m.player_a_id = gm.user_id or m.player_b_id = gm.user_id)
    group by gm.user_id
    order by n desc, gm.user_id
    limit 10
  ) x;

  foreach opp in array opps loop
    fid := gen_random_uuid();
    insert into public.friendships (id, requester_id, addressee_id, status, created_at, responded_at)
    values (fid, opp, p_user, 'accepted', now() - interval '68 days', now() - interval '68 days')
    on conflict do nothing;
    if found then
      insert into public.demo_seed (kind, id) values ('friendship', fid);
    end if;
  end loop;

  -- 14 partidos confirmados en los últimos dos meses (con reportes de ambos).
  for i in 0..13 loop
    opp := opps[1 + (i % array_length(opps, 1))];
    select gm.group_id into g from public.group_members gm
      join public.group_members mine on mine.group_id = gm.group_id and mine.user_id = p_user
      where gm.user_id = opp limit 1;
    at := date_trunc('day', now() - make_interval(days => 60 - i * 4)) + interval '1 day' + make_interval(mins => 30 + (i * 37) % 240);
    r := random();
    draw := r < 0.18;
    ga := 1 + floor(random() * 4)::int;
    gb := case when draw then ga else floor(random() * ga)::int end;
    if draw then
      win := null;
    elsif r < 0.62 then
      win := p_user;
    else
      win := opp;
    end if;
    mid := gen_random_uuid();
    insert into public.matches (id, player_a_id, player_b_id, status, group_id, winner_id, is_draw, goals_a, goals_b,
                                created_at, expires_at, accepted_at, confirmed_at)
    values (mid, p_user, opp, 'confirmed', g, win, draw,
            case when win = opp then gb else ga end, case when win = opp then ga else gb end,
            at - interval '40 minutes', at + interval '12 hours', at - interval '35 minutes', at);
    insert into public.match_reports (match_id, reporter_id, winner_id, is_draw, goals_a, goals_b, updated_at)
    select mid, who, win, draw, m.goals_a, m.goals_b, at
    from public.matches m, unnest(array[p_user, opp]) as who where m.id = mid;
    insert into public.demo_seed (kind, id) values ('match', mid);
  end loop;

  -- Uno esperando su confirmación (el rival ya reportó) y uno por aceptar.
  for i in 1..2 loop
    select o into opp from unnest(opps) as o
    where not exists (
      select 1 from public.matches m
      where m.status in ('pending_accept', 'in_progress', 'disputed')
        and least(m.player_a_id, m.player_b_id) = least(o, p_user)
        and greatest(m.player_a_id, m.player_b_id) = greatest(o, p_user)
    )
    order by o desc
    limit 1;
    exit when opp is null;
    select gm.group_id into g from public.group_members gm
      join public.group_members mine on mine.group_id = gm.group_id and mine.user_id = p_user
      where gm.user_id = opp limit 1;
    mid := gen_random_uuid();
    if i = 1 then
      insert into public.matches (id, player_a_id, player_b_id, status, group_id, created_at, expires_at, accepted_at)
      values (mid, opp, p_user, 'in_progress', g, now() - interval '3 hours', now() + interval '9 hours', now() - interval '170 minutes');
      insert into public.match_reports (match_id, reporter_id, winner_id, is_draw, goals_a, goals_b, updated_at)
      values (mid, opp, opp, false, 3, 2, now() - interval '2 hours');
    else
      insert into public.matches (id, player_a_id, player_b_id, status, group_id, created_at, expires_at)
      values (mid, opp, p_user, 'pending_accept', g, now() - interval '20 minutes', now() + interval '11 hours');
    end if;
    insert into public.demo_seed (kind, id) values ('match', mid);
  end loop;

  insert into public.demo_seed (kind, id) values ('attached_user', p_user);
  perform public.recompute_ratings();
  perform public.sync_achievements(p_user);
  return 'Listo: 2 grupos, ' || array_length(opps, 1) || ' amigos, 14 partidos confirmados y 2 pendientes.';
end;
$fn$;

revoke all on function public.attach_user_to_demo(uuid) from public, anon, authenticated;
