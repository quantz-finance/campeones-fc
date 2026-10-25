-- Red de cada anclaje: al pasar de testnet a mainnet (solo con variables de entorno) el historial se vuelve a anclar
-- en la red nueva y la cadena de actas empieza de cero en esa red. Lo anclado en la red anterior se archiva.

alter table public.matches
  add column if not exists chain_network text check (chain_network in ('testnet', 'mainnet'));
update public.matches set chain_network = 'testnet' where chain_tx is not null and chain_network is null;

create table if not exists public.chain_anchor_archive (
  match_id    uuid not null references public.matches (id) on delete cascade,
  network     text not null check (network in ('testnet', 'mainnet')),
  chain_hash  text,
  chain_tx    text,
  chain_payload jsonb,
  anchored_at timestamptz,
  archived_at timestamptz not null default now(),
  primary key (match_id, network, archived_at)
);
alter table public.chain_anchor_archive enable row level security;
revoke all on public.chain_anchor_archive from anon, authenticated;

-- Actas por red: la clave pasa a ser (network, day).
alter table public.chain_daily_records drop constraint if exists chain_daily_records_pkey;
alter table public.chain_daily_records add primary key (network, day);
drop index if exists public.chain_daily_records_queue;
create index if not exists chain_daily_records_queue on public.chain_daily_records (network, status, day)
  where status in ('pending', 'submitting');

-- Encola hasta p_limit partidos confirmados que no están anclados en p_network:
--   - los que nunca entraron a la cola, y
--   - los anclados (o fallidos) en otra red: se archivan y se vuelven a anclar "sin firma" del registro anterior.
drop function if exists public.queue_chain_backfill(int);
create or replace function public.queue_chain_backfill(p_limit int, p_network text default null)
returns int
language plpgsql
security definer
set search_path = ''
as $fn$
declare
  n int;
begin
  if p_network is not null and p_network not in ('testnet', 'mainnet') then
    raise exception 'red inválida';
  end if;
  with picked as (
    select m.id from public.matches m
    where m.status = 'confirmed' and m.confirmed_at is not null
      and (
        m.chain_status is null
        -- Sin chain_network = anclado antes de esta migración, que solo existió en testnet.
        or (p_network is not null and coalesce(m.chain_network, 'testnet') <> p_network
            and m.chain_status in ('anchored', 'failed'))
      )
    order by m.confirmed_at, m.id
    limit greatest(0, least(p_limit, 500))
    for update skip locked
  ),
  archived as (
    insert into public.chain_anchor_archive (match_id, network, chain_hash, chain_tx, chain_payload, anchored_at)
    select m.id, coalesce(m.chain_network, 'testnet'), m.chain_hash, m.chain_tx, m.chain_payload, m.anchored_at
    from public.matches m join picked on picked.id = m.id
    where m.chain_tx is not null
    returning 1
  )
  update public.matches m
    set chain_status = 'pending', chain_backfill = true, chain_network = null, chain_hash = null, chain_payload = null,
        chain_tx = null, chain_max_time = null, chain_attempts = 0, chain_claimed_at = null, chain_error = null, anchored_at = null
    from picked where m.id = picked.id;
  get diagnostics n = row_count;
  return n;
end;
$fn$;
revoke all on function public.queue_chain_backfill(int, text) from public, anon, authenticated;
grant execute on function public.queue_chain_backfill(int, text) to service_role;
