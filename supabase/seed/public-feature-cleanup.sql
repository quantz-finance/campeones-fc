-- Campeones FC: quita los datos de supabase/seed/public-feature-seed.sql.
-- No toca la demo de 50 jugadores (demo-seed.sql) ni usuarios reales, salvo
-- restaurar show_demo del usuario de prueba si este seed lo cambió.
-- Idempotente: correrla dos veces no falla.

begin;

do $cleanup$
declare
  test_user uuid := '84bc6502-f520-488d-94c9-e0838c4aea99';
  prev text;
begin
  if to_regclass('public.public_feature_seed') is null then
    raise notice 'No hay siembra de grupos y torneos públicos.';
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

  -- Quita al usuario de prueba de estos grupos; los miembros demo caen con el grupo.
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

  select extra into prev
    from public.public_feature_seed
    where kind = 'show_demo_backup' and id = test_user
    limit 1;
  if prev is not null and exists (select 1 from public.profiles where id = test_user) then
    update public.profiles
      set show_demo = (prev = 'true')
      where id = test_user;
  end if;

  delete from public.public_feature_seed;
end
$cleanup$;

commit;
