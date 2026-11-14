-- Evita la recursión infinita entre policies de tournaments y tournament_registrations.
-- Las lecturas cruzadas pasan por funciones security definer (no por RLS de la otra tabla).
-- No se borran tablas ni columnas.

create or replace function public.is_tournament_registrant(tid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.tournament_registrations
    where tournament_id = tid and user_id = uid
  );
$$;

create or replace function public.can_see_tournament_regs(tid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = tid
      and (
        t.created_by = uid
        or (t.visibility = 'public' and (not t.is_demo or public.sees_demo()))
        or (t.group_id is not null and public.is_group_member(t.group_id, uid))
      )
  );
$$;

create or replace function public.can_see_sponsored_tournament(tid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.tournaments t
    where t.id = tid
      and (not t.is_demo or public.sees_demo())
      and (
        t.visibility = 'public'
        or t.created_by = uid
        or (t.group_id is not null and public.is_group_member(t.group_id, uid))
        or exists (
          select 1 from public.tournament_registrations r
          where r.tournament_id = t.id and r.user_id = uid
        )
      )
  );
$$;

revoke all on function public.is_tournament_registrant(uuid, uuid), public.can_see_tournament_regs(uuid, uuid), public.can_see_sponsored_tournament(uuid, uuid) from public, anon;
grant execute on function public.is_tournament_registrant(uuid, uuid), public.can_see_tournament_regs(uuid, uuid), public.can_see_sponsored_tournament(uuid, uuid) to authenticated;

drop policy if exists tournaments_registered_select on public.tournaments;
create policy tournaments_registered_select on public.tournaments
  for select to authenticated
  using (public.is_tournament_registrant(id, (select auth.uid())));

drop policy if exists tournament_registrations_select on public.tournament_registrations;
create policy tournament_registrations_select on public.tournament_registrations
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_tournament_organizer(tournament_id, (select auth.uid()))
    or public.can_see_tournament_regs(tournament_id, (select auth.uid()))
  );

drop policy if exists sponsors_select on public.sponsors;
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
      placement = 'tournament' and tournament_id is not null
      and public.can_see_sponsored_tournament(tournament_id, (select auth.uid()))
    )
  );
