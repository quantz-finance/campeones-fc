-- Grupos y torneos públicos: visibilidad, política de entrada, colas de
-- solicitudes, inscripciones, patrocinios en especie y búsqueda. Solo
-- cambios aditivos (columnas con default, tablas nuevas, políticas y RPCs).
-- El premio de un patrocinio es en especie, nunca dinero.

-- ---------------------------------------------------------------------------
-- Columnas nuevas
-- ---------------------------------------------------------------------------
alter table public.groups
  add column if not exists visibility text not null default 'private',
  add column if not exists join_policy text not null default 'invite';

alter table public.groups drop constraint if exists groups_visibility_check;
alter table public.groups add constraint groups_visibility_check
  check (visibility in ('private', 'public'));
alter table public.groups drop constraint if exists groups_join_policy_check;
alter table public.groups add constraint groups_join_policy_check
  check (join_policy in ('open', 'invite'));

alter table public.tournaments
  add column if not exists visibility text not null default 'private',
  add column if not exists join_policy text not null default 'invite',
  add column if not exists starts_at timestamptz,
  add column if not exists max_players int;

alter table public.tournaments drop constraint if exists tournaments_visibility_check;
alter table public.tournaments add constraint tournaments_visibility_check
  check (visibility in ('private', 'public'));
alter table public.tournaments drop constraint if exists tournaments_join_policy_check;
alter table public.tournaments add constraint tournaments_join_policy_check
  check (join_policy in ('open', 'invite'));
alter table public.tournaments drop constraint if exists tournaments_status_check;
alter table public.tournaments add constraint tournaments_status_check
  check (status in ('registration', 'in_progress', 'completed'));
alter table public.tournaments drop constraint if exists tournaments_max_players_check;
alter table public.tournaments add constraint tournaments_max_players_check
  check (max_players is null or (max_players between 3 and 16));

-- Un torneo público puede existir sin grupo.
alter table public.tournaments alter column group_id drop not null;

-- ---------------------------------------------------------------------------
-- Tablas nuevas
-- ---------------------------------------------------------------------------
create table if not exists public.group_join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id),
  unique (group_id, user_id)
);

create table if not exists public.tournament_registrations (
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  registered_at timestamptz not null default now(),
  primary key (tournament_id, user_id)
);

create table if not exists public.tournament_join_requests (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.profiles (id),
  unique (tournament_id, user_id)
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  placement text not null check (placement in ('home', 'group', 'tournament', 'groups-list', 'tournaments-list')),
  group_id uuid references public.groups (id) on delete cascade,
  tournament_id uuid references public.tournaments (id) on delete cascade,
  name text not null,
  kicker text,
  body text,
  cta text,
  href text,
  image_url text,
  -- Premio en especie (camisetas, trofeo, balón). Nunca dinero.
  prize text,
  size text not null default 'banner' check (size in ('banner', 'tile')),
  created_at timestamptz not null default now(),
  constraint sponsors_group_placement check (
    (placement <> 'group') or (group_id is not null)
  ),
  constraint sponsors_tournament_placement check (
    (placement <> 'tournament') or (tournament_id is not null)
  )
);

create index if not exists group_join_requests_group on public.group_join_requests (group_id, status);
create index if not exists group_join_requests_user on public.group_join_requests (user_id);
create index if not exists tournament_registrations_user on public.tournament_registrations (user_id);
create index if not exists tournament_join_requests_cup on public.tournament_join_requests (tournament_id, status);
create index if not exists tournament_join_requests_user on public.tournament_join_requests (user_id);
create index if not exists sponsors_placement on public.sponsors (placement);
create index if not exists sponsors_group on public.sponsors (group_id);
create index if not exists sponsors_tournament on public.sponsors (tournament_id);
create index if not exists groups_visibility on public.groups (visibility) where visibility = 'public';
create index if not exists tournaments_visibility on public.tournaments (visibility) where visibility = 'public';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_group_owner(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = uid and role = 'owner'
  );
$$;

create or replace function public.is_tournament_organizer(tid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tournaments
    where id = tid and created_by = uid
  );
$$;

revoke all on function public.is_group_owner(uuid, uuid), public.is_tournament_organizer(uuid, uuid) from public, anon;
grant execute on function public.is_group_owner(uuid, uuid), public.is_tournament_organizer(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.group_join_requests enable row level security;
alter table public.tournament_registrations enable row level security;
alter table public.tournament_join_requests enable row level security;
alter table public.sponsors enable row level security;

create policy groups_public_select on public.groups
  for select to authenticated
  using (
    visibility = 'public'
    and (not is_demo or (select public.sees_demo()))
  );

create policy tournaments_public_select on public.tournaments
  for select to authenticated
  using (
    visibility = 'public'
    and (not is_demo or (select public.sees_demo()))
  );

create policy tournaments_organizer_select on public.tournaments
  for select to authenticated
  using (created_by = (select auth.uid()));

create policy tournaments_registered_select on public.tournaments
  for select to authenticated
  using (
    exists (
      select 1 from public.tournament_registrations r
      where r.tournament_id = tournaments.id and r.user_id = (select auth.uid())
    )
  );

create policy group_join_requests_select on public.group_join_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_group_owner(group_id, (select auth.uid()))
  );

create policy tournament_registrations_select on public.tournament_registrations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_tournament_organizer(tournament_id, (select auth.uid()))
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.visibility = 'public'
        and (not t.is_demo or (select public.sees_demo()))
    )
    or exists (
      select 1 from public.tournaments t
      where t.id = tournament_id and t.group_id is not null
        and public.is_group_member(t.group_id, (select auth.uid()))
    )
  );

create policy tournament_join_requests_select on public.tournament_join_requests
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_tournament_organizer(tournament_id, (select auth.uid()))
  );

-- Patrocinios: solo lectura. No se siembran marcas ficticias.
create policy sponsors_select on public.sponsors
  for select to authenticated
  using (
    placement in ('home', 'groups-list', 'tournaments-list')
    or (
      placement = 'group' and group_id is not null and exists (
        select 1 from public.groups g
        where g.id = sponsors.group_id
          and (g.visibility = 'public' or public.is_group_member(g.id, (select auth.uid())))
          and (not g.is_demo or (select public.sees_demo()))
      )
    )
    or (
      placement = 'tournament' and tournament_id is not null and exists (
        select 1 from public.tournaments t
        where t.id = sponsors.tournament_id
          and (
            t.visibility = 'public'
            or t.created_by = (select auth.uid())
            or (t.group_id is not null and public.is_group_member(t.group_id, (select auth.uid())))
            or exists (
              select 1 from public.tournament_registrations r
              where r.tournament_id = t.id and r.user_id = (select auth.uid())
            )
          )
          and (not t.is_demo or (select public.sees_demo()))
      )
    )
  );

grant select on public.group_join_requests, public.tournament_registrations,
  public.tournament_join_requests, public.sponsors to authenticated;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.set_group_access(gid uuid, new_visibility text, new_join_policy text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  if new_visibility not in ('private', 'public') then raise exception 'La visibilidad no es válida.'; end if;
  if new_join_policy not in ('open', 'invite') then raise exception 'La forma de unirse no es válida.'; end if;
  if not public.is_group_owner(gid, me) then raise exception 'Solo quien manda el grupo puede cambiar el acceso.'; end if;
  update public.groups set visibility = new_visibility, join_policy = new_join_policy where id = gid;
end;
$fn$;

create or replace function public.search_public_groups(q text default '')
returns table (
  id uuid,
  name text,
  logo text,
  photo_url text,
  member_count int,
  join_policy text,
  requested boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    g.id,
    g.name,
    g.logo,
    g.photo_url,
    (select count(*)::int from public.group_members m where m.group_id = g.id),
    g.join_policy,
    exists (
      select 1 from public.group_join_requests r
      where r.group_id = g.id and r.user_id = auth.uid() and r.status = 'pending'
    )
  from public.groups g
  where g.visibility = 'public'
    and (not g.is_demo or public.sees_demo())
    and not exists (
      select 1 from public.group_members m
      where m.group_id = g.id and m.user_id = auth.uid()
    )
    and (
      q is null or trim(q) = ''
      or g.name ilike '%' || trim(q) || '%'
    )
  order by g.created_at desc;
$$;

create or replace function public.join_public_group(gid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  g public.groups;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  select * into g from public.groups where id = gid;
  if g.id is null then raise exception 'No encontramos ese grupo.'; end if;
  if g.is_demo and not public.sees_demo() then raise exception 'No encontramos ese grupo.'; end if;
  if g.visibility <> 'public' or g.join_policy <> 'open' then
    raise exception 'Este grupo no es de entrada libre.';
  end if;
  if public.is_group_member(gid, me) then raise exception 'Ya estás en este grupo.'; end if;
  insert into public.group_members (group_id, user_id, role) values (gid, me, 'member');
  delete from public.group_join_requests where group_id = gid and user_id = me;
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

create or replace function public.decide_group_join(request_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  r public.group_join_requests;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  select * into r from public.group_join_requests where id = request_id for update;
  if r.id is null then raise exception 'No está esa solicitud.'; end if;
  if not public.is_group_owner(r.group_id, me) then raise exception 'Solo quien manda el grupo puede decidir.'; end if;
  if r.status <> 'pending' then raise exception 'Esa solicitud ya se resolvió.'; end if;
  update public.group_join_requests
    set status = case when approve then 'approved' else 'rejected' end,
        decided_at = now(),
        decided_by = me
    where id = request_id;
  if approve then
    insert into public.group_members (group_id, user_id, role)
    values (r.group_id, r.user_id, 'member')
    on conflict do nothing;
  end if;
end;
$fn$;

create or replace function public.set_tournament_access(
  tid uuid,
  new_visibility text,
  new_join_policy text,
  new_max_players int default null,
  new_starts_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  cup public.tournaments;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  if new_visibility not in ('private', 'public') then raise exception 'La visibilidad no es válida.'; end if;
  if new_join_policy not in ('open', 'invite') then raise exception 'La forma de inscribirse no es válida.'; end if;
  select * into cup from public.tournaments where id = tid for update;
  if cup.id is null then raise exception 'No encontramos ese torneo.'; end if;
  if cup.created_by <> me then raise exception 'Solo el organizador puede cambiar el acceso.'; end if;
  if cup.status <> 'registration' and (new_max_players is not null and new_max_players is distinct from cup.max_players) then
    raise exception 'Los cupos solo se cambian mientras hay inscripciones abiertas.';
  end if;
  if cup.group_id is null and new_visibility <> 'public' then
    raise exception 'Un torneo sin grupo tiene que ser público.';
  end if;
  update public.tournaments
    set visibility = new_visibility,
        join_policy = new_join_policy,
        max_players = coalesce(new_max_players, max_players),
        starts_at = coalesce(new_starts_at, starts_at)
    where id = tid;
end;
$fn$;

create or replace function public.create_registration_tournament(
  tournament_name text,
  tournament_format text,
  cup_max_players int,
  cup_visibility text default 'public',
  cup_join_policy text default 'open',
  cup_starts_at timestamptz default null,
  cup_group_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  trimmed text := trim(tournament_name);
  created uuid;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  if char_length(trimmed) < 3 or char_length(trimmed) > 40 then
    raise exception 'Ponle un nombre de 3 a 40 caracteres.';
  end if;
  if tournament_format not in ('single_elim', 'round_robin') then
    raise exception 'Elige eliminación o liga.';
  end if;
  if cup_visibility not in ('private', 'public') then raise exception 'La visibilidad no es válida.'; end if;
  if cup_join_policy not in ('open', 'invite') then raise exception 'La forma de inscribirse no es válida.'; end if;
  if cup_group_id is null and cup_visibility <> 'public' then
    raise exception 'Un torneo sin grupo tiene que ser público.';
  end if;
  if cup_group_id is not null then
    if not exists (select 1 from public.groups g where g.id = cup_group_id) then
      raise exception 'No encontramos el grupo.';
    end if;
    if not public.is_group_member(cup_group_id, me) then
      raise exception 'No estás en ese grupo.';
    end if;
  end if;
  if tournament_format = 'single_elim' and cup_max_players not in (4, 8, 16) then
    raise exception 'La eliminación directa es de 4, 8 o 16 jugadores.';
  end if;
  if tournament_format = 'round_robin' and (cup_max_players < 3 or cup_max_players > 16) then
    raise exception 'La liga necesita entre 3 y 16 jugadores.';
  end if;

  insert into public.tournaments (
    group_id, name, format, size, status, created_by, player_ids,
    visibility, join_policy, starts_at, max_players
  ) values (
    cup_group_id, trimmed, tournament_format,
    case when tournament_format = 'single_elim' then cup_max_players else null end,
    'registration', me, array[]::uuid[],
    cup_visibility, cup_join_policy, cup_starts_at, cup_max_players
  ) returning id into created;

  insert into public.tournament_registrations (tournament_id, user_id)
  values (created, me);
  return created;
end;
$fn$;

create or replace function public.search_public_tournaments(q text default '')
returns table (
  id uuid,
  name text,
  logo text,
  photo_url text,
  format text,
  status text,
  visibility text,
  join_policy text,
  starts_at timestamptz,
  max_players int,
  registered_count int,
  group_id uuid,
  group_name text,
  requested boolean,
  registered boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    t.logo,
    t.photo_url,
    t.format,
    t.status,
    t.visibility,
    t.join_policy,
    t.starts_at,
    t.max_players,
    (select count(*)::int from public.tournament_registrations r where r.tournament_id = t.id),
    t.group_id,
    (select g.name from public.groups g where g.id = t.group_id),
    exists (
      select 1 from public.tournament_join_requests r
      where r.tournament_id = t.id and r.user_id = auth.uid() and r.status = 'pending'
    ),
    exists (
      select 1 from public.tournament_registrations r
      where r.tournament_id = t.id and r.user_id = auth.uid()
    )
  from public.tournaments t
  where t.visibility = 'public'
    and (not t.is_demo or public.sees_demo())
    and (
      q is null or trim(q) = ''
      or t.name ilike '%' || trim(q) || '%'
      or exists (select 1 from public.groups g where g.id = t.group_id and g.name ilike '%' || trim(q) || '%')
    )
  order by t.created_at desc;
$$;

create or replace function public.register_for_tournament(tid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  cup public.tournaments;
  taken int;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  select * into cup from public.tournaments where id = tid for update;
  if cup.id is null then raise exception 'No encontramos ese torneo.'; end if;
  if cup.is_demo and not public.sees_demo() then raise exception 'No encontramos ese torneo.'; end if;
  if cup.status <> 'registration' then raise exception 'Las inscripciones de este torneo no están abiertas.'; end if;
  if cup.visibility <> 'public' or cup.join_policy <> 'open' then
    raise exception 'Este torneo no es de inscripción libre.';
  end if;
  if cup.group_id is not null and not public.is_group_member(cup.group_id, me) and cup.visibility <> 'public' then
    raise exception 'Este torneo es del grupo y no estás dentro.';
  end if;
  if exists (select 1 from public.tournament_registrations r where r.tournament_id = tid and r.user_id = me) then
    raise exception 'Ya estás inscrito.';
  end if;
  select count(*) into taken from public.tournament_registrations where tournament_id = tid;
  if cup.max_players is not null and taken >= cup.max_players then
    raise exception 'Este torneo ya no tiene cupos.';
  end if;
  insert into public.tournament_registrations (tournament_id, user_id) values (tid, me);
  delete from public.tournament_join_requests where tournament_id = tid and user_id = me;
end;
$fn$;

create or replace function public.request_tournament_join(tid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  cup public.tournaments;
  created uuid;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  select * into cup from public.tournaments where id = tid;
  if cup.id is null then raise exception 'No encontramos ese torneo.'; end if;
  if cup.is_demo and not public.sees_demo() then raise exception 'No encontramos ese torneo.'; end if;
  if cup.visibility <> 'public' then raise exception 'Este torneo no acepta solicitudes públicas.'; end if;
  if cup.status <> 'registration' then raise exception 'Las inscripciones de este torneo no están abiertas.'; end if;
  if exists (select 1 from public.tournament_registrations r where r.tournament_id = tid and r.user_id = me) then
    raise exception 'Ya estás inscrito.';
  end if;
  if exists (select 1 from public.tournament_join_requests r where r.tournament_id = tid and r.user_id = me and r.status = 'pending') then
    raise exception 'Ya pediste inscribirte en este torneo.';
  end if;
  insert into public.tournament_join_requests (tournament_id, user_id)
  values (tid, me)
  on conflict (tournament_id, user_id) do update
    set status = 'pending', created_at = now(), decided_at = null, decided_by = null
  returning id into created;
  return created;
end;
$fn$;

create or replace function public.decide_tournament_join(request_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  r public.tournament_join_requests;
  cup public.tournaments;
  taken int;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  select * into r from public.tournament_join_requests where id = request_id for update;
  if r.id is null then raise exception 'No está esa solicitud.'; end if;
  if not public.is_tournament_organizer(r.tournament_id, me) then
    raise exception 'Solo el organizador puede decidir.';
  end if;
  if r.status <> 'pending' then raise exception 'Esa solicitud ya se resolvió.'; end if;
  select * into cup from public.tournaments where id = r.tournament_id for update;
  if approve then
    if cup.status <> 'registration' then raise exception 'Las inscripciones de este torneo no están abiertas.'; end if;
    select count(*) into taken from public.tournament_registrations where tournament_id = cup.id;
    if cup.max_players is not null and taken >= cup.max_players then
      raise exception 'Este torneo ya no tiene cupos.';
    end if;
    insert into public.tournament_registrations (tournament_id, user_id)
    values (cup.id, r.user_id)
    on conflict do nothing;
  end if;
  update public.tournament_join_requests
    set status = case when approve then 'approved' else 'rejected' end,
        decided_at = now(),
        decided_by = me
    where id = request_id;
end;
$fn$;

create or replace function public.start_tournament(tid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  cup public.tournaments;
  ids uuid[];
  size int;
  player uuid;
  rounds int;
  round_no int;
  count_slots int;
  pos int;
  pair_pos int := 0;
  slot_id uuid;
  a uuid;
  b uuid;
  rotation uuid[];
  bye uuid := '00000000-0000-0000-0000-000000000000';
  n int;
  half int;
  r int;
  i int;
  fixed uuid;
  rest uuid[];
  last_id uuid;
begin
  if me is null then raise exception 'Tienes que iniciar sesión.'; end if;
  select * into cup from public.tournaments where id = tid for update;
  if cup.id is null then raise exception 'No encontramos ese torneo.'; end if;
  if cup.created_by <> me then raise exception 'Solo el organizador puede empezar el torneo.'; end if;
  if cup.status <> 'registration' then raise exception 'Este torneo ya no está en inscripciones.'; end if;

  select coalesce(array_agg(user_id order by registered_at, user_id), array[]::uuid[])
    into ids
    from public.tournament_registrations
    where tournament_id = tid;
  size := cardinality(ids);
  if (select count(distinct id) from unnest(ids) as id) <> size then
    raise exception 'Un jugador no puede salir dos veces.';
  end if;
  if cup.format = 'single_elim' and size not in (4, 8, 16) then
    raise exception 'Para empezar la eliminación hacen falta 4, 8 o 16 inscritos.';
  end if;
  if cup.format = 'round_robin' and (size < 3 or size > 16) then
    raise exception 'Para empezar la liga hacen falta entre 3 y 16 inscritos.';
  end if;
  if cup.max_players is not null and size <> cup.max_players and cup.format = 'single_elim' then
    raise exception 'Todavía no se llenan los cupos de la eliminación.';
  end if;

  if cup.format = 'single_elim' then
    rounds := case size when 4 then 2 when 8 then 3 else 4 end;
    for round_no in 1..rounds loop
      count_slots := size / (power(2, round_no))::int;
      for pos in 0..count_slots - 1 loop
        if round_no = 1 then
          perform public.assert_no_open(ids[pos * 2 + 1], ids[pos * 2 + 2]);
        end if;
      end loop;
    end loop;
  else
    rotation := ids;
    if cardinality(rotation) % 2 = 1 then
      rotation := rotation || bye;
    end if;
    n := cardinality(rotation);
    half := n / 2;
    for r in 1..n - 1 loop
      for i in 1..half loop
        a := rotation[i];
        b := rotation[n - i + 1];
        if a <> bye and b <> bye then
          perform public.assert_no_open(a, b);
        end if;
      end loop;
      fixed := rotation[1];
      rest := rotation[2:n];
      last_id := rest[cardinality(rest)];
      rest := rest[1:cardinality(rest) - 1];
      rotation := array[fixed, last_id] || rest;
    end loop;
  end if;

  update public.tournaments
    set player_ids = ids,
        status = 'in_progress',
        size = case when cup.format = 'single_elim' then size else cup.size end
    where id = tid;

  if cup.format = 'single_elim' then
    rounds := case size when 4 then 2 when 8 then 3 else 4 end;
    for round_no in 1..rounds loop
      count_slots := size / (power(2, round_no))::int;
      for pos in 0..count_slots - 1 loop
        a := case when round_no = 1 then ids[pos * 2 + 1] else null end;
        b := case when round_no = 1 then ids[pos * 2 + 2] else null end;
        insert into public.tournament_slots (tournament_id, round, position, player_a_id, player_b_id)
        values (tid, round_no, pos, a, b)
        returning id into slot_id;
        if a is not null and b is not null then
          perform public.insert_pending_match(a, b, cup.group_id, tid, slot_id, interval '72 hours');
        end if;
      end loop;
    end loop;
  else
    rotation := ids;
    if cardinality(rotation) % 2 = 1 then
      rotation := rotation || bye;
    end if;
    n := cardinality(rotation);
    half := n / 2;
    for r in 1..n - 1 loop
      for i in 1..half loop
        a := rotation[i];
        b := rotation[n - i + 1];
        if a <> bye and b <> bye then
          insert into public.tournament_slots (tournament_id, round, position, player_a_id, player_b_id)
          values (tid, 1, pair_pos, a, b)
          returning id into slot_id;
          pair_pos := pair_pos + 1;
          perform public.insert_pending_match(a, b, cup.group_id, tid, slot_id, interval '72 hours');
        end if;
      end loop;
      fixed := rotation[1];
      rest := rotation[2:n];
      last_id := rest[cardinality(rest)];
      rest := rest[1:cardinality(rest) - 1];
      rotation := array[fixed, last_id] || rest;
    end loop;
  end if;
end;
$fn$;

revoke all on function
  public.set_group_access(uuid, text, text),
  public.search_public_groups(text),
  public.join_public_group(uuid),
  public.request_group_join(uuid),
  public.decide_group_join(uuid, boolean),
  public.set_tournament_access(uuid, text, text, int, timestamptz),
  public.create_registration_tournament(text, text, int, text, text, timestamptz, uuid),
  public.search_public_tournaments(text),
  public.register_for_tournament(uuid),
  public.request_tournament_join(uuid),
  public.decide_tournament_join(uuid, boolean),
  public.start_tournament(uuid)
from public, anon;

grant execute on function
  public.set_group_access(uuid, text, text),
  public.search_public_groups(text),
  public.join_public_group(uuid),
  public.request_group_join(uuid),
  public.decide_group_join(uuid, boolean),
  public.set_tournament_access(uuid, text, text, int, timestamptz),
  public.create_registration_tournament(text, text, int, text, text, timestamptz, uuid),
  public.search_public_tournaments(text),
  public.register_for_tournament(uuid),
  public.request_tournament_join(uuid),
  public.decide_tournament_join(uuid, boolean),
  public.start_tournament(uuid)
to authenticated;
