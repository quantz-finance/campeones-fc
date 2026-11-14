-- Rendimiento: la visibilidad de partidos y reportes se calcula UNA vez por consulta.
-- Antes, match_visible(id) (SECURITY DEFINER, no se puede inlinear) corría fila por fila:
-- ~2 s para leer match_reports. La regla es exactamente la misma; solo cambia cómo se evalúa.
-- No borra nada: agrega funciones y cambia el USING de cuatro políticas con ALTER POLICY.
-- Respaldo y vuelta atrás: /workspace/cfc/backups/pre-perf-rls-2026-11-14/policies.sql

-- Ids de partidos que el usuario actual puede ver; misma condición que match_visible():
-- jugó, es del grupo del partido, o es amigo (aceptado) de los dos jugadores.
create or replace function public.visible_match_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  friends as (
    select case when f.requester_id = me.uid then f.addressee_id else f.requester_id end as id
    from public.friendships f, me
    where f.status = 'accepted' and (f.requester_id = me.uid or f.addressee_id = me.uid)
  ),
  my_groups as (
    select gm.group_id from public.group_members gm, me where gm.user_id = me.uid
  )
  select m.id
  from public.matches m, me
  where m.player_a_id = me.uid
     or m.player_b_id = me.uid
     or (m.group_id is not null and m.group_id in (select group_id from my_groups))
     or (m.player_a_id in (select id from friends) and m.player_b_id in (select id from friends));
$$;

-- Ids de partidos demo (lo mismo que is_demo_match(id) = true).
create or replace function public.demo_match_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select m.id from public.matches m where m.is_demo is true;
$$;

revoke all on function public.visible_match_ids() from public, anon;
revoke all on function public.demo_match_ids() from public, anon;
grant execute on function public.visible_match_ids() to authenticated;
grant execute on function public.demo_match_ids() to authenticated;

alter policy matches_select on public.matches
  using (id in (select public.visible_match_ids()));
alter policy reports_select on public.match_reports
  using (match_id in (select public.visible_match_ids()));
alter policy reports_demo_select on public.match_reports
  using ((select public.sees_demo()) and match_id in (select public.demo_match_ids()));
-- matches_demo_select ya era barata (is_demo and (select sees_demo())): queda igual.
