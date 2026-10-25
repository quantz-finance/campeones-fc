-- Campeones FC: borra TODOS los datos de demo sembrados con supabase/seed/demo-seed.sql
-- (y lo que attach-user-to-demo.sql le agregó a usuarios reales). No toca usuarios reales:
-- solo les quita los grupos, amistades, partidos y trofeos de demo, y recalcula el Elo.
begin;

do $cleanup$
declare
  attached uuid;
begin
  if to_regclass('public.demo_seed') is null then
    raise notice 'No hay datos de demo.';
    return;
  end if;

  create temp table _demo_users on commit drop as
    select id from public.demo_seed where kind = 'user';
  create temp table _demo_groups on commit drop as
    select id from public.demo_seed where kind = 'group';
  create temp table _demo_tournaments on commit drop as
    select id from public.demo_seed where kind = 'tournament'
    union select id from public.tournaments where group_id in (select id from _demo_groups);
  create temp table _demo_matches on commit drop as
    select id from public.demo_seed where kind = 'match'
    union select id from public.matches
      where player_a_id in (select id from _demo_users)
         or player_b_id in (select id from _demo_users)
         or group_id in (select id from _demo_groups)
         or tournament_id in (select id from _demo_tournaments);

  delete from public.tournament_slots where tournament_id in (select id from _demo_tournaments);
  delete from public.matches where id in (select id from _demo_matches);
  delete from public.achievements where ref_id in (select id from _demo_tournaments);
  delete from public.tournaments where id in (select id from _demo_tournaments);
  delete from public.groups where id in (select id from _demo_groups);
  delete from public.friendships where id in (select id from public.demo_seed where kind = 'friendship');
  -- Perfil, rating, amistades, miembros y trofeos de los jugadores demo caen en cascada.
  delete from auth.users where id in (select id from _demo_users) and email like '%@demo.campeonesfc.invalid';

  -- Usuarios reales que se ligaron a la demo: se recalculan sus trofeos.
  for attached in select id from public.demo_seed where kind = 'attached_user' loop
    delete from public.achievements where user_id = attached;
    if exists (select 1 from public.profiles where id = attached) then
      perform public.sync_achievements(attached);
    end if;
  end loop;

  perform public.recompute_ratings();
  drop function if exists public.attach_user_to_demo(uuid);
  drop table public.demo_seed;
end
$cleanup$;

commit;
