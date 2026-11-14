-- Huella de los datos que ve el usuario: el sondeo de respaldo (cada 30 s) pide ~100 bytes y solo
-- relee el mundo completo (~0,8 MB) cuando la huella cambia. Solo agrega una función; no toca datos.
-- Devuelve únicamente un md5: no expone filas ni conteos.
create or replace function public.data_fingerprint()
returns text
language sql
stable
security definer
set search_path = public
as $$
  with me as (select auth.uid() as uid),
  vis as (
    select id from public.visible_match_ids() as id
    union
    select m.id from public.matches m where m.is_demo is true and public.sees_demo()
  ),
  h as (
    -- Partidos visibles, solo las columnas que usa la app (los datos de la cadena no cuentan).
    select 'matches' as t, md5(coalesce(string_agg(md5(row(
      m.id, m.player_a_id, m.player_b_id, m.status, m.group_id, m.tournament_id, m.tournament_slot_id, m.winner_id,
      m.is_draw, m.goals_a, m.goals_b, m.created_at, m.expires_at, m.accepted_at, m.confirmed_at,
      m.rating_a_before, m.rating_b_before, m.rating_delta_a, m.rating_delta_b, m.chain_status, m.chain_tx, m.chain_network, m.is_demo
    )::text), '' order by m.id), '')) as v
    from public.matches m where m.id in (select id from vis)
    union all
    select 'reports', md5(coalesce(string_agg(md5(r::text), '' order by r.match_id, r.reporter_id), ''))
    from public.match_reports r where r.match_id in (select id from vis)
    union all
    select 'friendships', md5(coalesce(string_agg(md5(f::text), '' order by f.id), ''))
    from public.friendships f, me where f.requester_id = me.uid or f.addressee_id = me.uid
    union all
    select 'invites', md5(coalesce(string_agg(md5(i::text), '' order by md5(i::text)), ''))
    from public.invite_links i, me where i.creator_id = me.uid
    union all
    select 'profiles', md5(coalesce(string_agg(md5(p::text), '' order by p.id), '')) from public.profiles p
    union all
    select 'groups', md5(coalesce(string_agg(md5(g::text), '' order by g.id), '')) from public.groups g
    union all
    select 'members', md5(coalesce(string_agg(md5(x::text), '' order by md5(x::text)), '')) from public.group_members x
    union all
    select 'tournaments', md5(coalesce(string_agg(md5(x::text), '' order by md5(x::text)), '')) from public.tournaments x
    union all
    select 'slots', md5(coalesce(string_agg(md5(x::text), '' order by md5(x::text)), '')) from public.tournament_slots x
    union all
    select 'achievements', md5(coalesce(string_agg(md5(x::text), '' order by md5(x::text)), '')) from public.achievements x
    union all
    select 'group_requests', md5(coalesce(string_agg(md5(x::text), '' order by md5(x::text)), '')) from public.group_join_requests x
    union all
    select 'registrations', md5(coalesce(string_agg(md5(x::text), '' order by md5(x::text)), '')) from public.tournament_registrations x
    union all
    select 'cup_requests', md5(coalesce(string_agg(md5(x::text), '' order by md5(x::text)), '')) from public.tournament_join_requests x
    union all
    select 'sponsors', md5(coalesce(string_agg(md5(x::text), '' order by md5(x::text)), '')) from public.sponsors x
  )
  select md5(string_agg(t || ':' || v, '|' order by t)) from h;
$$;

revoke all on function public.data_fingerprint() from public, anon;
grant execute on function public.data_fingerprint() to authenticated;
