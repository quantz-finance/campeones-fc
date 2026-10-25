-- Datos falsos: si el caller tiene profiles.show_demo = true, el mundo demo (is_demo) es legible
-- (solo lectura) para cualquier cuenta, sin vincularla a usuarios demo. Apagado = no ve nada demo.
create or replace function public.sees_demo() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select show_demo from profiles where id = auth.uid()), false)
$$;
create or replace function public.is_demo_user(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_demo from profiles where id = uid), false)
$$;
create or replace function public.is_demo_match(mid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_demo from matches where id = mid), false)
$$;
create or replace function public.is_demo_group(gid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_demo from groups where id = gid), false)
$$;
create or replace function public.is_demo_tournament(tid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_demo from tournaments where id = tid), false)
$$;
revoke all on function public.sees_demo(), public.is_demo_user(uuid), public.is_demo_match(uuid),
  public.is_demo_group(uuid), public.is_demo_tournament(uuid) from public, anon;
grant execute on function public.sees_demo(), public.is_demo_user(uuid), public.is_demo_match(uuid),
  public.is_demo_group(uuid), public.is_demo_tournament(uuid) to authenticated;

create policy matches_demo_select on public.matches for select to authenticated
  using (is_demo and (select public.sees_demo()));
create policy reports_demo_select on public.match_reports for select to authenticated
  using ((select public.sees_demo()) and public.is_demo_match(match_id));
create policy attestations_demo_select on public.match_attestations for select to authenticated
  using ((select public.sees_demo()) and public.is_demo_match(match_id));
create policy groups_demo_select on public.groups for select to authenticated
  using (is_demo and (select public.sees_demo()));
create policy members_demo_select on public.group_members for select to authenticated
  using ((select public.sees_demo()) and public.is_demo_group(group_id));
create policy tournaments_demo_select on public.tournaments for select to authenticated
  using (is_demo and (select public.sees_demo()));
create policy slots_demo_select on public.tournament_slots for select to authenticated
  using ((select public.sees_demo()) and public.is_demo_tournament(tournament_id));
create policy achievements_demo_select on public.achievements for select to authenticated
  using ((select public.sees_demo()) and public.is_demo_user(user_id));
create policy ratings_demo_select on public.player_ratings for select to authenticated
  using ((select public.sees_demo()) and public.is_demo_user(user_id));
create policy friendships_demo_select on public.friendships for select to authenticated
  using ((select public.sees_demo()) and public.is_demo_user(requester_id) and public.is_demo_user(addressee_id));
