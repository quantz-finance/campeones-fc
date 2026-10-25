-- Elo con las reglas FIDE (ajedrez). Mismo cálculo que src/domain/elo.ts:
--   - Todos empiezan en 1200.
--   - Esperado E = 1 / (1 + 10^((Rb - Ra) / 400)), con la diferencia topada en 400 (regla de los 400 puntos).
--   - Cambio de cada jugador = K * (S - E), S = 1 victoria, 0.5 empate, 0 derrota.
--   - K = 40 en los primeros 30 partidos con rating, K = 10 si alguna vez llegó a 2400, si no K = 20.
--   - Cada jugador usa su propio K; el cambio se redondea al entero (mitades lejos de cero) y el rating guardado es entero.
-- Cada partido confirmado guarda el rating de ambos antes del partido y el cambio, para mostrar +18 / -7.

alter table public.player_ratings
  add column if not exists games int not null default 0,
  add column if not exists peak int not null default 1200;

alter table public.matches
  add column if not exists rating_a_before int,
  add column if not exists rating_b_before int,
  add column if not exists rating_delta_a int,
  add column if not exists rating_delta_b int;

create or replace function public.fide_k(p_games int, p_peak int)
returns int
language sql
immutable
set search_path = ''
as $fn$
  select case when p_games < 30 then 40 when p_peak >= 2400 then 10 else 20 end;
$fn$;

create or replace function public.fide_delta(p_rating int, p_opponent int, p_score numeric, p_k int)
returns int
language plpgsql
immutable
set search_path = ''
as $fn$
declare
  diff double precision := greatest(-400, least(400, p_opponent - p_rating));
  expected double precision := 1.0 / (1.0 + power(10.0, diff / 400.0));
begin
  return round((p_k * (p_score - expected))::numeric)::int;
end;
$fn$;

create or replace function public.apply_rating(p_match public.matches)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  ra public.player_ratings;
  rb public.player_ratings;
  score_a numeric;
  delta_a int;
  delta_b int;
  before_a int;
  before_b int;
begin
  if p_match.status <> 'confirmed' then
    return;
  end if;
  -- Un partido cuenta una sola vez.
  if exists (select 1 from public.matches m where m.id = p_match.id and m.rating_delta_a is not null) then
    return;
  end if;
  insert into public.player_ratings (user_id, rating)
  values (p_match.player_a_id, 1200), (p_match.player_b_id, 1200)
  on conflict (user_id) do nothing;
  select * into ra from public.player_ratings where user_id = p_match.player_a_id for update;
  select * into rb from public.player_ratings where user_id = p_match.player_b_id for update;
  before_a := round(ra.rating::numeric)::int;
  before_b := round(rb.rating::numeric)::int;
  if p_match.is_draw or p_match.winner_id is null then
    score_a := 0.5;
  elsif p_match.winner_id = p_match.player_a_id then
    score_a := 1;
  else
    score_a := 0;
  end if;
  delta_a := public.fide_delta(before_a, before_b, score_a, public.fide_k(ra.games, ra.peak));
  delta_b := public.fide_delta(before_b, before_a, 1 - score_a, public.fide_k(rb.games, rb.peak));
  update public.player_ratings
    set rating = before_a + delta_a, games = games + 1, peak = greatest(peak, before_a + delta_a), updated_at = now()
    where user_id = p_match.player_a_id;
  update public.player_ratings
    set rating = before_b + delta_b, games = games + 1, peak = greatest(peak, before_b + delta_b), updated_at = now()
    where user_id = p_match.player_b_id;
  update public.matches
    set rating_a_before = before_a, rating_b_before = before_b, rating_delta_a = delta_a, rating_delta_b = delta_b
    where id = p_match.id;
end;
$fn$;

-- Repite todos los partidos confirmados en orden (confirmed_at, id) desde 1200. Solo servidor.
create or replace function public.recompute_ratings()
returns int
language plpgsql
security definer
set search_path = public
as $fn$
declare
  m public.matches;
  n int := 0;
begin
  update public.player_ratings set rating = 1200, games = 0, peak = 1200, updated_at = now();
  insert into public.player_ratings (user_id, rating)
    select p.id, 1200 from public.profiles p
    on conflict (user_id) do nothing;
  update public.matches
    set rating_a_before = null, rating_b_before = null, rating_delta_a = null, rating_delta_b = null
    where rating_delta_a is not null or rating_a_before is not null;
  for m in
    select * from public.matches
    where status = 'confirmed' and confirmed_at is not null
    order by confirmed_at, id
  loop
    perform public.apply_rating(m);
    n := n + 1;
  end loop;
  return n;
end;
$fn$;

revoke all on function public.fide_k(int, int) from public, anon, authenticated;
revoke all on function public.fide_delta(int, int, numeric, int) from public, anon, authenticated;
revoke all on function public.apply_rating(public.matches) from public, anon, authenticated;
revoke all on function public.recompute_ratings() from public, anon, authenticated;

select public.recompute_ratings();
