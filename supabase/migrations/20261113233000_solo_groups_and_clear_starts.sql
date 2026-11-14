-- El creador queda como dueño y primer miembro; los amigos son opcionales.
-- set_tournament_access admite borrar starts_at con una bandera explícita (sin coalesce).

create or replace function public.create_group(group_name text, member_ids uuid[])
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  trimmed text := trim(group_name);
  member uuid;
  created uuid;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  if char_length(trimmed) < 3 or char_length(trimmed) > 32 then
    raise exception 'El grupo necesita un nombre de 3 a 32 caracteres.';
  end if;
  for member in
    select distinct id from unnest(coalesce(member_ids, array[]::uuid[])) as id where id <> me
  loop
    if not public.are_friends(me, member) then
      raise exception 'Solo puedes sumar a tus amigos.';
    end if;
  end loop;
  insert into public.groups (name, created_by) values (trimmed, me) returning id into created;
  insert into public.group_members (group_id, user_id, role) values (created, me, 'owner');
  insert into public.group_members (group_id, user_id, role)
  select created, id, 'member'
  from (select distinct id from unnest(coalesce(member_ids, array[]::uuid[])) as id where id <> me) people;
  return created;
end;
$fn$;

revoke all on function public.create_group(text, uuid[]) from public, anon;
grant execute on function public.create_group(text, uuid[]) to authenticated;

drop function if exists public.set_tournament_access(uuid, text, text, int, timestamptz);

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
