-- Decisión de Rolando (2026-11-13): los torneos públicos no pertenecen a ningún grupo.
-- visibility = 'public'  ⇒  group_id is null. Un torneo de grupo es siempre privado y en él
-- se inscriben solo los miembros del grupo (libre o con aprobación del organizador).
-- Volverlo público se rechaza (no se desprende del grupo: eso le cambiaría el dueño en silencio).
-- Antes de aplicar no había filas que lo violen (ni reales ni de la semilla). Nada se borra.

alter table public.tournaments drop constraint if exists tournaments_public_no_group;
alter table public.tournaments add constraint tournaments_public_no_group
  check (visibility <> 'public' or group_id is null);

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
  if cup_group_id is not null and cup_visibility = 'public' then
    raise exception 'Un torneo de grupo es privado: para uno público, créalo desde Torneos, fuera del grupo.';
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
  if cup.group_id is not null and new_visibility = 'public' then
    raise exception 'Un torneo de grupo es privado: para uno público, créalo desde Torneos, fuera del grupo.';
  end if;
  if cup.group_id is null and new_visibility <> 'public' then
    raise exception 'Un torneo sin grupo tiene que ser público.';
  end if;
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

-- Inscripción: público y abierto (cualquiera), o de grupo y abierto (solo miembros).
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
  if cup.join_policy <> 'open' then raise exception 'Este torneo no es de inscripción libre.'; end if;
  if cup.group_id is not null then
    if not public.is_group_member(cup.group_id, me) then
      raise exception 'Este torneo es del grupo y no estás dentro.';
    end if;
  elsif cup.visibility <> 'public' then
    raise exception 'Este torneo no es de inscripción libre.';
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

-- Solicitud: público con invitación (cualquiera), o de grupo con invitación (solo miembros).
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
  if cup.group_id is not null then
    if not public.is_group_member(cup.group_id, me) then
      raise exception 'Este torneo es del grupo y no estás dentro.';
    end if;
  elsif cup.visibility <> 'public' then
    raise exception 'Este torneo no acepta solicitudes públicas.';
  end if;
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

revoke all on function
  public.create_registration_tournament(text, text, int, text, text, timestamptz, uuid),
  public.set_tournament_access(uuid, text, text, int, timestamptz, boolean),
  public.register_for_tournament(uuid),
  public.request_tournament_join(uuid)
from public, anon;
grant execute on function
  public.create_registration_tournament(text, text, int, text, text, timestamptz, uuid),
  public.set_tournament_access(uuid, text, text, int, timestamptz, boolean),
  public.register_for_tournament(uuid),
  public.request_tournament_join(uuid)
to authenticated;
