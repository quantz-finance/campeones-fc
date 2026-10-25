-- Campeones FC V1. Auth, amistades, partidos con doble confirmación, grupos, torneos y trofeos.
-- Las constantes de tiempo coinciden con src/domain/rules.ts:
--   partido amistoso sin aceptar: 12 horas
--   partido de torneo sin aceptar: 72 horas
--   enlace de invitación: 14 días
--   Elo inicial 1200, K = 32
-- El cliente vuelve a calcular el rating con los partidos que puede ver.
-- player_ratings es solo una caché global en el servidor.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_key text not null default 'rayo',
  created_at timestamptz not null default now(),
  constraint profiles_username_shape check (username ~ '^[a-z0-9_]{3,16}$'),
  constraint profiles_display_name_len check (char_length(display_name) between 2 and 32),
  constraint profiles_avatar check (
    avatar_key in ('rayo', 'ola', 'volcan', 'quetzal', 'estrella', 'luna', 'fuego', 'montana')
  )
);

create table public.player_ratings (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rating double precision not null default 1200,
  updated_at timestamptz not null default now()
);

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester_id <> addressee_id)
);

create unique index friendships_pair
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

create table public.invite_links (
  code text primary key,
  creator_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  constraint groups_name_len check (char_length(name) between 3 and 32)
);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.tournaments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null,
  format text not null check (format in ('single_elim', 'round_robin')),
  size int,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  created_by uuid not null references public.profiles (id),
  winner_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  player_ids uuid[] not null,
  constraint tournaments_name_len check (char_length(name) between 3 and 40)
);

create table public.tournament_slots (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments (id) on delete cascade,
  round int not null,
  position int not null,
  player_a_id uuid references public.profiles (id),
  player_b_id uuid references public.profiles (id),
  winner_id uuid references public.profiles (id),
  match_id uuid,
  unique (tournament_id, round, position)
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  player_a_id uuid not null references public.profiles (id),
  player_b_id uuid not null references public.profiles (id),
  status text not null default 'pending_accept' check (
    status in ('pending_accept', 'in_progress', 'disputed', 'confirmed', 'expired', 'cancelled')
  ),
  group_id uuid references public.groups (id),
  tournament_id uuid references public.tournaments (id),
  tournament_slot_id uuid,
  winner_id uuid references public.profiles (id),
  is_draw boolean not null default false,
  goals_a int,
  goals_b int,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  confirmed_at timestamptz,
  constraint matches_not_self check (player_a_id <> player_b_id),
  constraint matches_goals_pair check (
    (goals_a is null and goals_b is null) or (goals_a is not null and goals_b is not null)
  ),
  constraint matches_goals_range check (
    (goals_a is null or goals_a between 0 and 30)
    and (goals_b is null or goals_b between 0 and 30)
  )
);

alter table public.tournament_slots
  add constraint tournament_slots_match_fk
  foreign key (match_id) references public.matches (id) deferrable initially deferred;

alter table public.matches
  add constraint matches_slot_fk
  foreign key (tournament_slot_id) references public.tournament_slots (id) deferrable initially deferred;

create unique index matches_one_open_pair
  on public.matches (least(player_a_id, player_b_id), greatest(player_a_id, player_b_id))
  where status in ('pending_accept', 'in_progress', 'disputed');

create index matches_players on public.matches (player_a_id, player_b_id);
create index matches_group on public.matches (group_id);
create index matches_pending_expiry on public.matches (expires_at) where status = 'pending_accept';

create table public.match_reports (
  match_id uuid not null references public.matches (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id),
  winner_id uuid references public.profiles (id),
  is_draw boolean not null default false,
  goals_a int,
  goals_b int,
  updated_at timestamptz not null default now(),
  primary key (match_id, reporter_id)
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  code text not null check (code in ('first_win', 'streak_5', 'tournament_champion')),
  earned_at timestamptz not null default now(),
  ref_id uuid,
  unique (user_id, code)
);

-- ---------------------------------------------------------------------------
-- Perfil al registrarse
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  raw text;
  base text;
  chosen text;
  suffix int := 1;
  display text;
begin
  raw := coalesce(
    nullif(new.raw_user_meta_data->>'username', ''),
    split_part(coalesce(new.email, 'jugador@local'), '@', 1)
  );
  base := left(regexp_replace(lower(raw), '[^a-z0-9_]', '', 'g'), 12);
  if char_length(base) < 3 then
    base := 'jugador';
  end if;
  chosen := base;
  while exists (select 1 from public.profiles where username = chosen) loop
    suffix := suffix + 1;
    chosen := left(base || suffix::text, 16);
  end loop;
  display := left(
    coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), initcap(chosen)),
    32
  );
  if char_length(display) < 2 then
    display := 'Jugador';
  end if;
  insert into public.profiles (id, username, display_name, avatar_key)
  values (new.id, chosen, display, 'rayo');
  insert into public.player_ratings (user_id, rating) values (new.id, 1200);
  return new;
end;
$fn$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.validate_profile()
returns trigger
language plpgsql
set search_path = public
as $fn$
begin
  new.display_name := trim(new.display_name);
  new.username := lower(trim(new.username));
  if char_length(new.display_name) < 2 or char_length(new.display_name) > 32 then
    raise exception 'Tu nombre va de 2 a 32 caracteres.';
  end if;
  if new.username !~ '^[a-z0-9_]{3,16}$' then
    raise exception 'El usuario usa de 3 a 16 letras minúsculas, números o _.';
  end if;
  if exists (select 1 from public.profiles where username = new.username and id <> new.id) then
    raise exception 'Ese usuario ya existe.';
  end if;
  if new.avatar_key not in ('rayo', 'ola', 'volcan', 'quetzal', 'estrella', 'luna', 'fuego', 'montana') then
    raise exception 'Elige un avatar de la lista.';
  end if;
  return new;
end;
$fn$;

create trigger profiles_validate
  before update on public.profiles
  for each row execute function public.validate_profile();

-- ---------------------------------------------------------------------------
-- Ayudas internas
-- ---------------------------------------------------------------------------

create or replace function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a)
      )
  );
$fn$;

create or replace function public.is_group_member(p_group uuid, p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group and gm.user_id = p_user
  );
$fn$;

create or replace function public.match_visible(p_match uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.matches m
    where m.id = p_match
      and (
        m.player_a_id = auth.uid()
        or m.player_b_id = auth.uid()
        or (m.group_id is not null and public.is_group_member(m.group_id, auth.uid()))
        or (
          public.are_friends(auth.uid(), m.player_a_id)
          and public.are_friends(auth.uid(), m.player_b_id)
        )
      )
  );
$fn$;

create or replace function public.slot_visible(p_slot uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (
    select 1
    from public.tournament_slots s
    join public.tournaments t on t.id = s.tournament_id
    where s.id = p_slot
      and public.is_group_member(t.group_id, auth.uid())
  );
$fn$;

create or replace function public.assert_no_open(p_a uuid, p_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if exists (
    select 1 from public.matches m
    where m.status in ('pending_accept', 'in_progress', 'disputed')
      and (
        (m.player_a_id = p_a and m.player_b_id = p_b)
        or (m.player_a_id = p_b and m.player_b_id = p_a)
      )
  ) then
    raise exception 'Ya tienen un partido abierto. Ciérrenlo antes de abrir otro.';
  end if;
end;
$fn$;

create or replace function public.make_invite_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  alphabet text := 'abcdefghjkmnpqrstuvwxyz23456789';
  out text := '';
  i int;
begin
  for i in 1..8 loop
    out := out || substr(alphabet, 1 + (floor(random() * length(alphabet)))::int, 1);
  end loop;
  return out;
end;
$fn$;

create or replace function public.insert_pending_match(
  p_a uuid,
  p_b uuid,
  p_group uuid,
  p_tournament uuid,
  p_slot uuid,
  p_ttl interval
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $fn$
declare
  created public.matches;
begin
  insert into public.matches (
    player_a_id, player_b_id, status, group_id, tournament_id, tournament_slot_id,
    winner_id, is_draw, goals_a, goals_b, expires_at
  ) values (
    p_a, p_b, 'pending_accept', p_group, p_tournament, p_slot,
    null, false, null, null, now() + p_ttl
  )
  returning * into created;
  if p_slot is not null then
    update public.tournament_slots
      set match_id = created.id, winner_id = null
      where id = p_slot;
  end if;
  return created;
end;
$fn$;

create or replace function public.best_win_streak(p_user uuid)
returns int
language sql
stable
security definer
set search_path = public
as $fn$
  with ordered as (
    select
      case
        when m.is_draw or m.winner_id is null then 'draw'
        when m.winner_id = p_user then 'win'
        else 'loss'
      end as outcome,
      row_number() over (order by m.confirmed_at, m.id) as rn
    from public.matches m
    where m.status = 'confirmed'
      and m.confirmed_at is not null
      and (m.player_a_id = p_user or m.player_b_id = p_user)
  ),
  grouped as (
    select outcome, rn - row_number() over (partition by outcome order by rn) as grp
    from ordered
  )
  select coalesce(max(cnt), 0)::int
  from (
    select count(*) as cnt
    from grouped
    where outcome = 'win'
    group by grp
  ) streaks;
$fn$;

create or replace function public.apply_rating(p_match public.matches)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  rating_a double precision;
  rating_b double precision;
  expected_a double precision;
  expected_b double precision;
  score_a double precision;
  k double precision := 32;
begin
  if p_match.status <> 'confirmed' then
    return;
  end if;
  insert into public.player_ratings (user_id, rating)
  values (p_match.player_a_id, 1200), (p_match.player_b_id, 1200)
  on conflict (user_id) do nothing;
  select rating into rating_a from public.player_ratings where user_id = p_match.player_a_id;
  select rating into rating_b from public.player_ratings where user_id = p_match.player_b_id;
  expected_a := 1.0 / (1.0 + power(10.0, (rating_b - rating_a) / 400.0));
  expected_b := 1.0 / (1.0 + power(10.0, (rating_a - rating_b) / 400.0));
  if p_match.is_draw then
    score_a := 0.5;
  elsif p_match.winner_id = p_match.player_a_id then
    score_a := 1;
  else
    score_a := 0;
  end if;
  update public.player_ratings
    set rating = rating_a + k * (score_a - expected_a), updated_at = now()
    where user_id = p_match.player_a_id;
  update public.player_ratings
    set rating = rating_b + k * ((1 - score_a) - expected_b), updated_at = now()
    where user_id = p_match.player_b_id;
end;
$fn$;

create or replace function public.sync_achievements(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cup uuid;
begin
  if exists (
    select 1 from public.matches
    where status = 'confirmed' and winner_id = p_user
  ) then
    insert into public.achievements (user_id, code)
    values (p_user, 'first_win')
    on conflict (user_id, code) do nothing;
  end if;
  if public.best_win_streak(p_user) >= 5 then
    insert into public.achievements (user_id, code)
    values (p_user, 'streak_5')
    on conflict (user_id, code) do nothing;
  end if;
  select t.id into cup
  from public.tournaments t
  where t.winner_id = p_user
  order by t.created_at
  limit 1;
  if cup is not null then
    insert into public.achievements (user_id, code, ref_id)
    values (p_user, 'tournament_champion', cup)
    on conflict (user_id, code) do nothing;
  end if;
end;
$fn$;

create or replace function public.tournament_unique_leader(p_tournament uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  best_id uuid;
  best_points int;
  best_gd int;
  best_gf int;
  second_points int;
  second_gd int;
  second_gf int;
  row_count int := 0;
  rec record;
begin
  for rec in
    select
      p.player_id,
      coalesce(sum(
        case
          when m.id is null then 0
          when m.winner_id = p.player_id then 3
          when m.is_draw or m.winner_id is null then 1
          else 0
        end
      ), 0)::int as points,
      coalesce(sum(
        case
          when m.goals_a is null or m.goals_b is null then 0
          when m.player_a_id = p.player_id then m.goals_a - m.goals_b
          else m.goals_b - m.goals_a
        end
      ), 0)::int as gd,
      coalesce(sum(
        case
          when m.goals_a is null or m.goals_b is null then 0
          when m.player_a_id = p.player_id then m.goals_a
          else m.goals_b
        end
      ), 0)::int as gf
    from public.tournaments t
    cross join lateral unnest(t.player_ids) as p(player_id)
    left join public.tournament_slots s on s.tournament_id = t.id
    left join public.matches m
      on m.id = s.match_id
     and m.status = 'confirmed'
     and (m.player_a_id = p.player_id or m.player_b_id = p.player_id)
    where t.id = p_tournament
    group by p.player_id
    order by points desc, gd desc, gf desc, p.player_id
  loop
    row_count := row_count + 1;
    if row_count = 1 then
      best_id := rec.player_id;
      best_points := rec.points;
      best_gd := rec.gd;
      best_gf := rec.gf;
    elsif row_count = 2 then
      second_points := rec.points;
      second_gd := rec.gd;
      second_gf := rec.gf;
      exit;
    end if;
  end loop;
  if best_id is null then
    return null;
  end if;
  if row_count >= 2
     and second_points = best_points
     and second_gd = best_gd
     and second_gf = best_gf then
    return null;
  end if;
  return best_id;
end;
$fn$;

create or replace function public.advance_tournament(p_match public.matches)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  cup public.tournaments;
  slot public.tournament_slots;
  nxt public.tournament_slots;
  rounds int;
  all_done boolean;
  fresh public.matches;
begin
  if p_match.tournament_id is null or p_match.tournament_slot_id is null or p_match.status <> 'confirmed' then
    return;
  end if;
  select * into cup from public.tournaments where id = p_match.tournament_id;
  select * into slot from public.tournament_slots where id = p_match.tournament_slot_id;
  if cup.id is null or slot.id is null or cup.status = 'completed' then
    return;
  end if;
  if not p_match.is_draw and p_match.winner_id is not null then
    update public.tournament_slots set winner_id = p_match.winner_id where id = slot.id;
  end if;

  if cup.format = 'single_elim' then
    if p_match.is_draw or p_match.winner_id is null then
      return;
    end if;
    rounds := case coalesce(cup.size, cardinality(cup.player_ids))
      when 4 then 2
      when 8 then 3
      when 16 then 4
      else 1
    end;
    if slot.round >= rounds then
      update public.tournaments
        set status = 'completed', winner_id = p_match.winner_id
        where id = cup.id;
      return;
    end if;
    select * into nxt
    from public.tournament_slots
    where tournament_id = cup.id
      and round = slot.round + 1
      and position = floor(slot.position / 2.0)::int;
    if nxt.id is null then
      return;
    end if;
    if slot.position % 2 = 0 then
      update public.tournament_slots set player_a_id = p_match.winner_id where id = nxt.id;
      nxt.player_a_id := p_match.winner_id;
    else
      update public.tournament_slots set player_b_id = p_match.winner_id where id = nxt.id;
      nxt.player_b_id := p_match.winner_id;
    end if;
    if nxt.player_a_id is not null and nxt.player_b_id is not null and nxt.match_id is null then
      if not exists (
        select 1 from public.matches m
        where m.status in ('pending_accept', 'in_progress', 'disputed')
          and (
            (m.player_a_id = nxt.player_a_id and m.player_b_id = nxt.player_b_id)
            or (m.player_a_id = nxt.player_b_id and m.player_b_id = nxt.player_a_id)
          )
      ) then
        fresh := public.insert_pending_match(
          nxt.player_a_id, nxt.player_b_id, cup.group_id, cup.id, nxt.id, interval '72 hours'
        );
      end if;
    end if;
    return;
  end if;

  select bool_and(m.status = 'confirmed')
    into all_done
  from public.tournament_slots s
  left join public.matches m on m.id = s.match_id
  where s.tournament_id = cup.id;
  if coalesce(all_done, false) then
    update public.tournaments
      set status = 'completed', winner_id = public.tournament_unique_leader(cup.id)
      where id = cup.id;
  end if;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- RPC que usa el cliente
-- ---------------------------------------------------------------------------

create or replace function public.send_friend_request(target_username text)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  target public.profiles;
  existing public.friendships;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  select * into target from public.profiles where username = lower(trim(target_username));
  if target.id is null then
    raise exception 'No hay un jugador con ese usuario.';
  end if;
  if target.id = me then
    raise exception 'Ese usuario eres tú.';
  end if;
  select * into existing
  from public.friendships
  where least(requester_id, addressee_id) = least(me, target.id)
    and greatest(requester_id, addressee_id) = greatest(me, target.id);
  if existing.status = 'accepted' then
    raise exception 'Ya son amigos.';
  end if;
  if existing.status = 'pending' then
    if existing.addressee_id = me then
      update public.friendships
        set status = 'accepted', responded_at = now()
        where id = existing.id;
      return;
    end if;
    raise exception 'Ya enviaste esa invitación.';
  end if;
  if existing.status = 'rejected' then
    update public.friendships
      set requester_id = me, addressee_id = target.id, status = 'pending',
          created_at = now(), responded_at = null
      where id = existing.id;
    return;
  end if;
  insert into public.friendships (requester_id, addressee_id, status)
  values (me, target.id, 'pending');
end;
$fn$;

create or replace function public.respond_friend_request(friendship_id uuid, accept boolean)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  row public.friendships;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  select * into row from public.friendships where id = friendship_id for update;
  if row.id is null then
    raise exception 'No está esa invitación.';
  end if;
  if row.addressee_id <> me then
    raise exception 'Esa invitación no es tuya.';
  end if;
  if row.status <> 'pending' then
    raise exception 'Esa invitación ya fue respondida.';
  end if;
  update public.friendships
    set status = case when accept then 'accepted' else 'rejected' end,
        responded_at = now()
    where id = row.id;
end;
$fn$;

create or replace function public.create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  existing text;
  code text;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  select invite_links.code into existing
  from public.invite_links
  where creator_id = me and expires_at > now()
  order by created_at desc
  limit 1;
  if existing is not null then
    return existing;
  end if;
  code := public.make_invite_code();
  while exists (select 1 from public.invite_links where invite_links.code = code) loop
    code := public.make_invite_code();
  end loop;
  insert into public.invite_links (code, creator_id, expires_at)
  values (code, me, now() + interval '14 days');
  return code;
end;
$fn$;

create or replace function public.redeem_invite(invite_code text)
returns text
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  invite public.invite_links;
  existing public.friendships;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  select * into invite
  from public.invite_links
  where lower(code) = lower(trim(invite_code));
  if invite.code is null or invite.expires_at <= now() then
    raise exception 'Ese enlace no sirve o ya venció.';
  end if;
  if invite.creator_id = me then
    raise exception 'Ese enlace es tuyo. Compártelo con quien quieres retar.';
  end if;
  if public.are_friends(me, invite.creator_id) then
    return 'already';
  end if;
  select * into existing
  from public.friendships
  where least(requester_id, addressee_id) = least(me, invite.creator_id)
    and greatest(requester_id, addressee_id) = greatest(me, invite.creator_id);
  if existing.id is not null then
    update public.friendships
      set requester_id = invite.creator_id,
          addressee_id = me,
          status = 'accepted',
          responded_at = now()
      where id = existing.id;
    return 'friends';
  end if;
  insert into public.friendships (requester_id, addressee_id, status, responded_at)
  values (invite.creator_id, me, 'accepted', now());
  return 'friends';
end;
$fn$;

create or replace function public.create_match(opponent_id uuid, group_id uuid default null)
returns public.matches
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  if me = opponent_id then
    raise exception 'No puedes jugar contra ti.';
  end if;
  if not exists (select 1 from public.profiles where id = opponent_id) then
    raise exception 'No encontramos a ese jugador.';
  end if;
  if not public.are_friends(me, opponent_id) then
    raise exception 'Solo puedes proponer un partido a un amigo.';
  end if;
  if group_id is not null then
    if not public.is_group_member(group_id, me) or not public.is_group_member(group_id, opponent_id) then
      raise exception 'Los dos tienen que estar en el grupo.';
    end if;
  end if;
  perform public.assert_no_open(me, opponent_id);
  return public.insert_pending_match(me, opponent_id, group_id, null, null, interval '12 hours');
end;
$fn$;

create or replace function public.touch_expiry(p_match public.matches)
returns public.matches
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if p_match.status = 'pending_accept' and p_match.expires_at <= now() then
    update public.matches set status = 'expired' where id = p_match.id;
    p_match.status := 'expired';
  end if;
  return p_match;
end;
$fn$;

create or replace function public.accept_match(match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  row public.matches;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  select * into row from public.matches where id = match_id for update;
  if row.id is null then
    raise exception 'No está ese partido.';
  end if;
  row := public.touch_expiry(row);
  if row.status = 'expired' then
    raise exception 'Este partido expiró sin que lo aceptaran.';
  end if;
  if row.status <> 'pending_accept' then
    raise exception 'Este partido ya no está para aceptar.';
  end if;
  if me <> row.player_b_id then
    raise exception 'Solo tu rival puede aceptar el partido.';
  end if;
  update public.matches
    set status = 'in_progress', accepted_at = now()
    where id = row.id
    returning * into row;
  return row;
end;
$fn$;

create or replace function public.decline_match(match_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  row public.matches;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  select * into row from public.matches where id = match_id for update;
  if row.id is null then
    raise exception 'No está ese partido.';
  end if;
  row := public.touch_expiry(row);
  if row.status = 'expired' then
    raise exception 'Este partido ya expiró.';
  end if;
  if row.status <> 'pending_accept' then
    raise exception 'Este partido ya no se puede cancelar.';
  end if;
  if me <> row.player_a_id and me <> row.player_b_id then
    raise exception 'No juegas este partido.';
  end if;
  update public.matches set status = 'cancelled' where id = row.id returning * into row;
  return row;
end;
$fn$;

create or replace function public.submit_match_report(
  match_id uuid,
  is_draw boolean,
  winner_id uuid,
  goals_a int,
  goals_b int
)
returns public.matches
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  row public.matches;
  previous text;
  cup_format text;
  allow_draw boolean;
  from_a public.match_reports;
  from_b public.match_reports;
  agree boolean;
  scored_a boolean;
  scored_b boolean;
  final_goals_a int;
  final_goals_b int;
  final_winner uuid;
  final_draw boolean;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  select * into row from public.matches where id = match_id for update;
  if row.id is null then
    raise exception 'No está ese partido.';
  end if;
  row := public.touch_expiry(row);
  if row.status = 'expired' then
    raise exception 'Este partido expiró.';
  end if;
  if row.status = 'confirmed' then
    raise exception 'Ese resultado ya quedó confirmado.';
  end if;
  if me <> row.player_a_id and me <> row.player_b_id then
    raise exception 'No juegas este partido.';
  end if;
  if row.status <> 'in_progress' and row.status <> 'disputed' then
    raise exception 'Este partido no está esperando un resultado.';
  end if;

  select t.format into cup_format from public.tournaments t where t.id = row.tournament_id;
  allow_draw := cup_format is distinct from 'single_elim';
  if is_draw then
    if not allow_draw then
      raise exception 'En eliminación directa el partido no puede terminar en empate. Pónganse de acuerdo en un ganador.';
    end if;
    winner_id := null;
  elsif winner_id is distinct from row.player_a_id and winner_id is distinct from row.player_b_id then
    raise exception 'Elige un ganador o marca empate.';
  end if;
  if (goals_a is null) <> (goals_b is null) then
    raise exception 'Si anotas goles, completa los dos.';
  end if;
  if goals_a is not null then
    if goals_a < 0 or goals_b < 0 or goals_a > 30 or goals_b > 30 then
      raise exception 'Los goles van de 0 a 30.';
    end if;
    if is_draw and goals_a <> goals_b then
      raise exception 'En un empate los goles tienen que ser iguales.';
    end if;
    if not is_draw and winner_id = row.player_a_id and not (goals_a > goals_b) then
      raise exception 'El marcador no coincide con el ganador.';
    end if;
    if not is_draw and winner_id = row.player_b_id and not (goals_b > goals_a) then
      raise exception 'El marcador no coincide con el ganador.';
    end if;
  end if;

  previous := row.status;
  insert into public.match_reports (match_id, reporter_id, winner_id, is_draw, goals_a, goals_b, updated_at)
  values (row.id, me, winner_id, is_draw, goals_a, goals_b, now())
  on conflict on constraint match_reports_pkey do update
    set winner_id = excluded.winner_id,
        is_draw = excluded.is_draw,
        goals_a = excluded.goals_a,
        goals_b = excluded.goals_b,
        updated_at = now();

  select * into from_a from public.match_reports where match_reports.match_id = row.id and reporter_id = row.player_a_id;
  select * into from_b from public.match_reports where match_reports.match_id = row.id and reporter_id = row.player_b_id;

  if from_a.match_id is null or from_b.match_id is null then
    update public.matches
      set status = 'in_progress', winner_id = null, is_draw = false, goals_a = null, goals_b = null, confirmed_at = null
      where id = row.id
      returning * into row;
    return row;
  end if;

  scored_a := from_a.goals_a is not null and from_a.goals_b is not null;
  scored_b := from_b.goals_a is not null and from_b.goals_b is not null;
  agree := from_a.is_draw = from_b.is_draw
    and from_a.winner_id is not distinct from from_b.winner_id
    and (not scored_a or not scored_b or (from_a.goals_a = from_b.goals_a and from_a.goals_b = from_b.goals_b));

  if not agree then
    update public.matches
      set status = 'disputed', winner_id = null, is_draw = false, goals_a = null, goals_b = null, confirmed_at = null
      where id = row.id
      returning * into row;
    return row;
  end if;

  if scored_a then
    final_goals_a := from_a.goals_a;
    final_goals_b := from_a.goals_b;
  elsif scored_b then
    final_goals_a := from_b.goals_a;
    final_goals_b := from_b.goals_b;
  else
    final_goals_a := null;
    final_goals_b := null;
  end if;
  final_draw := from_a.is_draw;
  final_winner := case when final_draw then null else from_a.winner_id end;

  update public.matches
    set status = 'confirmed',
        winner_id = final_winner,
        is_draw = final_draw,
        goals_a = final_goals_a,
        goals_b = final_goals_b,
        confirmed_at = now()
    where id = row.id
    returning * into row;

  if previous is distinct from 'confirmed' then
    perform public.apply_rating(row);
    perform public.advance_tournament(row);
    perform public.sync_achievements(row.player_a_id);
    perform public.sync_achievements(row.player_b_id);
    select t.winner_id into final_winner
    from public.tournaments t
    where t.id = row.tournament_id and t.winner_id is not null;
    if final_winner is not null then
      perform public.sync_achievements(final_winner);
    end if;
  end if;
  return row;
end;
$fn$;

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
  if (
    select count(distinct id)
    from unnest(coalesce(member_ids, array[]::uuid[])) as id
    where id <> me
  ) < 1 then
    raise exception 'Invita al menos a un amigo al grupo.';
  end if;
  for member in
    select distinct id from unnest(member_ids) as id where id <> me
  loop
    if not public.are_friends(me, member) then
      raise exception 'Solo puedes sumar a tus amigos.';
    end if;
  end loop;
  insert into public.groups (name, created_by) values (trimmed, me) returning id into created;
  insert into public.group_members (group_id, user_id, role) values (created, me, 'owner');
  insert into public.group_members (group_id, user_id, role)
  select created, id, 'member'
  from (select distinct id from unnest(member_ids) as id where id <> me) people;
  return created;
end;
$fn$;

create or replace function public.create_tournament(
  group_id uuid,
  tournament_name text,
  tournament_format text,
  player_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  trimmed text := trim(tournament_name);
  size int;
  player uuid;
  created uuid;
  rounds int;
  round_no int;
  count_slots int;
  pos int;
  pair_pos int := 0;
  slot_id uuid;
  a uuid;
  b uuid;
  ids uuid[];
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
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  if char_length(trimmed) < 3 or char_length(trimmed) > 40 then
    raise exception 'Ponle un nombre de 3 a 40 caracteres.';
  end if;
  if not exists (select 1 from public.groups g where g.id = group_id) then
    raise exception 'No encontramos el grupo.';
  end if;
  if not public.is_group_member(group_id, me) then
    raise exception 'No estás en ese grupo.';
  end if;
  if tournament_format not in ('single_elim', 'round_robin') then
    raise exception 'Elige eliminación o liga.';
  end if;
  size := cardinality(player_ids);
  if (select count(distinct id) from unnest(player_ids) as id) <> size then
    raise exception 'Un jugador no puede salir dos veces.';
  end if;
  foreach player in array player_ids loop
    if not public.is_group_member(group_id, player) then
      raise exception 'Todos los jugadores tienen que estar en el grupo.';
    end if;
  end loop;
  if tournament_format = 'single_elim' and size not in (4, 8, 16) then
    raise exception 'La eliminación directa es de 4, 8 o 16 jugadores.';
  end if;
  if tournament_format = 'round_robin' and (size < 3 or size > 16) then
    raise exception 'La liga necesita entre 3 y 16 jugadores.';
  end if;

  if tournament_format = 'single_elim' then
    rounds := case size when 4 then 2 when 8 then 3 else 4 end;
    for round_no in 1..rounds loop
      count_slots := size / (power(2, round_no))::int;
      for pos in 0..count_slots - 1 loop
        if round_no = 1 then
          perform public.assert_no_open(player_ids[pos * 2 + 1], player_ids[pos * 2 + 2]);
        end if;
      end loop;
    end loop;
  else
    ids := player_ids;
    if cardinality(ids) % 2 = 1 then
      ids := ids || bye;
    end if;
    n := cardinality(ids);
    half := n / 2;
    rotation := ids;
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

  insert into public.tournaments (group_id, name, format, size, created_by, player_ids)
  values (
    group_id,
    trimmed,
    tournament_format,
    case when tournament_format = 'single_elim' then size else null end,
    me,
    player_ids
  )
  returning id into created;

  if tournament_format = 'single_elim' then
    rounds := case size when 4 then 2 when 8 then 3 else 4 end;
    for round_no in 1..rounds loop
      count_slots := size / (power(2, round_no))::int;
      for pos in 0..count_slots - 1 loop
        a := case when round_no = 1 then player_ids[pos * 2 + 1] else null end;
        b := case when round_no = 1 then player_ids[pos * 2 + 2] else null end;
        insert into public.tournament_slots (tournament_id, round, position, player_a_id, player_b_id)
        values (created, round_no, pos, a, b)
        returning id into slot_id;
        if a is not null and b is not null then
          perform public.insert_pending_match(a, b, group_id, created, slot_id, interval '72 hours');
        end if;
      end loop;
    end loop;
  else
    ids := player_ids;
    if cardinality(ids) % 2 = 1 then
      ids := ids || bye;
    end if;
    n := cardinality(ids);
    half := n / 2;
    rotation := ids;
    for r in 1..n - 1 loop
      for i in 1..half loop
        a := rotation[i];
        b := rotation[n - i + 1];
        if a <> bye and b <> bye then
          insert into public.tournament_slots (tournament_id, round, position, player_a_id, player_b_id)
          values (created, 1, pair_pos, a, b)
          returning id into slot_id;
          pair_pos := pair_pos + 1;
          perform public.insert_pending_match(a, b, group_id, created, slot_id, interval '72 hours');
        end if;
      end loop;
      fixed := rotation[1];
      rest := rotation[2:n];
      last_id := rest[cardinality(rest)];
      rest := rest[1:cardinality(rest) - 1];
      rotation := array[fixed, last_id] || rest;
    end loop;
  end if;

  return created;
end;
$fn$;

create or replace function public.reopen_tournament_match(slot_id uuid)
returns public.matches
language plpgsql
security definer
set search_path = public
as $fn$
declare
  me uuid := auth.uid();
  slot public.tournament_slots;
  cup public.tournaments;
  existing public.matches;
  opponent uuid;
begin
  if me is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  select * into slot from public.tournament_slots where id = slot_id for update;
  if slot.id is null then
    raise exception 'No está ese cruce.';
  end if;
  select * into cup from public.tournaments where id = slot.tournament_id;
  if cup.id is null or cup.status <> 'in_progress' then
    raise exception 'El torneo no está en juego.';
  end if;
  if slot.player_a_id is null or slot.player_b_id is null then
    raise exception 'Este cruce todavía no tiene a los dos jugadores.';
  end if;
  if me <> slot.player_a_id and me <> slot.player_b_id then
    raise exception 'Solo quien juega este cruce puede proponerlo.';
  end if;
  if slot.match_id is not null then
    select * into existing from public.matches where id = slot.match_id;
    if existing.status in ('pending_accept', 'in_progress', 'disputed') then
      raise exception 'Ese cruce ya tiene un partido en curso.';
    end if;
    if existing.status = 'confirmed' then
      raise exception 'Ese cruce ya tiene resultado.';
    end if;
  end if;
  perform public.assert_no_open(slot.player_a_id, slot.player_b_id);
  opponent := case when me = slot.player_a_id then slot.player_b_id else slot.player_a_id end;
  return public.insert_pending_match(me, opponent, cup.group_id, cup.id, slot.id, interval '72 hours');
end;
$fn$;

create or replace function public.expire_pending_matches()
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  updated_count int;
begin
  if auth.uid() is null then
    raise exception 'Tienes que iniciar sesión.';
  end if;
  update public.matches
    set status = 'expired'
    where status = 'pending_accept' and expires_at <= now();
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$fn$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.player_ratings enable row level security;
alter table public.friendships enable row level security;
alter table public.invite_links enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_slots enable row level security;
alter table public.matches enable row level security;
alter table public.match_reports enable row level security;
alter table public.achievements enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy ratings_select on public.player_ratings
  for select to authenticated
  using (user_id = auth.uid() or public.are_friends(auth.uid(), user_id));

create policy friendships_select on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

create policy invites_select on public.invite_links
  for select to authenticated using (creator_id = auth.uid());

create policy groups_select on public.groups
  for select to authenticated using (public.is_group_member(id, auth.uid()));

create policy members_select on public.group_members
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));

create policy tournaments_select on public.tournaments
  for select to authenticated using (public.is_group_member(group_id, auth.uid()));

create policy slots_select on public.tournament_slots
  for select to authenticated using (public.slot_visible(id));

create policy matches_select on public.matches
  for select to authenticated using (public.match_visible(id));

create policy reports_select on public.match_reports
  for select to authenticated using (public.match_visible(match_id));

create policy achievements_select on public.achievements
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.are_friends(auth.uid(), user_id)
    or exists (
      select 1 from public.group_members gm
      where gm.user_id = achievements.user_id
        and public.is_group_member(gm.group_id, auth.uid())
    )
  );

grant usage on schema public to anon, authenticated;
grant select on public.profiles, public.player_ratings, public.friendships, public.invite_links,
  public.groups, public.group_members, public.tournaments, public.tournament_slots,
  public.matches, public.match_reports, public.achievements
  to authenticated;
grant update (username, display_name, avatar_key) on public.profiles to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.validate_profile() from public, anon, authenticated;
revoke all on function public.are_friends(uuid, uuid) from public;
revoke all on function public.is_group_member(uuid, uuid) from public;
revoke all on function public.match_visible(uuid) from public;
revoke all on function public.slot_visible(uuid) from public;
revoke all on function public.assert_no_open(uuid, uuid) from public, anon, authenticated;
revoke all on function public.make_invite_code() from public, anon, authenticated;
revoke all on function public.insert_pending_match(uuid, uuid, uuid, uuid, uuid, interval) from public, anon, authenticated;
revoke all on function public.best_win_streak(uuid) from public, anon, authenticated;
revoke all on function public.apply_rating(public.matches) from public, anon, authenticated;
revoke all on function public.sync_achievements(uuid) from public, anon, authenticated;
revoke all on function public.tournament_unique_leader(uuid) from public, anon, authenticated;
revoke all on function public.advance_tournament(public.matches) from public, anon, authenticated;
revoke all on function public.touch_expiry(public.matches) from public, anon, authenticated;

grant execute on function public.are_friends(uuid, uuid) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
grant execute on function public.match_visible(uuid) to authenticated;
grant execute on function public.slot_visible(uuid) to authenticated;

grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.create_match(uuid, uuid) to authenticated;
grant execute on function public.accept_match(uuid) to authenticated;
grant execute on function public.decline_match(uuid) to authenticated;
grant execute on function public.submit_match_report(uuid, boolean, uuid, int, int) to authenticated;
grant execute on function public.create_group(text, uuid[]) to authenticated;
grant execute on function public.create_tournament(uuid, text, text, uuid[]) to authenticated;
grant execute on function public.reopen_tournament_match(uuid) to authenticated;
grant execute on function public.expire_pending_matches() to authenticated;

do $pub$
begin
  begin
    alter publication supabase_realtime add table public.matches;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.match_reports;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.friendships;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.tournaments;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.tournament_slots;
  exception when duplicate_object or undefined_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.achievements;
  exception when duplicate_object or undefined_object then null;
  end;
end;
$pub$;
