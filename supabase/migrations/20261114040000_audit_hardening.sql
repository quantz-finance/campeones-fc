-- Auditoría previa al build 8: endurece RPCs y políticas de grupos y torneos públicos.
-- Solo cambios aditivos o correctivos (create or replace, índices, revoke). No se borra nada.

-- 1) Los cupos no pueden quedar por debajo de los inscritos, y la eliminación solo es de 4, 8 o 16.
--    En eliminación, size sigue a max_players para que el póster y el arranque coincidan.
create or replace function public.set_tournament_access(
  tid uuid,
  new_visibility text,
  new_join_policy text,
  new_max_players int default null,
  new_starts_at timestamptz default null,
  clear_starts boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  cup public.tournaments;
  taken int;
  changing_max boolean;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  if new_visibility not in ('private', 'public') then raise exception 'La visibilidad no es válida.'; end if;
  if new_join_policy not in ('open', 'invite') then raise exception 'La forma de inscribirse no es válida.'; end if;
  select * into cup from public.tournaments where id = tid for update;
  if cup.id is null then raise exception 'No encontramos ese torneo.'; end if;
  if cup.created_by <> me then raise exception 'Solo el organizador puede cambiar el acceso.'; end if;
  changing_max := new_max_players is not null and new_max_players is distinct from cup.max_players;
  if cup.status <> 'registration' and changing_max then
    raise exception 'Los cupos solo se cambian mientras hay inscripciones abiertas.';
  end if;
  if changing_max then
    if cup.format = 'single_elim' and new_max_players not in (4, 8, 16) then
      raise exception 'La eliminación directa es de 4, 8 o 16 jugadores.';
    end if;
    if cup.format = 'round_robin' and (new_max_players < 3 or new_max_players > 16) then
      raise exception 'La liga necesita entre 3 y 16 jugadores.';
    end if;
    select count(*) into taken from public.tournament_registrations where tournament_id = tid;
    if new_max_players < taken then
      raise exception 'Ya hay % inscritos: los cupos no pueden ser menos.', taken;
    end if;
  end if;
  if cup.group_id is null and new_visibility <> 'public' then
    raise exception 'Un torneo sin grupo tiene que ser público.';
  end if;
  update public.tournaments
    set visibility = new_visibility,
        join_policy = new_join_policy,
        max_players = coalesce(new_max_players, max_players),
        size = case
          when changing_max and cup.format = 'single_elim' then new_max_players
          else size
        end,
        starts_at = case
          when clear_starts then null
          when new_starts_at is not null then new_starts_at
          else starts_at
        end
    where id = tid;
end;
$fn$;

revoke all on function public.set_tournament_access(uuid, text, text, int, timestamptz, boolean) from public, anon;
grant execute on function public.set_tournament_access(uuid, text, text, int, timestamptz, boolean) to authenticated;

-- 2) Las solicitudes son solo para torneos con invitación y con cupo libre.
create or replace function public.request_tournament_join(tid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  cup public.tournaments;
  taken int;
  created uuid;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  select * into cup from public.tournaments where id = tid;
  if cup.id is null then raise exception 'No encontramos ese torneo.'; end if;
  if cup.is_demo and not public.sees_demo() then raise exception 'No encontramos ese torneo.'; end if;
  if cup.visibility <> 'public' then raise exception 'Este torneo no acepta solicitudes públicas.'; end if;
  if cup.status <> 'registration' then raise exception 'Las inscripciones de este torneo no están abiertas.'; end if;
  if cup.join_policy = 'open' then raise exception 'Este torneo es de inscripción libre: inscríbete directo.'; end if;
  if exists (select 1 from public.tournament_registrations r where r.tournament_id = tid and r.user_id = me) then
    raise exception 'Ya estás inscrito.';
  end if;
  if exists (select 1 from public.tournament_join_requests r where r.tournament_id = tid and r.user_id = me and r.status = 'pending') then
    raise exception 'Ya pediste inscribirte en este torneo.';
  end if;
  select count(*) into taken from public.tournament_registrations where tournament_id = tid;
  if cup.max_players is not null and taken >= cup.max_players then
    raise exception 'Este torneo ya no tiene cupos.';
  end if;
  insert into public.tournament_join_requests (tournament_id, user_id)
  values (tid, me)
  on conflict (tournament_id, user_id) do update
    set status = 'pending', created_at = now(), decided_at = null, decided_by = null
  returning id into created;
  return created;
end;
$fn$;

create or replace function public.request_group_join(gid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  g public.groups;
  created uuid;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  select * into g from public.groups where id = gid;
  if g.id is null then raise exception 'No encontramos ese grupo.'; end if;
  if g.is_demo and not public.sees_demo() then raise exception 'No encontramos ese grupo.'; end if;
  if g.visibility <> 'public' then raise exception 'Este grupo no acepta solicitudes públicas.'; end if;
  if g.join_policy = 'open' then raise exception 'Este grupo es de entrada libre: únete directo.'; end if;
  if public.is_group_member(gid, me) then raise exception 'Ya estás en este grupo.'; end if;
  if exists (select 1 from public.group_join_requests r where r.group_id = gid and r.user_id = me and r.status = 'pending') then
    raise exception 'Ya pediste unirte a este grupo.';
  end if;
  insert into public.group_join_requests (group_id, user_id)
  values (gid, me)
  on conflict (group_id, user_id) do update
    set status = 'pending', created_at = now(), decided_at = null, decided_by = null
  returning id into created;
  return created;
end;
$fn$;

revoke all on function public.request_tournament_join(uuid), public.request_group_join(uuid) from public, anon;
grant execute on function public.request_tournament_join(uuid), public.request_group_join(uuid) to authenticated;

-- 3) Un patrocinio de lista atado a un grupo o torneo solo se ve si ese grupo o torneo se ve
--    (así un patrocinio de un torneo demo no aparece a quien no ve el mundo demo).
drop policy if exists sponsors_select on public.sponsors;
create policy sponsors_select on public.sponsors
  for select to authenticated
  using (
    (
      placement in ('home', 'groups-list', 'tournaments-list')
      and (
        tournament_id is null
        or public.can_see_sponsored_tournament(tournament_id, (select auth.uid()))
      )
      and (
        group_id is null
        or exists (
          select 1 from public.groups g
          where g.id = sponsors.group_id
            and (g.visibility = 'public' or public.is_group_member(g.id, (select auth.uid())))
            and (not g.is_demo or (select public.sees_demo()))
        )
      )
    )
    or (
      placement = 'group' and group_id is not null and exists (
        select 1 from public.groups g
        where g.id = sponsors.group_id
          and (g.visibility = 'public' or public.is_group_member(g.id, (select auth.uid())))
          and (not g.is_demo or (select public.sees_demo()))
      )
    )
    or (
      placement = 'tournament' and tournament_id is not null
      and public.can_see_sponsored_tournament(tournament_id, (select auth.uid()))
    )
  );

-- 4) Índices de las llaves foráneas decided_by (advisor de rendimiento).
create index if not exists group_join_requests_decided_by on public.group_join_requests (decided_by);
create index if not exists tournament_join_requests_decided_by on public.tournament_join_requests (decided_by);

-- 5) La función del trigger no tiene por qué ser invocable como RPC por anon
--    (los triggers se siguen ejecutando igual; Postgres no revisa EXECUTE al dispararlos).
revoke execute on function public.guard_demo_login_friendship() from public, anon;
