-- Avisos en la app: amistad, retos y resultados quedan sincronizados para los dos lados.
-- Los escriben triggers (nada externo, sin push). Realtime los entrega al instante.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'friend_joined', 'friend_request', 'friend_accepted',
    'match_challenge', 'match_accepted', 'match_declined', 'match_report',
    'match_disputed', 'match_confirmed', 'match_expired'
  )),
  match_id uuid references public.matches (id) on delete cascade,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists notifications_user_recent on public.notifications (user_id, created_at desc);
create index if not exists notifications_actor on public.notifications (actor_id);
create index if not exists notifications_match on public.notifications (match_id);

alter table public.notifications enable row level security;
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
grant select on public.notifications to authenticated;

create or replace function public.push_notice(p_user uuid, p_actor uuid, p_kind text, p_match uuid default null)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_user is null or p_user = p_actor then
    return;
  end if;
  if exists (select 1 from public.profiles where id = p_user and is_demo) then
    return;
  end if;
  insert into public.notifications (user_id, actor_id, kind, match_id) values (p_user, p_actor, p_kind, p_match);
end;
$fn$;

create or replace function public.notify_friendship()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending' then
      perform public.push_notice(new.addressee_id, new.requester_id, 'friend_request');
    elsif new.status = 'accepted' then
      -- Enlace de invitación: el creador (requester) se entera de que su amigo entró.
      perform public.push_notice(new.requester_id, new.addressee_id, 'friend_joined');
    end if;
  elsif new.status = 'accepted' and old.status is distinct from 'accepted' then
    if old.status = 'pending' and old.requester_id = new.requester_id then
      perform public.push_notice(new.requester_id, new.addressee_id, 'friend_accepted');
    else
      perform public.push_notice(new.requester_id, new.addressee_id, 'friend_joined');
    end if;
  end if;
  return null;
end;
$fn$;

drop trigger if exists friendships_notify on public.friendships;
create trigger friendships_notify
  after insert or update of status on public.friendships
  for each row execute function public.notify_friendship();

create or replace function public.notify_match()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  other uuid;
begin
  if tg_op = 'INSERT' then
    if new.status = 'pending_accept' then
      perform public.push_notice(new.player_b_id, new.player_a_id, 'match_challenge', new.id);
    end if;
    return null;
  end if;
  if new.status is not distinct from old.status then
    return null;
  end if;
  other := case when me = new.player_a_id then new.player_b_id when me = new.player_b_id then new.player_a_id else null end;
  if new.status = 'in_progress' and old.status = 'pending_accept' then
    perform public.push_notice(new.player_a_id, new.player_b_id, 'match_accepted', new.id);
  elsif new.status = 'cancelled' and old.status = 'pending_accept' then
    if other is not null then
      perform public.push_notice(other, me, 'match_declined', new.id);
    end if;
  elsif new.status = 'expired' then
    perform public.push_notice(new.player_a_id, new.player_b_id, 'match_expired', new.id);
    perform public.push_notice(new.player_b_id, new.player_a_id, 'match_expired', new.id);
  elsif new.status = 'disputed' then
    if other is not null then
      perform public.push_notice(other, me, 'match_disputed', new.id);
    else
      perform public.push_notice(new.player_a_id, new.player_b_id, 'match_disputed', new.id);
      perform public.push_notice(new.player_b_id, new.player_a_id, 'match_disputed', new.id);
    end if;
  elsif new.status = 'confirmed' then
    if other is not null then
      perform public.push_notice(other, me, 'match_confirmed', new.id);
    else
      perform public.push_notice(new.player_a_id, new.player_b_id, 'match_confirmed', new.id);
      perform public.push_notice(new.player_b_id, new.player_a_id, 'match_confirmed', new.id);
    end if;
  end if;
  return null;
end;
$fn$;

drop trigger if exists matches_notify on public.matches;
create trigger matches_notify
  after insert or update of status on public.matches
  for each row execute function public.notify_match();

-- Primer resultado registrado: al rival le toca confirmar.
create or replace function public.notify_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  m public.matches;
  other uuid;
begin
  select * into m from public.matches where id = new.match_id;
  if m.id is null or m.status not in ('in_progress', 'disputed') then
    return null;
  end if;
  other := case when new.reporter_id = m.player_a_id then m.player_b_id else m.player_a_id end;
  if exists (select 1 from public.match_reports r where r.match_id = m.id and r.reporter_id = other) then
    return null;
  end if;
  perform public.push_notice(other, new.reporter_id, 'match_report', m.id);
  return null;
end;
$fn$;

drop trigger if exists match_reports_notify on public.match_reports;
create trigger match_reports_notify
  after insert on public.match_reports
  for each row execute function public.notify_report();

create or replace function public.mark_notifications_read(ids uuid[] default null)
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  n int;
begin
  update public.notifications
    set read_at = now()
    where user_id = auth.uid() and read_at is null and (ids is null or id = any (ids));
  get diagnostics n = row_count;
  return n;
end;
$fn$;

revoke all on function public.push_notice(uuid, uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.notify_friendship() from public, anon, authenticated;
revoke all on function public.notify_match() from public, anon, authenticated;
revoke all on function public.notify_report() from public, anon, authenticated;
revoke all on function public.mark_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

-- Avisos de amistades ya creadas por enlace en las últimas 48 h (el invitador no se enteró).
insert into public.notifications (user_id, actor_id, kind, created_at)
select f.requester_id, f.addressee_id, 'friend_joined', coalesce(f.responded_at, f.created_at)
from public.friendships f
join public.profiles r on r.id = f.requester_id and not r.is_demo
join public.profiles a on a.id = f.addressee_id and not a.is_demo
where f.status = 'accepted' and f.created_at > now() - interval '48 hours'
  and not exists (select 1 from public.notifications n where n.user_id = f.requester_id and n.actor_id = f.addressee_id and n.kind = 'friend_joined');

do $pub$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when duplicate_object or undefined_object then null;
  end;
end;
$pub$;
