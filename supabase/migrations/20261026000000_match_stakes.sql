-- Apuestas por partido (Trustless Work, SOLO testnet). Un escrow single-release por partido.
-- Solo el servidor (service_role, api/stake.ts) escribe. Los jugadores y quien puede ver el partido solo leen.
-- NO APLICADA: scaffold del branch `escrow`.

create table if not exists public.match_stakes (
  match_id         uuid primary key references public.matches (id) on delete cascade,
  network          text not null default 'testnet' check (network = 'testnet'),
  asset_code       text not null default 'USDC',
  asset_issuer     text not null,
  stake_stroops    bigint not null check (stake_stroops > 0 and stake_stroops <= 10000000000), -- máx. 1000 por jugador
  proposed_by      uuid not null references public.profiles (id),
  status           text not null default 'proposed' check (status in (
                     'proposed', 'declined', 'deploying', 'funding', 'locked', 'settling', 'paid', 'refunded', 'failed')),
  contract_id      text unique check (contract_id ~ '^C[A-Z2-7]{55}$'),
  deploy_tx        text,
  player_a_address text check (player_a_address ~ '^G[A-Z2-7]{55}$'),
  player_b_address text check (player_b_address ~ '^G[A-Z2-7]{55}$'),
  -- Candado por lado contra doble depósito (se toma antes de enviar, se suelta al terminar o a los 2 min).
  funding_a_lock   timestamptz,
  funding_b_lock   timestamptz,
  funded_a_tx      text,
  funded_b_tx      text,
  funded_a_at      timestamptz,
  funded_b_at      timestamptz,
  fund_deadline    timestamptz,   -- sin los dos depósitos a esta hora: se devuelve lo depositado
  result_deadline  timestamptz,   -- sin resultado confirmado a esta hora: se devuelve a cada uno
  outcome          text check (outcome in ('winner', 'draw', 'refund')),
  winner_id        uuid references public.profiles (id),
  distributions    jsonb,         -- [{address, amount}] enviado a resolve_dispute (bruto, antes del 0.3 % de TW)
  dispute_tx       text,
  settle_tx        text,          -- tx de resolve_dispute: el link "Verificado en Stellar"
  settled_at       timestamptz,
  claimed_at       timestamptz,   -- candado del que está liquidando (deploy / settle)
  attempts         int not null default 0,
  last_error       text,
  accepted_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists match_stakes_open on public.match_stakes (status, fund_deadline, result_deadline)
  where status in ('funding', 'locked', 'settling');
create index if not exists match_stakes_proposed_by on public.match_stakes (proposed_by);
create index if not exists match_stakes_winner on public.match_stakes (winner_id);

alter table public.match_stakes enable row level security;
revoke all on public.match_stakes from anon, authenticated;
grant select on public.match_stakes to authenticated;
drop policy if exists match_stakes_select on public.match_stakes;
create policy match_stakes_select on public.match_stakes for select to authenticated
  using (public.match_visible(match_id));
