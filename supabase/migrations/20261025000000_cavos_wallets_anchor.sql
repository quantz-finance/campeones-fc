-- Cavos: identidad (iss, sub) -> usuario, billetera Stellar por jugador, nonces de un uso,
-- firmas de los dos jugadores y anclaje del resultado en Stellar.
-- Aditiva: no cambia ninguna tabla ni RPC existente; la app actual sigue igual.

-- 1. Identidad Cavos. La clave es (iss, sub): el sub solo no es único entre proveedores.
--    Solo el servidor (service_role) la lee y escribe.
create table public.cavos_identities (
  iss          text not null check (char_length(iss) between 1 and 200),
  sub          text not null check (char_length(sub) between 1 and 200),
  user_id      uuid not null references auth.users (id) on delete cascade,
  linked_by    text not null check (linked_by in ('new_user', 'verified_email')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  primary key (iss, sub)
);
create index cavos_identities_user on public.cavos_identities (user_id);
alter table public.cavos_identities enable row level security;
revoke all on public.cavos_identities from anon, authenticated;

-- 2. Billetera Stellar ligada al jugador. La primera gana: el servidor nunca la sobrescribe.
create table public.wallets (
  user_id    uuid primary key references public.profiles (id) on delete cascade,
  address    text not null unique check (address ~ '^G[A-Z2-7]{55}$'),
  network    text not null default 'testnet' check (network in ('testnet', 'mainnet')),
  created_at timestamptz not null default now()
);
alter table public.wallets enable row level security;
revoke all on public.wallets from anon, authenticated;
grant select on public.wallets to authenticated;
-- La dirección ya es pública en la cadena; cualquier jugador con sesión la puede ver.
create policy wallets_select on public.wallets for select to authenticated using (true);

-- 3. Nonces de un uso (5 min) para la prueba de firma al entrar.
create table public.session_nonces (
  nonce      text primary key check (nonce ~ '^[a-f0-9]{32,128}$'),
  iss        text not null,
  sub        text not null,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index session_nonces_owner on public.session_nonces (iss, sub, expires_at);
alter table public.session_nonces enable row level security;
revoke all on public.session_nonces from anon, authenticated;

-- 4. Firma de cada jugador sobre el resultado confirmado (signMessage de Cavos).
create table public.match_attestations (
  match_id   uuid not null references public.matches (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  address    text not null check (address ~ '^G[A-Z2-7]{55}$'),
  public_key text not null check (public_key ~ '^G[A-Z2-7]{55}$'),
  message    text not null check (char_length(message) <= 600),
  signature  text not null check (char_length(signature) <= 200),
  created_at timestamptz not null default now(),
  primary key (match_id, user_id)
);
create index match_attestations_user on public.match_attestations (user_id);
alter table public.match_attestations enable row level security;
revoke all on public.match_attestations from anon, authenticated;
grant select on public.match_attestations to authenticated;
create policy attestations_select on public.match_attestations
  for select to authenticated using (public.match_visible(match_id));

-- 5. Estado del anclaje en Stellar. Solo el servidor escribe estas columnas
--    (authenticated no tiene UPDATE sobre matches).
alter table public.matches
  add column chain_status     text check (chain_status in ('pending', 'submitting', 'anchored', 'failed')),
  add column chain_hash       text check (chain_hash ~ '^[a-f0-9]{64}$'),
  add column chain_payload    jsonb,
  add column chain_tx         text check (chain_tx ~ '^[a-f0-9]{64}$'),
  add column chain_max_time   bigint,
  add column chain_attempts   int not null default 0,
  add column chain_claimed_at timestamptz,
  add column chain_error      text,
  add column anchored_at      timestamptz;

create index matches_chain_queue on public.matches (chain_status, confirmed_at)
  where chain_status in ('pending', 'submitting');

-- Un partido que pasa a confirmado entra a la cola de anclaje. Los ya confirmados antes de
-- esta migración quedan sin anclar (chain_status null).
create or replace function public.queue_match_anchor()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' and new.chain_status is null then
    new.chain_status := 'pending';
  end if;
  return new;
end;
$fn$;
revoke all on function public.queue_match_anchor() from public, anon, authenticated;

create trigger matches_queue_anchor
  before update of status on public.matches
  for each row execute function public.queue_match_anchor();

-- 6. Buscar un usuario de auth por correo (solo para ligar una identidad Cavos con correo
--    verificado a una cuenta existente). Solo service_role.
create or replace function public.cavos_user_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $fn$
  select u.id from auth.users u
  where lower(u.email) = lower(trim(p_email))
  order by u.created_at
  limit 1;
$fn$;
revoke all on function public.cavos_user_by_email(text) from public, anon, authenticated;
grant execute on function public.cavos_user_by_email(text) to service_role;
