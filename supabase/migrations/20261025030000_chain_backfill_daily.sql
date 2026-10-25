-- Registro en Stellar, segunda parte:
--   1. Partidos confirmados antes del registro: se encolan "sin firma" (chain_backfill) y se anclan por lotes.
--   2. Acta diaria: raíz Merkle de los resultados confirmados de cada día (hora de Costa Rica),
--      encadenada con el acta anterior y anclada en un memo hash. La escribe solo el servidor.
-- Aditiva: no cambia RPC existentes.

alter table public.matches
  add column if not exists chain_backfill boolean not null default false;

-- Encola hasta p_limit partidos confirmados que nunca entraron a la cola (los más viejos primero).
-- Devuelve cuántos encoló. Solo service_role.
create or replace function public.queue_chain_backfill(p_limit int)
returns int
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  n int;
begin
  with picked as (
    select m.id from public.matches m
    where m.status = 'confirmed' and m.confirmed_at is not null and m.chain_status is null
    order by m.confirmed_at, m.id
    limit greatest(0, least(p_limit, 500))
    for update skip locked
  )
  update public.matches m
    set chain_status = 'pending', chain_backfill = true
    from picked where m.id = picked.id;
  get diagnostics n = row_count;
  return n;
end;
$fn$;
revoke all on function public.queue_chain_backfill(int) from public, anon, authenticated;
grant execute on function public.queue_chain_backfill(int) to service_role;

create table if not exists public.chain_daily_records (
  day            date primary key,
  network        text not null check (network in ('testnet', 'mainnet')),
  match_count    int not null check (match_count >= 0),
  root           text not null check (root ~ '^[a-f0-9]{64}$'),
  prev_hash      text check (prev_hash ~ '^[a-f0-9]{64}$'),
  record_hash    text not null unique check (record_hash ~ '^[a-f0-9]{64}$'),
  record         jsonb not null,
  match_ids      uuid[] not null,
  status         text not null default 'pending' check (status in ('pending', 'submitting', 'anchored', 'failed')),
  tx             text check (tx ~ '^[a-f0-9]{64}$'),
  max_time       bigint,
  attempts       int not null default 0,
  claimed_at     timestamptz,
  error          text,
  created_at     timestamptz not null default now(),
  anchored_at    timestamptz
);
create index if not exists chain_daily_records_queue on public.chain_daily_records (status, day)
  where status in ('pending', 'submitting');
alter table public.chain_daily_records enable row level security;
revoke all on public.chain_daily_records from anon, authenticated;
-- Es información pública (también está en la cadena), pero se sirve por /api/verificar.
create index if not exists chain_daily_records_match_ids on public.chain_daily_records using gin (match_ids);
