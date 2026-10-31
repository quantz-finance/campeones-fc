-- Lo mínimo que Supabase trae de fábrica y las migraciones dan por hecho (roles, esquemas, Storage, Realtime).
-- Solo para el Supabase local de las pruebas e2e sin Docker (e2e/stack/native-stack.mjs).
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticator') then create role authenticator login password 'e2e' noinherit; end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then create role supabase_auth_admin login password 'e2e' createrole; end if;
end $$;
grant anon, authenticated, service_role to authenticator;

create schema if not exists auth authorization supabase_auth_admin;
grant usage on schema auth to anon, authenticated, service_role, postgres;
create schema if not exists extensions;
grant usage on schema extensions to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;

-- Storage (solo lo que usan las migraciones: el bucket y las políticas de photos).
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean default false, file_size_limit bigint,
  allowed_mime_types text[], owner uuid, created_at timestamptz default now(), updated_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text,
  owner uuid, metadata jsonb, created_at timestamptz default now(), updated_at timestamptz default now()
);
alter table storage.objects enable row level security;
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
$$;
grant usage on schema storage to anon, authenticated, service_role;

-- Realtime: la publicación existe en Supabase; aquí no hay servidor de Realtime (la app relee cada 30 s).
do $$ begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then create publication supabase_realtime; end if;
end $$;
